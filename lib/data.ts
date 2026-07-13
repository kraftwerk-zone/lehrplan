import { supabase } from "./supabase"
import type { Database, Tables, TablesInsert, TablesUpdate } from "./database.types"

export type TableName = keyof Database["public"]["Tables"]

type QueryResult<T> = { data: T | null; error: string | null }

function toErrorMessage(error: { message: string } | null): string | null {
  return error?.message ?? null
}

/** Lädt alle Zeilen einer Tabelle. Optional mit Filter-Spalte. */
export async function fetchRows<T extends TableName>(
  table: T,
  options?: { column?: keyof Tables<T> & string; value?: string },
): Promise<QueryResult<Tables<T>[]>> {
  let query = supabase.from(table).select("*")

  if (options?.column && options.value !== undefined) {
    query = query.eq(options.column as never, options.value as never)
  }

  const { data, error } = await query
  return { data: (data as Tables<T>[] | null) ?? null, error: toErrorMessage(error) }
}

/** Lädt eine einzelne Zeile anhand der ID. */
export async function fetchRowById<T extends TableName>(
  table: T,
  id: string,
): Promise<QueryResult<Tables<T>>> {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("id" as never, id as never)
    .maybeSingle()

  return { data: (data as Tables<T> | null) ?? null, error: toErrorMessage(error) }
}

/** Fügt eine oder mehrere Zeilen ein. */
export async function insertRows<T extends TableName>(
  table: T,
  rows: TablesInsert<T> | TablesInsert<T>[],
): Promise<QueryResult<Tables<T>[]>> {
  const { data, error } = await supabase
    .from(table)
    .insert(rows as never)
    .select()

  return { data: (data as Tables<T>[] | null) ?? null, error: toErrorMessage(error) }
}

/** Aktualisiert Zeilen anhand eines Filters. */
export async function updateRows<T extends TableName>(
  table: T,
  filter: { column: keyof Tables<T> & string; value: string },
  patch: TablesUpdate<T>,
): Promise<QueryResult<Tables<T>[]>> {
  const { data, error } = await supabase
    .from(table)
    .update(patch as never)
    .eq(filter.column as never, filter.value as never)
    .select()

  return { data: (data as Tables<T>[] | null) ?? null, error: toErrorMessage(error) }
}

/** Löscht Zeilen anhand eines Filters. */
export async function deleteRows<T extends TableName>(
  table: T,
  filter: { column: keyof Tables<T> & string; value: string },
): Promise<QueryResult<null>> {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq(filter.column as never, filter.value as never)

  return { data: null, error: toErrorMessage(error) }
}
