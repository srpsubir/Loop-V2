/* @ds-bundle: {"format":3,"namespace":"LoopDesignSystem_96f8bb","components":[{"name":"Button","sourcePath":"components/buttons/Button.jsx"},{"name":"IconButton","sourcePath":"components/buttons/IconButton.jsx"},{"name":"Avatar","sourcePath":"components/data-display/Avatar.jsx"},{"name":"PaperCard","sourcePath":"components/data-display/PaperCard.jsx"},{"name":"PersonRow","sourcePath":"components/data-display/PersonRow.jsx"},{"name":"Tag","sourcePath":"components/data-display/Tag.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"SegmentedControl","sourcePath":"components/forms/SegmentedControl.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Dialog","sourcePath":"components/overlays/Dialog.jsx"},{"name":"Dropdown","sourcePath":"components/overlays/Dropdown.jsx"},{"name":"Toast","sourcePath":"components/overlays/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/overlays/Tooltip.jsx"}],"sourceHashes":{"components/buttons/Button.jsx":"f5622ca4378d","components/buttons/IconButton.jsx":"145e5bb4419b","components/data-display/Avatar.jsx":"a16d87871b52","components/data-display/PaperCard.jsx":"f41f1a3accbd","components/data-display/PersonRow.jsx":"53a7fecf4322","components/data-display/Tag.jsx":"5f0ef765df59","components/forms/Input.jsx":"3c6455f32cac","components/forms/SegmentedControl.jsx":"332e94bad7e3","components/forms/Switch.jsx":"1c343017b95d","components/overlays/Dialog.jsx":"5bce4923686f","components/overlays/Dropdown.jsx":"502b37596439","components/overlays/Toast.jsx":"93862a1ea9f0","components/overlays/Tooltip.jsx":"2ed00fdff2aa","ui_kits/loop-app/App.jsx":"1b324ce51c57","ui_kits/loop-app/ChapterScreen.jsx":"0d5b3364ab0e","ui_kits/loop-app/ChapterSetupScreen.jsx":"a9939f40ea8e","ui_kits/loop-app/HomeScreen.jsx":"77cddafb73fa","ui_kits/loop-app/PersonScreen.jsx":"b47362f7e53e","ui_kits/loop-app/data.jsx":"22e741e30157","ui_kits/loop-app/ui.jsx":"3f6e9c7e28fb"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.LoopDesignSystem_96f8bb = window.LoopDesignSystem_96f8bb || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/buttons/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Loop Button — a warm, low-chrome action.
 * Primary is a solid terracotta stamp; secondary is paper-on-paper;
 * ghost is text-only. No hard borders, soft warm shadows.
 */
function Button({
  variant = "primary",
  size = "md",
  iconLeft = null,
  iconRight = null,
  disabled = false,
  type = "button",
  onClick,
  children,
  style,
  ...rest
}) {
  const heights = {
    sm: 30,
    md: 38,
    lg: 46
  };
  const pads = {
    sm: "0 12px",
    md: "0 18px",
    lg: "0 24px"
  };
  const fonts = {
    sm: 13,
    md: 14,
    lg: 15
  };
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: heights[size],
    padding: pads[size],
    fontFamily: "var(--font-sans)",
    fontSize: fonts[size],
    fontWeight: 600,
    lineHeight: 1,
    borderRadius: "var(--radius-full)",
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "background var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out)",
    whiteSpace: "nowrap",
    userSelect: "none"
  };
  const variants = {
    primary: {
      background: "var(--accent)",
      color: "var(--text-on-accent)",
      boxShadow: "var(--shadow-sm)"
    },
    secondary: {
      background: "var(--surface-raised)",
      color: "var(--text-primary)",
      boxShadow: "var(--shadow-sm)"
    },
    ghost: {
      background: "transparent",
      color: "var(--accent)",
      boxShadow: "none"
    }
  };
  const hoverBg = {
    primary: "var(--accent-hover)",
    secondary: "var(--terracotta-faint)",
    ghost: "var(--terracotta-faint)"
  };
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const merged = {
    ...base,
    ...variants[variant],
    ...(hover && !disabled ? {
      background: hoverBg[variant]
    } : null),
    ...(press && !disabled ? {
      transform: "translateY(0.5px) scale(0.985)"
    } : null),
    ...style
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    style: merged,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPress(false);
    },
    onMouseDown: () => setPress(true),
    onMouseUp: () => setPress(false)
  }, rest), iconLeft, children, iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/buttons/Button.jsx", error: String((e && e.message) || e) }); }

// components/buttons/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Loop IconButton — a soft circular control for a single icon.
 * Used for toolbar actions, close buttons, "add" affordances.
 * Pass a Lucide (or any) SVG/element as `icon`.
 */
function IconButton({
  icon,
  size = "md",
  variant = "ghost",
  disabled = false,
  label,
  onClick,
  style,
  ...rest
}) {
  const dims = {
    sm: 30,
    md: 36,
    lg: 44
  };
  const d = dims[size];
  const variants = {
    ghost: {
      background: "transparent",
      color: "var(--text-secondary)"
    },
    soft: {
      background: "var(--surface-raised)",
      color: "var(--text-primary)",
      boxShadow: "var(--shadow-sm)"
    },
    primary: {
      background: "var(--accent)",
      color: "var(--text-on-accent)",
      boxShadow: "var(--shadow-sm)"
    }
  };
  const hoverBg = {
    ghost: "var(--surface-raised)",
    soft: "var(--terracotta-faint)",
    primary: "var(--accent-hover)"
  };
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const merged = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: d,
    height: d,
    borderRadius: "var(--radius-full)",
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "background var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out)",
    ...variants[variant],
    ...(hover && !disabled ? {
      background: hoverBg[variant]
    } : null),
    ...(press && !disabled ? {
      transform: "scale(0.92)"
    } : null),
    ...style
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": label,
    title: label,
    style: merged,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPress(false);
    },
    onMouseDown: () => setPress(true),
    onMouseUp: () => setPress(false)
  }, rest), icon);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/buttons/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/data-display/Avatar.jsx
try { (() => {
/**
 * Loop Avatar — a round portrait. Falls back to warm initials on a tinted
 * paper disc when no photo. Optional soft ring to mark "still close" (sage)
 * or a highlighted person (terracotta).
 */
function Avatar({
  src,
  name = "",
  size = 44,
  ring = "none",
  // "none" | "sage" | "terracotta"
  style
}) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();

  // Deterministic warm tint from the name
  const tints = ["var(--rose)", "var(--terracotta-light)", "var(--sage)", "var(--rose)", "var(--terracotta)"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = h * 31 + name.charCodeAt(i) >>> 0;
  const bg = tints[h % tints.length];
  const ringColor = ring === "sage" ? "var(--sage)" : ring === "terracotta" ? "var(--accent)" : null;
  const wrap = {
    width: size,
    height: size,
    borderRadius: "var(--radius-full)",
    flex: "none",
    position: "relative",
    boxShadow: ringColor ? `0 0 0 2px var(--bg), 0 0 0 4px ${ringColor}` : "var(--shadow-sm)",
    ...style
  };
  const inner = {
    width: "100%",
    height: "100%",
    borderRadius: "var(--radius-full)",
    objectFit: "cover",
    display: "block"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: wrap
  }, src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    style: inner
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      ...inner,
      background: bg,
      color: "var(--bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-sans)",
      fontWeight: 600,
      fontSize: Math.round(size * 0.38),
      letterSpacing: "0.01em"
    }
  }, initials));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/data-display/PaperCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Loop PaperCard — the fundamental container. A sheet of warm paper lifted
 * by a soft shadow. No border. Hover raises it gently when interactive.
 */
