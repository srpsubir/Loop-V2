import React from "react";

/**
 * A text field sunk gently into the paper — an inset well, no hard box outline.
 * Warm terracotta focus ring. Use for search, names, notes, and short entry.
 */
export interface InputProps {
  /** Optional field label rendered above the well. */
  label?: string;
  /** Optional leading icon (e.g. a Lucide SVG). */
  icon?: React.ReactNode;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  id?: string;
  style?: React.CSSProperties;
}

export function Input(props: InputProps): JSX.Element;
