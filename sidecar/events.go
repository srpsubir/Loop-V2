package main

import (
	"encoding/json"

	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	"google.golang.org/protobuf/encoding/protojson"
)

// historySyncBatchSize caps how many individual messages go into one
// history-sync-chunk event. The spike proved a single sync can deliver
// 14,812 messages in one HistorySync callback; emitting that as one JSON
// blob would force the Node side to buffer and parse a multi-MB line
// synchronously (design.md Section 4, "Large initial sync burst"). Batching
// here means the Node side can insert incrementally and never see a single
// line larger than a few hundred messages' worth of JSON.
const historySyncBatchSize = 300

type qrPayload struct {
	Code string `json:"code"`
}

type connectionUpdatePayload struct {
	State  string `json:"state"` // "connecting" | "connected" | "disconnected" | "logged-out" | "qr-timeout" | "connect-failure"
	Reason string `json:"reason,omitempty"`
}

type historyChatBatch struct {
	ChatID   string            `json:"chatId"`
	Name     string            `json:"name,omitempty"`
	Messages []json.RawMessage `json:"messages"`
}

type historySyncChunkPayload struct {
	SyncType string             `json:"syncType"`
	Progress int                `json:"progress"`
	IsLast   bool               `json:"isLast"`
	Chats    []historyChatBatch `json:"chats"`
}

type messageUpsertPayload struct {
	ChatID    string          `json:"chatId"`
	SenderID  string          `json:"senderId"`
	ID        string          `json:"id"`
	IsFromMe  bool            `json:"isFromMe"`
	IsGroup   bool            `json:"isGroup"`
	Timestamp int64           `json:"timestamp"` // unix seconds
	PushName  string          `json:"pushName,omitempty"`
	Message   json.RawMessage `json:"message"` // protojson-encoded waE2E.Message
}

type receiptUpdatePayload struct {
	ChatID        string   `json:"chatId"`
	SenderID      string   `json:"senderId"`
	MessageIDs    []string `json:"messageIds"`
	Type          string   `json:"type"`
	Timestamp     int64    `json:"timestamp"`
	MessageSender string   `json:"messageSender,omitempty"`
}

type callPayload struct {
	CallID    string `json:"callId"`
	From      string `json:"from"`
	GroupJID  string `json:"groupJid,omitempty"`
	Timestamp int64  `json:"timestamp"`
	Kind      string `json:"kind"` // "offer" | "offer-notice" | "terminate" | "reject"
	Reason    string `json:"reason,omitempty"`
	Media     string `json:"media,omitempty"`
}

type labelEditPayload struct {
	LabelID string `json:"labelId"`
	Name    string `json:"name"`
	Color   int32  `json:"color"`
	Deleted bool   `json:"deleted"`
}

type labelAssociationPayload struct {
	LabelID string `json:"labelId"`
	Type    string `json:"type"` // "chat" | "message"
	ChatID  string `json:"chatId"`
	MsgID   string `json:"messageId,omitempty"`
	Labeled bool   `json:"labeled"`
}

type groupUpsertPayload struct {
	ChatID string   `json:"chatId"`
	Name   string   `json:"name,omitempty"`
	Join   []string `json:"join,omitempty"`
}

type groupUpdatePayload struct {
	ChatID    string   `json:"chatId"`
	Name      string   `json:"name,omitempty"`
	Timestamp int64    `json:"timestamp"`
	Join      []string `json:"join,omitempty"`
	Leave     []string `json:"leave,omitempty"`
	Promote   []string `json:"promote,omitempty"`
	Demote    []string `json:"demote,omitempty"`
}

type groupParticipantsUpdatePayload struct {
	ChatID  string   `json:"chatId"`
	Join    []string `json:"join,omitempty"`
	Leave   []string `json:"leave,omitempty"`
	Promote []string `json:"promote,omitempty"`
	Demote  []string `json:"demote,omitempty"`
}

