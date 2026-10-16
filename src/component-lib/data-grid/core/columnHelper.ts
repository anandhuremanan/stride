import type { ColumnDef } from "./types";

type Base<T, V> = Omit<ColumnDef<T, V>, "id" | "field" | "accessor">;

/**
 * Typed column builders: `value` in `cell`, `format`, `validate` and friends is
 * inferred from the field or accessor.
 */
export function createColumnHelper<T>() {
  return {
    field<K extends Extract<keyof T, string>>(field: K, def: Base<T, T[K]> & { id?: string } = {}): ColumnDef<T> {
      return { ...def, field } as unknown as ColumnDef<T>;
    },
    accessor<V>(id: string, accessor: (row: T) => V, def: Base<T, V> = {}): ColumnDef<T> {
      return { ...def, id, accessor } as unknown as ColumnDef<T>;
    },
    display(id: string, def: Base<T, undefined>): ColumnDef<T> {
      return { ...def, id } as unknown as ColumnDef<T>;
    },
  };
}
