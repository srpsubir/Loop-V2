// THROWAWAY SPIKE — see README.md. Not production code.
package main

import (
	"context"
	"fmt"
	"os"
	"sort"
	"sync"
	"time"

	"go.mau.fi/whatsmeow"
	waProto "go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"

	_ "modernc.org/sqlite"
)

type chatStats struct {
	count   int
	oldest  int64
	newest  int64
}

func main() {
	dbLog := waLog.Stdout("Database", "ERROR", true)
	container, err := sqlstore.New(context.Background(), "sqlite", "file:spike.db?_pragma=foreign_keys(1)", dbLog)
	if err != nil {
		fmt.Println("DB init failed:", err)
		os.Exit(1)
	}

	deviceStore, err := container.GetFirstDevice(context.Background())
	if err != nil {
		fmt.Println("GetFirstDevice failed:", err)
		os.Exit(1)
	}

	clientLog := waLog.Stdout("Client", "ERROR", true)
	client := whatsmeow.NewClient(deviceStore, clientLog)

	stats := map[string]*chatStats{}
	var mu sync.Mutex
	totalMessages := 0
	var globalOldest int64 = 0

	client.AddEventHandler(func(evt interface{}) {
		switch v := evt.(type) {
		case *events.HistorySync:
			mu.Lock()
			defer mu.Unlock()
			conv := v.Data.GetConversations()
			fmt.Printf("[HistorySync] chunk received: %d conversations, syncType=%v progress=%v\n",
				len(conv), v.Data.GetSyncType(), v.Data.GetProgress())
			for _, c := range conv {
				jid := c.GetID()
				msgs := c.GetMessages()
				if len(msgs) == 0 {
					continue
				}
				s, ok := stats[jid]
				if !ok {
					s = &chatStats{}
					stats[jid] = s
				}
				for _, hm := range msgs {
					m := hm.GetMessage()
					ts := int64(m.GetMessageTimestamp())
					s.count++
					totalMessages++
					if s.oldest == 0 || ts < s.oldest {
						s.oldest = ts
					}
					if ts > s.newest {
						s.newest = ts
					}
					if globalOldest == 0 || ts < globalOldest {
						globalOldest = ts
					}
				}
			}
		case *events.Message:
			// live messages arriving post-connect; not counted as backfill
		case *events.Connected:
			fmt.Println("[Connected] whatsmeow session established")
		case *events.LoggedOut:
			fmt.Println("[LoggedOut]", v.Reason)
		}
	})

	if client.Store.ID == nil {
		qrChan, _ := client.GetQRChannel(context.Background())
		err = client.Connect()
		if err != nil {
			fmt.Println("Connect failed:", err)
			os.Exit(1)
		}
		for evt := range qrChan {
			if evt.Event == "code" {
				fmt.Println("QR_CODE_START")
				fmt.Println(evt.Code)
				fmt.Println("QR_CODE_END")
			} else {
				fmt.Println("QR login event:", evt.Event)
			}
		}
	} else {
		err = client.Connect()
		if err != nil {
			fmt.Println("Connect failed:", err)
			os.Exit(1)
		}
	}

	fmt.Println("Waiting 90s for history sync chunks to arrive...")
	time.Sleep(90 * time.Second)

	mu.Lock()
	fmt.Println("\n=== RESULTS ===")
	fmt.Printf("Total chats with history: %d\n", len(stats))
	fmt.Printf("Total messages received: %d\n", totalMessages)
	if globalOldest > 0 {
		fmt.Printf("Oldest message overall: %s\n", time.Unix(globalOldest, 0).Format(time.RFC3339))
	}

	type kv struct {
		jid string
		s   *chatStats
	}
	var sorted []kv
	for jid, s := range stats {
		sorted = append(sorted, kv{jid, s})
	}
	sort.Slice(sorted, func(i, j int) bool { return sorted[i].s.count > sorted[j].s.count })

	fmt.Println("\nTop 10 chats by message count:")
	for i, e := range sorted {
		if i >= 10 {
			break
		}
		oldest := time.Unix(e.s.oldest, 0).Format("2006-01-02")
		newest := time.Unix(e.s.newest, 0).Format("2006-01-02")
		fmt.Printf("  %s: count=%d oldest=%s newest=%s\n", e.jid, e.s.count, oldest, newest)
	}
	mu.Unlock()

	fmt.Println("\nLogging out test device...")
	err = client.Logout(context.Background())
	if err != nil {
		fmt.Println("Logout FAILED:", err)
	} else {
		fmt.Println("Logout succeeded — test device removed from account.")
	}
	client.Disconnect()

	_ = waProto.Message{}
}
