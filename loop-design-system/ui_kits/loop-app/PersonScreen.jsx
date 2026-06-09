// Loop — Person: a life shared, as a timeline of moments
(function () {
  const { Avatar, Tag, PaperCard, Button, IconButton } = window.LoopDesignSystem_96f8bb;

  function chaptersFor(id) {
    return window.LoopData.chapters
      .filter((c) => c.crews.some((cr) => cr.members.includes(id)))
      .map((c) => c.title);
  }

  function fallbackMemories(p) {
    return [
      { date: "Recently", kind: "note", text: `You last spoke ${p.last}. ${p.place} still suits them.` },
      { date: "The beginning", kind: "milestone", text: `Where your story with ${p.name.split(" ")[0]} started.` },
    ];
  }

  function TimelineItem({ m, last }) {
    return (
      <div style={{ display: "flex", gap: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "none", width: 14 }}>
          <span style={{ width: 11, height: 11, borderRadius: "50%", background: m.kind === "milestone" ? "var(--accent)" : "var(--rose)", boxShadow: "0 0 0 4px var(--bg)", marginTop: 4 }} />
          {!last && <span style={{ width: 2, flex: 1, background: "var(--border-light)", marginTop: 4 }} />}
        </div>
        <div style={{ paddingBottom: 26, flex: 1 }}>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 }}>{m.date}</div>
          {m.photo && (
            <window.Photo src={m.photo} overlay={false} style={{ height: 168, borderRadius: "var(--radius-md)", marginBottom: 10, boxShadow: "var(--shadow-photo)" }} />
          )}
          <div style={{ fontFamily: m.kind === "milestone" ? "var(--font-serif)" : "var(--font-sans)", fontSize: m.kind === "milestone" ? 17 : 15, fontStyle: m.kind === "milestone" ? "italic" : "normal", color: m.kind === "milestone" ? "var(--text-primary)" : "var(--text-secondary)", lineHeight: 1.6 }}>
            {m.text}
          </div>
        </div>
      </div>
    );
  }

  function PersonScreen({ personId, onBack }) {
    const p = window.LoopData.people[personId];
    const memories = window.LoopData.memories[personId] || fallbackMemories(p);
    const chaps = chaptersFor(personId);

    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "26px 56px 72px" }}>
        <div style={{ marginBottom: 26 }}>
          <IconButton variant="ghost" label="Back" onClick={onBack} icon={<window.Ic name="ArrowLeft" size={18} />} />
        </div>

        <div style={{ display: "flex", gap: 22, alignItems: "center", marginBottom: 28 }}>
          <Avatar name={p.name} size={88} ring={p.ring} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 34, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>{p.name}</div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>Last spoke {p.last} · {p.place}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {chaps.map((t) => <Tag key={t} tone="chapter">{t}</Tag>)}
              {p.close && <Tag tone="positive" icon={<window.Ic name="Heart" size={12} />}>Still close</Tag>}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 38 }}>
          <Button variant="primary" iconLeft={<window.Ic name="Send" size={15} />}>Reach out</Button>
          <Button variant="secondary" iconLeft={<window.Ic name="Plus" size={15} />}>Add a moment</Button>
        </div>

        <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600, marginBottom: 20 }}>Your story together</div>
        <div>
          {memories.map((m, i) => <TimelineItem key={i} m={m} last={i === memories.length - 1} />)}
        </div>
      </div>
    );
  }

  window.PersonScreen = PersonScreen;
})();