// registerEventHandlers wires every whatsmeow event this sidecar cares about
// into the Emitter. It mirrors Baileys' event names as closely as the two
// libraries' models allow (design.md Section 2).
func registerEventHandlers(emitter *Emitter) func(interface{}) {
	return func(raw interface{}) {
		switch evt := raw.(type) {
		case *events.Connected:
			_ = emitter.Emit(EventConnectionUpdate, connectionUpdatePayload{State: "connected"})

		case *events.Disconnected:
			_ = emitter.Emit(EventConnectionUpdate, connectionUpdatePayload{State: "disconnected"})

		case *events.LoggedOut:
			_ = emitter.Emit(EventConnectionUpdate, connectionUpdatePayload{
				State:  "logged-out",
				Reason: evt.Reason.String(),
			})

		case *events.ConnectFailure:
			_ = emitter.Emit(EventConnectionUpdate, connectionUpdatePayload{
				State:  "connect-failure",
				Reason: evt.Reason.String(),
			})

		case *events.StreamReplaced:
			_ = emitter.Emit(EventConnectionUpdate, connectionUpdatePayload{
				State:  "logged-out",
				Reason: "stream replaced by another client",
			})

		case *events.HistorySync:
			emitHistorySync(emitter, evt)

		case *events.Message:
			emitMessageUpsert(emitter, evt)

		case *events.Receipt:
			ids := make([]string, len(evt.MessageIDs))
			copy(ids, evt.MessageIDs)
			_ = emitter.Emit(EventReceiptUpdate, receiptUpdatePayload{
				ChatID:        evt.Chat.String(),
				SenderID:      evt.Sender.String(),
				MessageIDs:    ids,
				Type:          string(evt.Type),
				Timestamp:     evt.Timestamp.Unix(),
				MessageSender: jidOrEmpty(evt.MessageSender),
			})

		case *events.CallOffer:
			_ = emitter.Emit(EventCall, callPayload{
				CallID:    evt.CallID,
				From:      evt.From.String(),
				GroupJID:  jidOrEmpty(evt.GroupJID),
				Timestamp: evt.Timestamp.Unix(),
				Kind:      "offer",
			})

		case *events.CallOfferNotice:
			_ = emitter.Emit(EventCall, callPayload{
				CallID:    evt.CallID,
				From:      evt.From.String(),
				GroupJID:  jidOrEmpty(evt.GroupJID),
				Timestamp: evt.Timestamp.Unix(),
				Kind:      "offer-notice",
				Media:     evt.Media,
			})

		case *events.CallTerminate:
			_ = emitter.Emit(EventCall, callPayload{
				CallID:    evt.CallID,
				From:      evt.From.String(),
				GroupJID:  jidOrEmpty(evt.GroupJID),
				Timestamp: evt.Timestamp.Unix(),
				Kind:      "terminate",
				Reason:    evt.Reason,
			})

		case *events.CallReject:
			_ = emitter.Emit(EventCall, callPayload{
				CallID:    evt.CallID,
				From:      evt.From.String(),
				GroupJID:  jidOrEmpty(evt.GroupJID),
				Timestamp: evt.Timestamp.Unix(),
				Kind:      "reject",
			})

		case *events.LabelEdit:
			_ = emitter.Emit(EventLabelsEdit, labelEditPayload{
				LabelID: evt.LabelID,
				Name:    evt.Action.GetName(),
				Color:   evt.Action.GetColor(),
				Deleted: evt.Action.GetDeleted(),
			})

		case *events.LabelAssociationChat:
			_ = emitter.Emit(EventLabelsAssociation, labelAssociationPayload{
				LabelID: evt.LabelID,
				Type:    "chat",
				ChatID:  evt.JID.String(),
				Labeled: evt.Action.GetLabeled(),
			})

		case *events.LabelAssociationMessage:
			_ = emitter.Emit(EventLabelsAssociation, labelAssociationPayload{
				LabelID: evt.LabelID,
				Type:    "message",
				ChatID:  evt.JID.String(),
				MsgID:   evt.MessageID,
				Labeled: evt.Action.GetLabeled(),
			})

		case *events.JoinedGroup:
			participantJIDs := make([]types.JID, len(evt.Participants))
			for i, p := range evt.Participants {
				participantJIDs[i] = p.JID
			}
			_ = emitter.Emit(EventGroupsUpsert, groupUpsertPayload{
				ChatID: evt.JID.String(),
				Name:   evt.GroupName.Name,
				Join:   jidsToStrings(participantJIDs),
			})

		case *events.GroupInfo:
			name := ""
			if evt.Name != nil {
				name = evt.Name.Name
			}
			_ = emitter.Emit(EventGroupsUpdate, groupUpdatePayload{
				ChatID:    evt.JID.String(),
				Name:      name,
				Timestamp: evt.Timestamp.Unix(),
				Join:      jidsToStrings(evt.Join),
				Leave:     jidsToStrings(evt.Leave),
				Promote:   jidsToStrings(evt.Promote),
				Demote:    jidsToStrings(evt.Demote),
			})
			if len(evt.Join) > 0 || len(evt.Leave) > 0 || len(evt.Promote) > 0 || len(evt.Demote) > 0 {
				_ = emitter.Emit(EventGroupParticipantsUpdate, groupParticipantsUpdatePayload{
					ChatID:  evt.JID.String(),
					Join:    jidsToStrings(evt.Join),
					Leave:   jidsToStrings(evt.Leave),
					Promote: jidsToStrings(evt.Promote),
					Demote:  jidsToStrings(evt.Demote),
				})
			}

		default:
			// Intentionally silent for event types this sidecar doesn't
			// forward yet (e.g. Presence, ChatPresence, KeepAliveTimeout) —
			// not everything Baileys never wired either needs a mirror here.
		}
	}
}

