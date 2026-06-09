// Loop — Chapter: the crews who lived a chapter with you
(function () {
  const { PaperCard, PersonRow, Tag, SegmentedControl, IconButton, Button } = window.LoopDesignSystem_96f8bb;

  function Crew({ crew, onOpenPerson }) {
    return (
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 500, color: "var(--text-primary)" }}>{crew.name}</div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-muted)" }}>{crew.note}</div>
        </div>
        <PaperCard padding={10}>
          {crew.members.map((id, i) => {
            const p = window.LoopData.people[id];
            return (
              <div key={id + i}>
                <PersonRow
                  name={p.name}
                  ring={p.ring}
                  note={`Last spoke ${p.last} · ${p.place}`}
                  onClick={() => onOpenPerson(id)}
                  trailing={p.close ? <Tag tone="positive" icon={<window.Ic name="Heart" size={12} />}>Still close</Tag> : (p.drifting ? <Tag tone="chapter">Drifting</Tag> : null)}
                />
                {i < crew.members.length - 1 && <div style={{ height: 1, background: "var(--border-light)", margin: "0 12px" }} />}
              </div>
            );
          })}
        </PaperCard>
      </div>
    );
  }

  function ChapterScreen({ chapterId, onBack, onOpenPerson }) {
    const chapter = window.LoopData.chapters.find((c) => c.id === chapterId);
    const [view, setView] = React.useState("People");

    return (
      <div>
        <div style={{ position: "relative", height: 240 }}>
          <window.Photo src={chapter.cover} alt={chapter.title} style={{ position: "absolute", inset: 0 }} />
          <div style={{ position: "absolute", top: 20, left: 24 }}>
            <IconButton variant="soft" label="Back" onClick={onBack} icon={<window.Ic name="ArrowLeft" size={18} />} />
          </div>
          <div style={{ position: "absolute", left: 56, right: 56, bottom: 26 }}>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(249,245,238,0.85)" }}>{chapter.years}</div>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 40, fontWeight: 600, color: "#FBF7F0", letterSpacing: "-0.02em", marginTop: 4, textShadow: "0 1px 12px rgba(42,31,27,0.4)" }}>{chapter.title}</div>
          </div>
        </div>

        <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 56px 64px" }}>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 19, fontStyle: "italic", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 28 }}>
            {chapter.blurb}
          </div>

          <div style={{ marginBottom: 28 }}>
            <SegmentedControl options={["People", "Moments"]} value={view} onChange={setView} />
          </div>

          {view === "People" ? (
            chapter.crews.map((crew, i) => <Crew key={i} crew={crew} onOpenPerson={onOpenPerson} />)
          ) : (
            <div style={{ fontFamily: "var(--font-sans)", color: "var(--text-muted)", fontSize: 14, padding: "40px 0", textAlign: "center" }}>
              <window.Ic name="Camera" size={26} style={{ color: "var(--text-muted)", marginBottom: 10 }} />
              <div>Moments from this chapter will gather here as you add them.</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  window.ChapterScreen = ChapterScreen;
})();