function PaperCard({
  children,
  raised = false,
  interactive = false,
  padding = 20,
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const base = {
    background: raised ? "var(--surface)" : "var(--bg)",
    borderRadius: "var(--radius-lg)",
    boxShadow: interactive && hover ? "var(--shadow-lg)" : "var(--shadow-md)",
    padding,
    transition: "box-shadow var(--duration-base) var(--ease-out), transform var(--duration-base) var(--ease-out)",
    cursor: interactive ? "pointer" : "default",
    transform: interactive && hover ? "translateY(-2px)" : "none",
    ...style
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: base,
    onClick: onClick,
    onMouseEnter: interactive ? () => setHover(true) : undefined,
    onMouseLeave: interactive ? () => setHover(false) : undefined
  }, rest), children);
}
Object.assign(__ds_scope, { PaperCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/PaperCard.jsx", error: String((e && e.message) || e) }); }

// components/data-display/PersonRow.jsx
try { (() => {
/**
 * Loop PersonRow — the signature unit. A person, rendered like a line in a
 * photo album: portrait, name in serif, and a soft human line of metadata
 * ("Last spoke 3 weeks ago"). No status dots, no table cells.
 */
function PersonRow({
  name,
  src,
  meta,
  note,
  ring = "none",
  trailing = null,
  onClick,
  style
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "10px 12px",
      borderRadius: "var(--radius-md)",
      background: hover ? "var(--surface)" : "transparent",
      transition: "background var(--duration-fast) var(--ease-out)",
      cursor: onClick ? "pointer" : "default",
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    src: src,
    name: name,
    size: 46,
    ring: ring
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-serif)",
      fontSize: 18,
      fontWeight: 500,
      color: "var(--text-primary)",
      lineHeight: 1.25
    }
  }, name), (meta || note) && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 13,
      color: "var(--text-muted)",
      marginTop: 2,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, note || meta)), trailing && /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "none"
    }
  }, trailing));
}
Object.assign(__ds_scope, { PersonRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/PersonRow.jsx", error: String((e && e.message) || e) }); }

// components/data-display/Tag.jsx
try { (() => {
/**
 * Loop Tag — a soft, low-contrast label for chapters, places, and quiet
 * status. Tinted paper, no hard border. Never a loud status dot.
 */
function Tag({
  children,
  tone = "neutral",
  icon = null,
  style
}) {
  const tones = {
    neutral: {
      bg: "var(--surface-raised)",
      fg: "var(--text-secondary)"
    },
    chapter: {
      bg: "var(--terracotta-faint)",
      fg: "var(--accent-hover)"
    },
    people: {
      bg: "var(--rose-faint)",
      fg: "#9C6E5C"
    },
    positive: {
      bg: "var(--sage-faint)",
      fg: "#4C7353"
    }
  };
  const t = tones[tone] || tones.neutral;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: icon ? "4px 11px 4px 9px" : "4px 11px",
      background: t.bg,
      color: t.fg,
      fontFamily: "var(--font-sans)",
      fontSize: 12,
      fontWeight: 600,
      lineHeight: 1.4,
      borderRadius: "var(--radius-full)",
      whiteSpace: "nowrap",
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex"
    }
  }, icon), children);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Tag.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Loop Input — a text field sunk gently into the paper (inset well),
 * no hard box. Warm focus ring. Optional leading icon and label.
 */
function Input({
  label,
  icon = null,
  value,
  defaultValue,
  placeholder,
  type = "text",
  disabled = false,
  onChange,
  style,
  id,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const fid = id || React.useId();
  const wrap = {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontFamily: "var(--font-sans)",
    ...style
  };
  const field = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    height: 38,
    padding: "0 14px",
    background: "var(--bg)",
    borderRadius: "var(--radius-sm)",
    boxShadow: focus ? "var(--shadow-inset), var(--focus-ring)" : "var(--shadow-inset)",
    transition: "box-shadow var(--duration-fast) var(--ease-out)",
    opacity: disabled ? 0.55 : 1
  };
  const input = {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    fontFamily: "var(--font-sans)",
    fontSize: 14,
    color: "var(--text-primary)",
    minWidth: 0
  };
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: fid,
    style: wrap
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "var(--text-secondary)"
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: field
  }, icon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      color: "var(--text-muted)"
    }
  }, icon), /*#__PURE__*/React.createElement("input", _extends({
    id: fid,
    type: type,
    value: value,
    defaultValue: defaultValue,
    placeholder: placeholder,
    disabled: disabled,
    onChange: onChange,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: input
  }, rest))));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/SegmentedControl.jsx
