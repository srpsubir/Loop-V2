import React from "react";

export type PersonRowRing = "none" | "sage" | "terracotta";

/**
 * The signature unit of Loop — a person rendered like a line in a photo album:
 * portrait, serif name, and a soft human line of metadata. No status dots,
 * no table cells. Composes Avatar.
 *
 * @startingPoint section="People" subtitle="Album-style person row with serif name" viewport="700x120"
 */
export interface PersonRowProps {
  name: string;
  /** Photo URL; falls back to initials. */
  src?: string;
  /** Plain metadata line (shown if `note` absent). */
  meta?: string;
  /** A warmer, human note — takes precedence over `meta`. */
  note?: string;
  ring?: PersonRowRing;
  /** Optional trailing element (e.g. an IconButton or Tag). */
  trailing?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  style?: React.CSSProperties;
}

export function PersonRow(props: PersonRowProps): JSX.Element;
