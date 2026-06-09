import React from "react";

export type AvatarRing = "none" | "sage" | "terracotta";

/**
 * A round portrait. Falls back to warm initials on a name-tinted disc when no
 * photo is supplied. Optional soft ring marks a person as "still close" (sage)
 * or highlighted (terracotta).
 */
export interface AvatarProps {
  /** Photo URL. Omit to render initials. */
  src?: string;
  /** Full name — drives initials and the fallback tint. */
  name?: string;
  /** Diameter in px. Default 44. */
  size?: number;
  ring?: AvatarRing;
  style?: React.CSSProperties;
}

export function Avatar(props: AvatarProps): JSX.Element;