try { (() => {
/**
 * Loop SegmentedControl — a small paper toggle between a few related views,
 * e.g. switching a chapter between "Timeline" and "People". The selected
 * segment rises on a soft white pill; the track is a sunk well.
 */
function SegmentedControl({
  options = [],
  value,
  onChange,
  style
}) {
  const wrap = {
    display: "inline-flex",
    padding: 3,
    gap: 2,
    background: "var(--surface)",
    borderRadius: "var(--radius-full)",
    boxShadow: "var(--shadow-inset)",
    fontFamily: "var(--font-sans)",
    ...style
  };
  return /*#__PURE__*/React.createElement("div", {
    style: wrap,
    role: "tablist"
  }, options.map(opt => {
    const v = typeof opt === "string" ? opt : opt.value;
    const lbl = typeof opt === "string" ? opt : opt.label;
    const active = v === value;
    return /*#__PURE__*/React.createElement("button", {
      key: v,
      type: "button",
      role: "tab",
      "aria-selected": active,
      onClick: () => onChange && onChange(v),
      style: {
        border: "none",
        cursor: "pointer",
        padding: "6px 16px",
        fontSize: 13,
        fontWeight: 600,
        fontFamily: "var(--font-sans)",
        borderRadius: "var(--radius-full)",
        color: active ? "var(--text-primary)" : "var(--text-muted)",
        background: active ? "var(--bg)" : "transparent",
        boxShadow: active ? "var(--shadow-sm)" : "none",
        transition: "all var(--duration-fast) var(--ease-out)"
      }
    }, lbl);
  }));
}
Object.assign(__ds_scope, { SegmentedControl });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SegmentedControl.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
/**
 * Loop Switch — a soft on/off toggle. Terracotta when on, paper well when off.
 * Used for quiet preferences ("Remind me about this crew").
 */
function Switch({
  checked = false,
  onChange,
  disabled = false,
  label,
  style
}) {
  const track = {
    width: 42,
    height: 24,
    borderRadius: "var(--radius-full)",
    background: checked ? "var(--accent)" : "var(--surface-raised)",
    boxShadow: checked ? "var(--shadow-sm)" : "var(--shadow-inset)",
    position: "relative",
    transition: "background var(--duration-base) var(--ease-out)",
    cursor: disabled ? "not-allowed" : "pointer",
    flex: "none"
  };
  const knob = {
    position: "absolute",
    top: 3,
    left: checked ? 21 : 3,
    width: 18,
    height: 18,
    borderRadius: "var(--radius-full)",
    background: "var(--bg)",
    boxShadow: "0 1px 2px rgba(42,31,27,0.25)",
    transition: "left var(--duration-base) var(--ease-out)"
  };
  const inner = /*#__PURE__*/React.createElement("button", {
    type: "button",
    role: "switch",
    "aria-checked": checked,
    disabled: disabled,
    onClick: () => !disabled && onChange && onChange(!checked),
    style: {
      ...track,
      border: "none",
      padding: 0,
      opacity: disabled ? 0.5 : 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: knob
  }));
  if (!label) return inner;
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      fontFamily: "var(--font-sans)",
      fontSize: 14,
      color: "var(--text-primary)",
      cursor: disabled ? "not-allowed" : "pointer",
      ...style
    }
  }, inner, /*#__PURE__*/React.createElement("span", null, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/overlays/Dialog.jsx
try { (() => {
/**
 * Loop Dialog — a sheet of paper that floats above the app for a single,
 * deliberate decision (confirm a delete, name a new chapter). A warm-tinted
 * scrim dims the paper behind it — never a hard black overlay. Title is serif,
 * body is sans. It fades and lifts in gently; it never snaps.
 */
function Dialog({
  open = false,
  onClose,
  title,
  description,
  children,
  footer,
  icon = null,
  width = 440,
  closeOnScrim = true,
  inline = false,
  // scope the scrim to a relative parent (e.g. a device frame)
  style
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = e => {
      if (e.key === "Escape" && onClose) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    role: "presentation",
    onMouseDown: e => {
      if (closeOnScrim && e.target === e.currentTarget && onClose) onClose();
    },
    style: {
      position: inline ? "absolute" : "fixed",
      inset: 0,
      zIndex: 100,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      // Warm ink scrim — brown, low alpha. Never neutral black.
      background: "rgba(42, 31, 27, 0.32)",
      backdropFilter: "saturate(1.05) blur(1px)",
      animation: "loopDialogScrim var(--duration-base) var(--ease-out)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    "aria-label": typeof title === "string" ? title : undefined,
    style: {
      width: "100%",
      maxWidth: width,
      background: "var(--bg)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-xl)",
      padding: 28,
      fontFamily: "var(--font-sans)",
      animation: "loopDialogIn var(--duration-base) var(--ease-out)",
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 44,
      height: 44,
      borderRadius: "var(--radius-full)",
      background: "var(--terracotta-faint)",
      color: "var(--accent)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16
    }
  }, icon), title && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-serif)",
      fontSize: 22,
      fontWeight: 600,
      color: "var(--text-primary)",
      letterSpacing: "-0.01em",
      lineHeight: 1.25
    }
  }, title), description && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--text-secondary)",
      lineHeight: 1.55,
      marginTop: 8
    }
  }, description), children && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: title || description ? 18 : 0
    }
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "flex-end",
      gap: 10,
      marginTop: 24
    }
  }, footer)), /*#__PURE__*/React.createElement("style", {
    dangerouslySetInnerHTML: {
      __html: `
        @keyframes loopDialogScrim { from { opacity: 0 } to { opacity: 1 } }
        @keyframes loopDialogIn {
          from { opacity: 0; transform: translateY(8px) scale(0.985) }
          to   { opacity: 1; transform: none }
        }
        @media (prefers-reduced-motion: reduce) {
          [role="dialog"], [role="presentation"] { animation: none !important }
        }
      `
    }
  }));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlays/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/overlays/Dropdown.jsx
try { (() => {
/**
 * Loop Dropdown — a small menu of actions on a sheet of paper, opened from a
 * trigger (an IconButton "…", a name, a chevron). Items wash to the surface
 * tint on hover; a chosen item shows a soft terracotta check. A "remove" item
 * can read terracotta, but there are no loud red destructive rows.
 */
function Dropdown({
  trigger,
  items = [],
  align = "start",
  // "start" | "end"
  width = 220,
  open: controlledOpen,
  onOpenChange,
  style
}) {
  const [uncontrolled, setUncontrolled] = React.useState(false);
  const open = controlledOpen != null ? controlledOpen : uncontrolled;
  const setOpen = v => {
    if (onOpenChange) onOpenChange(v);
    if (controlledOpen == null) setUncontrolled(v);
  };
  const wrapRef = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = e => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return /*#__PURE__*/React.createElement("span", {
    ref: wrapRef,
    style: {
      position: "relative",
      display: "inline-flex",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    onClick: () => setOpen(!open),
    style: {
      display: "inline-flex"
    }
  }, trigger), open && /*#__PURE__*/React.createElement("div", {
    role: "menu",
    style: {
      position: "absolute",
      top: "calc(100% + 8px)",
      [align === "end" ? "right" : "left"]: 0,
      zIndex: 110,
      width,
      background: "var(--bg)",
      borderRadius: "var(--radius-md)",
      boxShadow: "var(--shadow-lg)",
      padding: 6,
      fontFamily: "var(--font-sans)",
      animation: "loopMenuIn var(--duration-fast) var(--ease-out)"
    }
  }, items.map((it, i) => it.divider ? /*#__PURE__*/React.createElement("div", {
    key: `d${i}`,
    style: {
      height: 1,
      background: "var(--border-light)",
      margin: "6px 8px"
    }
  }) : it.header ? /*#__PURE__*/React.createElement("div", {
    key: `h${i}`,
    style: {
      fontSize: 11,
      letterSpacing: ".08em",
      textTransform: "uppercase",
      color: "var(--text-muted)",
      fontWeight: 600,
      padding: "8px 10px 4px"
    }
  }, it.header) : /*#__PURE__*/React.createElement(MenuItem, {
    key: i,
    item: it,
    onClose: () => setOpen(false)
  })), /*#__PURE__*/React.createElement("style", {
    dangerouslySetInnerHTML: {
      __html: `
            @keyframes loopMenuIn {
              from { opacity: 0; transform: translateY(-4px) scale(0.99) }
              to   { opacity: 1; transform: none }
            }
          `
    }
  })));
}
function MenuItem({
  item,
  onClose
}) {
  const [hover, setHover] = React.useState(false);
  const fg = item.tone === "accent" ? "var(--accent)" : "var(--text-primary)";
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    role: "menuitem",
    disabled: item.disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    onClick: () => {
      if (!item.disabled) {
        item.onClick && item.onClick();
        onClose();
      }
    },
    style: {
      display: "flex",
      alignItems: "center",
      gap: 11,
      width: "100%",
      textAlign: "left",
      border: "none",
      cursor: item.disabled ? "not-allowed" : "pointer",
      background: hover && !item.disabled ? "var(--surface)" : "transparent",
      color: fg,
      opacity: item.disabled ? 0.45 : 1,
      fontFamily: "var(--font-sans)",
      fontSize: 14,
      fontWeight: 500,
      padding: "9px 10px",
      borderRadius: "var(--radius-sm)",
      transition: "background var(--duration-fast) var(--ease-out)"
    }
  }, item.icon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      color: item.tone === "accent" ? "var(--accent)" : "var(--text-muted)",
      flex: "none"
    }
  }, item.icon), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, item.label), item.selected && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      color: "var(--accent)",
      flex: "none"
    }
  }, item.checkIcon || "✓"), item.trailing && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-muted)",
      fontSize: 12,
      flex: "none"
    }
  }, item.trailing));
}
Object.assign(__ds_scope, { Dropdown });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlays/Dropdown.jsx", error: String((e && e.message) || e) }); }

