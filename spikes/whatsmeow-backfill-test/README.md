# THROWAWAY SPIKE — not production code

One-off empirical test: does whatsmeow (Go WhatsApp multi-device library,
what Beeper's bridge uses) get deeper message-history backfill than Baileys
does for this WhatsApp account? Baileys capped at ~15 messages/chat even
with every history-sync lever maxed out.

Logs a fresh QR pairing, listens for HistorySync events for ~90s, prints
per-chat message counts and timestamp ranges, then logs the test device
out again so it doesn't linger as a zombie linked device.

Safe to delete this whole directory after the spike is done.
