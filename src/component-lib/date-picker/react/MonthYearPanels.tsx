"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { moveInGrid } from "../core/calendar";

const COLUMNS = 3;

/**
 * Roving focus for the month and year grids: arrows move, Home/End jump. The
 * container ref belongs to the component, so nothing reads a ref while rendering.
 */
function usePanelFocus(
  containerRef: RefObject<HTMLDivElement | null>,
  count: number,
  initialIndex: number,
) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    const container = containerRef.current;
    if (!container?.contains(document.activeElement)) return;
    const button = container.querySelectorAll<HTMLButtonElement>("button")[index];
    button?.focus({ preventScroll: true });
  }, [containerRef, index]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const next = moveInGrid(index, event.key, COLUMNS, count, rtl);
    if (next === null) return;
    event.preventDefault();
    event.stopPropagation();
    setIndex(next);
  };

  return { index, setIndex, onKeyDown };
}

interface MonthPanelProps {
  labels: string[];
  current: number;
  label: string;
  isMonthDisabled(month: number): boolean;
  onSelect(month: number): void;
}

export function MonthPanel({
  labels,
  current,
  label,
  isMonthDisabled,
  onSelect,
}: MonthPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { index, setIndex, onKeyDown } = usePanelFocus(containerRef, labels.length, current);

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label={label}
      className="dp-panel"
      onKeyDown={onKeyDown}
    >
      {labels.map((monthLabel, month) => (
        <button
          key={monthLabel}
          type="button"
          className="dp-panel-item"
          data-selected={month === current || undefined}
          data-autofocus={month === current || undefined}
          tabIndex={month === index ? 0 : -1}
          disabled={isMonthDisabled(month)}
          aria-pressed={month === current}
          onClick={() => onSelect(month)}
          onFocus={() => setIndex(month)}
        >
          {monthLabel}
        </button>
      ))}
    </div>
  );
}

interface YearPanelProps {
  years: number[];
  current: number;
  label: string;
  isYearDisabled(year: number): boolean;
  onSelect(year: number): void;
}

export function YearPanel({ years, current, label, isYearDisabled, onSelect }: YearPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedIndex = Math.max(0, years.indexOf(current));
  const { index, setIndex, onKeyDown } = usePanelFocus(containerRef, years.length, selectedIndex);

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label={label}
      className="dp-panel"
      onKeyDown={onKeyDown}
    >
      {years.map((year, position) => (
        <button
          key={year}
          type="button"
          className="dp-panel-item"
          data-selected={year === current || undefined}
          data-autofocus={year === current || undefined}
          tabIndex={position === index ? 0 : -1}
          disabled={isYearDisabled(year)}
          aria-pressed={year === current}
          onClick={() => onSelect(year)}
          onFocus={() => setIndex(position)}
        >
          {year}
        </button>
      ))}
    </div>
  );
}
