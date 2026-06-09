// Loop — Home: who's on your mind (a hero) + your chapters
(function () {
  const { PaperCard, Avatar, Tag, PersonRow, Button } = window.LoopDesignSystem_96f8bb;

  function AvatarStack({ ids, size = 30 }) {
    return (
      <div style={{ display: "flex" }}>
        {ids.map((id, i) => (
          <div key={id} style={{ marginLeft: i ? -10 : 0, position: "relative", zIndex: ids.length - i }}>
            <Avatar name={window.LoopData.people[id].name} size={size} />
          </div>
        ))}
      </div>
    );
  }

  function ChapterCard({ chapter, onOpen }) {
    const memberIds = [...new Set(chapter.crews.flatMap((c) => c.members))];
    return (
      <PaperCard interactive padding={0} onClick={onOpen} style={{ overflow: "hidden", borderRadius: "var(--radius-lg)" }}>
        <window.Photo src={chapter.cover} alt={chapter.title} style={{ height: 150, borderTopLeftRadius: "var(--radius-lg)", borderTopRightRadius: "var(--radius-lg)" }} />
        <div style={{ padding: "16px 18px 18px" }}>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-muted)" }}>{chapter.years}</div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 600, color: "var(--text-primary)", margin: "4px 0 12px", letterSpacing: "-0.01em" }}>{chapter.title}</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <AvatarStack ids={memberIds.slice(0, 5)} />
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)" }}>{memberIds.length} people</span>
          </div>
        </div>
      </PaperCard>
    );
  }

  // The lead of "On your mind": one person, given the room a real prompt deserves.
  function MindHero({ entry, onOpenPerson }) {
    const p = window.LoopData.people[entry.id];
    return (
      <PaperCard raised padding={0} style={{ overflow: "hidden", display: "flex" }}>
        <div style={{ width: 210, flex: "none", background: "var(--terracotta-faint)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Avatar name={p.name} size={108} ring="terracotta" />
        </div>
        <div style={{ flex: 1, minWidth: 0, padding: "30px 34px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, color: "var(--accent)" }}>
            <window.Ic name="Gift" size={18} />
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 700, letterSpacing: "0.01em", whiteSpace: "nowrap" }}>{entry.reason}</span>
          </div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 30, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em", margin: "9px 0 9px" }}>{p.name}</div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 540 }}>{entry.brief}</div>
          <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
            <Button iconLeft={<window.Ic name="FileText" size={16} />} onClick={() => onOpenPerson(entry.id)}>Open brief</Button>
            <Button variant="secondary" iconLeft={<window.Ic name="Pencil" size={15} />}>Add a note</Button>
          </div>
        </div>
      </PaperCard>
    );
  }

  function HomeScreen({ onOpenChapter, onOpenPerson, onOpenSetup }) {
    const D = window.LoopData;
    const [hero, ...rest] = D.onYourMind;
    return (
      <div style={{ padding: "40px 56px 64px", maxWidth: 1040, margin: "0 auto" }}>
        <div style={{ fontFamily: "var(--font-serif)", fontSize: 34, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          Good evening, Alex
        </div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 15, color: "var(--text-secondary)", marginTop: 6 }}>
          Eight people across three chapters. One has a date worth remembering.
        </div>

        <div style={{ margin: "34px 0 16px", fontFamily: "var(--font-sans)", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>On your mind</div>
        <MindHero entry={hero} onOpenPerson={onOpenPerson} />
        <div style={{ marginTop: 14 }}>
          <PaperCard padding={10}>
            {rest.map((e, i) => {
              const p = D.people[e.id];
              return (
                <div key={e.id}>
                  <PersonRow
                    name={p.name}
                    note={e.reason}
                    onClick={() => onOpenPerson(e.id)}
                    trailing={<Button variant="secondary" size="sm" iconLeft={<window.Ic name="Send" size={14} />}>Say hi</Button>}
                  />
                  {i < rest.length - 1 && <div style={{ height: 1, background: "var(--border-light)", margin: "0 12px" }} />}
                </div>
              );
            })}
          </PaperCard>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "44px 0 16px" }}>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>Your chapters</div>
          <Button variant="ghost" size="sm" iconLeft={<window.Ic name="Plus" size={15} />} onClick={onOpenSetup}>New chapter</Button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22 }}>
          {D.chapters.map((c) => (
            <ChapterCard key={c.id} chapter={c} onOpen={() => onOpenChapter(c.id)} />
          ))}
        </div>
      </div>
    );
  }

  window.HomeScreen = HomeScreen;
})();
