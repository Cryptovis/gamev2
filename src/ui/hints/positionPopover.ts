/**
 * Pure popover placement. No DOM access: callers pass measured rectangles in,
 * so the flip and clamp rules can be unit-tested without mocks.
 */
export interface Size { width: number; height: number }
export type AnchorRect = Pick<DOMRectReadOnly, 'top' | 'bottom' | 'left' | 'right'>;
export interface PopoverPlacement { top: number; left: number; placement: 'below' | 'above' }

/** Gap in px between the anchor and the popover. */
export const ANCHOR_GAP = 6;

const clamp = (value: number, min: number, max: number) => (max < min ? min : Math.min(Math.max(value, min), max));

/**
 * Places the popover below the anchor with its right edge aligned to the anchor's
 * right edge (so it opens "below and to the left" of a top-right beacon). Flips
 * above when it does not fit below, then clamps inside the viewport by `margin`.
 */
export function positionPopover(anchor: AnchorRect, popover: Size, viewport: Size, margin = 8): PopoverPlacement {
  const spaceBelow = viewport.height - margin - (anchor.bottom + ANCHOR_GAP);
  const spaceAbove = anchor.top - ANCHOR_GAP - margin;
  const placement: 'below' | 'above' =
    popover.height <= spaceBelow ? 'below' : popover.height <= spaceAbove ? 'above' : spaceBelow >= spaceAbove ? 'below' : 'above';
  const rawTop = placement === 'below' ? anchor.bottom + ANCHOR_GAP : anchor.top - ANCHOR_GAP - popover.height;
  const top = clamp(rawTop, margin, viewport.height - margin - popover.height);
  const left = clamp(anchor.right - popover.width, margin, viewport.width - margin - popover.width);
  return { top, left, placement };
}
