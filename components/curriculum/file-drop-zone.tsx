"use client"

import { Loader2, Upload } from "lucide-react"
import { useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface FileDropZoneProps {
  onFiles: (files: File[]) => void | Promise<void>
  disabled?: boolean
  compact?: boolean
  className?: string
}

export function FileDropZone({ onFiles, disabled, compact, className }: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)

  async function handleFiles(fileList: FileList | null) {
    if (disabled || uploading || !fileList?.length) return
    const files = Array.from(fileList)
    setUploading(true)
    try {
      await onFiles(files)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  function onDragOver(event: React.DragEvent) {
    event.preventDefault()
    if (!disabled && !uploading) setDragging(true)
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault()
    setDragging(false)
    void handleFiles(event.dataTransfer.files)
  }

  return (
    <button
      type="button"
      disabled={disabled || uploading}
      onClick={() => inputRef.current?.click()}
      onDragOver={onDragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-md border border-dashed text-left transition-colors",
        compact ? "px-2 py-1.5 text-xs" : "px-3 py-4 text-sm",
        dragging ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground",
        !disabled && !uploading && "hover:border-primary/50 hover:bg-accent/50 hover:text-foreground",
        (disabled || uploading) && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        disabled={disabled || uploading}
        onChange={(event) => void handleFiles(event.target.files)}
      />
      {uploading ? (
        <>
          <Loader2 className={cn("shrink-0 animate-spin", compact ? "size-3.5" : "size-4")} />
          <span>Wird hochgeladen …</span>
        </>
      ) : (
        <>
          <Upload className={cn("shrink-0", compact ? "size-3.5" : "size-4")} />
          <span>{compact ? "Dateien hierher ziehen" : "Dateien hierher ziehen oder klicken"}</span>
        </>
      )}
    </button>
  )
}
