import {useEffect, useLayoutEffect, useRef, type RefObject} from 'react';

/**
 * Parent windows stay mounted but are hidden (display:none) while a child window is open, which
 * drops the scroll offset of every scrolling area inside them. Remember the last offsets the
 * player scrolled to and put them back before the returning window is painted.
 */
export function useScrollMemory(ref: RefObject<HTMLElement | null>, visible: boolean) {
  const offsets = useRef(new Map<Element, [number, number]>());
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const remember = (event: Event) => {
      const target = event.target;
      // Ignore offsets reported while the window is hidden; they are not the player's position.
      if (!(target instanceof Element) || !root.contains(target) || !root.getClientRects().length) return;
      offsets.current.set(target, [target.scrollTop, target.scrollLeft]);
    };
    root.addEventListener('scroll', remember, {capture: true, passive: true});
    return () => root.removeEventListener('scroll', remember, {capture: true});
  }, [ref]);
  useLayoutEffect(() => {
    if (!visible) return;
    for (const [node, [top, left]] of offsets.current) {
      if (!node.isConnected) { offsets.current.delete(node); continue; }
      if (node.scrollTop !== top) node.scrollTop = top;
      if (node.scrollLeft !== left) node.scrollLeft = left;
    }
  }, [visible]);
}

