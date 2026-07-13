"use client"

import { ChevronRight, FileText, Folder, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"
import { FileDropZone } from "@/components/curriculum/file-drop-zone"
import { getSubjectTheme } from "@/lib/subject-theme"
import type { Material, Subject, Topic } from "@/lib/types"
import { cn } from "@/lib/utils"

// A file selected in the tree, carrying enough context to preview / delete it.
export interface FileSelection {
  topicId: string
  subTopicId: string
  subjectName: string
  topicName: string
  subTopicName: string
  material: Material
}

// Callbacks passed down through the recursive tree.
interface TreeContext {
  topicId: string
  subTopicId: string
  subjectName: string
  topicName: string
  subTopicName: string
  selectedMaterialId: string | null
  onSelectFile?: (selection: FileSelection) => void
  onDeleteMaterial?: (topicId: string, subTopicId: string, materialId: string) => void
}

// ---- Global file tree (all subjects → topics → subtopics → folders) ------

interface GlobalFileTreeProps {
  subjects: Subject[]
  topics: Topic[]
  highlightSubTopicId?: string | null
  // Interactive mode (opt-in): providing any of these enables selection,
  // add and delete affordances. Omit them all for a read-only tree.
  selectedMaterialId?: string | null
  onSelectFile?: (selection: FileSelection) => void
  onUploadFiles?: (topicId: string, subTopicId: string, files: File[]) => void | Promise<void>
  onDeleteMaterial?: (topicId: string, subTopicId: string, materialId: string) => void
}

export function GlobalFileTree({
  subjects,
  topics,
  highlightSubTopicId = null,
  selectedMaterialId = null,
  onSelectFile,
  onUploadFiles,
  onDeleteMaterial,
}: GlobalFileTreeProps) {
  const interactive = Boolean(onUploadFiles || onDeleteMaterial || onSelectFile)

  const totalMaterials = useMemo(
    () => topics.reduce((sum, t) => sum + t.children.reduce((a, st) => a + st.materials.length, 0), 0),
    [topics],
  )

  if (totalMaterials === 0 && !interactive) {
    return (
      <p className="px-1 py-3 text-center text-xs text-muted-foreground">
        Im gesamten Lehrplan gibt es noch keine Materialien.
      </p>
    )
  }

  return (
    <div role="tree">
      {subjects.map((subject) => {
        const theme = getSubjectTheme(subject.color)
        const subjectTopics = topics.filter((t) => t.subjectId === subject.id)
        const count = subjectTopics.reduce((a, t) => a + t.children.reduce((b, st) => b + st.materials.length, 0), 0)
        return (
          <CollapsibleRow
            key={subject.id}
            label={subject.name}
            count={count}
            depth={0}
            defaultOpen
            dotClass={theme.dot}
            showEmptyChildren={interactive}
          >
            {subjectTopics.length === 0 && (
              <p style={{ paddingLeft: 20 }} className="py-0.5 text-xs text-muted-foreground">
                Noch keine Themen.
              </p>
            )}
            {subjectTopics.map((topic) => {
              const tCount = topic.children.reduce((a, st) => a + st.materials.length, 0)
              return (
                <CollapsibleRow
                  key={topic.id}
                  label={topic.name}
                  count={tCount}
                  depth={1}
                  showEmptyChildren={interactive}
                >
                  {topic.children.map((st) => {
                    const ctx: TreeContext = {
                      topicId: topic.id,
                      subTopicId: st.id,
                      subjectName: subject.name,
                      topicName: topic.name,
                      subTopicName: st.name,
                      selectedMaterialId,
                      onSelectFile,
                      onDeleteMaterial,
                    }
                    return (
                      <CollapsibleRow
                        key={st.id}
                        label={st.name}
                        count={st.materials.length}
                        depth={2}
                        highlight={st.id === highlightSubTopicId}
                        defaultOpen={interactive}
                        showEmptyChildren={interactive}
                      >
                        <FolderTreeView node={buildTree(st.materials)} depth={3} ctx={ctx} />
                        {onUploadFiles && (
                          <div style={{ paddingLeft: 3 * 12 + 4 }} className="py-1 pr-1">
                            <FileDropZone
                              compact
                              onFiles={(files) => onUploadFiles(topic.id, st.id, files)}
                            />
                          </div>
                        )}
                      </CollapsibleRow>
                    )
                  })}
                </CollapsibleRow>
              )
            })}
          </CollapsibleRow>
        )
      })}
    </div>
  )
}

interface CollapsibleRowProps {
  label: string
  count: number
  depth: number
  defaultOpen?: boolean
  highlight?: boolean
  dotClass?: string
  showEmptyChildren?: boolean
  children: React.ReactNode
}

function CollapsibleRow({
  label,
  count,
  depth,
  defaultOpen,
  highlight,
  dotClass,
  showEmptyChildren,
  children,
}: CollapsibleRowProps) {
  const [open, setOpen] = useState(Boolean(defaultOpen))
  return (
    <div role="treeitem" aria-expanded={open}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ paddingLeft: depth * 12 + 4 }}
        className={cn(
          "flex w-full items-center gap-1 rounded px-1 py-1 text-left text-sm hover:bg-accent",
          highlight ? "bg-accent font-semibold text-foreground" : "font-medium text-foreground",
        )}
      >
        <ChevronRight className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
        {dotClass ? (
          <span className={cn("inline-flex size-2.5 shrink-0 rounded-full", dotClass)} aria-hidden />
        ) : (
          <Folder className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <span className="truncate">{label}</span>
        <span className="ml-auto pr-1 text-xs text-muted-foreground">{count}</span>
      </button>
      {open && (count > 0 || showEmptyChildren) && children}
      {open && count === 0 && !showEmptyChildren && (
        <p style={{ paddingLeft: (depth + 1) * 12 + 8 }} className="py-0.5 text-xs text-muted-foreground">
          Keine Materialien.
        </p>
      )}
    </div>
  )
}

// ---- Folder tree within a single sub-topic -------------------------------

interface TreeNode {
  name: string
  folders: Map<string, TreeNode>
  files: Material[]
}

function buildTree(materials: Material[]): TreeNode {
  const root: TreeNode = { name: "", folders: new Map(), files: [] }
  for (const m of materials) {
    const segments = (m.folder ?? "")
      .split("/")
      .map((s) => s.trim())
      .filter(Boolean)
    let node = root
    for (const seg of segments) {
      let child = node.folders.get(seg)
      if (!child) {
        child = { name: seg, folders: new Map(), files: [] }
        node.folders.set(seg, child)
      }
      node = child
    }
    node.files.push(m)
  }
  return root
}

function FolderTreeView({ node, depth, ctx }: { node: TreeNode; depth: number; ctx: TreeContext }) {
  const folders = Array.from(node.folders.values()).sort((a, b) => a.name.localeCompare(b.name))
  return (
    <div role="group">
      {folders.map((folder) => (
        <FolderNode key={folder.name} node={folder} depth={depth} ctx={ctx} />
      ))}
      {node.files.map((file) => (
        <FileRow key={file.id} file={file} depth={depth} ctx={ctx} />
      ))}
    </div>
  )
}

function FileRow({ file, depth, ctx }: { file: Material; depth: number; ctx: TreeContext }) {
  const selectable = Boolean(ctx.onSelectFile)
  const selected = ctx.selectedMaterialId === file.id
  return (
    <div role="treeitem" className="group flex items-center gap-1" style={{ paddingLeft: depth * 12 + 4 }}>
      <button
        type="button"
        disabled={!selectable}
        onClick={() =>
          ctx.onSelectFile?.({
            topicId: ctx.topicId,
            subTopicId: ctx.subTopicId,
            subjectName: ctx.subjectName,
            topicName: ctx.topicName,
            subTopicName: ctx.subTopicName,
            material: file,
          })
        }
        className={cn(
          "flex min-w-0 flex-1 items-center gap-1.5 rounded px-1 py-0.5 text-left text-sm text-foreground",
          selectable && "hover:bg-accent",
          selected && "bg-accent font-medium",
          !selectable && "cursor-default",
        )}
      >
        <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="truncate">{file.name}</span>
      </button>
      {ctx.onDeleteMaterial && (
        <button
          type="button"
          onClick={() => ctx.onDeleteMaterial?.(ctx.topicId, ctx.subTopicId, file.id)}
          className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
          aria-label={`${file.name} löschen`}
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
    </div>
  )
}

function FolderNode({ node, depth, ctx }: { node: TreeNode; depth: number; ctx: TreeContext }) {
  const [open, setOpen] = useState(true)
  const count = countFiles(node)
  return (
    <div role="treeitem" aria-expanded={open}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ paddingLeft: depth * 12 + 4 }}
        className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-sm font-medium text-foreground hover:bg-accent"
      >
        <ChevronRight className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
        <Folder className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="truncate">{node.name}</span>
        <span className="ml-auto pr-1 text-xs text-muted-foreground">{count}</span>
      </button>
      {open && <FolderTreeView node={node} depth={depth + 1} ctx={ctx} />}
    </div>
  )
}

function countFiles(node: TreeNode): number {
  let total = node.files.length
  for (const child of node.folders.values()) total += countFiles(child)
  return total
}
