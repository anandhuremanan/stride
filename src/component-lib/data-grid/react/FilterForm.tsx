"use client";

import { useState, type FormEvent } from "react";
import { getFilterOperators } from "../core/filtering";
import type { ColumnFilter, FilterOperator, FilterValue, ResolvedColumn } from "../core/types";
import { useGridContext } from "./context";

interface FilterFormProps<T> {
  column: ResolvedColumn<T>;
  filter: ColumnFilter | undefined;
  onDone(): void;
}

const toInput = (value: FilterValue | undefined) =>
  value === null || value === undefined || typeof value === "object" ? "" : String(value);

export function FilterForm<T>({ column, filter, onDone }: FilterFormProps<T>) {
  const { engine, locale } = useGridContext<T>();
  const operators = getFilterOperators(column);
  const { options } = column.def;

  const [operator, setOperator] = useState<FilterOperator>(
    filter && operators.includes(filter.operator) ? filter.operator : operators[0],
  );
  const [value, setValue] = useState(() => toInput(filter?.value));
  const [value2, setValue2] = useState(() => toInput(filter?.value2));
  const [chosen, setChosen] = useState<ReadonlyArray<string | number>>(() =>
    filter && Array.isArray(filter.value) ? (filter.value as ReadonlyArray<string | number>) : [],
  );

  const needsValue = operator !== "isEmpty" && operator !== "isNotEmpty";
  const inputType = column.type === "number" ? "number" : column.type === "date" ? "date" : "text";
  const parse = (raw: string): FilterValue =>
    raw === "" ? null : column.type === "number" ? Number(raw) : raw;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    let next: Omit<ColumnFilter, "columnId"> | null;
    if (!needsValue) next = { operator };
    else if (operator === "in") next = chosen.length > 0 ? { operator, value: chosen } : null;
    else if (column.type === "boolean") next = { operator, value: value !== "false" };
    else if (operator === "between") {
      next = value || value2 ? { operator, value: parse(value), value2: parse(value2) } : null;
    } else next = value === "" ? null : { operator, value: parse(value) };

    engine.api.setFilter(column.id, next);
    onDone();
  };

  const clear = () => {
    engine.api.setFilter(column.id, null);
    onDone();
  };

  return (
    <form className="dg-filter-form" onSubmit={submit}>
      <div className="dg-menu-label">{locale.filter}</div>

      {operators.length > 1 && (
        <select
          className="dg-select"
          aria-label={locale.filterOperator}
          value={operator}
          onChange={(e) => setOperator(e.target.value as FilterOperator)}
        >
          {operators.map((op) => (
            <option key={op} value={op}>
              {locale.operators[op]}
            </option>
          ))}
        </select>
      )}

      {needsValue && operator === "in" && options && (
        <div className="dg-check-list" role="group" aria-label={locale.filterValue}>
          {options.map((option) => {
            const checked = chosen.includes(option.value);
            return (
              <label key={String(option.value)}>
                <input
                  type="checkbox"
                  className="dg-checkbox"
                  checked={checked}
                  onChange={() =>
                    setChosen(checked ? chosen.filter((v) => v !== option.value) : [...chosen, option.value])
                  }
                />
                {option.label}
              </label>
            );
          })}
        </div>
      )}

      {needsValue && column.type === "boolean" && (
        <select
          className="dg-select"
          aria-label={locale.filterValue}
          value={value === "false" ? "false" : "true"}
          onChange={(e) => setValue(e.target.value)}
        >
          <option value="true">{locale.yes}</option>
          <option value="false">{locale.no}</option>
        </select>
      )}

      {needsValue && operator !== "in" && column.type !== "boolean" && (
        <>
          <input
            className="dg-input"
            type={inputType}
            value={value}
            aria-label={operator === "between" ? locale.filterFrom : locale.filterValue}
            placeholder={operator === "between" ? locale.filterFrom : locale.filterValue}
            onChange={(e) => setValue(e.target.value)}
          />
          {operator === "between" && (
            <input
              className="dg-input"
              type={inputType}
              value={value2}
              aria-label={locale.filterTo}
              placeholder={locale.filterTo}
              onChange={(e) => setValue2(e.target.value)}
            />
          )}
        </>
      )}

      <div className="dg-form-actions">
        {filter && (
          <button type="button" className="dg-button" onClick={clear}>
            {locale.clearFilter}
          </button>
        )}
        <button type="submit" className="dg-button" data-variant="primary">
          {locale.applyFilter}
        </button>
      </div>
    </form>
  );
}
