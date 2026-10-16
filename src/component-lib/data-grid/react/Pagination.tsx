"use client";

import type { KeyboardEvent, FocusEvent } from "react";
import type { PageResult } from "../core/rows";
import { cx, useGridContext } from "./context";
import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from "./icons";

interface PaginationProps<T> {
  page: PageResult<T>;
  pageSize: number;
  pageSizeOptions: number[];
}

export function Pagination<T>({ page, pageSize, pageSizeOptions }: PaginationProps<T>) {
  const { engine, locale, classNames, numberFormat } = useGridContext<T>();
  const { api } = engine;
  const { pageIndex, pageCount, rowCount, pageOffset } = page;
  const format = (n: number) => numberFormat.format(n);

  const from = rowCount === 0 ? 0 : pageOffset + 1;
  const to = Math.min(rowCount, pageOffset + page.rows.length);
  const sizes = pageSizeOptions.includes(pageSize)
    ? pageSizeOptions
    : [...pageSizeOptions, pageSize].sort((a, b) => a - b);

  const goToInput = (input: HTMLInputElement) => {
    const target = Math.min(pageCount, Math.max(1, Math.round(Number(input.value)) || 1));
    input.value = String(target);
    api.setPageIndex(target - 1);
  };

  return (
    <nav className={cx("dg-pagination", classNames.pagination)} aria-label={locale.pagination}>
      <label className="dg-page-size">
        <span>{locale.rowsPerPage}</span>
        <select className="dg-select" value={pageSize} onChange={(e) => api.setPageSize(Number(e.target.value))}>
          {sizes.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>

      <span className="dg-page-range" aria-live="polite">
        {locale.pageRange(format(from), format(to), format(rowCount))}
      </span>

      <div className="dg-page-controls">
        <button
          type="button"
          className="dg-icon-button"
          aria-label={locale.firstPage}
          disabled={pageIndex === 0}
          onClick={() => api.setPageIndex(0)}
        >
          <ChevronsLeftIcon className="dg-flip-rtl" />
        </button>
        <button
          type="button"
          className="dg-icon-button"
          aria-label={locale.previousPage}
          disabled={pageIndex === 0}
          onClick={() => api.setPageIndex(pageIndex - 1)}
        >
          <ChevronLeftIcon className="dg-flip-rtl" />
        </button>

        <label className="dg-page-input">
          <span className="dg-sr-only">{locale.page}</span>
          <input
            key={pageIndex}
            className="dg-input"
            type="number"
            min={1}
            max={pageCount}
            defaultValue={pageIndex + 1}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter") goToInput(e.currentTarget);
            }}
            onBlur={(e: FocusEvent<HTMLInputElement>) => goToInput(e.currentTarget)}
          />
        </label>
        <span className="dg-page-count">{locale.pageOf(format(pageCount))}</span>

        <button
          type="button"
          className="dg-icon-button"
          aria-label={locale.nextPage}
          disabled={pageIndex >= pageCount - 1}
          onClick={() => api.setPageIndex(pageIndex + 1)}
        >
          <ChevronRightIcon className="dg-flip-rtl" />
        </button>
        <button
          type="button"
          className="dg-icon-button"
          aria-label={locale.lastPage}
          disabled={pageIndex >= pageCount - 1}
          onClick={() => api.setPageIndex(pageCount - 1)}
        >
          <ChevronsRightIcon className="dg-flip-rtl" />
        </button>
      </div>
    </nav>
  );
}
