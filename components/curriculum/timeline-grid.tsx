"use client"

import { useDroppable } from "@dnd-kit/core"
import { format } from "date-fns"
import { useMemo, type RefObject } from "react"
import { cn } from "@/lib/utils"
import type { CalendarEngine } from "@/lib/calendar-engine"
import { AXIS_WIDTH, COL_WIDTH, HEADER_HEIGHT, ROW_HEIGHT } from "@/lib/layout"
import { rangeToBox } from "@/lib/placement"
import { getSubjectTheme } from "@/lib/subject-theme"
import type { ScheduledBlock, Subject } from "@/lib/types"
import { ScheduledBlockView } from "./scheduled-block-view"

export interface DropPreview {
  subjectId: string
  startDate: Date
  endDate: Date
  valid: boolean
}

interface TimelineGridProps {
  engine: CalendarEngine
  timelineDates: Date[]
  subjects: Subject[]
  blocks: ScheduledBlock[]
  preview: DropPreview | null
  activeSubjectId: string | null
  selectedBlockId: string | null
  onSelectBlock: (id: string) => void
  scrollRef?: RefObject<HTMLDivElement | null>
}

export function TimelineGrid({
  engine,
  timelineDates,
  subjects,
  blocks,
  preview,
  activeSubjectId,
  selectedBlockId,
  onSelectBlock,
  scrollRef,
}: TimelineGridProps) {
  const timelineStart = timelineDates[0]
  const bodyWidth = timelineDates.length * COL_WIDTH

  const dayFlags = useMemo(
    () =>
      timelineDates.map((d) => ({
        date: d,
        iso: format(d, "yyyy-MM-dd"),
        isWork: engine.isWorkDay(d),
        isHoliday: engine.isHoliday(d),
        isMonthStart: d.getDate() === 1,
      })),
    [timelineDates, engine],
  )

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto bg-background">
      <div style={{ width: AXIS_WIDTH + bodyWidth }} className="relative">
        {/* Header row */}
        <div
          className="sticky top-0 z-30 flex border-b border-border bg-background/95 backdrop-blur"
          style={{ height: HEADER_HEIGHT }}
        >
          <div
            className="sticky left-0 z-40 flex items-end border-r border-border bg-background px-3 pb-1.5"
            style={{ width: AXIS_WIDTH }}
          >
            <span className="text-xs font-semibold text-muted-foreground">Fach / Kalender</span>
          </div>
          {dayFlags.map((d) => (
            <div
              key={d.iso}
              className={cn(
                "flex flex-col items-center justify-end border-r border-border/60 pb-1",
                // Only non-school days are shaded. Holiday wins over weekend deterministically.
                d.isHoliday ? "bg-amber-100 text-amber-800" : !d.isWork ? "bg-neutral-200 text-muted-foreground" : "",
              )}
              style={{ width: COL_WIDTH }}
            >
              {d.isMonthStart && (
                <span className="mb-0.5 whitespace-nowrap text-[9px] font-semibold uppercase text-foreground">
                  {format(d.date, "MMM")}
                </span>
              )}
              <span className="text-[9px] uppercase text-muted-foreground">{format(d.date, "EE")[0]}</span>
              <span className="text-xs font-medium tabular-nums text-foreground">{format(d.date, "d")}</span>
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex">
          {/* Subject axis */}
          <div className="sticky left-0 z-20 bg-background" style={{ width: AXIS_WIDTH }}>
            {subjects.map((s) => {
              const theme = getSubjectTheme(s.color)
              return (
                <div
                  key={s.id}
                  className={cn(
                    "flex items-center gap-2 border-b border-r border-border px-3",
                    activeSubjectId === s.id && "bg-accent",
                  )}
                  style={{ height: ROW_HEIGHT }}
                >
                  <span className={cn("h-8 w-1 rounded-full", theme.laneAccent)} aria-hidden />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {blocks.filter((b) => b.subjectId === s.id).length} Blöcke
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Lanes */}
          <div className="relative" style={{ width: bodyWidth, height: subjects.length * ROW_HEIGHT }}>
            {/* Cell grid (droppable) */}
            {subjects.map((s) => {
              const theme = getSubjectTheme(s.color)
              const laneActive = activeSubjectId === s.id
              return (
                <div key={s.id} className={cn("flex", laneActive && theme.laneTint)} style={{ height: ROW_HEIGHT }}>
                  {dayFlags.map((d) => (
                    <Cell
                      key={d.iso}
                      subjectId={s.id}
                      iso={d.iso}
                      isWork={d.isWork}
                      isHoliday={d.isHoliday}
                      droppable={laneActive}
                    />
                  ))}
                </div>
              )
            })}

            {/* Overlay: preview + blocks */}
            <div className="pointer-events-none absolute inset-0">
              {preview &&
                (() => {
                  const rowIndex = subjects.findIndex((s) => s.id === preview.subjectId)
                  if (rowIndex < 0) return null
                  const box = rangeToBox(timelineStart, preview.startDate, preview.endDate)
                  return (
                    <div
                      style={{
                        left: box.left,
                        width: box.width,
                        top: rowIndex * ROW_HEIGHT + 4,
                        height: ROW_HEIGHT - 8,
                      }}
                      className={cn(
                        "absolute rounded-xl border-2",
                        preview.valid ? "border-orange-400 bg-orange-50/80" : "border-destructive bg-red-50/80",
                      )}
                    />
                  )
                })()}

              {blocks.map((block) => {
                const rowIndex = subjects.findIndex((s) => s.id === block.subjectId)
                const subject = subjects.find((s) => s.id === block.subjectId)
                if (rowIndex < 0 || !subject) return null
                return (
                  <div key={block.id} className="pointer-events-auto">
                    <ScheduledBlockView
                      block={block}
                      subject={subject}
                      rowIndex={rowIndex}
                      engine={engine}
                      timelineStart={timelineStart}
                      selected={selectedBlockId === block.id}
                      onSelect={onSelectBlock}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface CellProps {
  subjectId: string
  iso: string
  isWork: boolean
  isHoliday: boolean
  droppable: boolean
}

function Cell({ subjectId, iso, isWork, isHoliday, droppable }: CellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell:${subjectId}:${iso}`,
    data: { subjectId, date: iso },
    disabled: !droppable,
  })

  // Only non-school days get a shade. Order matters: a live drop-target highlight
  // beats everything; otherwise holiday (amber) beats weekend (neutral); school
  // days stay unshaded (white).
  const shade = isOver
    ? "bg-orange-200"
    : isHoliday
      ? "bg-amber-100"
      : !isWork
        ? "bg-neutral-200"
        : ""

  return (
    <div
      ref={setNodeRef}
      className={cn("border-b border-r border-border/50", shade)}
      style={{ width: COL_WIDTH, height: ROW_HEIGHT }}
    />
  )
}
