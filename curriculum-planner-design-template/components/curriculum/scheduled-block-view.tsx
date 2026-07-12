"use client"

import { useDraggable } from "@dnd-kit/core"
import { useMemo } from "react"
import { cn } from "@/lib/utils"
import type { CalendarEngine } from "@/lib/calendar-engine"
import { BLOCK_INSET, COL_WIDTH, ROW_HEIGHT } from "@/lib/layout"
import { computeBlockSpan, dateToIndex, rangeToBox } from "@/lib/placement"
import { getSubjectTheme } from "@/lib/subject-theme"
import type { ScheduledBlock, Subject } from "@/lib/types"

interface ScheduledBlockViewProps {
  block: ScheduledBlock
  subject: Subject
  rowIndex: number
  engine: CalendarEngine
  timelineStart: Date
  selected: boolean
  onSelect: (id: string) => void
}

export function ScheduledBlockView({
  block,
  subject,
  rowIndex,
  engine,
  timelineStart,
  selected,
  onSelect,
}: ScheduledBlockViewProps) {
  // Memoized coordinate calculation (design-doc mitigation for the O(n^2) render).
  const { box, subSpans } = useMemo(() => {
    const span = computeBlockSpan(engine, block.startDate, block.topicReference)
    return {
      box: rangeToBox(timelineStart, block.startDate, block.endDate),
      subSpans: span.subSpans,
    }
  }, [engine, block.startDate, block.endDate, block.topicReference, timelineStart])

  // Always render in the subject's colour; the understanding level is conveyed
  // by the percentage badge instead of desaturating the block.
  const palette = getSubjectTheme(subject.color)

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `block:${block.id}`,
    data: { kind: "block", blockId: block.id, subjectId: block.subjectId, topic: block.topicReference },
  })

  const top = rowIndex * ROW_HEIGHT + BLOCK_INSET
  const height = ROW_HEIGHT - BLOCK_INSET * 2
  const blockStartIndex = dateToIndex(timelineStart, block.startDate)

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onSelect(block.id)}
      style={{ left: box.left, width: box.width, top, height }}
      className={cn(
        "group absolute flex cursor-grab flex-col overflow-hidden rounded-xl border text-left shadow-sm transition-shadow active:cursor-grabbing",
        palette.blockBg,
        palette.blockText,
        palette.blockBorder,
        selected && "ring-2 ring-foreground/70",
        isDragging && "opacity-40",
        "hover:shadow-md",
      )}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-center justify-between gap-2 px-2 pt-1.5">
        <span className="truncate text-xs font-semibold">{block.topicReference.name}</span>
        <span className="shrink-0 rounded-full bg-background/50 px-1.5 text-[10px] font-medium tabular-nums">
          {block.understandingLevel}%
        </span>
      </div>

      {/* Bubble-in-bubble: SubTopics mapped as absolute children */}
      <div className="relative mt-1 flex-1">
        {subSpans.map((sub) => {
          const subStartIndex = dateToIndex(timelineStart, sub.startDate)
          const subEndIndex = dateToIndex(timelineStart, sub.endDate)
          const activeEndIndex = dateToIndex(timelineStart, sub.activeEndDate)
          const left = (subStartIndex - blockStartIndex) * COL_WIDTH
          const width = (subEndIndex - subStartIndex + 1) * COL_WIDTH
          const activeWidth = (activeEndIndex - subStartIndex + 1) * COL_WIDTH
          return (
            <div
              key={sub.subTopicId}
              style={{ left: left + 2, width: width - 4 }}
              className={cn(
                "absolute bottom-1 top-0 overflow-hidden rounded-md border",
                palette.subBg,
                palette.subBorder,
              )}
              title={`${sub.name} · ${sub.durationInDays} T + ${sub.bufferInDays} Puffer`}
            >
              {/* Buffer tail (dashed) */}
              {sub.bufferInDays > 0 && (
                <div
                  style={{ left: activeWidth - 4, right: 0 }}
                  className="absolute inset-y-0 border-l border-dashed border-current/40 bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,currentColor_3px,currentColor_4px)] opacity-20"
                  aria-hidden
                />
              )}
              <span className="relative block truncate px-1.5 py-0.5 text-[10px] font-medium leading-tight">
                {sub.name}
              </span>
            </div>
          )
        })}
      </div>
    </button>
  )
}
