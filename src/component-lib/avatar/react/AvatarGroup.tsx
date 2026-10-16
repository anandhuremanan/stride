"use client";

import { Children, useMemo, type CSSProperties, type ReactNode, type Ref } from "react";
import { splitGroup } from "../core/identity";
import type { AvatarLocaleText, AvatarShape, AvatarSize } from "../core/types";
import { defaultAvatarText } from "./locale";
import { cx, type AvatarGroupSlot } from "./props";

export interface AvatarGroupProps {
  children: ReactNode;
  /** How many slots there are, the overflow bubble included. Default 4. */
  max?: number;
  /** Applied to the group; each Avatar keeps its own if it sets one. */
  size?: AvatarSize;
  shape?: AvatarShape;
  /** Names the set, e.g. "Assigned to". A list of faces with no name says nothing. */
  label?: string;
  className?: string;
  classNames?: Partial<Record<AvatarGroupSlot, string>>;
  style?: CSSProperties;
  localeText?: Partial<AvatarLocaleText>;
  ref?: Ref<HTMLDivElement>;
}

/**
 * Overlapping avatars with a "+3" at the end.
 *
 * The overflow bubble takes one of the `max` slots, so five people with
 * `max={4}` show three faces and a "+2" — the alternative, four faces and a
 * "+2", is five slots wide and quietly breaks a layout built for four.
 */
export function AvatarGroup(props: AvatarGroupProps) {
  const {
    ref,
    children,
    max = 4,
    size,
    shape,
    label,
    className,
    classNames,
    style,
    localeText,
  } = props;

  const text = useMemo(() => ({ ...defaultAvatarText, ...localeText }), [localeText]);
  const items = Children.toArray(children);
  const { shown, overflow } = splitGroup(items, max);

  return (
    <div
      ref={ref}
      className={cx("av-group", classNames?.root, className)}
      style={style}
      data-size={size}
      data-shape={shape}
      role="group"
      aria-label={label}
    >
      {shown}
      {overflow > 0 && (
        <span
          className={cx("av-overflow", classNames?.overflow)}
          data-size={size}
          data-shape={shape}
          role="img"
          aria-label={text.more(overflow)}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
