"use client"

import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { addDays, parseISO } from "date-fns"
import { BarChart3, CalendarDays, GripVertical, UserRound } from "lucide-react"
import { useMemo, useRef, useState } from "react"
import { useAuth } from "@/components/auth/auth-context"
import { UserView } from "@/components/user/user-view"
import { useCurriculum } from "@/hooks/use-curriculum"
import { CalendarEngine } from "@/lib/calendar-engine"
import {
  HOLIDAYS,
  TIMELINE_END,
  TIMELINE_START,
} from "@/lib/curriculum-data"
import { deleteMaterialStorage, uploadMaterials } from "@/lib/material-upload"
import { removeStudentFromReferences } from "@/lib/reference-utils"
import { computeBlockSpan } from "@/lib/placement"
import { rescheduleWithCascade } from "@/lib/scheduling"
import type { Material, ScheduledBlock, Student, Subject, SubjectColor, SubTopic, Topic } from "@/lib/types"
import { CatalogSidebar } from "./catalog-sidebar"
import { CurriculumReportView } from "./curriculum-report"
import { DockedPanel } from "./docked-panel"
import { TimelineGrid, type DropPreview } from "./timeline-grid"
import { YearOverview } from "./year-overview"

interface ActiveDrag {
  topic: Topic // synthetic snapshot (single subtopic wrapped when needed)
  subjectId: string
  label: string
  mode: "new" | "move"
  blockId?: string // set when mode === "move"
}

// What the docked panel is currently focused on: a scheduled block or a
// catalog sub-topic (opened via its settings button). Mutually exclusive.
type Selection =
  | { kind: "block"; blockId: string }
  | { kind: "subtopic"; topicId: string; subTopicId: string }
  | { kind: "topic"; topicId: string }
  | null