// components/overlays/Toast.jsx
try { (() => {
/**
 * Loop Toast — a small slip of paper that rises from the bottom to confirm
 * something quietly ("Saved to Priya's story"). Warm shadow, soft sage dot for
 * a positive note. It reassures; it never alarms. Auto-dismisses after a beat.
 */
function Toast({
  open = false,
  onClose,
  message,
  icon = null,
  tone = "neutral",
  // "neutral" | "positive"
  action,
  duration = 3200,
  inline = false,
  // position within a relative parent instead of the viewport
  style
}) {
  React.useEffect(() => {
    if (!open || !duration || !onClose) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [open, duration, onClose]);
  if (!open) return null;
  const dotColor = tone === "positive" ? "var(--sage)" : "var(--accent)";
  return /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    style: {
      position: inline ? "absolute" : "fixed",
      left: "50%",
      bottom: inline ? 20 : 32,
      transform: "translateX(-50%)",
      zIndex: 120,
      display: "inline-flex",
      alignItems: "center",
      gap: 12,
      maxWidth: "min(92vw, 420px)",
      padding: action ? "12px 12px 12px 18px" : "13px 20px",
      background: "var(--bg)",
      borderRadius: "var(--radius-full)",
      boxShadow: "var(--shadow-xl)",
      fontFamily: "var(--font-sans)",
      animation: "loopToastIn var(--duration-base) var(--ease-out)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: "none",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      color: dotColor
    }
  }, icon || /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: "var(--radius-full)",
      background: dotColor
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--text-primary)",
      lineHeight: 1.4
    }
  }, message), action && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: action.onClick,
    style: {
      flex: "none",
      border: "none",
      cursor: "pointer",
      background: "var(--surface-raised)",
      color: "var(--accent)",
      fontFamily: "var(--font-sans)",
      fontSize: 13,
      fontWeight: 600,
      padding: "7px 14px",
      borderRadius: "var(--radius-full)"
    }
  }, action.label), /*#__PURE__*/React.createElement("style", {
    dangerouslySetInnerHTML: {
      __html: `
        @keyframes loopToastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(10px) }
          to   { opacity: 1; transform: translateX(-50%) translateY(0) }
        }
        @media (prefers-reduced-motion: reduce) {
          [role="status"] { animation: none !important }
        }
      `
    }
  }));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlays/Toast.jsx", error: String((e && e.message) || e) }); }

// components/overlays/Tooltip.jsx
try { (() => {
/**
 * Loop Tooltip — a quiet word of explanation on hover or focus. A small ink
 * bubble (warm brown, never black) with paper text, used for icon-only
 * controls. Appears after a brief pause so it never feels twitchy.
 */
function Tooltip({
  label,
  children,
  side = "top",
  // "top" | "bottom" | "left" | "right"
  delay = 320,
  style
}) {
  const [show, setShow] = React.useState(false);
  const timer = React.useRef(null);
  const open = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShow(true), delay);
  };
  const close = () => {
    clearTimeout(timer.current);
    setShow(false);
  };
  React.useEffect(() => () => clearTimeout(timer.current), []);
  const gap = 8;
  const pos = {
    top: {
      bottom: "100%",
      left: "50%",
      transform: "translateX(-50%)",
      marginBottom: gap
    },
    bottom: {
      top: "100%",
      left: "50%",
      transform: "translateX(-50%)",
      marginTop: gap
    },
    left: {
      right: "100%",
      top: "50%",
      transform: "translateY(-50%)",
      marginRight: gap
    },
    right: {
      left: "100%",
      top: "50%",
      transform: "translateY(-50%)",
      marginLeft: gap
    }
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      display: "inline-flex",
      ...style
    },
    onMouseEnter: open,
    onMouseLeave: close,
    onFocus: open,
    onBlur: close
  }, children, show && /*#__PURE__*/React.createElement("span", {
    role: "tooltip",
    style: {
      position: "absolute",
      zIndex: 130,
      ...pos[side],
      background: "var(--ink)",
      color: "var(--bg)",
      fontFamily: "var(--font-sans)",
      fontSize: 12,
      fontWeight: 500,
      lineHeight: 1.3,
      letterSpacing: "0.005em",
      padding: "6px 10px",
      borderRadius: "var(--radius-sm)",
      boxShadow: "var(--shadow-lg)",
      whiteSpace: "nowrap",
      pointerEvents: "none",
      animation: "loopTipIn 140ms var(--ease-out)"
    }
  }, label, /*#__PURE__*/React.createElement("style", {
    dangerouslySetInnerHTML: {
      __html: `
            @keyframes loopTipIn { from { opacity: 0 } to { opacity: 1 } }
          `
    }
  })));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlays/Tooltip.jsx", error: String((e && e.message) || e) }); }

