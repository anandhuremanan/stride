"use client";

import type { CSSProperties, Ref } from "react";
import { lineWidths, toLength } from "../core/lines";
import type { SkeletonAnimation, SkeletonSlot, SkeletonVariant } from "../core/types";
import { cx } from "./props";

export interface SkeletonProps {
  /** Default `text`. */
  variant?: SkeletonVariant;
  /** Number of bars, for `text`. Default 1. */
  lines?: number;
  /** Width of the last line as a percentage, for `text`. Default 60. */
  lastLineWidth?: number;
  /** A number is pixels; a string is used as given. */
  width?: number | string;
  /**
   * A number is pixels; a string is used as given. Left out, each variant
   * uses its own height, which is what keeps a skeleton the size of the
   * thing it stands in for.
   */
  height?: number | string;
  /** Corner radius for `rect`. */
  radius?: number | string;
  /** Default `pulse`. Reduced-motion settings turn any of them off. */
  animation?: SkeletonAnimation;
  /**
   * Announced while the placeholder is up. Leave it out inside a region that
   * already says it is busy — two announcements are worse than one.
   */
  label?: string;
  className?: string;
  classNames?: Partial<Record<SkeletonSlot, string>>;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
}

/**
 * A placeholder in the shape of the content that is loading.
 *
 * It is hidden from assistive technology: a screen reader gains nothing from
 * being told the shape of a grey box. Use `label`, or say the region is busy
 * where it makes more sense, so the wait is announced once.
 */
export function Skeleton(props: SkeletonProps) {
  const {
    ref,
    variant = "text",
    lines = 1,
    lastLineWidth = 60,
    width,
    height,
    radius,
    animation = "pulse",
    label,
    className,
    classNames,
    style,
  } = props;

  const shared = {
    className: cx("sk-root", classNames?.root, className),
    "data-variant": variant,
    "data-animation": animation,
    style: {
      ...style,
      "--sk-width": toLength(width),
      "--sk-height": toLength(height),
      "--sk-radius": toLength(radius),
    } as CSSProperties,
  };

  // One shape for every variant: bars hidden from assistive technology, and an
  // optional spoken label beside them. A conditional `aria-hidden` on the root
  // would swallow that label in some variants and not others.
  const widths = variant === "text" ? lineWidths(lines, lastLineWidth) : ["100%"];

  return (
    <div ref={ref} {...shared} data-lines={variant === "text" ? lines : undefined}>
      {widths.map((lineWidth, index) => (
        <div
          // The bars are decoration with no identity of their own, so their
          // position is the only key there is.
          key={index}
          className={cx("sk-line", classNames?.line)}
          style={{ width: lineWidth }}
          aria-hidden="true"
        />
      ))}
      {label && (
        <span className="sk-sr-only" role="status">
          {label}
        </span>
      )}
    </div>
  );
}
