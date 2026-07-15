package main

import (
	"context"
	"encoding/json"
	"time"

	"go.mau.fi/whatsmeow"
	waE2E "go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/types"
)

type fetchHistoryPayload struct {
	ChatID               string `json:"chatId"`
	OldestKnownMessageID string `json:"oldestKnownMessageId"`
	OldestKnownFromMe    bool   `json:"oldestKnownFromMe"`
	OldestKnownTimestamp int64  `json:"oldestKnownTimestamp"` // unix seconds
	Count                int    `json:"count"`
}

type sendMessagePayload struct {
	JID  string `json:"jid"`
	Text string `json:"text"`
}

// sendMessageAckPayload/commandErrorPayload are the ack/error bodies for
// commands sent with a correlation ID (protocol.go's EventCommandAck /
// EventCommandError). CmdID echoes InEnvelope.ID so the Node side can
// resolve the right pending promise.
type sendMessageAckPayload struct {
	CmdID     string `json:"cmdId"`
	MessageID string `json:"messageId"`
	Timestamp int64  `json:"timestamp"` // unix seconds
}

type commandErrorPayload struct {
	CmdID string `json:"cmdId"`
	Cmd   string `json:"cmd"`
	Error string `json:"error"`
}

type groupInfoPayload struct {
	ChatID       string   `json:"chatId"`
	Name         string   `json:"name,omitempty"`
	Participants []string `json:"participants,omitempty"`
}

type listGroupsAckPayload struct {
	CmdID  string             `json:"cmdId"`
	Groups []groupInfoPayload `json:"groups"`
}

// dispatchCommand handles one InEnvelope command from the main process.
// Commands with no meaningful synchronous whatsmeow result (fetch-history,
// logout — both signal completion via their own events) report failures as
// EventLog entries only, same as before. Commands with a real synchronous
// result (send-message, list-groups) ack/error-correlate via env.ID so a
// single bad command still can't take down the sidecar process (mirrors
// ReadCommands' "skip malformed line" behavior in protocol.go), but the
// caller now actually learns whether it worked.
func dispatchCommand(ctx context.Context, client *whatsmeow.Client, emitter *Emitter, env InEnvelope) {
	switch env.Cmd {
	case CmdFetchHistory:
		var p fetchHistoryPayload
		if err := json.Unmarshal(env.Payload, &p); err != nil {
			emitter.Logf("fetch-history: bad payload: %v", err)
			return
		}
		handleFetchHistory(ctx, client, emitter, p)

	case CmdLogout:
		handleLogout(ctx, client, emitter)

	case CmdSendMessage:
		var p sendMessagePayload
		if err := json.Unmarshal(env.Payload, &p); err != nil {
			emitCommandError(emitter, env, err)
			return
		}
		handleSendMessage(ctx, client, emitter, env.ID, p)

	case CmdListGroups:
		handleListGroups(ctx, client, emitter, env.ID)

	default:
		emitter.Logf("unknown command %q", env.Cmd)
	}
}

func emitCommandError(emitter *Emitter, env InEnvelope, err error) {
	if env.ID == "" {
		emitter.Logf("%s: %v", env.Cmd, err)
		return
	}
	_ = emitter.Emit(EventCommandError, commandErrorPayload{CmdID: env.ID, Cmd: env.Cmd, Error: err.Error()})
}

// handleFetchHistory implements WhatsAppManager.fetchOlderMessages()'s
// sidecar side (design.md Section 2, step 5): requests on-demand history
// from the account's primary device via a peer message. The response
// arrives asynchronously as a normal *events.HistorySync with
// syncType=ON_DEMAND, which registerEventHandlers already forwards as
// history-sync-chunk — this command just kicks that off, it doesn't return
// the messages itself.
func handleFetchHistory(ctx context.Context, client *whatsmeow.Client, emitter *Emitter, p fetchHistoryPayload) {
	chatJID, err := types.ParseJID(p.ChatID)
	if err != nil {
		emitter.Logf("fetch-history: invalid chatId %q: %v", p.ChatID, err)
		return
	}
	if p.Count <= 0 {
		p.Count = 50 // whatsmeow's own recommended default (BuildHistorySyncRequest doc)
	}

	lastKnown := &types.MessageInfo{
		MessageSource: types.MessageSource{Chat: chatJID},
		ID:            p.OldestKnownMessageID,
		Timestamp:     time.Unix(p.OldestKnownTimestamp, 0),
	}
	lastKnown.IsFromMe = p.OldestKnownFromMe

	req := client.BuildHistorySyncRequest(lastKnown, p.Count)
	if _, err := client.SendPeerMessage(ctx, req); err != nil {
		emitter.Logf("fetch-history: SendPeerMessage failed for chat %s: %v", p.ChatID, err)
	}
}

func handleLogout(ctx context.Context, client *whatsmeow.Client, emitter *Emitter) {
	if err := client.Logout(ctx); err != nil {
		emitter.Logf("logout failed: %v", err)
		// Fall through to Disconnect regardless — an unlink failure
		// shouldn't leave the local socket dangling.
	}
	client.Disconnect()
	_ = emitter.Emit(EventConnectionUpdate, connectionUpdatePayload{State: "logged-out", Reason: "local logout"})
}

// handleSendMessage mirrors mautrix-whatsapp's own send path
// (pkg/connector/handlematrix.go, HandleMatrixMessage): whatsmeow's
// Client.SendMessage is a synchronous call returning (SendResponse, error)
// directly — there is no separate ack mechanism at the whatsmeow layer to
// wait on. This is not fire-and-forget; the result is available immediately,
// it just needs to be correlated back to the caller over IPC by cmdId.
func handleSendMessage(ctx context.Context, client *whatsmeow.Client, emitter *Emitter, cmdID string, p sendMessagePayload) {
	to, err := types.ParseJID(p.JID)
	if err != nil {
		emitCommandError(emitter, InEnvelope{ID: cmdID, Cmd: CmdSendMessage}, err)
		return
	}
	msg := &waE2E.Message{
		Conversation: &p.Text,
	}
	resp, err := client.SendMessage(ctx, to, msg)
	if err != nil {
		emitCommandError(emitter, InEnvelope{ID: cmdID, Cmd: CmdSendMessage}, err)
		return
	}
	if cmdID == "" {
		return
	}
	_ = emitter.Emit(EventCommandAck, sendMessageAckPayload{
		CmdID:     cmdID,
		MessageID: resp.ID,
		Timestamp: resp.Timestamp.Unix(),
	})
}

// handleListGroups mirrors mautrix-whatsapp's chatinfo.go pattern: group
// membership is fetched on demand via a synchronous whatsmeow call
// (GetJoinedGroups), not assembled passively from cached group-update
// events. This closes the gap where a group joined before the sidecar's
// current run wouldn't appear until it had a membership-changing event.
func handleListGroups(ctx context.Context, client *whatsmeow.Client, emitter *Emitter, cmdID string) {
	groups, err := client.GetJoinedGroups(ctx)
	if err != nil {
		emitCommandError(emitter, InEnvelope{ID: cmdID, Cmd: CmdListGroups}, err)
		return
	}
	out := make([]groupInfoPayload, 0, len(groups))
	for _, g := range groups {
		participants := make([]string, len(g.Participants))
		for i, p := range g.Participants {
			participants[i] = p.JID.String()
		}
		out = append(out, groupInfoPayload{
			ChatID:       g.JID.String(),
			Name:         g.Name,
			Participants: participants,
		})
	}
	if cmdID == "" {
		return
	}
	_ = emitter.Emit(EventCommandAck, listGroupsAckPayload{CmdID: cmdID, Groups: out})
}
