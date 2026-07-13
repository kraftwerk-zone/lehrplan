import type { Material } from "./types"
import { deleteFiles, uploadFile } from "./storage"

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_")
}

function newMaterialId(): string {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

/** Lädt Dateien in den Materials-Bucket und liefert Material-Einträge. */
export async function uploadMaterials(
  userId: string,
  scopeId: string,
  files: File[],
): Promise<{ materials: Material[]; errors: string[] }> {
  const materials: Material[] = []
  const errors: string[] = []

  for (const file of files) {
    const id = newMaterialId()
    const path = `${userId}/${scopeId}/${id}-${sanitizeFileName(file.name)}`
    const { data, error } = await uploadFile(file, { path })
    if (error || !data) {
      errors.push(error ?? `Upload fehlgeschlagen: ${file.name}`)
      continue
    }
    materials.push({ id, name: file.name, storagePath: data.path })
  }

  return { materials, errors }
}

export async function deleteMaterialStorage(material: Material): Promise<string | null> {
  if (!material.storagePath) return null
  const { error } = await deleteFiles([material.storagePath])
  return error
}
