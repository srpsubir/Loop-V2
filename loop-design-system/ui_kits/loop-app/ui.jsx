// Loop UI kit — shared helpers (Lucide icon component, warm photo treatment)
(function () {
  function Ic({ name, size = 18, stroke = 2, color, style }) {
    const ref = React.useRef(null);
    React.useEffect(() => {
      if (!ref.current) return;
      const node = lucide[name] ? lucide.createElement(lucide[name]) : null;
      ref.current.innerHTML = node ? node.outerHTML : "";
      const svg = ref.current.querySelector("svg");
      if (svg) {
        svg.setAttribute("width", size);
        svg.setAttribute("height", size);
        svg.setAttribute("stroke-width", stroke);
      }
    }, [name, size, stroke]);
    return <span ref={ref} style={{ display: "inline-flex", color, ...style }} />;
  }

  // Warm duotone so any photo harmonises with the parchment palette
  const photoFilter = "sepia(0.32) saturate(1.05) contrast(0.96) brightness(1.02) hue-rotate(-8deg)";

  function Photo({ src, alt = "", style, overlay = true }) {
    return (
      <div style={{ position: "relative", overflow: "hidden", ...style }}>
        <img
          src={src}
          alt={alt}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: photoFilter }}
        />
        {overlay && (
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(180deg, rgba(184,98,74,0.05) 0%, rgba(42,31,27,0.04) 55%, rgba(42,31,27,0.34) 100%)",
            mixBlendMode: "multiply",
          }} />
        )}
      </div>
    );
  }

  Object.assign(window, { Ic, Photo, photoFilter });
})();
