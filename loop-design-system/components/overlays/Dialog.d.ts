import React from "react";

/**
 * A sheet of paper that floats above the app for a single deliberate decision.
 * Warm ink scrim (never hard black). Serif title, sans body, footer actions.
 * Closes on Escape or scrim click. Render your action Buttons into `footer`.
 *
 * @startingPoint section="Overlays" subtitle="Modal paper sheet with warm scrim" viewport="720x460"
 */
export interface DialogProps {
  /** Controls visibility. */
  open?: boolean;
  /** Called on Escape, scrim click, or your own close buttons. */
  onClose?: () => void;
  /** Serif heading. */
  title?: React.ReactNode;
  /** Supporting sans line under the title. */
  description?: React.ReactNode;
  /** Body content between description and footer. */
  children?: React.ReactNode;
  /** Right-aligned action row — usually Buttons. */
  footer?: React.ReactNode;
  /** Optional glyph in a terracotta-faint disc above the title. */
  icon?: React.ReactNode;
  /** Max width in px. Default 440. */
  width?: number;
  /** Dismiss when the scrim is clicked. Default true. */
  closeOnScrim?: boolean;
  /** Scope the scrim to the nearest positioned ancestor (e.g. a device frame). */
  inline?: boolean;
  style?: React.CSSProperties;
}

export function Dialog(props: DialogProps): JSX.Element | null;
