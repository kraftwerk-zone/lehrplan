"use client"

import { useDraggable } from "@dnd-kit/core"
import { ChevronRight, GripVertical, Plus, SlidersHorizontal, Trash2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { getSubjectTheme } from "@/lib/subject-theme"
import { getTopicTotalDuration, type Subject, type SubTopic, type Topic } from "@/lib/types"

interface CatalogSidebarProps {
  subjects: Subject[]
  topics: Topic[]
  onUpdateTopic: (topic: Topic) => void
  onDeleteTopic: (topicId: string) => void
  onAddTopic: (subjectId: string) => void
  onUpdateSubTopic: (subTopic: SubTopic) => void
  onDeleteSubTopic: (topicId: string, subTopicId: string) => void
  onAddSubTopic: (topicId: string) => void
  onOpenSubTopicConfig: (topicId: string, subTopicId: string) => void
}

export function CatalogSidebar({
  subjects,
  topics,
  onUpdateTopic,
  onDeleteTopic,
  onAddTopic,
  onUpdateSubTopic,
  onDeleteSubTopic,
  onAddSubTopic,
  onOpenSubTopicConfig,
}: CatalogSidebarProps) {
  const [closedSubjects, setClosedSubjects] = useState<Set<string>>(new Set())

  // Resizable width (px). Drag the right-edge handle to widen/narrow the catalog.
  const MIN_WIDTH = 260
  const MAX_WIDTH = 640
  const [width, setWidth] = useState(320)
  const asideRef = useRef<HTMLElement>(null)
  const [resizing, setResizing] = useState(false)

  const startResize = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    setResizing(true)
  }, [])

  useEffect(() => {
    if (!resizing) return
    function onMove(e: PointerEvent) {
      const left = asideRef.current?.getBoundingClientRect().left ?? 0
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX - left))
      setWidth(next)
    }
    function onUp() {
      setResizing(false)
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    document.body.style.userSelect = "none"
    document.body.style.cursor = "col-resize"
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      document.body.style.userSelect = ""
      document.body.style.cursor = ""
    }
  }, [resizing])

  function toggleSubject(id: string) {
    setClosedSubjects((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <aside
      ref={asideRef}
      style={{ width }}
      className="relative flex h-full shrink-0 flex-col border-r border-border bg-sidebar"
    >
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Themenkatalog</h2>
        <p className="text-xs text-muted-foreground">Themen per Griff in den Plan ziehen</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {subjects.map((subject) => {
          const theme = getSubjectTheme(subject.color)
          const subjectTopics = topics.filter((t) => t.subjectId === subject.id)
          const isOpen = !closedSubjects.has(subject.id)
          return (
            <div key={subject.id} className="mb-1">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => toggleSubject(subject.id)}
                  className="flex flex-1 items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-accent"
                >
                  <ChevronRight
                    className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-90")}
                  />
                  <span className={cn("inline-flex size-2.5 shrink-0 rounded-full", theme.dot)} aria-hidden />
                  <span className="text-sm font-medium text-foreground">{subject.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{subjectTopics.length}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onAddTopic(subject.id)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label={`Thema zu ${subject.name} hinzufügen`}
                >
                  <Plus className="size-4" />
                </button>
              </div>

              {isOpen && (
                <div className="ml-3 space-y-1.5 border-l border-border pb-2 pl-2">
                  {subjectTopics.length === 0 && (
                    <p className="px-2 py-1 text-xs text-muted-foreground">Noch keine Themen.</p>
                  )}
                  {subjectTopics.map((topic) => (
                    <TopicCard
                      key={topic.id}
                      topic={topic}
                      subject={subject}
                      onUpdateTopic={onUpdateTopic}
                      onDeleteTopic={onDeleteTopic}
                      onUpdateSubTopic={onUpdateSubTopic}
                      onDeleteSubTopic={onDeleteSubTopic}
                      onAddSubTopic={onAddSubTopic}
                      onOpenSubTopicConfig={onOpenSubTopicConfig}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Resize handle */}
      <div
        onPointerDown={startResize}
        role="separator"
        aria-orientation="vertical"
        aria-label="Themenkatalog verbreitern"
        className={cn(
          "absolute right-0 top-0 z-50 h-full w-1.5 -translate-x-0 cursor-col-resize touch-none transition-colors hover:bg-primary/40",
          resizing && "bg-primary/60",
        )}
      />
    </aside>
  )
}

interface TopicCardProps {
  topic: Topic
  subject: Subject
  onUpdateTopic: (topic: Topic) => void
  onDeleteTopic: (topicId: string) => void
  onUpdateSubTopic: (subTopic: SubTopic) => void
  onDeleteSubTopic: (topicId: string, subTopicId: string) => void
  onAddSubTopic: (topicId: string) => void
  onOpenSubTopicConfig: (topicId: string, subTopicId: string) => void
}

function TopicCard({
  topic,
  subject,
  onUpdateTopic,
  onDeleteTopic,
  onUpdateSubTopic,
  onDeleteSubTopic,
  onAddSubTopic,
  onOpenSubTopicConfig,
}: TopicCardProps) {
  const theme = getSubjectTheme(subject.color)
  const total = getTopicTotalDuration(topic)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `topic:${topic.id}`,
    data: { kind: "topic", topic, subjectId: subject.id },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn("rounded-lg border border-border bg-card p-2 shadow-sm", isDragging && "opacity-40")}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-accent active:cursor-grabbing"
          aria-label="Thema ziehen"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <input
          value={topic.name}
          onChange={(e) => onUpdateTopic({ ...topic, name: e.target.value })}
          className="min-w-0 flex-1 rounded bg-transparent px-1 py-0.5 text-sm font-medium text-foreground outline-none focus:bg-accent"
          aria-label="Themenname"
        />
        <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", theme.chip)}>{total} T</span>
        <button
          type="button"
          onClick={() => onDeleteTopic(topic.id)}
          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label="Thema löschen"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      <div className="mt-1.5 space-y-1 pl-6">
        {topic.children.map((st) => (
          <SubTopicRow
            key={st.id}
            subTopic={st}
            subject={subject}
            onUpdateSubTopic={onUpdateSubTopic}
            onDeleteSubTopic={onDeleteSubTopic}
            onOpenSubTopicConfig={onOpenSubTopicConfig}
          />
        ))}
        <button
          type="button"
          onClick={() => onAddSubTopic(topic.id)}
          className="flex items-center gap-1 rounded px-1 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus className="size-3.5" /> Unterthema
        </button>
      </div>
    </div>
  )
}

interface SubTopicRowProps {
  subTopic: SubTopic
  subject: Subject
  onUpdateSubTopic: (subTopic: SubTopic) => void
  onDeleteSubTopic: (topicId: string, subTopicId: string) => void
  onOpenSubTopicConfig: (topicId: string, subTopicId: string) => void
}

function SubTopicRow({ subTopic, subject, onUpdateSubTopic, onDeleteSubTopic, onOpenSubTopicConfig }: SubTopicRowProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `subtopic:${subTopic.id}`,
    data: { kind: "subtopic", subTopic, subjectId: subject.id },
  })

  function setNumber(field: "durationInDays" | "bufferInDays", value: string) {
    const n = Math.max(0, Math.min(60, Number.parseInt(value || "0", 10) || 0))
    onUpdateSubTopic({ ...subTopic, [field]: n })
  }

  const materialCount = subTopic.materials.length

  return (
    <div
      ref={setNodeRef}
      className={cn("rounded-md border border-border/60 bg-muted/40", isDragging && "opacity-40")}
    >
      <div className="flex items-center gap-1 px-1 py-1">
        <button
          type="button"
          className="cursor-grab touch-none rounded p-0.5 text-muted-foreground hover:bg-accent active:cursor-grabbing"
          aria-label="Unterthema ziehen"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" />
        </button>
        <input
          value={subTopic.name}
          onChange={(e) => onUpdateSubTopic({ ...subTopic, name: e.target.value })}
          className="min-w-0 flex-1 rounded bg-transparent px-1 py-0.5 text-xs text-foreground outline-none focus:bg-accent"
          aria-label="Unterthema-Name"
        />
        <label className="flex items-center gap-0.5 text-[10px] text-muted-foreground" title="Unterrichtstage">
          <input
            type="number"
            min={0}
            value={subTopic.durationInDays}
            onChange={(e) => setNumber("durationInDays", e.target.value)}
            className="w-8 rounded border border-border bg-background px-1 py-0.5 text-center text-[11px] text-foreground outline-none focus:ring-1 focus:ring-ring"
            aria-label="Unterrichtstage"
          />
        </label>
        <label className="flex items-center gap-0.5 text-[10px] text-muted-foreground" title="Puffertage">
          <span className="text-[9px]">+</span>
          <input
            type="number"
            min={0}
            value={subTopic.bufferInDays}
            onChange={(e) => setNumber("bufferInDays", e.target.value)}
            className="w-8 rounded border border-dashed border-border bg-background px-1 py-0.5 text-center text-[11px] text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
            aria-label="Puffertage"
          />
        </label>
        <button
          type="button"
          onClick={() => onOpenSubTopicConfig(subTopic.topicId, subTopic.id)}
          className="relative rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Konfiguration öffnen"
          title="Konfiguration, Materialien & Punkte"
        >
          <SlidersHorizontal className="size-3.5" />
          {materialCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex size-3 items-center justify-center rounded-full bg-primary text-[8px] font-semibold text-primary-foreground">
              {materialCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onDeleteSubTopic(subTopic.topicId, subTopic.id)}
          className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label="Unterthema löschen"
        >
          <Trash2 className="size-3" />
        </button>
      </div>
    </div>
  )
}


