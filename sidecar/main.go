// Command loop-sidecar is the whatsmeow-based WhatsApp transport for Loop,
// replacing Baileys (MAV-265). It is a thin translation layer: it makes no
// product decisions and does not touch Loop's SQLite message store directly
// (design.md Section 3) — it only speaks whatsmeow on one side and
// newline-delimited JSON (protocol.go) on stdio on the other.
//
// Usage:
//
//	loop-sidecar -db /path/to/whatsmeow-session.db
//
// The db path is also readable from the LOOP_WHATSMEOW_DB_PATH env var if
// the flag is omitted, so the parent process can wire it either way.
package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/store/sqlstore"
	waLog "go.mau.fi/whatsmeow/util/log"

	_ "modernc.org/sqlite"
)

func main() {
	dbPathFlag := flag.String("db", "", "path to whatsmeow session sqlite db (or set LOOP_WHATSMEOW_DB_PATH)")
	logLevel := flag.String("log-level", "ERROR", "whatsmeow internal log level: DEBUG, INFO, WARN, ERROR")
	flag.Parse()

	dbPath := *dbPathFlag
	if dbPath == "" {
		dbPath = os.Getenv("LOOP_WHATSMEOW_DB_PATH")
	}
	if dbPath == "" {
		fmt.Fprintln(os.Stderr, "loop-sidecar: -db or LOOP_WHATSMEOW_DB_PATH is required")
		os.Exit(1)
	}

	emitter := NewEmitter(os.Stdout)

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)
	defer stop()

	dbLog := waLog.Stdout("Database", *logLevel, true)
	container, err := sqlstore.New(ctx, "sqlite", fmt.Sprintf("file:%s?_pragma=foreign_keys(1)", dbPath), dbLog)
	if err != nil {
		emitter.Emit(EventFatal, map[string]string{"message": fmt.Sprintf("session db init failed: %v", err)})
		os.Exit(1)
	}

	deviceStore, err := container.GetFirstDevice(ctx)
	if err != nil {
		emitter.Emit(EventFatal, map[string]string{"message": fmt.Sprintf("device store init failed: %v", err)})
		os.Exit(1)
	}

	clientLog := waLog.Stdout("Client", *logLevel, true)
	client := whatsmeow.NewClient(deviceStore, clientLog)
	client.AddEventHandler(registerEventHandlers(emitter))

	// Command reader runs on its own goroutine so it can service
	// send-message/fetch-history/logout concurrently with whatsmeow's own
	// event-driven goroutines. dispatchCommand is itself safe to call
	// concurrently with connect/QR handling below since whatsmeow's Client
	// methods are internally synchronized.
	go func() {
		err := ReadCommands(os.Stdin, emitter, func(env InEnvelope) {
			dispatchCommand(ctx, client, emitter, env)
		})
		if err != nil {
			emitter.Logf("stdin read loop exited with error: %v", err)
		}
		// stdin closed (EOF) means the parent process is gone or closed the
		// pipe deliberately — either way, this process has no further
		// purpose. Trigger the same shutdown path as a signal.
		stop()
	}()

	if client.Store.ID == nil {
		if err := connectWithQR(ctx, client, emitter); err != nil {
			emitter.Emit(EventFatal, map[string]string{"message": fmt.Sprintf("QR connect failed: %v", err)})
			os.Exit(1)
		}
	} else {
		_ = emitter.Emit(EventConnectionUpdate, connectionUpdatePayload{State: "connecting"})
		if err := client.Connect(); err != nil {
			emitter.Emit(EventFatal, map[string]string{"message": fmt.Sprintf("connect failed: %v", err)})
			os.Exit(1)
		}
	}

	<-ctx.Done()

	// Graceful shutdown (design.md Section 4, "App quit / clean shutdown"):
	// disconnect cleanly rather than letting the parent SIGKILL us, so
	// whatsmeow closes its websocket instead of leaving a stale connection
	// for WhatsApp's servers to time out on their own schedule.
	client.Disconnect()
}

// connectWithQR runs the pairing flow for a device with no existing
// session, forwarding each QR code to the main process as it's issued.
// WhatsApp QR codes rotate every ~20-60s until scanned, so this may emit
// several qr events for a single pairing attempt — the Node/renderer side
// (unchanged, per design.md Section 2 step 2) already handles that today.
func connectWithQR(ctx context.Context, client *whatsmeow.Client, emitter *Emitter) error {
	qrChan, err := client.GetQRChannel(ctx)
	if err != nil {
		return err
	}
	_ = emitter.Emit(EventConnectionUpdate, connectionUpdatePayload{State: "connecting"})
	if err := client.Connect(); err != nil {
		return err
	}
	for evt := range qrChan {
		switch evt.Event {
		case "code":
			_ = emitter.Emit(EventQR, qrPayload{Code: evt.Code})
		case "success":
			_ = emitter.Emit(EventConnectionUpdate, connectionUpdatePayload{State: "connected"})
		case "timeout":
			_ = emitter.Emit(EventConnectionUpdate, connectionUpdatePayload{State: "qr-timeout"})
		default:
			emitter.Logf("qr channel event: %s", evt.Event)
		}
	}
	return nil
}
