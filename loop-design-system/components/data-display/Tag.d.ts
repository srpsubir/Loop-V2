import React from "react";

export type TagTone = "neutral" | "chapter" | "people" | "positive";

/**
 * A soft, low-contrast label for chapters, places and quiet status.
 * Tinted paper, no border, never a loud status dot.
 */
export interface TagProps {
  children?: React.ReactNode;
  /** Color tone. Default "neutral". */
  tone?: TagTone;
  /** Optional small leading icon. */
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}

export function Tag(props: TagProps): JSX.Element;