// ui_kits/loop-app/App.jsx
try { (() => {
// Loop — app shell: window chrome, top bar, search, and simple routing
(function () {
  const {
    Avatar,
    Input,
    PersonRow,
    PaperCard,
    IconButton
  } = window.LoopDesignSystem_96f8bb;
  function TrafficLights() {
    const dot = c => ({
      width: 12,
      height: 12,
      borderRadius: "50%",
      background: c
    });
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: dot("#E0685B")
    }), /*#__PURE__*/React.createElement("span", {
      style: dot("#E8B14C")
    }), /*#__PURE__*/React.createElement("span", {
      style: dot("#7CB45C")
    }));
  }
  function SearchPopover({
    query,
    onPick
  }) {
    const D = window.LoopData;
    const all = Object.values(D.people);
    const q = query.trim().toLowerCase();
    const results = q ? all.filter(p => p.name.toLowerCase().includes(q) || p.place.toLowerCase().includes(q)) : all;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        top: 46,
        left: 0,
        right: 0,
        zIndex: 40
      }
    }, /*#__PURE__*/React.createElement(PaperCard, {
      padding: 8,
      style: {
        boxShadow: "var(--shadow-xl)",
        maxHeight: 340,
        overflow: "auto"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 11,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        padding: "6px 12px 8px"
      }
    }, q ? `${results.length} match${results.length === 1 ? "" : "es"}` : "Everyone"), results.map(p => /*#__PURE__*/React.createElement(PersonRow, {
      key: p.id,
      name: p.name,
      ring: p.ring,
      note: `Last spoke ${p.last} · ${p.place}`,
      onClick: () => onPick(p.id)
    })), results.length === 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 18,
        textAlign: "center",
        color: "var(--text-muted)",
        fontFamily: "var(--font-sans)",
        fontSize: 14
      }
    }, "No one by that name yet.")));
  }
  function TopBar({
    onHome,
    onPick
  }) {
    const [query, setQuery] = React.useState("");
    const [open, setOpen] = React.useState(false);
    const wrapRef = React.useRef(null);
    React.useEffect(() => {
      const h = e => {
        if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
      };
      document.addEventListener("mousedown", h);
      return () => document.removeEventListener("mousedown", h);
    }, []);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        height: 60,
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "0 18px",
        borderBottom: "1px solid var(--border-light)",
        background: "var(--surface)",
        flex: "none"
      }
    }, /*#__PURE__*/React.createElement(TrafficLights, null), /*#__PURE__*/React.createElement("div", {
      onClick: onHome,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 9,
        cursor: "pointer",
        marginLeft: 6
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: "../../assets/logo/loop-mark.svg",
      width: "26",
      height: "26",
      alt: "Loop"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-serif)",
        fontSize: 20,
        fontWeight: 600,
        color: "var(--ink)",
        letterSpacing: "-0.01em"
      }
    }, "Loop")), /*#__PURE__*/React.createElement("div", {
      ref: wrapRef,
      style: {
        position: "relative",
        flex: 1,
        maxWidth: 440,
        margin: "0 auto"
      }
    }, /*#__PURE__*/React.createElement(Input, {
      icon: /*#__PURE__*/React.createElement(window.Ic, {
        name: "Search",
        size: 16
      }),
      placeholder: "Search everyone\u2026",
      value: query,
      onChange: e => {
        setQuery(e.target.value);
        setOpen(true);
      },
      onFocus: () => setOpen(true)
    }), open && /*#__PURE__*/React.createElement(SearchPopover, {
      query: query,
      onPick: id => {
        setOpen(false);
        setQuery("");
        onPick(id);
      }
    })), /*#__PURE__*/React.createElement(IconButton, {
      variant: "ghost",
      label: "Settings",
      icon: /*#__PURE__*/React.createElement(window.Ic, {
        name: "Settings2",
        size: 18
      })
    }), /*#__PURE__*/React.createElement(Avatar, {
      name: "Alex Mercer",
      size: 34
    }));
  }
  function App() {
    const [route, setRoute] = React.useState({
      screen: "home"
    });
    const scrollRef = React.useRef(null);
    React.useEffect(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }, [route]);
    const go = r => setRoute(r);
    // The setup screen has its own header/back; hide the top bar while it's shown.
    const showTopBar = route.screen !== "setup";
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg)"
      }
    }, showTopBar && /*#__PURE__*/React.createElement(TopBar, {
      onHome: () => go({
        screen: "home"
      }),
      onPick: id => go({
        screen: "person",
        id
      })
    }), /*#__PURE__*/React.createElement("div", {
      ref: scrollRef,
      style: {
        flex: 1,
        overflow: "auto"
      }
    }, route.screen === "home" && /*#__PURE__*/React.createElement(window.HomeScreen, {
      onOpenChapter: id => go({
        screen: "chapter",
        id
      }),
      onOpenPerson: id => go({
        screen: "person",
        id
      }),
      onOpenSetup: () => go({
        screen: "setup"
      })
    }), route.screen === "chapter" && /*#__PURE__*/React.createElement(window.ChapterScreen, {
      chapterId: route.id,
      onBack: () => go({
        screen: "home"
      }),
      onOpenPerson: id => go({
        screen: "person",
        id
      })
    }), route.screen === "person" && /*#__PURE__*/React.createElement(window.PersonScreen, {
      personId: route.id,
      onBack: () => go({
        screen: "home"
      })
    }), route.screen === "setup" && /*#__PURE__*/React.createElement(window.ChapterSetupScreen, {
      onBack: () => go({
        screen: "home"
      })
    })));
  }
  window.LoopApp = App;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/loop-app/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/loop-app/ChapterScreen.jsx
try { (() => {
// Loop — Chapter: the crews who lived a chapter with you
(function () {
  const {
    PaperCard,
    PersonRow,
    Tag,
    SegmentedControl,
    IconButton,
    Button
  } = window.LoopDesignSystem_96f8bb;
  function Crew({
    crew,
    onOpenPerson
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 28
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "baseline",
        gap: 10,
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-serif)",
        fontSize: 20,
        fontWeight: 500,
        color: "var(--text-primary)"
      }
    }, crew.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        color: "var(--text-muted)"
      }
    }, crew.note)), /*#__PURE__*/React.createElement(PaperCard, {
      padding: 10
    }, crew.members.map((id, i) => {
      const p = window.LoopData.people[id];
      return /*#__PURE__*/React.createElement("div", {
        key: id + i
      }, /*#__PURE__*/React.createElement(PersonRow, {
        name: p.name,
        ring: p.ring,
        note: `Last spoke ${p.last} · ${p.place}`,
        onClick: () => onOpenPerson(id),
        trailing: p.close ? /*#__PURE__*/React.createElement(Tag, {
          tone: "positive",
          icon: /*#__PURE__*/React.createElement(window.Ic, {
            name: "Heart",
            size: 12
          })
        }, "Still close") : p.drifting ? /*#__PURE__*/React.createElement(Tag, {
          tone: "chapter"
        }, "Drifting") : null
      }), i < crew.members.length - 1 && /*#__PURE__*/React.createElement("div", {
        style: {
          height: 1,
          background: "var(--border-light)",
          margin: "0 12px"
        }
      }));
    })));
  }
  function ChapterScreen({
    chapterId,
    onBack,
    onOpenPerson
  }) {
    const chapter = window.LoopData.chapters.find(c => c.id === chapterId);
    const [view, setView] = React.useState("People");
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        position: "relative",
        height: 240
      }
    }, /*#__PURE__*/React.createElement(window.Photo, {
      src: chapter.cover,
      alt: chapter.title,
      style: {
        position: "absolute",
        inset: 0
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        top: 20,
        left: 24
      }
    }, /*#__PURE__*/React.createElement(IconButton, {
      variant: "soft",
      label: "Back",
      onClick: onBack,
      icon: /*#__PURE__*/React.createElement(window.Ic, {
        name: "ArrowLeft",
        size: 18
      })
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        left: 56,
        right: 56,
        bottom: 26
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        letterSpacing: ".1em",
        textTransform: "uppercase",
        color: "rgba(249,245,238,0.85)"
      }
    }, chapter.years), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-serif)",
        fontSize: 40,
        fontWeight: 600,
        color: "#FBF7F0",
        letterSpacing: "-0.02em",
        marginTop: 4,
        textShadow: "0 1px 12px rgba(42,31,27,0.4)"
      }
    }, chapter.title))), /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 760,
        margin: "0 auto",
        padding: "32px 56px 64px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-serif)",
        fontSize: 19,
        fontStyle: "italic",
        color: "var(--text-secondary)",
        lineHeight: 1.5,
        marginBottom: 28
      }
    }, chapter.blurb), /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 28
      }
    }, /*#__PURE__*/React.createElement(SegmentedControl, {
      options: ["People", "Moments"],
      value: view,
      onChange: setView
    })), view === "People" ? chapter.crews.map((crew, i) => /*#__PURE__*/React.createElement(Crew, {
      key: i,
      crew: crew,
      onOpenPerson: onOpenPerson
    })) : /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        color: "var(--text-muted)",
        fontSize: 14,
        padding: "40px 0",
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement(window.Ic, {
      name: "Camera",
      size: 26,
      style: {
        color: "var(--text-muted)",
        marginBottom: 10
      }
    }), /*#__PURE__*/React.createElement("div", null, "Moments from this chapter will gather here as you add them."))));
  }
  window.ChapterScreen = ChapterScreen;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/loop-app/ChapterScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/loop-app/ChapterSetupScreen.jsx
