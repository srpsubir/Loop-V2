import React from "react";

/**
 * A small menu of actions on a sheet of paper, opened from a trigger. Items
 * wash to the surface tint on hover; a chosen item shows a terracotta check.
 * Works uncontrolled (built-in open state) or controlled via `open`.
 *
 * @startingPoint section="Overlays" subtitle="Paper action menu / select popover" viewport="520x360"
 */
export interface DropdownItem {
  /** Row text. Omit and set `divider` or `header` for non-action rows. */
  label?: React.ReactNode;
  /** Leading glyph (muted, or terracotta when tone is accent). */
  icon?: React.ReactNode;
  onClick?: () => void;
  /** Show a terracotta check on the right (use for select-style menus). */
  selected?: boolean;
  /** Override the check glyph. */
  checkIcon?: React.ReactNode;
  /** Trailing hint text (e.g. a shortcut). */
  trailing?: React.ReactNode;
  /** "accent" tints the row terracotta (e.g. a remove action). */
  tone?: "default" | "accent";
  disabled?: boolean;
  /** Render a hairline divider instead of an item. */
  divider?: boolean;
  /** Render an uppercase section header instead of an item. */
  header?: string;
}

export interface DropdownProps {
  /** The element that opens the menu when clicked. */
  trigger: React.ReactNode;
  items: DropdownItem[];
  /** Align the menu's left or right edge to the trigger. Default "start". */
  align?: "start" | "end";
  /** Menu width in px. Default 220. */
  width?: number;
  /** Controlled open state (omit for built-in state). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  style?: React.CSSProperties;
}

export function Dropdown(props: DropdownProps): JSX.Element;
