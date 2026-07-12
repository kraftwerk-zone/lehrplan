"use client"

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { format } from "date-fns"
import {
  Check,
  ChevronRight,
  FileText,
  FolderTree,
  GripVertical,
  List,
  Plus,
  Scissors,
  Trash2,
  X,
} from "lucide-react"
import { useState } from "react"
import { getSubjectTheme } from "@/lib/subject-theme"
import type { Material, ScheduledBlock, Student, SubTopic, Subject, Topic } from "@/lib/types"
import { cn } from "@/lib/utils"
import { GlobalFileTree } from "./file-tree"

interface DockedPanelProps {
  /** Selected scheduled block (block mode) — mutually exclusive with subTopic. */
  block: ScheduledBlock | null
  /** Selected catalog sub-topic (config mode) — mutually exclusive with block. */
  subTopic: SubTopic | null
  /** Subject of the selected item. */
  subject: Subject | null
  /** Full catalog, used to render the global file tree. */
  subjects: Subject[]
  topics: Topic[]
  students: Student[]
  onClose: () => void
  onUpdateBlock: (block: ScheduledBlock) => void
  onDeleteBlock: (id: string) => void
  onSplitBlock: (blockId: string, index: number) => void
  onUpdateSubTopic: (subTopic: SubTopic) => void
}

type MaterialView = "list" | "tree"

