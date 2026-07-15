package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"sync"
)

// ProtocolVersion is bumped whenever the shape of OutEnvelope/InEnvelope
// (or any event/command payload) changes in a way that isn't purely additive.
// The Node side must check this and hard-fail on mismatch rather than
// silently mis-parsing (see design.md Section 4, "IPC protocol version skew").
const ProtocolVersion = 1

// Event names emitted sidecar -> main process.
const (
	EventQR                      = "qr"
	EventConnectionUpdate        = "connection-update"
	EventHistorySyncChunk        = "history-sync-chunk"
	EventMessagesUpsert          = "messages-upsert"
	EventReceiptUpdate           = "receipt-update"
	EventCall                    = "call"
	EventLabelsEdit              = "labels-edit"
	EventLabelsAssociation       = "labels-association"
	EventGroupsUpsert            = "groups-upsert"
	EventGroupsUpdate            = "groups-update"
	EventGroupParticipantsUpdate = "group-participants-update"
	// EventLog is a non-protocol-critical diagnostic channel; the Node side
	// may just log-and-drop these rather than treat them as domain events.
	EventLog = "log"
	// EventFatal is emitted immediately before the sidecar exits due to an
	// unrecoverable error (e.g. device store corruption). Distinct from a
	// clean "connection-update: disconnected" so the main process can tell
	// "will reconnect" apart from "this process is about to die."
	EventFatal = "fatal"
	// EventCommandAck/EventCommandError correlate back to an InEnvelope.ID
	// for commands that have a synchronous, meaningful result at the
	// whatsmeow layer (send-message, list-groups). whatsmeow's own
	// Client.SendMessage/GetJoinedGroups calls are synchronous Go calls that
	// return (result, error) directly — mirroring mautrix-whatsapp's own
	// bridge, which just propagates that error straight back to its caller
	// rather than treating sends as fire-and-forget. A command sent without
	// an ID gets no ack/error (only fetch-history and logout currently omit
	// one; both have their own event-based completion signal already).
	EventCommandAck   = "command-ack"
	EventCommandError = "command-error"
)

// Command names accepted main process -> sidecar.
const (
	CmdFetchHistory = "fetch-history"
	CmdLogout       = "logout"
	CmdSendMessage  = "send-message"
	CmdListGroups   = "list-groups"
)

// OutEnvelope is one line of sidecar stdout: a single JSON object followed by '\n'.
type OutEnvelope struct {
	V       int             `json:"v"`
	Type    string          `json:"type"` // "event"
	Event   string          `json:"event"`
	Payload json.RawMessage `json:"payload,omitempty"`
}

// InEnvelope is one line of sidecar stdin: a single JSON object followed by '\n'.
type InEnvelope struct {
	V       int             `json:"v"`
	Type    string          `json:"type"` // "command"
	Cmd     string          `json:"cmd"`
	ID      string          `json:"id,omitempty"` // optional correlation id, echoed back in ack/error events if present
	Payload json.RawMessage `json:"payload,omitempty"`
}

// Emitter writes NDJSON events to an underlying writer (stdout in production).
// Safe for concurrent use — whatsmeow event handlers fire from multiple
// goroutines, and without locking, concurrent writes could interleave
// partial lines and corrupt the stream for the Node-side parser.
type Emitter struct {
	mu  sync.Mutex
	w   *bufio.Writer
	out io.Writer
}

func NewEmitter(w io.Writer) *Emitter {
	return &Emitter{w: bufio.NewWriter(w), out: w}
}

func (e *Emitter) Emit(event string, payload interface{}) error {
	raw, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal payload for event %q: %w", event, err)
	}
	env := OutEnvelope{
		V:       ProtocolVersion,
		Type:    "event",
		Event:   event,
		Payload: raw,
	}
	line, err := json.Marshal(env)
	if err != nil {
		return fmt.Errorf("marshal envelope for event %q: %w", event, err)
	}
	e.mu.Lock()
	defer e.mu.Unlock()
	if _, err := e.w.Write(line); err != nil {
		return err
	}
	if err := e.w.WriteByte('\n'); err != nil {
		return err
	}
	return e.w.Flush()
}

// Logf emits a best-effort diagnostic EventLog message. Errors are swallowed
// since this is a debug aid, not a protocol-critical event.
func (e *Emitter) Logf(format string, args ...interface{}) {
	_ = e.Emit(EventLog, map[string]string{"message": fmt.Sprintf(format, args...)})
}

// ReadCommands reads newline-delimited JSON commands from r and invokes
// handle for each one. Returns when r is exhausted (stdin closed, i.e. the
// parent process exited or closed the pipe) or on a read error.
//
// A malformed line is logged via the emitter and skipped rather than
// killing the loop — one bad line from a version-skewed or buggy caller
// should not take down an otherwise-healthy sidecar.
func ReadCommands(r io.Reader, emitter *Emitter, handle func(InEnvelope)) error {
	scanner := bufio.NewScanner(r)
	// Default bufio.Scanner max token size (64KiB) is too small for a
	// send-message payload with a large caption, or any future large
	// command payload. 8MiB matches the batch cap used for history-sync
	// chunk emission on the outbound side (see events.go) as a shared
	// "large but bounded" ceiling.
	buf := make([]byte, 0, 64*1024)
	scanner.Buffer(buf, 8*1024*1024)
	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}
		var env InEnvelope
		if err := json.Unmarshal(line, &env); err != nil {
			emitter.Logf("failed to parse incoming command line: %v", err)
			continue
		}
		if env.V != ProtocolVersion {
			emitter.Logf("protocol version mismatch on incoming command %q: got v%d, want v%d", env.Cmd, env.V, ProtocolVersion)
			continue
		}
		handle(env)
	}
	return scanner.Err()
}
