import { supabase } from "./supabase"

export const MATERIALS_BUCKET = "materials"

export interface UploadFileResult {
  path: string
  publicUrl: string | null
}

type StorageResult<T> = { data: T | null; error: string | null }

function toErrorMessage(error: { message: string } | null): string | null {
  return error?.message ?? null
}

/**
 * Lädt eine Datei in Supabase Storage hoch.
 * Der Pfad wird automatisch mit der User-ID namespaced, falls angegeben.
 */
export async function uploadFile(
  file: File,
  options: {
    bucket?: string
    path: string
    upsert?: boolean
  },
): Promise<StorageResult<UploadFileResult>> {
  const bucket = options.bucket ?? MATERIALS_BUCKET

  const { data, error } = await supabase.storage.from(bucket).upload(options.path, file, {
    upsert: options.upsert ?? false,
    contentType: file.type || undefined,
  })

  if (error) return { data: null, error: toErrorMessage(error) }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path)

  return {
    data: { path: data.path, publicUrl: urlData.publicUrl },
    error: null,
  }
}

/** Erzeugt eine signierte URL für private Buckets. */
export async function getSignedFileUrl(
  path: string,
  options?: { bucket?: string; expiresIn?: number },
): Promise<StorageResult<string>> {
  const bucket = options?.bucket ?? MATERIALS_BUCKET
  const expiresIn = options?.expiresIn ?? 3600

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
  return { data: data?.signedUrl ?? null, error: toErrorMessage(error) }
}

/** Öffentliche URL für Dateien im Materials-Bucket. */
export function getPublicFileUrl(path: string, bucket: string = MATERIALS_BUCKET): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}
export async function deleteFiles(
  paths: string[],
  options?: { bucket?: string },
): Promise<StorageResult<null>> {
  const bucket = options?.bucket ?? MATERIALS_BUCKET
  const { error } = await supabase.storage.from(bucket).remove(paths)
  return { data: null, error: toErrorMessage(error) }
}