export function DockedPanel({
  block,
  subTopic,
  subject,
  subjects,
  topics,
  students,
  onClose,
  onUpdateBlock,
  onDeleteBlock,
  onSplitBlock,
  onUpdateSubTopic,
}: DockedPanelProps) {
  const [view, setView] = useState<MaterialView>("list")
  const open = Boolean((block || subTopic) && subject)
  const theme = subject ? getSubjectTheme(subject.color) : null

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-foreground/20 transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Konfiguration"
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card shadow-xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {open && subject && theme && (
          <>
            <header className="flex items-start justify-between gap-3 border-b border-border p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("inline-flex size-2.5 rounded-full", theme.dot)} aria-hidden />
                  <span className="text-xs font-medium text-muted-foreground">
                    {subject.name}
                    {block ? " · Geplanter Block" : " · Katalog-Unterthema"}
                  </span>
                </div>
                {block ? (
                  <>
                    <h2 className="mt-1 truncate text-lg font-semibold text-foreground">
                      {block.topicReference.name}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {format(block.startDate, "dd.MM.yyyy")} – {format(block.endDate, "dd.MM.yyyy")}
                    </p>
                  </>
                ) : (
                  subTopic && (
                    <input
                      value={subTopic.name}
                      onChange={(e) => onUpdateSubTopic({ ...subTopic, name: e.target.value })}
                      className="mt-1 w-full rounded bg-transparent text-lg font-semibold text-foreground outline-none focus:bg-accent"
                      aria-label="Unterthema-Name"
                    />
                  )
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Schließen"
              >
                <X className="size-5" />
              </button>
            </header>

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
              {/* ---- Block-only: understanding + progress ---- */}
              {block && (
                <BlockSections
                  block={block}
                  theme={theme}
                  students={students}
                  onUpdateBlock={onUpdateBlock}
                  onSplitBlock={onSplitBlock}
                />
              )}

              {/* ---- SubTopic-only: time planning + points ---- */}
              {subTopic && !block && (
                <SubTopicSections subTopic={subTopic} students={students} onUpdateSubTopic={onUpdateSubTopic} />
              )}

              {/* ---- Shared: materials (list + global tree) ---- */}
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground">
                    Lehrmaterialien{" "}
                    <span className="font-normal text-muted-foreground">
                      ({block ? block.materials.length : subTopic?.materials.length ?? 0})
                    </span>
                  </h3>
                  <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
                    <button
                      type="button"
                      onClick={() => setView("list")}
                      className={cn(
                        "inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium",
                        view === "list" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
                      )}
                      aria-pressed={view === "list"}
                    >
                      <List className="size-3.5" /> Liste
                    </button>
                    <button
                      type="button"
                      onClick={() => setView("tree")}
                      className={cn(
                        "inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium",
                        view === "tree" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
                      )}
                      aria-pressed={view === "tree"}
                    >
                      <FolderTree className="size-3.5" /> Dateiansicht
                    </button>
                  </div>
                </div>

                {view === "list" ? (
                  block ? (
                    <MaterialManager
                      materials={block.materials}
                      onChange={(materials) => onUpdateBlock({ ...block, materials })}
                    />
                  ) : subTopic ? (
                    <MaterialManager
                      materials={subTopic.materials}
                      onChange={(materials) => onUpdateSubTopic({ ...subTopic, materials })}
                    />
                  ) : null
                ) : (
                  <div>
                    <p className="mb-2 text-xs text-muted-foreground">
                      Alle Materialien des gesamten Lehrplans – nach Fach, Thema und Unterthema.
                    </p>
                    <div className="rounded-md border border-border bg-background p-2">
                      <GlobalFileTree
                        subjects={subjects}
                        topics={topics}
                        highlightSubTopicId={subTopic?.id ?? null}
                      />
                    </div>
                  </div>
                )}
              </section>
            </div>

            {block && (
              <footer className="border-t border-border p-4">
                <button
                  type="button"
                  onClick={() => onDeleteBlock(block.id)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-destructive/40 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-4" /> Block aus Plan entfernen
                </button>
              </footer>
            )}
          </>
        )}
      </aside>
    </>
  )
}

// ---- Block-specific sections ---------------------------------------------

interface BlockSectionsProps {
  block: ScheduledBlock
  theme: NonNullable<ReturnType<typeof getSubjectTheme>>
  students: Student[]
  onUpdateBlock: (block: ScheduledBlock) => void
  onSplitBlock: (blockId: string, index: number) => void
}

function BlockSections({ block, theme, students, onUpdateBlock, onSplitBlock }: BlockSectionsProps) {
  function updateSubTopic(subTopicId: string, patch: Partial<SubTopic>) {
    onUpdateBlock({
      ...block,
      topicReference: {
        ...block.topicReference,
        children: block.topicReference.children.map((st) => (st.id === subTopicId ? { ...st, ...patch } : st)),
      },
    })
  }
  function toggleSubTopicDone(index: number) {
    const done = index < block.completedSubTopics
    onUpdateBlock({ ...block, completedSubTopics: done ? index : index + 1 })
  }

  const totalSubTopics = block.topicReference.children.length
  const progressPct = totalSubTopics > 0 ? Math.round((block.completedSubTopics / totalSubTopics) * 100) : 0

  return (
    <>
      {/* Understanding level */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="understanding" className="text-sm font-medium text-foreground">
            Verständnis
          </label>
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums", theme.chip)}>
            {block.understandingLevel}%
          </span>
        </div>
        <input
          id="understanding"
          type="range"
          min={0}
          max={100}
          step={5}
          value={block.understandingLevel}
          onChange={(e) => onUpdateBlock({ ...block, understandingLevel: Number(e.target.value) })}
          className="w-full accent-foreground"
        />
      </section>

      {/* Sub-topics: progress + per-child points */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">Unterthemen</h3>
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            {block.completedSubTopics} / {totalSubTopics} · {progressPct}%
          </span>
        </div>

        <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full transition-all", theme.dot)} style={{ width: `${progressPct}%` }} />
        </div>

        {totalSubTopics >= 2 && (
          <p className="mb-2 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Scissors className="size-3" /> Über die Trenner zwischen den Karten kannst du den Block teilen.
          </p>
        )}

        {totalSubTopics === 0 ? (
          <p className="text-xs text-muted-foreground">Dieser Block hat keine Unterthemen.</p>
        ) : (
          <div className="-mx-4 overflow-x-auto px-4 pb-2">
            <ol className="flex items-stretch gap-3">
              {block.topicReference.children.map((st, index) => {
                const done = index < block.completedSubTopics
                return (
                  <li key={st.id} className="flex items-stretch gap-3">
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => onSplitBlock(block.id, index)}
                        className="group flex w-6 flex-shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-muted-foreground transition-colors hover:border-foreground/50 hover:bg-accent hover:text-foreground"
                        aria-label={`Block vor "${st.name}" teilen`}
                        title={`Block hier teilen — "${st.name}" beginnt einen neuen Block`}
                      >
                        <Scissors className="size-3.5" />
                      </button>
                    )}
                    <div
                      className={cn(
                        "flex w-56 flex-shrink-0 flex-col rounded-lg border p-3",
                        done ? cn(theme.chip, theme.blockBorder) : "border-border bg-muted/30",
                      )}
                    >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{st.name}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            Dauer
                            <input
                              type="number"
                              min={1}
                              inputMode="numeric"
                              aria-label={`Dauer (Tage) für ${st.name}`}
                              value={st.durationInDays}
                              onChange={(e) =>
                                updateSubTopic(st.id, { durationInDays: Math.max(1, Number(e.target.value) || 1) })
                              }
                              className="w-11 rounded-md border border-border bg-background px-1 py-0.5 text-right text-[11px] tabular-nums text-foreground outline-none focus:ring-1 focus:ring-ring"
                            />
                          </label>
                          <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            Puffer
                            <input
                              type="number"
                              min={0}
                              inputMode="numeric"
                              aria-label={`Puffer (Tage) für ${st.name}`}
                              value={st.bufferInDays}
                              onChange={(e) =>
                                updateSubTopic(st.id, { bufferInDays: Math.max(0, Number(e.target.value) || 0) })
                              }
                              className="w-11 rounded-md border border-border bg-background px-1 py-0.5 text-right text-[11px] tabular-nums text-foreground outline-none focus:ring-1 focus:ring-ring"
                            />
                          </label>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSubTopicDone(index)}
                        aria-pressed={done}
                        aria-label={done ? `${st.name} als offen markieren` : `${st.name} als erledigt markieren`}
                        className={cn(
                          "inline-flex size-6 flex-shrink-0 items-center justify-center rounded-full border transition-colors",
                          done
                            ? "border-transparent bg-foreground text-background"
                            : "border-border text-muted-foreground hover:border-foreground/40",
                        )}
                      >
                        <Check className="size-3.5" />
                      </button>
                    </div>

                    <div className="mt-3 border-t border-border/60 pt-2">
                      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Punkte pro Kind
                      </p>
                      {students.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground">Noch keine Kinder angelegt.</p>
                      ) : (
                        <ul className="space-y-1">
                          {students.map((child) => (
                            <li key={child.id} className="flex items-center justify-between gap-2">
                              <span className="truncate text-xs text-foreground">{child.name}</span>
                              <input
                                type="number"
                                min={0}
                                inputMode="numeric"
                                aria-label={`Punkte für ${child.name} in ${st.name}`}
                                value={st.points[child.id] ?? ""}
                                placeholder="0"
                                onChange={(e) =>
                                  updateSubTopic(st.id, {
                                    points: {
                                      ...st.points,
                                      [child.id]: e.target.value === "" ? 0 : Number(e.target.value),
                                    },
                                  })
                                }
                                className="w-14 rounded-md border border-border bg-background px-1.5 py-1 text-right text-xs tabular-nums text-foreground outline-none focus:ring-1 focus:ring-ring"
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        )}
      </section>

      {/* Differentiation */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Differenzierung</h3>
        <div>
          <label htmlFor="support" className="mb-1 block text-xs font-medium text-muted-foreground">
            Unterstützung
          </label>
          <textarea
            id="support"
            value={block.differentiation.support}
            onChange={(e) =>
              onUpdateBlock({ ...block, differentiation: { ...block.differentiation, support: e.target.value } })
            }
            rows={2}
            className="w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div>
          <label htmlFor="challenge" className="mb-1 block text-xs font-medium text-muted-foreground">
            Herausforderung
          </label>
          <textarea
            id="challenge"
            value={block.differentiation.challenge}
            onChange={(e) =>
              onUpdateBlock({ ...block, differentiation: { ...block.differentiation, challenge: e.target.value } })
            }
            rows={2}
            className="w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </section>
    </>
  )
}

// ---- SubTopic-specific sections ------------------------------------------

interface SubTopicSectionsProps {
  subTopic: SubTopic
  students: Student[]
  onUpdateSubTopic: (subTopic: SubTopic) => void
}

function SubTopicSections({ subTopic, students, onUpdateSubTopic }: SubTopicSectionsProps) {
  function setNumber(field: "durationInDays" | "bufferInDays", value: string) {
    const n = Math.max(0, Math.min(60, Number.parseInt(value || "0", 10) || 0))
    onUpdateSubTopic({ ...subTopic, [field]: n })
  }
  function setPoints(studentId: string, value: string) {
    const n = Math.max(0, Math.min(999, Number.parseInt(value || "0", 10) || 0))
    onUpdateSubTopic({ ...subTopic, points: { ...subTopic.points, [studentId]: n } })
  }

  const totalPoints = students.reduce((sum, s) => sum + (subTopic.points[s.id] ?? 0), 0)

  return (
    <>
      <section>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Zeitplanung</h3>
        <p className="mb-2 text-xs text-muted-foreground">
          Änderungen wirken sich direkt auf bereits geplante Blöcke im Kalender aus.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Unterrichtstage</span>
            <input
              type="number"
              min={0}
              value={subTopic.durationInDays}
              onChange={(e) => setNumber("durationInDays", e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
              aria-label="Unterrichtstage"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Puffertage</span>
            <input
              type="number"
              min={0}
              value={subTopic.bufferInDays}
              onChange={(e) => setNumber("bufferInDays", e.target.value)}
              className="rounded-md border border-dashed border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
              aria-label="Puffertage"
            />
          </label>
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Punkte pro Kind</h3>
          <span className="text-xs text-muted-foreground">Gesamt: {totalPoints} Pkt</span>
        </div>
        {students.length === 0 ? (
          <p className="text-xs text-muted-foreground">Erst Kinder im Katalog anlegen.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {students.map((student) => (
              <li
                key={student.id}
                className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{student.name}</span>
                <input
                  type="number"
                  min={0}
                  value={subTopic.points[student.id] ?? 0}
                  onChange={(e) => setPoints(student.id, e.target.value)}
                  className="w-16 rounded border border-border bg-background px-2 py-1 text-center text-sm tabular-nums text-foreground outline-none focus:ring-1 focus:ring-ring"
                  aria-label={`Punkte für ${student.name}`}
                />
                <span className="text-xs text-muted-foreground">Pkt</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

// ---- Material list manager (sortable, with folders) ----------------------

interface MaterialManagerProps {
  materials: Material[]
  onChange: (materials: Material[]) => void
}

function MaterialManager({ materials, onChange }: MaterialManagerProps) {
  const [newMaterial, setNewMaterial] = useState("")
  const [newFolder, setNewFolder] = useState("")
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function addMaterial() {
    const name = newMaterial.trim()
    if (!name) return
    const folder = newFolder.trim().replace(/^\/+|\/+$/g, "")
    onChange([...materials, { id: `mat-${Date.now()}`, name, folder: folder || undefined }])
    setNewMaterial("")
  }
  function removeMaterial(id: string) {
    onChange(materials.filter((m) => m.id !== id))
  }
  function updateMaterial(id: string, patch: Partial<Material>) {
    onChange(materials.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = materials.findIndex((m) => m.id === active.id)
    const newIndex = materials.findIndex((m) => m.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    onChange(arrayMove(materials, oldIndex, newIndex))
  }

  return (
    <div>
      {materials.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
          Noch keine Materialien. Unten hinzufügen.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={materials.map((m) => m.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-1.5">
              {materials.map((m) => (
                <SortableMaterialRow key={m.id} material={m} onRemove={removeMaterial} onUpdate={updateMaterial} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <div className="mt-3 flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-2">
        <input
          value={newMaterial}
          onChange={(e) => setNewMaterial(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) {
              e.preventDefault()
              addMaterial()
            }
          }}
          placeholder="Materialname, z. B. Arbeitsblatt.pdf"
          className="min-w-0 flex-1 rounded border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
          aria-label="Neues Material"
        />
        <div className="flex gap-2">
          <input
            value={newFolder}
            onChange={(e) => setNewFolder(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                e.preventDefault()
                addMaterial()
              }
            }}
            placeholder="Ordner (optional), z. B. Woche 1/Tests"
            className="min-w-0 flex-1 rounded border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
            aria-label="Ordnerpfad"
          />
          <button
            type="button"
            onClick={addMaterial}
            className="inline-flex shrink-0 items-center justify-center gap-1 rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="size-4" /> Hinzufügen
          </button>
        </div>
      </div>
    </div>
  )
}

interface SortableMaterialRowProps {
  material: Material
  onRemove: (id: string) => void
  onUpdate: (id: string, patch: Partial<Material>) => void
}

function SortableMaterialRow({ material, onRemove, onUpdate }: SortableMaterialRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: material.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5",
        isDragging && "z-10 opacity-80 shadow-md",
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none rounded p-0.5 text-muted-foreground hover:bg-accent active:cursor-grabbing"
        aria-label="Material verschieben"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <input
        value={material.name}
        onChange={(e) => onUpdate(material.id, { name: e.target.value })}
        className="min-w-0 flex-1 rounded bg-transparent px-1 py-0.5 text-sm text-foreground outline-none focus:bg-accent"
        aria-label="Materialname"
      />
      <input
        value={material.folder ?? ""}
        onChange={(e) => onUpdate(material.id, { folder: e.target.value.trim() || undefined })}
        placeholder="Ordner"
        className="w-28 shrink-0 rounded border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
        aria-label="Ordner"
      />
      <button
        type="button"
        onClick={() => onRemove(material.id)}
        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        aria-label={`${material.name} entfernen`}
      >
        <Trash2 className="size-3.5" />
      </button>
    </li>
  )
}