func emitMessageUpsert(emitter *Emitter, evt *events.Message) {
	msgJSON, err := protojson.Marshal(evt.Message)
	if err != nil {
		emitter.Logf("failed to marshal message %s in chat %s: %v", evt.Info.ID, evt.Info.Chat.String(), err)
		return
	}
	_ = emitter.Emit(EventMessagesUpsert, messageUpsertPayload{
		ChatID:    evt.Info.Chat.String(),
		SenderID:  evt.Info.Sender.String(),
		ID:        evt.Info.ID,
		IsFromMe:  evt.Info.IsFromMe,
		IsGroup:   evt.Info.IsGroup,
		Timestamp: evt.Info.Timestamp.Unix(),
		PushName:  evt.Info.PushName,
		Message:   json.RawMessage(msgJSON),
	})
}

func emitHistorySync(emitter *Emitter, evt *events.HistorySync) {
	conversations := evt.Data.GetConversations()
	syncType := evt.Data.GetSyncType().String()
	progress := int(evt.Data.GetProgress())

	var batch []historyChatBatch
	batchCount := 0

	flush := func(isLast bool) {
		if len(batch) == 0 && !isLast {
			return
		}
		_ = emitter.Emit(EventHistorySyncChunk, historySyncChunkPayload{
			SyncType: syncType,
			Progress: progress,
			IsLast:   isLast,
			Chats:    batch,
		})
		batch = nil
		batchCount = 0
	}

	for _, conv := range conversations {
		msgs := conv.GetMessages()
		if len(msgs) == 0 {
			continue
		}
		chatID := conv.GetID()
		name := conv.GetName()

		// ON_DEMAND responses (fetch-history command results) carry a
		// per-conversation transfer-completeness flag whatsmeow doesn't
		// surface anywhere else. COMPLETE_BUT_MORE_MESSAGES_REMAIN_ON_PRIMARY
		// means another fetch-history call (anchored on this response's
		// oldest message) can pull further back; anything else means this
		// chat is exhausted on the primary device. Log-only for now — no
		// automatic re-paging exists yet, this just makes the boundary
		// observable (mautrix-whatsapp gates re-fetching on this exact
		// field, see pkg/connector/backfill.go).
		if syncType == "ON_DEMAND" {
			emitter.Logf("on-demand history response for chat %s: endOfHistoryTransferType=%s", chatID, conv.GetEndOfHistoryTransferType().String())
		}

		var pending []json.RawMessage
		for _, hm := range msgs {
			wmi := hm.GetMessage()
			if wmi == nil {
				continue
			}
			raw, err := protojson.Marshal(wmi)
			if err != nil {
				emitter.Logf("failed to marshal history message in chat %s: %v", chatID, err)
				continue
			}
			pending = append(pending, json.RawMessage(raw))
			batchCount++

			if batchCount >= historySyncBatchSize {
				batch = append(batch, historyChatBatch{ChatID: chatID, Name: name, Messages: pending})
				pending = nil
				flush(false)
			}
		}
		if len(pending) > 0 {
			batch = append(batch, historyChatBatch{ChatID: chatID, Name: name, Messages: pending})
		}
	}

	// Final flush for this HistorySync callback. isLast here means "last
	// chunk of this callback," not "last chunk of the overall sync" — the
	// Node side should key off connection-update/messaging-history status
	// (progress reaching 100, or simply the absence of further chunks) for
	// true sync completion, same ambiguity Baileys' messaging-history.set
	// already had.
	flush(true)
}

func jidOrEmpty(j types.JID) string {
	if j.IsEmpty() {
		return ""
	}
	return j.String()
}

func jidsToStrings(jids []types.JID) []string {
	if len(jids) == 0 {
		return nil
	}
	out := make([]string, len(jids))
	for i, j := range jids {
		out[i] = j.String()
	}
	return out
}
