import React from "react";

/**
 * The fundamental container — a sheet of warm paper lifted by a soft shadow,
 * never a bordered box. Set `interactive` to raise it on hover.
 *
 * @startingPoint section="Surfaces" subtitle="Borderless paper card with warm shadow" viewport="700x240"
 */
export interface PaperCardProps {
  children?: React.ReactNode;
  /** Use the surface tint instead of background paper. */
  raised?: boolean;
  /** Lift on hover + pointer cursor. */
  interactive?: boolean;
  /** Inner padding in px. Default 20. */
  padding?: number;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  style?: React.CSSProperties;
}

export function PaperCard(props: PaperCardProps): JSX.Element;
