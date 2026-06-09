import React from "react";

export type IconButtonSize = "sm" | "md" | "lg";
export type IconButtonVariant = "ghost" | "soft" | "primary";

/**
 * A soft circular button holding a single icon. Use for toolbar actions,
 * close/add affordances, and anywhere a labelled button would be too heavy.
 * Always pass `label` for accessibility (also used as the tooltip).
 */
export interface IconButtonProps {
  /** The icon element (e.g. a Lucide SVG). */
  icon: React.ReactNode;
  size?: IconButtonSize;
  /** "ghost" (default), "soft" (paper well), or "primary" (terracotta). */
  variant?: IconButtonVariant;
  disabled?: boolean;
  /** Accessible name + tooltip text. */
  label?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: React.CSSProperties;
}

export function IconButton(props: IconButtonProps): JSX.Element;
