import React from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

/**
 * A warm, low-chrome action button. Pill-shaped, no hard borders.
 * Use `primary` (terracotta) for the single most important action on a view;
 * `secondary` for supporting actions; `ghost` for tertiary / inline actions.
 *
 * @startingPoint section="Buttons" subtitle="Pill action button — primary, secondary, ghost" viewport="700x160"
 */
export interface ButtonProps {
  /** Visual emphasis. Default "primary". */
  variant?: ButtonVariant;
  /** Control height. Default "md". */
  size?: ButtonSize;
  /** Optional element (icon) rendered before the label. */
  iconLeft?: React.ReactNode;
  /** Optional element (icon) rendered after the label. */
  iconRight?: React.ReactNode;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export function Button(props: ButtonProps): JSX.Element;
