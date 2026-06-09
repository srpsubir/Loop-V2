import React from "react";

export type SegmentOption = string | { value: string; label: string };

/**
 * A small paper toggle between a few related views (2–4 options).
 * Selected segment rises on a soft pill; the track is a sunk well.
 * Use for view switches like Timeline / People inside a chapter.
 *
 * @startingPoint section="Forms" subtitle="Segmented view toggle on paper" viewport="700x140"
 */
export interface SegmentedControlProps {
  /** Options as plain strings, or { value, label } objects. */
  options: SegmentOption[];
  /** Currently selected value. */
  value: string;
  onChange?: (value: string) => void;
  style?: React.CSSProperties;
}

export function SegmentedControl(props: SegmentedControlProps): JSX.Element;
