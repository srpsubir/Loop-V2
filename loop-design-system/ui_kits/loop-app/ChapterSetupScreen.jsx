// Loop — Chapter setup: name your eras and (optionally) give each a cover.
(function () {
  const { PaperCard, Input, Button, IconButton } = window.LoopDesignSystem_96f8bb;

  // Warm fallbacks — a chapter without a photo is never blank, just quietly tinted.
  const TINTS = [
    "linear-gradient(140deg, #F3E4D2 0%, #E7C9B4 100%)", // terracotta paper
    "linear-gradient(140deg, #F4E5DD 0%, #E6CBC0 100%)", // dusty rose
    "linear-gradient(140deg, #E8F0E6 0%, #CFE0CC 100%)", // sage
    "linear-gradient(140deg, #F2E8D4 0%, #E4D0AA 100%)", // warm gold
  ];

  function CoverPicker({ cover, tintIdx, onPick, onRemove }) {
    const inputRef = React.useRef(null);
    const open = () => inputRef.current && inputRef.current.click();
    return (
      <div
        onClick={() => { if (!cover) open(); }}
        style={{ position: "relative", height: 188, cursor: cover ? "default" : "pointer" }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files && e.target.files[0];
            if (f) onPick(URL.createObjectURL(f));
            e.target.value = "";
          }}
        />
        {cover ? (
          <React.Fragment>
            <window.Photo src={cover} alt="Chapter cover" style={{ position: "absolute", inset: 0 }} />
            <div style={{ position: "absolute", left: 14, bottom: 14 }}>
              <Button variant="secondary" size="sm" iconLeft={<window.Ic name="Camera" size={14} />} onClick={(e) => { e.stopPropagation(); open(); }}>Change photo</Button>
            </div>
            <div style={{ position: "absolute", right: 12, top: 12 }}>
              <IconButton variant="soft" size="sm" label="Remove photo" icon={<window.Ic name="X" size={16} />} onClick={(e) => { e.stopPropagation(); onRemove(); }} />
            </div>
          </React.Fragment>
        ) : (
          <div style={{ position: "absolute", inset: 0, background: TINTS[tintIdx % TINTS.length], display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <div style={{ width: 58, height: 58, borderRadius: "var(--radius-full)", background: "var(--bg)", boxShadow: "var(--shadow-md)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
              <window.Ic name="ImagePlus" size={24} />
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>Add a cover photo</div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Optional · one tap</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function SetupCard({ ch, idx, update }) {
    return (
      <PaperCard padding={0} style={{ overflow: "hidden" }}>
        <CoverPicker
          cover={ch.cover}
          tintIdx={idx}
          onPick={(url) => update({ cover: url })}
          onRemove={() => update({ cover: null })}
        />
        <div style={{ padding: "16px 18px 18px" }}>
          <Input value={ch.title} placeholder="Name this chapter" onChange={(e) => update({ title: e.target.value })} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, color: "var(--text-muted)" }}>
            <window.Ic name="Calendar" size={14} />
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 13 }}>{ch.years || "Add the years"}</span>
          </div>
        </div>
      </PaperCard>
    );
  }

  function AddTile({ onClick }) {
    const [hover, setHover] = React.useState(false);
    return (
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{ border: "none", cursor: "pointer", background: hover ? "var(--surface)" : "var(--surface-raised)", borderRadius: "var(--radius-lg)", minHeight: 188, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, boxShadow: "var(--shadow-inset)", transition: "background var(--duration-fast) var(--ease-out)" }}
      >
        <div style={{ width: 52, height: 52, borderRadius: "var(--radius-full)", background: "var(--bg)", boxShadow: "var(--shadow-sm)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
          <window.Ic name="Plus" size={24} />
        </div>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>Add another chapter</span>
      </button>
    );
  }

  function ChapterSetupScreen({ onBack }) {
    // Start from the existing chapters with covers cleared, so the warm
    // fallback (and the picker) is what you see first.
    const [chapters, setChapters] = React.useState(() =>
      window.LoopData.chapters.map((c) => ({ id: c.id, title: c.title, years: c.years, cover: null }))
    );
    const update = (i, patch) => setChapters((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
    const addChapter = () => setChapters((cs) => [...cs, { id: "new" + Date.now(), title: "", years: "", cover: null }]);
    const withCovers = chapters.filter((c) => c.cover).length;

    return (
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "40px 56px 64px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <IconButton variant="soft" label="Back" onClick={onBack} icon={<window.Ic name="ArrowLeft" size={18} />} />
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>Set up</div>
        </div>
        <div style={{ fontFamily: "var(--font-serif)", fontSize: 32, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Your chapters</div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 15, color: "var(--text-secondary)", marginTop: 7, maxWidth: 580, lineHeight: 1.55 }}>
          Name the eras of your life and, if you like, give each one a cover. Photos are optional — a chapter looks at home with or without one.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 22, marginTop: 30 }}>
          {chapters.map((c, i) => (
            <SetupCard key={c.id} ch={c} idx={i} update={(patch) => update(i, patch)} />
          ))}
          <AddTile onClick={addChapter} />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 30 }}>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-muted)" }}>
            {withCovers === 0 ? "No covers yet — that's perfectly fine." : `${withCovers} of ${chapters.length} chapters have a cover.`}
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <Button variant="ghost" onClick={onBack}>Skip for now</Button>
            <Button iconLeft={<window.Ic name="Check" size={16} />} onClick={onBack}>Save chapters</Button>
          </div>
        </div>
      </div>
    );
  }

  window.ChapterSetupScreen = ChapterSetupScreen;
})();
