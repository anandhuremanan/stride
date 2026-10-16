/** The side of the anchor a popover is placed on. */
export type Side = "top" | "bottom" | "left" | "right";

/**
 * Which edge of the anchor the popover lines up with, in reading order, or
 * `center` to share its midpoint.
 */
export type Align = "start" | "center" | "end";

export interface Size {
  width: number;
  height: number;
}

export interface AnchorRect extends Size {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PlacementOptions {
  /** The side to try first. */
  side: Side;
  align: Align;
  /** Distance between the anchor and the popover. */
  gap: number;
  /** Space kept between the popover and the edge of the viewport. */
  edge: number;
  /** Mirrors `left`/`right` and swaps which edge `align` means. */
  rtl: boolean;
  /**
   * The content scrolls, so the popover may be capped to the space available
   * and should prefer whichever side has more of it. Fixed-size panels leave
   * this off and only move when they fully fit on the other side.
   */
  fitHeight: boolean;
  /** Floor for the cap, so a cramped viewport still shows something. */
  minHeight: number;
}

export interface Placement {
  left: number;
  top: number;
  /** Where it actually ended up, which is not the requested side after a flip. */
  side: Side;
  /** Only when `fitHeight` asked for one. */
  maxHeight?: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

/**
 * Where to put a popover: on the requested side of its anchor, moved to the
 * opposite side when there is no room, and kept inside the viewport.
 *
 * Pure arithmetic, so the rules can be tested without a browser. The caller
 * measures, this decides, the caller writes the styles.
 */
export function placePopover(
  anchor: AnchorRect,
  size: Size,
  viewport: Size,
  options: PlacementOptions,
): Placement {
  const { side, align, gap, edge, rtl, fitHeight, minHeight } = options;
  const alignEnd = (align === "end") !== rtl;

  /** The cross-axis offset: centred, or against one edge of the anchor. */
  const across = (start: number, length: number, extent: number) =>
    align === "center"
      ? start + (length - extent) / 2
      : alignEnd
        ? start + length - extent
        : start;

  if (side === "top" || side === "bottom") {
    const roomBelow = viewport.height - anchor.bottom - gap - edge;
    const roomAbove = anchor.top - gap - edge;
    const prefersBelow = side === "bottom";
    const roomPreferred = prefersBelow ? roomBelow : roomAbove;
    const roomOther = prefersBelow ? roomAbove : roomBelow;

    const flip =
      size.height > roomPreferred &&
      (fitHeight ? roomOther > roomPreferred : size.height <= roomOther);
    const below = prefersBelow !== flip;

    return {
      side: below ? "bottom" : "top",
      left: clamp(
        across(anchor.left, anchor.width, size.width),
        edge,
        viewport.width - size.width - edge,
      ),
      top: Math.max(edge, below ? anchor.bottom + gap : anchor.top - gap - size.height),
      maxHeight: fitHeight
        ? Math.max(minHeight, below ? roomBelow : roomAbove)
        : undefined,
    };
  }

  const roomRight = viewport.width - anchor.right - gap - edge;
  const roomLeft = anchor.left - gap - edge;
  const prefersRight = (side === "right") !== rtl;
  const roomPreferred = prefersRight ? roomRight : roomLeft;
  const roomOther = prefersRight ? roomLeft : roomRight;

  // Sideways there is nothing to scroll, so it only moves when it fully fits.
  const flip = size.width > roomPreferred && size.width <= roomOther;
  const right = prefersRight !== flip;

  return {
    side: right ? "right" : "left",
    left: Math.max(edge, right ? anchor.right + gap : anchor.left - gap - size.width),
    top: clamp(
      across(anchor.top, anchor.height, size.height),
      edge,
      viewport.height - size.height - edge,
    ),
    maxHeight: fitHeight ? Math.max(minHeight, viewport.height - 2 * edge) : undefined,
  };
}
