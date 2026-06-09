import React from "react";

/**
 * A soft on/off toggle. Terracotta when on, paper well when off.
 * Use for quiet, low-stakes preferences. Optional inline label.
 */
export interface SwitchProps {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  /** Optional label rendered to the right of the track. */
  label?: string;
  style?: React.CSSProperties;
}

export function Switch(props: SwitchProps): JSX.Element;
