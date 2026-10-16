"use client";

import {
  useMemo,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { colorIndex, initials as toInitials } from "../core/identity";
import type { AvatarLocaleText, AvatarShape, AvatarSize, AvatarStatus } from "../core/types";
import { defaultAvatarText } from "./locale";
import { cx, type AvatarSlot } from "./props";

/** Hues spread around the wheel; the fill and text are mixed from one of these. */
const PALETTE = 8;

export interface AvatarProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /**
   * The person or thing. Used for the alternative text, for the initials and
   * for the colour, so the same person is always the same colour.
   */
  name?: string;
  /**
   * The image. If it fails to load, the avatar falls back to the initials
   * rather than showing a broken image, so `name` is worth setting too.
   */
  src?: string;
  /** Overrides the text derived from `name`. */
  initials?: string;
  /** An icon or anything else to show instead of initials. */
  children?: ReactNode;
  /** Default `md` (32px). */
  size?: AvatarSize;
  /** Default `circle`. */
  shape?: AvatarShape;
  /** A presence dot in the corner. */
  status?: AvatarStatus;
  /** Marks the avatar as decoration, for a name printed next to it. */
  decorative?: boolean;
  className?: string;
  classNames?: Partial<Record<AvatarSlot, string>>;
  style?: CSSProperties;
  localeText?: Partial<AvatarLocaleText>;
  ref?: Ref<HTMLSpanElement>;
}

/**
 * A person in a small square or circle: their picture, or the letters of their
 * name on a colour derived from it.
 *
 * An image that fails to load falls back to the initials rather than leaving a
 * broken frame — which happens more than it should with avatar URLs that have
 * expired or come from a third party.
 */
export function Avatar(props: AvatarProps) {
  const {
    ref,
    name = "",
    src,
    initials: initialsProp,
    children,
    size = "md",
    shape = "circle",
    status,
    decorative = false,
    className,
    classNames,
    style,
    localeText,
    ...rest
  } = props;

  const text = useMemo(() => ({ ...defaultAvatarText, ...localeText }), [localeText]);
  const [failed, setFailed] = useState(false);
  const letters = initialsProp ?? toInitials(name);
  const showImage = Boolean(src) && !failed;

  return (
    <span
      {...rest}
      ref={ref}
      className={cx("av-root", classNames?.root, className)}
      style={{ ...style, "--av-hue-index": colorIndex(name || letters, PALETTE) } as CSSProperties}
      data-size={size}
      data-shape={shape}
      data-status={status}
      // Decoration when the name is printed beside it; otherwise the name is
      // the alternative text, and there is no point repeating it.
      role={decorative ? "presentation" : "img"}
      aria-label={decorative ? undefined : name || undefined}
      aria-hidden={decorative && !name ? "true" : undefined}
    >
      {showImage ? (
        <img
          className={cx("av-image", classNames?.image)}
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className={cx("av-fallback", classNames?.fallback)} aria-hidden="true">
          {children ?? letters}
        </span>
      )}

      {status && (
        <span
          className={cx("av-status", classNames?.status)}
          data-status={status}
          // The dot is a fact about the person, so it is named rather than
          // hidden — colour on its own tells a colour-blind user nothing.
          role="img"
          aria-label={text.status[status]}
        />
      )}
    </span>
  );
}