export function Planner() {
  const engine = useMemo(() => new CalendarEngine(HOLIDAYS), [])
  const timelineDates = useMemo(() => engine.generateTimeline(TIMELINE_START, TIMELINE_END), [engine])

  const { user } = useAuth()
  const {
    subjects,
    topics,
    students,
    blocks,
    setSubjects,
    setTopics,
    setStudents,
    setBlocks,
    loading: curriculumLoading,
    error: curriculumError,
  } = useCurriculum(user?.id)
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null)
  const [preview, setPreview] = useState<DropPreview | null>(null)
  const [selection, setSelection] = useState<Selection>(null)
  const [view, setView] = useState<"planner" | "report" | "user">("planner")
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // Resolve the current selection into the concrete entities the panel needs.
  const selectedBlock =
    selection?.kind === "block" ? blocks.find((b) => b.id === selection.blockId) ?? null : null
  const selectedSubTopic =
    selection?.kind === "subtopic"
      ? topics.find((t) => t.id === selection.topicId)?.children.find((st) => st.id === selection.subTopicId) ?? null
      : null
  const selectedTopic =
    selection?.kind === "topic" ? topics.find((t) => t.id === selection.topicId) ?? null : null
  const selectedBlockId = selectedBlock?.id ?? null
  const selectedSubject = selectedBlock
    ? subjects.find((s) => s.id === selectedBlock.subjectId) ?? null
    : selectedSubTopic
      ? subjects.find((s) => s.id === topics.find((t) => t.id === selectedSubTopic.topicId)?.subjectId) ?? null
      : selectedTopic
        ? subjects.find((s) => s.id === selectedTopic.subjectId) ?? null
        : null

  // ---- Catalog mutations ---------------------------------------------------

  function updateTopic(updated: Topic) {
    setTopics((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
  }
  function deleteTopic(topicId: string) {
    setTopics((prev) => prev.filter((t) => t.id !== topicId))
  }
  function addTopic(subjectId: string) {
    const id = `t-${Date.now()}`
    setTopics((prev) => [...prev, { id, subjectId, name: "Neues Thema", children: [] }])
  }

  // ---- Subjects (configurable in the user/info view) ----------------------

  function addSubject() {
    const palette: SubjectColor[] = ["blue", "emerald", "amber", "sky", "rose"]
    const id = `s-${Date.now()}`
    setSubjects((prev) => [...prev, { id, name: "Neues Fach", color: palette[prev.length % palette.length] }])
  }
  function updateSubject(updated: Subject) {
    setSubjects((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
  }
  function deleteSubject(id: string) {
    setSubjects((prev) => prev.filter((s) => s.id !== id))
    // Cascade: drop the subject's topics and any blocks scheduled from them.
    setTopics((prev) => prev.filter((t) => t.subjectId !== id))
    setBlocks((prev) => prev.filter((b) => b.subjectId !== id))
    setSelection(null)
  }

  // ---- Materials (files) — upload/delete from the file view ----------------

  async function uploadMaterialsForSubTopic(topicId: string, subTopicId: string, files: File[]) {
    if (!user?.id || files.length === 0) return
    const { materials, errors } = await uploadMaterials(user.id, subTopicId, files)
    if (errors.length > 0) console.error("Upload fehlgeschlagen:", errors.join("; "))
    if (materials.length === 0) return

    setTopics((prev) =>
      prev.map((t) =>
        t.id === topicId
          ? {
              ...t,
              children: t.children.map((st) =>
                st.id === subTopicId ? { ...st, materials: [...st.materials, ...materials] } : st,
              ),
            }
          : t,
      ),
    )
  }

  async function deleteMaterial(topicId: string, subTopicId: string, materialId: string) {
    const topic = topics.find((t) => t.id === topicId)
    const subTopic = topic?.children.find((st) => st.id === subTopicId)
    const material = subTopic?.materials.find((m) => m.id === materialId)
    if (material) {
      const storageError = await deleteMaterialStorage(material)
      if (storageError) console.error("Storage löschen fehlgeschlagen:", storageError)
    }

    setTopics((prev) =>
      prev.map((t) =>
        t.id === topicId
          ? {
              ...t,
              children: t.children.map((st) =>
                st.id === subTopicId
                  ? { ...st, materials: st.materials.filter((m) => m.id !== materialId) }
                  : st,
              ),
            }
          : t,
      ),
    )
  }
  function updateSubTopic(updated: SubTopic) {
    setTopics((prev) =>
      prev.map((t) =>
        t.id === updated.topicId
          ? { ...t, children: t.children.map((st) => (st.id === updated.id ? updated : st)) }
          : t,
      ),
    )
    // Reflect the edit on the calendar: patch the snapshot inside any scheduled
    // block that was created from this sub-topic, re-span it, and cascade so a
    // changed duration/buffer pushes neighbouring blocks accordingly.
    setBlocks((prev) => {
      const affectedIds = prev
        .filter((b) => b.topicReference.children.some((st) => st.id === updated.id))
        .map((b) => b.id)
      if (affectedIds.length === 0) return prev
      let next = prev.map((b) =>
        b.topicReference.children.some((st) => st.id === updated.id)
          ? {
              ...b,
              topicReference: {
                ...b.topicReference,
                children: b.topicReference.children.map((st) => (st.id === updated.id ? updated : st)),
              },
            }
          : b,
      )
      for (const id of affectedIds) {
        const anchor = next.find((b) => b.id === id)
        if (anchor) next = rescheduleWithCascade(engine, next, id, anchor.startDate)
      }
      return next
    })
  }

  function openSubTopicConfig(topicId: string, subTopicId: string) {
    setSelection({ kind: "subtopic", topicId, subTopicId })
  }
  function openTopicConfig(topicId: string) {
    setSelection({ kind: "topic", topicId })
  }
  function deleteSubTopic(topicId: string, subTopicId: string) {
    setTopics((prev) =>
      prev.map((t) => (t.id === topicId ? { ...t, children: t.children.filter((st) => st.id !== subTopicId) } : t)),
    )
  }
  function addSubTopic(topicId: string) {
    const id = `st-${Date.now()}`
    setTopics((prev) =>
      prev.map((t) =>
        t.id === topicId
          ? {
              ...t,
              children: [
                ...t.children,
                {
                  id,
                  topicId,
                  name: "Neues Unterthema",
                  durationInDays: 2,
                  bufferInDays: 1,
                  materials: [],
                  references: [],
                  differentiation: { support: "", challenge: "" },
                },
              ],
            }
          : t,
      ),
    )
  }

  // ---- Class roster (students) --------------------------------------------

  function addStudent() {
    const id = `c-${Date.now()}`
    setStudents((prev) => [...prev, { id, name: `Kind ${prev.length + 1}` }])
  }
  function updateStudent(id: string, name: string) {
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)))
  }
  function deleteStudent(id: string) {
    setStudents((prev) => prev.filter((s) => s.id !== id))
    // Clean up any points recorded for this pupil across all sub-topics.
    setTopics((prev) =>
      prev.map((t) => ({
        ...t,
        children: t.children.map((st) => ({
          ...st,
          references: removeStudentFromReferences(st.references, id),
        })),
      })),
    )
  }

  // ---- Drag & drop ---------------------------------------------------------

  function resolveDrag(event: DragStartEvent | DragOverEvent | DragEndEvent): ActiveDrag | null {
    const data = event.active.data.current
    if (!data) return null
    if (data.kind === "topic") {
      const topic = data.topic as Topic
      return { topic, subjectId: data.subjectId as string, label: topic.name, mode: "new" }
    }
    if (data.kind === "subtopic") {
      const st = data.subTopic as SubTopic
      const synthetic: Topic = {
        id: `syn-${st.id}`,
        subjectId: data.subjectId as string,
        name: st.name,
        children: [st],
      }
      return { topic: synthetic, subjectId: data.subjectId as string, label: st.name, mode: "new" }
    }
    if (data.kind === "block") {
      const topic = data.topic as Topic
      return {
        topic,
        subjectId: data.subjectId as string,
        label: topic.name,
        mode: "move",
        blockId: data.blockId as string,
      }
    }
    return null
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDrag(resolveDrag(event))
  }

  function handleDragOver(event: DragOverEvent) {
    const drag = activeDrag ?? resolveDrag(event)
    const overData = event.over?.data.current
    if (!drag || !overData?.date || overData.subjectId !== drag.subjectId) {
      setPreview(null)
      return
    }
    const span = computeBlockSpan(engine, parseISO(overData.date as string), drag.topic)
    // Both moves and new drops cascade colliding neighbours out of the way, so a
    // drop within the correct lane is always accepted.
    setPreview({ subjectId: drag.subjectId, startDate: span.startDate, endDate: span.endDate, valid: true })
  }

  function handleDragEnd(event: DragEndEvent) {
    const drag = activeDrag ?? resolveDrag(event)
    const overData = event.over?.data.current
    setActiveDrag(null)
    setPreview(null)
    if (!drag || !overData?.date || overData.subjectId !== drag.subjectId) return

    const rawStart = parseISO(overData.date as string)

    // ---- Move an existing block (with cascade of neighbours) ----
    if (drag.mode === "move" && drag.blockId) {
      setBlocks((prev) => rescheduleWithCascade(engine, prev, drag.blockId as string, rawStart))
      return
    }

    // ---- Place a new block from the catalog ----
    // Overlaps are no longer rejected: the new block is anchored at the drop
    // position and any colliding blocks are cascaded forward/backward.
    const span = computeBlockSpan(engine, rawStart, drag.topic)

    const aggregatedMaterials: Material[] = drag.topic.children.flatMap((st) =>
      st.materials.map((m) => ({ ...m, id: `${m.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` })),
    )
    const firstDiff = drag.topic.children[0]?.differentiation ?? { support: "", challenge: "" }

    const block: ScheduledBlock = {
      id: `block-${Date.now()}`,
      topicId: drag.topic.id,
      subjectId: drag.subjectId,
      startDate: span.startDate,
      endDate: span.endDate,
      topicReference: drag.topic,
      understandingLevel: 65,
      completedSubTopics: 0,
      differentiation: { ...firstDiff },
      materials: aggregatedMaterials,
    }
    setBlocks((prev) => rescheduleWithCascade(engine, [...prev, block], block.id, span.startDate))
    setSelection({ kind: "block", blockId: block.id })
  }

  // Applies a block change and reflects it on the calendar: the block's span is
  // recomputed from its (possibly edited) sub-topics and neighbours are cascaded
  // so the timeline never shows an overlap.
  function updateBlock(updated: ScheduledBlock) {
    setBlocks((prev) => {
      const replaced = prev.map((b) => (b.id === updated.id ? updated : b))
      return rescheduleWithCascade(engine, replaced, updated.id, updated.startDate)
    })
  }
  function deleteBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id))
    setSelection(null)
  }

  // Splits a scheduled block into two consecutive blocks at `index`: sub-topics
  // [0, index) stay in the original (left) block, [index, end) move into a new
  // (right) block that starts on the next work day after the left block ends.
  // Because the layout is sequential the combined span is unchanged, and a
  // cascade keeps later blocks in the lane collision-free.
  function splitBlock(blockId: string, index: number) {
    setBlocks((prev) => {
      const original = prev.find((b) => b.id === blockId)
      if (!original) return prev
      const subs = original.topicReference.children
      if (index <= 0 || index >= subs.length) return prev

      const leftSubs = subs.slice(0, index)
      const rightSubs = subs.slice(index)
      const aggregate = (list: SubTopic[]): Material[] =>
        list.flatMap((st) =>
          st.materials.map((m) => ({ ...m, id: `${m.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` })),
        )

      const leftTopic: Topic = { ...original.topicReference, children: leftSubs }
      const rightTopic: Topic = {
        ...original.topicReference,
        id: `${original.topicReference.id}-split-${Date.now()}`,
        name: `${original.topicReference.name} (Teil 2)`,
        children: rightSubs,
      }

      const leftSpan = computeBlockSpan(engine, original.startDate, leftTopic)
      const rightSpan = computeBlockSpan(engine, engine.nextWorkDay(addDays(leftSpan.endDate, 1)), rightTopic)

      const leftBlock: ScheduledBlock = {
        ...original,
        topicReference: leftTopic,
        startDate: leftSpan.startDate,
        endDate: leftSpan.endDate,
        completedSubTopics: Math.min(original.completedSubTopics, leftSubs.length),
        materials: aggregate(leftSubs),
      }
      const rightBlock: ScheduledBlock = {
        ...original,
        id: `block-${Date.now()}`,
        topicId: rightTopic.id,
        topicReference: rightTopic,
        startDate: rightSpan.startDate,
        endDate: rightSpan.endDate,
        completedSubTopics: Math.max(0, original.completedSubTopics - leftSubs.length),
        materials: aggregate(rightSubs),
      }

      const withSplit = [...prev.map((b) => (b.id === blockId ? leftBlock : b)), rightBlock]
      return rescheduleWithCascade(engine, withSplit, rightBlock.id, rightSpan.startDate)
    })
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {curriculumLoading && (
        <div className="border-b border-border bg-muted/40 px-5 py-2 text-center text-xs text-muted-foreground">
          Lehrplan wird geladen …
        </div>
      )}
      {curriculumError && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-5 py-2 text-center text-xs text-destructive">
          {curriculumError}
        </div>
      )}
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <div>
          <h1 className="text-base font-semibold text-foreground">Lehrplan · Curriculum Planner</h1>
          <p className="text-xs text-muted-foreground">
            {blocks.length} geplante Blöcke · Schuljahr {TIMELINE_START.getFullYear()}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {view === "planner" && (
            <div className="hidden items-center gap-4 text-xs text-muted-foreground lg:flex">
              <span className="flex items-center gap-1.5">
                <span className="inline-block rounded bg-foreground px-1 py-0.5 text-[10px] font-medium text-background">
                  %
                </span>
                Verständnis
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded bg-amber-100 ring-1 ring-amber-300" /> Ferien
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded bg-neutral-200 ring-1 ring-neutral-300" /> Wochenende
              </span>
            </div>
          )}

          {/* View switcher */}
          <div className="flex items-center rounded-md border border-border bg-muted/50 p-0.5" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={view === "planner"}
              onClick={() => setView("planner")}
              className={
                view === "planner"
                  ? "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium bg-background text-foreground shadow-sm"
                  : "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              }
            >
              <CalendarDays className="size-3.5" />
              Planer
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "report"}
              onClick={() => setView("report")}
              className={
                view === "report"
                  ? "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium bg-background text-foreground shadow-sm"
                  : "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              }
            >
              <BarChart3 className="size-3.5" />
              Auswertung
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "user"}
              onClick={() => setView("user")}
              className={
                view === "user"
                  ? "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium bg-background text-foreground shadow-sm"
                  : "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              }
            >
              <UserRound className="size-3.5" />
              {user?.name ?? "Benutzer"}
            </button>
          </div>
        </div>
      </header>

      {view === "user" ? (
        <UserView
          subjects={subjects}
          topics={topics}
          students={students}
          onAddStudent={addStudent}
          onUpdateStudent={updateStudent}
          onDeleteStudent={deleteStudent}
          onAddSubject={addSubject}
          onUpdateSubject={updateSubject}
          onDeleteSubject={deleteSubject}
          onUploadFiles={uploadMaterialsForSubTopic}
          onDeleteMaterial={deleteMaterial}
        />
      ) : view === "report" ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <CurriculumReportView subjects={subjects} topics={topics} students={students} />
        </div>
      ) : (
        <>
      <YearOverview
        engine={engine}
        timelineDates={timelineDates}
        subjects={subjects}
        blocks={blocks}
        scrollRef={scrollRef}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        // Cells become droppable only once a drag starts (lane activation), so we
        // must re-measure continuously — otherwise fast/real drags land before the
        // freshly-enabled cells are measured and the drop silently fails.
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex min-h-0 flex-1">
          <CatalogSidebar
            subjects={subjects}
            topics={topics}
            onUpdateTopic={updateTopic}
            onDeleteTopic={deleteTopic}
            onAddTopic={addTopic}
            onUpdateSubTopic={updateSubTopic}
            onDeleteSubTopic={deleteSubTopic}
            onAddSubTopic={addSubTopic}
            onOpenSubTopicConfig={openSubTopicConfig}
            onOpenTopicConfig={openTopicConfig}
          />
          <TimelineGrid
            engine={engine}
            timelineDates={timelineDates}
            subjects={subjects}
            blocks={blocks}
            preview={preview}
            activeSubjectId={activeDrag?.subjectId ?? null}
            selectedBlockId={selectedBlockId}
            onSelectBlock={(id) => setSelection({ kind: "block", blockId: id })}
            scrollRef={scrollRef}
          />
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDrag && (
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm font-medium text-foreground shadow-lg">
              <GripVertical className="size-4 text-muted-foreground" />
              {activeDrag.label}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <DockedPanel
        block={selectedBlock}
        subTopic={selectedSubTopic}
        topic={selectedTopic}
        subject={selectedSubject}
        subjects={subjects}
        topics={topics}
        students={students}
        onClose={() => setSelection(null)}
        onUpdateBlock={updateBlock}
        onDeleteBlock={deleteBlock}
        onSplitBlock={splitBlock}
        onUpdateSubTopic={updateSubTopic}
        userId={user?.id}
      />
        </>
      )}
    </div>
  )
}
