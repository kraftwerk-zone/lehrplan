"use client"

import { FileAudio, FileImage, FileSpreadsheet, FileText, FileType, Trash2 } from "lucide-react"
import type { FileSelection } from "./file-tree"

type FileKind = "image" | "pdf" | "doc" | "sheet" | "audio" | "generic"

function getFileKind(name: string): FileKind {
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "heic"].includes(ext)) return "image"
  if (ext === "pdf") return "pdf"
  if (["doc", "docx", "txt", "rtf", "odt", "pages"].includes(ext)) return "doc"
  if (["xls", "xlsx", "csv", "numbers"].includes(ext)) return "sheet"
  if (["mp3", "wav", "m4a", "aac", "ogg"].includes(ext)) return "audio"
  return "generic"
}

const KIND_META: Record<FileKind, { label: string; Icon: typeof FileText }> = {
  image: { label: "Bild", Icon: FileImage },
  pdf: { label: "PDF-Dokument", Icon: FileType },
  doc: { label: "Dokument", Icon: FileText },
  sheet: { label: "Tabelle", Icon: FileSpreadsheet },
  audio: { label: "Audio", Icon: FileAudio },
  generic: { label: "Datei", Icon: FileText },
}

interface FilePreviewProps {
  selection: FileSelection | null
  onDelete?: (topicId: string, subTopicId: string, materialId: string) => void
}

export function FilePreview({ selection, onDelete }: FilePreviewProps) {
  if (!selection) {
    return (
      <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 text-center">
        <FileText className="size-8 text-muted-foreground/50" aria-hidden />
        <p className="text-sm text-muted-foreground">Datei auswählen, um eine Vorschau zu sehen.</p>
      </div>
    )
  }

  const { material, subjectName, topicName, subTopicName } = selection
  const kind = getFileKind(material.name)
  const meta = KIND_META[kind]
  const { Icon } = meta

  return (
    <div className="flex h-full flex-col">
      {/* Preview canvas */}
      <div className="flex flex-1 items-center justify-center rounded-lg border border-border bg-muted/40 p-6">
        <PreviewCanvas kind={kind} name={material.name} />
      </div>

      {/* Metadata */}
      <div className="mt-4 space-y-3">
        <div className="flex items-start gap-2">
          <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="break-words text-sm font-semibold text-foreground">{material.name}</p>
            <p className="text-xs text-muted-foreground">{meta.label}</p>
          </div>
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(selection.topicId, selection.subTopicId, material.id)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
              Löschen
            </button>
          )}
        </div>

        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          <dt className="text-muted-foreground">Fach</dt>
          <dd className="text-foreground">{subjectName}</dd>
          <dt className="text-muted-foreground">Thema</dt>
          <dd className="text-foreground">{topicName}</dd>
          <dt className="text-muted-foreground">Unterthema</dt>
          <dd className="text-foreground">{subTopicName}</dd>
          <dt className="text-muted-foreground">Ordner</dt>
          <dd className="text-foreground">{material.folder ? material.folder : "—"}</dd>
        </dl>
      </div>
    </div>
  )
}

// A stylised, content-agnostic preview appropriate to the file kind. The
// prototype has no real file bytes, so we render a representative mock.
function PreviewCanvas({ kind, name }: { kind: FileKind; name: string }) {
  if (kind === "image") {
    return (
      <div className="flex aspect-video w-full max-w-xs items-center justify-center rounded-md bg-gradient-to-br from-sky-100 to-blue-200">
        <FileImage className="size-10 text-blue-500/70" aria-hidden />
      </div>
    )
  }

  if (kind === "audio") {
    return (
      <div className="flex w-full max-w-xs flex-col items-center gap-3">
        <FileAudio className="size-10 text-muted-foreground" aria-hidden />
        <div className="flex h-10 w-full items-end justify-center gap-0.5">
          {[6, 12, 20, 32, 24, 16, 28, 36, 22, 14, 30, 18, 10].map((h, i) => (
            <span key={i} className="w-1.5 rounded-full bg-primary/60" style={{ height: h }} />
          ))}
        </div>
      </div>
    )
  }

  if (kind === "sheet") {
    return (
      <div className="w-full max-w-xs overflow-hidden rounded-md border border-border bg-background">
        {Array.from({ length: 5 }).map((_, r) => (
          <div key={r} className="grid grid-cols-4">
            {Array.from({ length: 4 }).map((_, c) => (
              <div
                key={c}
                className={`h-6 border-b border-r border-border ${r === 0 ? "bg-emerald-100" : c === 0 ? "bg-muted/60" : ""}`}
              />
            ))}
          </div>
        ))}
      </div>
    )
  }

  // pdf / doc / generic → a lined document mock
  return (
    <div className="w-full max-w-xs rounded-md border border-border bg-background p-4 shadow-sm">
      <div className="mb-3 h-2.5 w-2/3 rounded bg-foreground/70" />
      <div className="space-y-1.5">
        {[100, 92, 96, 80, 88, 70].map((w, i) => (
          <div key={i} className="h-1.5 rounded bg-muted-foreground/25" style={{ width: `${w}%` }} />
        ))}
      </div>
      <p className="mt-3 truncate text-[10px] text-muted-foreground">{name}</p>
    </div>
  )
}
