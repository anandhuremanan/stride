"use client";

import { useCallback, useState } from "react";

/**
 * One value that may be controlled by the caller or owned by the component.
 *
 * Pass the `value` prop (or `undefined`) and the `defaultValue`. The returned
 * setter writes internal state only while the component is uncontrolled, so a
 * controlled caller stays the single source of truth and the component never
 * renders a value its parent did not hand it.
 *
 * Change callbacks stay with the component: they differ too much between
 * controls — some pass a DOM event, some skip a no-op change — and hiding them
 * here would only move the difference somewhere less obvious.
 *
 * ```ts
 * const [value, setValue] = useControllableState(valueProp, defaultValue ?? "");
 *
 * const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
 *   setValue(event.target.value);
 *   onChange?.(event);
 * };
 * ```
 */
export function useControllableState<T>(
  controlled: T | undefined,
  defaultValue: T | (() => T),
): readonly [T, (next: T) => void, boolean] {
  const [internal, setInternal] = useState(defaultValue);
  const isControlled = controlled !== undefined;
  const value = isControlled ? controlled : internal;

  const setValue = useCallback(
    (next: T) => {
      if (!isControlled) setInternal(next);
    },
    [isControlled],
  );

  return [value, setValue, isControlled] as const;
}