try { (() => {
// Loop — Chapter setup: name your eras and (optionally) give each a cover.
(function () {
  const {
    PaperCard,
    Input,
    Button,
    IconButton
  } = window.LoopDesignSystem_96f8bb;

  // Warm fallbacks — a chapter without a photo is never blank, just quietly tinted.
  const TINTS = ["linear-gradient(140deg, #F3E4D2 0%, #E7C9B4 100%)",
  // terracotta paper
  "linear-gradient(140deg, #F4E5DD 0%, #E6CBC0 100%)",
  // dusty rose
  "linear-gradient(140deg, #E8F0E6 0%, #CFE0CC 100%)",
  // sage
  "linear-gradient(140deg, #F2E8D4 0%, #E4D0AA 100%)" // warm gold
  ];
  function CoverPicker({
    cover,
    tintIdx,
    onPick,
    onRemove
  }) {
    const inputRef = React.useRef(null);
    const open = () => inputRef.current && inputRef.current.click();
    return /*#__PURE__*/React.createElement("div", {
      onClick: () => {
        if (!cover) open();
      },
      style: {
        position: "relative",
        height: 188,
        cursor: cover ? "default" : "pointer"
      }
    }, /*#__PURE__*/React.createElement("input", {
      ref: inputRef,
      type: "file",
      accept: "image/*",
      style: {
        display: "none"
      },
      onChange: e => {
        const f = e.target.files && e.target.files[0];
        if (f) onPick(URL.createObjectURL(f));
        e.target.value = "";
      }
    }), cover ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(window.Photo, {
      src: cover,
      alt: "Chapter cover",
      style: {
        position: "absolute",
        inset: 0
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        left: 14,
        bottom: 14
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "sm",
      iconLeft: /*#__PURE__*/React.createElement(window.Ic, {
        name: "Camera",
        size: 14
      }),
      onClick: e => {
        e.stopPropagation();
        open();
      }
    }, "Change photo")), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        right: 12,
        top: 12
      }
    }, /*#__PURE__*/React.createElement(IconButton, {
      variant: "soft",
      size: "sm",
      label: "Remove photo",
      icon: /*#__PURE__*/React.createElement(window.Ic, {
        name: "X",
        size: 16
      }),
      onClick: e => {
        e.stopPropagation();
        onRemove();
      }
    }))) : /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        inset: 0,
        background: TINTS[tintIdx % TINTS.length],
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 58,
        height: 58,
        borderRadius: "var(--radius-full)",
        background: "var(--bg)",
        boxShadow: "var(--shadow-md)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--accent)"
      }
    }, /*#__PURE__*/React.createElement(window.Ic, {
      name: "ImagePlus",
      size: 24
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 14,
        fontWeight: 600,
        color: "var(--text-secondary)"
      }
    }, "Add a cover photo"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        color: "var(--text-muted)",
        marginTop: 2
      }
    }, "Optional \xB7 one tap"))));
  }
  function SetupCard({
    ch,
    idx,
    update
  }) {
    return /*#__PURE__*/React.createElement(PaperCard, {
      padding: 0,
      style: {
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement(CoverPicker, {
      cover: ch.cover,
      tintIdx: idx,
      onPick: url => update({
        cover: url
      }),
      onRemove: () => update({
        cover: null
      })
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "16px 18px 18px"
      }
    }, /*#__PURE__*/React.createElement(Input, {
      value: ch.title,
      placeholder: "Name this chapter",
      onChange: e => update({
        title: e.target.value
      })
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginTop: 12,
        color: "var(--text-muted)"
      }
    }, /*#__PURE__*/React.createElement(window.Ic, {
      name: "Calendar",
      size: 14
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 13
      }
    }, ch.years || "Add the years"))));
  }
  function AddTile({
    onClick
  }) {
    const [hover, setHover] = React.useState(false);
    return /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: onClick,
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => setHover(false),
      style: {
        border: "none",
        cursor: "pointer",
        background: hover ? "var(--surface)" : "var(--surface-raised)",
        borderRadius: "var(--radius-lg)",
        minHeight: 188,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        boxShadow: "var(--shadow-inset)",
        transition: "background var(--duration-fast) var(--ease-out)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 52,
        height: 52,
        borderRadius: "var(--radius-full)",
        background: "var(--bg)",
        boxShadow: "var(--shadow-sm)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--accent)"
      }
    }, /*#__PURE__*/React.createElement(window.Ic, {
      name: "Plus",
      size: 24
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 14,
        fontWeight: 600,
        color: "var(--text-secondary)"
      }
    }, "Add another chapter"));
  }
  function ChapterSetupScreen({
    onBack
  }) {
    // Start from the existing chapters with covers cleared, so the warm
    // fallback (and the picker) is what you see first.
    const [chapters, setChapters] = React.useState(() => window.LoopData.chapters.map(c => ({
      id: c.id,
      title: c.title,
      years: c.years,
      cover: null
    })));
    const update = (i, patch) => setChapters(cs => cs.map((c, j) => j === i ? {
      ...c,
      ...patch
    } : c));
    const addChapter = () => setChapters(cs => [...cs, {
      id: "new" + Date.now(),
      title: "",
      years: "",
      cover: null
    }]);
    const withCovers = chapters.filter(c => c.cover).length;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 920,
        margin: "0 auto",
        padding: "40px 56px 64px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 14,
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement(IconButton, {
      variant: "soft",
      label: "Back",
      onClick: onBack,
      icon: /*#__PURE__*/React.createElement(window.Ic, {
        name: "ArrowLeft",
        size: 18
      })
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 11,
        letterSpacing: ".1em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        fontWeight: 600
      }
    }, "Set up")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-serif)",
        fontSize: 32,
        fontWeight: 600,
        color: "var(--text-primary)",
        letterSpacing: "-0.02em"
      }
    }, "Your chapters"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 15,
        color: "var(--text-secondary)",
        marginTop: 7,
        maxWidth: 580,
        lineHeight: 1.55
      }
    }, "Name the eras of your life and, if you like, give each one a cover. Photos are optional \u2014 a chapter looks at home with or without one."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 22,
        marginTop: 30
      }
    }, chapters.map((c, i) => /*#__PURE__*/React.createElement(SetupCard, {
      key: c.id,
      ch: c,
      idx: i,
      update: patch => update(i, patch)
    })), /*#__PURE__*/React.createElement(AddTile, {
      onClick: addChapter
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 30
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        color: "var(--text-muted)"
      }
    }, withCovers === 0 ? "No covers yet — that's perfectly fine." : `${withCovers} of ${chapters.length} chapters have a cover.`), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      onClick: onBack
    }, "Skip for now"), /*#__PURE__*/React.createElement(Button, {
      iconLeft: /*#__PURE__*/React.createElement(window.Ic, {
        name: "Check",
        size: 16
      }),
      onClick: onBack
    }, "Save chapters"))));
  }
  window.ChapterSetupScreen = ChapterSetupScreen;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/loop-app/ChapterSetupScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/loop-app/HomeScreen.jsx
