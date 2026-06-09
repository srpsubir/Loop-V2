import React from "react";

/**
 * A small slip of paper that rises from the bottom to confirm something
 * quietly. Warm shadow, soft sage dot for a positive note. Auto-dismisses.
 * It reassures; it never alarms — no red error styling.
 */
export interface ToastProps {
  /** Controls visibility. */
  open?: boolean;
  /** Called on auto-dismiss (after `duration`). */
  onClose?: () => void;
  /** The reassuring line, sentence case. */
  message?: React.ReactNode;
  /** Optional leading glyph; defaults to a small tone-coloured dot. */
  icon?: React.ReactNode;
  /** "neutral" (terracotta dot) or "positive" (sage dot). */
  tone?: "neutral" | "positive";
  /** Optional trailing action, e.g. { label: "Undo", onClick }. */
  action?: { label: string; onClick: () => void };
  /** Auto-dismiss delay in ms. Pass 0 to disable. Default 3200. */
  duration?: number;
  /** Anchor to a relative parent instead of the viewport (for device frames). */
  inline?: boolean;
  style?: React.CSSProperties;
}

export function Toast(props: ToastProps): JSX.Element | null;
