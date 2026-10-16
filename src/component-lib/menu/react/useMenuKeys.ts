"use client";

import { useCallback, useRef, type KeyboardEvent, type RefObject } from "react";
import {
  edgeIndex,
  isTypeaheadKey,
  nextIndex,
  typeaheadBuffer,
  typeaheadIndex,
} from "../core/navigation";

/** Every item the keyboard can reach, in the order they appear. */
const ITEM_SELECTOR = '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]';

export interface MenuKeysOptions {
  listRef: RefObject<HTMLElement | null>;
  /** Escape, or ArrowLeft inside a submenu. */
  onDismiss(): void;
  /** True inside a submenu, where ArrowLeft goes back to the parent. */
  nested: boolean;
  rtl?: boolean;
}

/**
 * Keyboard behaviour for the WAI-ARIA menu pattern: arrows with wrap-around,
 * Home and End, and typeahead.
 *
 * Items are read from the DOM rather than registered through context. A menu is
 * a flat list of elements that are already in the document in the right order,
 * so asking the DOM is both simpler and impossible to get out of step with what
 * is on screen.
 */
export function useMenuKeys({ listRef, onDismiss, nested, rtl = false }: MenuKeysOptions) {
  const typeahead = useRef({ buffer: "", at: 0 });

  const items = useCallback(
    () => Array.from(listRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? []),
    [listRef],
  );

  const focusAt = useCallback(
    (elements: HTMLElement[], index: number) => {
      if (index < 0) return;
      elements[index]?.focus();
    },
    [],
  );

  /** Focus the first item; used when the menu opens from the keyboard. */
  const focusFirst = useCallback(() => {
    const elements = items();
    focusAt(elements, edgeIndex(describe(elements), "first"));
  }, [items, focusAt]);

  const focusLast = useCallback(() => {
    const elements = items();
    focusAt(elements, edgeIndex(describe(elements), "last"));
  }, [items, focusAt]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const elements = items();
      if (elements.length === 0) return;
      const described = describe(elements);
      const current = elements.indexOf(document.activeElement as HTMLElement);

      const back = rtl ? "ArrowRight" : "ArrowLeft";

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          focusAt(elements, nextIndex(described, current, 1));
          return;
        case "ArrowUp":
          event.preventDefault();
          focusAt(elements, nextIndex(described, current, -1));
          return;
        case "Home":
          event.preventDefault();
          focusAt(elements, edgeIndex(described, "first"));
          return;
        case "End":
          event.preventDefault();
          focusAt(elements, edgeIndex(described, "last"));
          return;
        case "Escape":
          event.preventDefault();
          event.stopPropagation();
          onDismiss();
          return;
        case back:
          if (!nested) return;
          event.preventDefault();
          event.stopPropagation();
          onDismiss();
          return;
        case "Tab":
          // Tab leaves the menu entirely, as the pattern requires.
          onDismiss();
          return;
        default:
          break;
      }

      if (!isTypeaheadKey(event.key, event.ctrlKey || event.metaKey || event.altKey)) return;
      event.preventDefault();
      const now = Date.now();
      const buffer = typeaheadBuffer(typeahead.current.buffer, event.key, now - typeahead.current.at);
      typeahead.current = { buffer, at: now };
      focusAt(elements, typeaheadIndex(described, buffer, current));
    },
    [items, focusAt, onDismiss, nested, rtl],
  );

  return { onKeyDown, focusFirst, focusLast };
}

/** The bits of each element the navigation rules care about. */
function describe(elements: HTMLElement[]) {
  return elements.map((element) => ({
    disabled: element.getAttribute("aria-disabled") === "true",
    text: element.textContent ?? "",
  }));
}
