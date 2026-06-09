import React from "react";

/**
 * A quiet word of explanation on hover or focus. A small warm-ink bubble
 * (never black) with paper text, for icon-only controls. Wraps its trigger.
 */
export interface TooltipProps {
  /** The short explanation shown in the bubble. */
  label: React.ReactNode;
  /** The trigger element the tooltip describes. */
  children: React.ReactNode;
  /** Which side of the trigger to appear on. Default "top". */
  side?: "top" | "bottom" | "left" | "right";
  /** Hover/focus delay before showing, in ms. Default 320. */
  delay?: number;
  style?: React.CSSProperties;
}

export function Tooltip(props: TooltipProps): JSX.Element;