try { (() => {
// Loop — Home: who's on your mind (a hero) + your chapters
(function () {
  const {
    PaperCard,
    Avatar,
    Tag,
    PersonRow,
    Button
  } = window.LoopDesignSystem_96f8bb;
  function AvatarStack({
    ids,
    size = 30
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex"
      }
    }, ids.map((id, i) => /*#__PURE__*/React.createElement("div", {
      key: id,
      style: {
        marginLeft: i ? -10 : 0,
        position: "relative",
        zIndex: ids.length - i
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      name: window.LoopData.people[id].name,
      size: size
    }))));
  }
  function ChapterCard({
    chapter,
    onOpen
  }) {
    const memberIds = [...new Set(chapter.crews.flatMap(c => c.members))];
    return /*#__PURE__*/React.createElement(PaperCard, {
      interactive: true,
      padding: 0,
      onClick: onOpen,
      style: {
        overflow: "hidden",
        borderRadius: "var(--radius-lg)"
      }
    }, /*#__PURE__*/React.createElement(window.Photo, {
      src: chapter.cover,
      alt: chapter.title,
      style: {
        height: 150,
        borderTopLeftRadius: "var(--radius-lg)",
        borderTopRightRadius: "var(--radius-lg)"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "16px 18px 18px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 11,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--text-muted)"
      }
    }, chapter.years), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-serif)",
        fontSize: 22,
        fontWeight: 600,
        color: "var(--text-primary)",
        margin: "4px 0 12px",
        letterSpacing: "-0.01em"
      }
    }, chapter.title), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }
    }, /*#__PURE__*/React.createElement(AvatarStack, {
      ids: memberIds.slice(0, 5)
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        color: "var(--text-muted)"
      }
    }, memberIds.length, " people"))));
  }

  // The lead of "On your mind": one person, given the room a real prompt deserves.
  function MindHero({
    entry,
    onOpenPerson
  }) {
    const p = window.LoopData.people[entry.id];
    return /*#__PURE__*/React.createElement(PaperCard, {
      raised: true,
      padding: 0,
      style: {
        overflow: "hidden",
        display: "flex"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 210,
        flex: "none",
        background: "var(--terracotta-faint)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      name: p.name,
      size: 108,
      ring: "terracotta"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0,
        padding: "30px 34px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 9,
        color: "var(--accent)"
      }
    }, /*#__PURE__*/React.createElement(window.Ic, {
      name: "Gift",
      size: 18
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 14,
        fontWeight: 700,
        letterSpacing: "0.01em",
        whiteSpace: "nowrap"
      }
    }, entry.reason)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-serif)",
        fontSize: 30,
        fontWeight: 600,
        color: "var(--text-primary)",
        letterSpacing: "-0.01em",
        margin: "9px 0 9px"
      }
    }, p.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 15,
        color: "var(--text-secondary)",
        lineHeight: 1.6,
        maxWidth: 540
      }
    }, entry.brief), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 12,
        marginTop: 22
      }
    }, /*#__PURE__*/React.createElement(Button, {
      iconLeft: /*#__PURE__*/React.createElement(window.Ic, {
        name: "FileText",
        size: 16
      }),
      onClick: () => onOpenPerson(entry.id)
    }, "Open brief"), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      iconLeft: /*#__PURE__*/React.createElement(window.Ic, {
        name: "Pencil",
        size: 15
      })
    }, "Add a note"))));
  }
  function HomeScreen({
    onOpenChapter,
    onOpenPerson,
    onOpenSetup
  }) {
    const D = window.LoopData;
    const [hero, ...rest] = D.onYourMind;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "40px 56px 64px",
        maxWidth: 1040,
        margin: "0 auto"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-serif)",
        fontSize: 34,
        fontWeight: 600,
        color: "var(--text-primary)",
        letterSpacing: "-0.02em"
      }
    }, "Good evening, Alex"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 15,
        color: "var(--text-secondary)",
        marginTop: 6
      }
    }, "Eight people across three chapters. One has a date worth remembering."), /*#__PURE__*/React.createElement("div", {
      style: {
        margin: "34px 0 16px",
        fontFamily: "var(--font-sans)",
        fontSize: 11,
        letterSpacing: ".1em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        fontWeight: 600
      }
    }, "On your mind"), /*#__PURE__*/React.createElement(MindHero, {
      entry: hero,
      onOpenPerson: onOpenPerson
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 14
      }
    }, /*#__PURE__*/React.createElement(PaperCard, {
      padding: 10
    }, rest.map((e, i) => {
      const p = D.people[e.id];
      return /*#__PURE__*/React.createElement("div", {
        key: e.id
      }, /*#__PURE__*/React.createElement(PersonRow, {
        name: p.name,
        note: e.reason,
        onClick: () => onOpenPerson(e.id),
        trailing: /*#__PURE__*/React.createElement(Button, {
          variant: "secondary",
          size: "sm",
          iconLeft: /*#__PURE__*/React.createElement(window.Ic, {
            name: "Send",
            size: 14
          })
        }, "Say hi")
      }), i < rest.length - 1 && /*#__PURE__*/React.createElement("div", {
        style: {
          height: 1,
          background: "var(--border-light)",
          margin: "0 12px"
        }
      }));
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        margin: "44px 0 16px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 11,
        letterSpacing: ".1em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        fontWeight: 600
      }
    }, "Your chapters"), /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "sm",
      iconLeft: /*#__PURE__*/React.createElement(window.Ic, {
        name: "Plus",
        size: 15
      }),
      onClick: onOpenSetup
    }, "New chapter")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 22
      }
    }, D.chapters.map(c => /*#__PURE__*/React.createElement(ChapterCard, {
      key: c.id,
      chapter: c,
      onOpen: () => onOpenChapter(c.id)
    }))));
  }
  window.HomeScreen = HomeScreen;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/loop-app/HomeScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/loop-app/PersonScreen.jsx
try { (() => {
// Loop — Person: a life shared, as a timeline of moments
(function () {
  const {
    Avatar,
    Tag,
    PaperCard,
    Button,
    IconButton
  } = window.LoopDesignSystem_96f8bb;
  function chaptersFor(id) {
    return window.LoopData.chapters.filter(c => c.crews.some(cr => cr.members.includes(id))).map(c => c.title);
  }
  function fallbackMemories(p) {
    return [{
      date: "Recently",
      kind: "note",
      text: `You last spoke ${p.last}. ${p.place} still suits them.`
    }, {
      date: "The beginning",
      kind: "milestone",
      text: `Where your story with ${p.name.split(" ")[0]} started.`
    }];
  }
  function TimelineItem({
    m,
    last
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 18
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        flex: "none",
        width: 14
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 11,
        height: 11,
        borderRadius: "50%",
        background: m.kind === "milestone" ? "var(--accent)" : "var(--rose)",
        boxShadow: "0 0 0 4px var(--bg)",
        marginTop: 4
      }
    }), !last && /*#__PURE__*/React.createElement("span", {
      style: {
        width: 2,
        flex: 1,
        background: "var(--border-light)",
        marginTop: 4
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        paddingBottom: 26,
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        letterSpacing: ".06em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        marginBottom: 6
      }
    }, m.date), m.photo && /*#__PURE__*/React.createElement(window.Photo, {
      src: m.photo,
      overlay: false,
      style: {
        height: 168,
        borderRadius: "var(--radius-md)",
        marginBottom: 10,
        boxShadow: "var(--shadow-photo)"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: m.kind === "milestone" ? "var(--font-serif)" : "var(--font-sans)",
        fontSize: m.kind === "milestone" ? 17 : 15,
        fontStyle: m.kind === "milestone" ? "italic" : "normal",
        color: m.kind === "milestone" ? "var(--text-primary)" : "var(--text-secondary)",
        lineHeight: 1.6
      }
    }, m.text)));
  }
  function PersonScreen({
    personId,
    onBack
  }) {
    const p = window.LoopData.people[personId];
    const memories = window.LoopData.memories[personId] || fallbackMemories(p);
    const chaps = chaptersFor(personId);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 720,
        margin: "0 auto",
        padding: "26px 56px 72px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 26
      }
    }, /*#__PURE__*/React.createElement(IconButton, {
      variant: "ghost",
      label: "Back",
      onClick: onBack,
      icon: /*#__PURE__*/React.createElement(window.Ic, {
        name: "ArrowLeft",
        size: 18
      })
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 22,
        alignItems: "center",
        marginBottom: 28
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      name: p.name,
      size: 88,
      ring: p.ring
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-serif)",
        fontSize: 34,
        fontWeight: 600,
        color: "var(--text-primary)",
        letterSpacing: "-0.02em"
      }
    }, p.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 14,
        color: "var(--text-muted)",
        marginTop: 4
      }
    }, "Last spoke ", p.last, " \xB7 ", p.place), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        marginTop: 12,
        flexWrap: "wrap"
      }
    }, chaps.map(t => /*#__PURE__*/React.createElement(Tag, {
      key: t,
      tone: "chapter"
    }, t)), p.close && /*#__PURE__*/React.createElement(Tag, {
      tone: "positive",
      icon: /*#__PURE__*/React.createElement(window.Ic, {
        name: "Heart",
        size: 12
      })
    }, "Still close")))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 12,
        marginBottom: 38
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      iconLeft: /*#__PURE__*/React.createElement(window.Ic, {
        name: "Send",
        size: 15
      })
    }, "Reach out"), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      iconLeft: /*#__PURE__*/React.createElement(window.Ic, {
        name: "Plus",
        size: 15
      })
    }, "Add a moment")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 11,
        letterSpacing: ".1em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        fontWeight: 600,
        marginBottom: 20
      }
    }, "Your story together"), /*#__PURE__*/React.createElement("div", null, memories.map((m, i) => /*#__PURE__*/React.createElement(TimelineItem, {
      key: i,
      m: m,
      last: i === memories.length - 1
    }))));
  }
  window.PersonScreen = PersonScreen;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/loop-app/PersonScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/loop-app/data.jsx
