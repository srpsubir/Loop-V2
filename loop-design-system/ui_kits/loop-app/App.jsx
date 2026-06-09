// Loop — app shell: window chrome, top bar, search, and simple routing
(function () {
  const { Avatar, Input, PersonRow, PaperCard, IconButton } = window.LoopDesignSystem_96f8bb;

  function TrafficLights() {
    const dot = (c) => ({ width: 12, height: 12, borderRadius: "50%", background: c });
    return (
      <div style={{ display: "flex", gap: 8 }}>
        <span style={dot("#E0685B")} /><span style={dot("#E8B14C")} /><span style={dot("#7CB45C")} />
      </div>
    );
  }

  function SearchPopover({ query, onPick }) {
    const D = window.LoopData;
    const all = Object.values(D.people);
    const q = query.trim().toLowerCase();
    const results = q ? all.filter((p) => p.name.toLowerCase().includes(q) || p.place.toLowerCase().includes(q)) : all;
    return (
      <div style={{ position: "absolute", top: 46, left: 0, right: 0, zIndex: 40 }}>
        <PaperCard padding={8} style={{ boxShadow: "var(--shadow-xl)", maxHeight: 340, overflow: "auto" }}>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-muted)", padding: "6px 12px 8px" }}>
            {q ? `${results.length} match${results.length === 1 ? "" : "es"}` : "Everyone"}
          </div>
          {results.map((p) => (
            <PersonRow key={p.id} name={p.name} ring={p.ring} note={`Last spoke ${p.last} · ${p.place}`} onClick={() => onPick(p.id)} />
          ))}
          {results.length === 0 && (
            <div style={{ padding: 18, textAlign: "center", color: "var(--text-muted)", fontFamily: "var(--font-sans)", fontSize: 14 }}>No one by that name yet.</div>
          )}
        </PaperCard>
      </div>
    );
  }

  function TopBar({ onHome, onPick }) {
    const [query, setQuery] = React.useState("");
    const [open, setOpen] = React.useState(false);
    const wrapRef = React.useRef(null);
    React.useEffect(() => {
      const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
      document.addEventListener("mousedown", h);
      return () => document.removeEventListener("mousedown", h);
    }, []);
    return (
      <div style={{ height: 60, display: "flex", alignItems: "center", gap: 16, padding: "0 18px", borderBottom: "1px solid var(--border-light)", background: "var(--surface)", flex: "none" }}>
        <TrafficLights />
        <div onClick={onHome} style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer", marginLeft: 6 }}>
          <img src="../../assets/logo/loop-mark.svg" width="26" height="26" alt="Loop" />
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em" }}>Loop</span>
        </div>
        <div ref={wrapRef} style={{ position: "relative", flex: 1, maxWidth: 440, margin: "0 auto" }}>
          <Input
            icon={<window.Ic name="Search" size={16} />}
            placeholder="Search everyone…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
          />
          {open && <SearchPopover query={query} onPick={(id) => { setOpen(false); setQuery(""); onPick(id); }} />}
        </div>
        <IconButton variant="ghost" label="Settings" icon={<window.Ic name="Settings2" size={18} />} />
        <Avatar name="Alex Mercer" size={34} />
      </div>
    );
  }

  function App() {
    const [route, setRoute] = React.useState({ screen: "home" });
    const scrollRef = React.useRef(null);
    React.useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [route]);

    const go = (r) => setRoute(r);
    // The setup screen has its own header/back; hide the top bar while it's shown.
    const showTopBar = route.screen !== "setup";

    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg)" }}>
        {showTopBar && (
          <TopBar onHome={() => go({ screen: "home" })} onPick={(id) => go({ screen: "person", id })} />
        )}
        <div ref={scrollRef} style={{ flex: 1, overflow: "auto" }}>
          {route.screen === "home" && (
            <window.HomeScreen
              onOpenChapter={(id) => go({ screen: "chapter", id })}
              onOpenPerson={(id) => go({ screen: "person", id })}
              onOpenSetup={() => go({ screen: "setup" })}
            />
          )}
          {route.screen === "chapter" && (
            <window.ChapterScreen
              chapterId={route.id}
              onBack={() => go({ screen: "home" })}
              onOpenPerson={(id) => go({ screen: "person", id })}
            />
          )}
          {route.screen === "person" && (
            <window.PersonScreen personId={route.id} onBack={() => go({ screen: "home" })} />
          )}
          {route.screen === "setup" && (
            <window.ChapterSetupScreen onBack={() => go({ screen: "home" })} />
          )}
        </div>
      </div>
    );
  }

  window.LoopApp = App;
})();
