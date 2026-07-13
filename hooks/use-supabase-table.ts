"use client"

import { useCallback, useEffect, useState } from "react"
import { deleteRows, fetchRows, insertRows, updateRows } from "@/lib/data"
import type { Database, Tables, TablesInsert, TablesUpdate } from "@/lib/database.types"

type TableName = keyof Database["public"]["Tables"]

interface UseSupabaseTableOptions<T extends TableName> {
  table: T
  /** Optional: nur Zeilen laden, bei denen diese Spalte dem Wert entspricht. */
  filter?: { column: keyof Tables<T> & string; value: string }
  /** Wenn false, wird beim Mount nicht automatisch geladen. */
  enabled?: boolean
}

interface UseSupabaseTableResult<T extends TableName> {
  rows: Tables<T>[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  create: (row: TablesInsert<T>) => Promise<Tables<T> | null>
  update: (id: string, patch: TablesUpdate<T>) => Promise<Tables<T> | null>
  remove: (id: string) => Promise<boolean>
}

export function useSupabaseTable<T extends TableName>({
  table,
  filter,
  enabled = true,
}: UseSupabaseTableOptions<T>): UseSupabaseTableResult<T> {
  const [rows, setRows] = useState<Tables<T>[]>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await fetchRows(table, filter)
    if (fetchError) {
      setError(fetchError)
      setRows([])
    } else {
      setRows(data ?? [])
    }

    setLoading(false)
  }, [table, filter?.column, filter?.value])

  useEffect(() => {
    if (enabled) void refresh()
  }, [enabled, refresh])

  const create = useCallback(
    async (row: TablesInsert<T>): Promise<Tables<T> | null> => {
      setError(null)
      const { data, error: insertError } = await insertRows(table, row)
      if (insertError) {
        setError(insertError)
        return null
      }
      const created = data?.[0] ?? null
      if (created) setRows((prev) => [...prev, created])
      return created
    },
    [table],
  )

  const update = useCallback(
    async (id: string, patch: TablesUpdate<T>): Promise<Tables<T> | null> => {
      setError(null)
      const { data, error: updateError } = await updateRows(
        table,
        { column: "id" as keyof Tables<T> & string, value: id },
        patch,
      )
      if (updateError) {
        setError(updateError)
        return null
      }
      const updated = data?.[0] ?? null
      if (updated) {
        setRows((prev) =>
          prev.map((row) => ((row as Tables<T> & { id: string }).id === id ? updated : row)),
        )
      }
      return updated
    },
    [table],
  )

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null)
      const { error: deleteError } = await deleteRows(table, {
        column: "id" as keyof Tables<T> & string,
        value: id,
      })
      if (deleteError) {
        setError(deleteError)
        return false
      }
      setRows((prev) => prev.filter((row) => (row as Tables<T> & { id: string }).id !== id))
      return true
    },
    [table],
  )

  return { rows, loading, error, refresh, create, update, remove }
}