try { (() => {
// Loop — sample data for the UI kit. Fictional people & chapters.
window.LoopData = function () {
  const people = {
    priya: {
      id: "priya",
      name: "Priya Raman",
      ring: "sage",
      last: "3 weeks ago",
      place: "Edinburgh",
      close: true
    },
    marcus: {
      id: "marcus",
      name: "Marcus Bell",
      ring: "none",
      last: "in the spring",
      place: "London",
      drifting: true
    },
    jo: {
      id: "jo",
      name: "Jo Okafor",
      ring: "terracotta",
      last: "on Tuesday",
      place: "London",
      close: true
    },
    tom: {
      id: "tom",
      name: "Tom Reid",
      ring: "none",
      last: "2 months ago",
      place: "Glasgow"
    },
    nadia: {
      id: "nadia",
      name: "Nadia Haddad",
      ring: "sage",
      last: "last weekend",
      place: "Edinburgh",
      close: true
    },
    sam: {
      id: "sam",
      name: "Sam Whitfield",
      ring: "none",
      last: "a while back",
      place: "Bristol",
      drifting: true
    },
    elena: {
      id: "elena",
      name: "Elena Costa",
      ring: "none",
      last: "last month",
      place: "Lisbon"
    },
    danny: {
      id: "danny",
      name: "Danny Mensah",
      ring: "sage",
      last: "yesterday",
      place: "London",
      close: true
    }
  };
  const chapters = [{
    id: "london",
    title: "The London Years",
    years: "2014 – 2019",
    cover: "../../assets/photos/city-canal.jpg",
    blurb: "Five years, three flats, and the people who made a huge city feel small.",
    crews: [{
      name: "The Camden flat",
      note: "Everyone who passed through 14b",
      members: ["jo", "marcus", "danny"]
    }, {
      name: "The agency",
      note: "Late nights and worse coffee",
      members: ["sam", "elena"]
    }]
  }, {
    id: "edinburgh",
    title: "Edinburgh Masters",
    years: "2019 – 2020",
    cover: "../../assets/photos/highlands.jpg",
    blurb: "One year up north. Cold mornings, long walks, the crew that got you through it.",
    crews: [{
      name: "The masters crew",
      note: "Library, pub, repeat",
      members: ["priya", "nadia"]
    }, {
      name: "Marchmont flatmates",
      note: "Sunday roasts on Spottiswoode St",
      members: ["tom", "priya"]
    }]
  }, {
    id: "home",
    title: "Home & Family",
    years: "Always",
    cover: "../../assets/photos/memory-room.jpg",
    blurb: "The people who were there before any of it, and will be after.",
    crews: [{
      name: "The family",
      note: "Sunday calls and group chats",
      members: ["tom", "nadia"]
    }]
  }];

  // memory timeline for a person (Priya)
  const memories = {
    priya: [{
      date: "April 2026",
      kind: "note",
      text: "Long phone call about her moving back to Edinburgh. She sounded happy."
    }, {
      date: "Dec 2025",
      kind: "photo",
      photo: "../../assets/photos/coffee-notes.jpg",
      text: "Caught up over coffee when she was down in London for the week."
    }, {
      date: "Aug 2025",
      kind: "note",
      text: "Her birthday. Sent a card — she still has the one from 2019."
    }, {
      date: "Jun 2022",
      kind: "photo",
      photo: "../../assets/photos/gig.jpg",
      text: "That gig we drove three hours for and barely remember."
    }, {
      date: "Sep 2019",
      kind: "milestone",
      text: "Met in the second year, the day she moved into the room down the hall."
    }]
  };

  // "On your mind" — one hero (a timely reason) then a couple of quieter nudges.
  const onYourMind = [{
    id: "jo",
    reason: "Birthday in 4 days",
    hero: true,
    brief: "Five years of birthdays since the Camden flat. She sent that old photo last week — a card back would mean a lot."
  }, {
    id: "marcus",
    reason: "You last spoke in the spring"
  }, {
    id: "sam",
    reason: "Quietly drifting lately"
  }];
  return {
    people,
    chapters,
    memories,
    onYourMind
  };
}();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/loop-app/data.jsx", error: String((e && e.message) || e) }); }

// ui_kits/loop-app/ui.jsx
try { (() => {
// Loop UI kit — shared helpers (Lucide icon component, warm photo treatment)
(function () {
  function Ic({
    name,
    size = 18,
    stroke = 2,
    color,
    style
  }) {
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
    return /*#__PURE__*/React.createElement("span", {
      ref: ref,
      style: {
        display: "inline-flex",
        color,
        ...style
      }
    });
  }

  // Warm duotone so any photo harmonises with the parchment palette
  const photoFilter = "sepia(0.32) saturate(1.05) contrast(0.96) brightness(1.02) hue-rotate(-8deg)";
  function Photo({
    src,
    alt = "",
    style,
    overlay = true
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "relative",
        overflow: "hidden",
        ...style
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: src,
      alt: alt,
      style: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
        filter: photoFilter
      }
    }), overlay && /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        inset: 0,
        background: "linear-gradient(180deg, rgba(184,98,74,0.05) 0%, rgba(42,31,27,0.04) 55%, rgba(42,31,27,0.34) 100%)",
        mixBlendMode: "multiply"
      }
    }));
  }
  Object.assign(window, {
    Ic,
    Photo,
    photoFilter
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/loop-app/ui.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.PaperCard = __ds_scope.PaperCard;

__ds_ns.PersonRow = __ds_scope.PersonRow;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.SegmentedControl = __ds_scope.SegmentedControl;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Dropdown = __ds_scope.Dropdown;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Tooltip = __ds_scope.Tooltip;

})();
