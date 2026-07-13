"use client"

import { format } from "date-fns"
import { de } from "date-fns/locale"
import { useEffect, useMemo, useState, type RefObject } from "react"
import { cn } from "@/lib/utils"
import type { CalendarEngine } from "@/lib/calendar-engine"
import { AXIS_WIDTH, COL_WIDTH } from "@/lib/layout"
import { getSubjectTheme } from "@/lib/subject-theme"
import type { ScheduledBlock, Subject } from "@/lib/types"

interface YearOverviewProps {
  engine: CalendarEngine
  timelineDates: Date[]
  subjects: Subject[]
  blocks: ScheduledBlock[]
  scrollRef: RefObject<HTMLDivElement | null>
}

interface MonthGroup {
  key: string
  label: string
  startIndex: number
  dayCount: number
}

export function YearOverview({ engine, timelineDates, subjects, blocks, scrollRef }: YearOverviewProps) {
  const totalDays = timelineDates.length

  // Group the flat day list into calendar months for proportional segments.
  const months = useMemo<MonthGroup[]>(() => {
    const groups: MonthGroup[] = []
    timelineDates.forEach((d, i) => {
      const key = format(d, "yyyy-MM")
      const last = groups[groups.length - 1]
      if (last && last.key === key) {
        last.dayCount += 1
      } else {
        groups.push({ key, label: format(d, "MMM yy", { locale: de }), startIndex: i, dayCount: 1 })
      }
    })
    return groups
  }, [timelineDates])

  // Holiday spans as percentage bands across the whole bar.
  const holidayBands = useMemo(() => {
    const bands: { left: number; width: number }[] = []
    let runStart = -1
    timelineDates.forEach((d, i) => {
      const holiday = engine.isHoliday(d)
      if (holiday && runStart === -1) runStart = i
      if ((!holiday || i === timelineDates.length - 1) && runStart !== -1) {
        const end = holiday ? i + 1 : i
        bands.push({ left: (runStart / totalDays) * 100, width: ((end - runStart) / totalDays) * 100 })
        runStart = -1
      }
    })
    return bands
  }, [timelineDates, engine, totalDays])

  // Block bars per subject lane (mini timeline).
  const blockBars = useMemo(() => {
    const startIso = timelineDates[0]
    return blocks
      .map((b) => {
        const startIdx = timelineDates.findIndex((d) => d >= b.startDate)
        const endIdx = timelineDates.findIndex((d) => d >= b.endDate)
        const rowIndex = subjects.findIndex((s) => s.id === b.subjectId)
        if (startIdx < 0 || rowIndex < 0) return null
        const end = endIdx < 0 ? totalDays - 1 : endIdx
        const subject = subjects.find((s) => s.id === b.subjectId)!
        return {
          id: b.id,
          left: (startIdx / totalDays) * 100,
          width: (Math.max(1, end - startIdx + 1) / totalDays) * 100,
          rowIndex,
          color: getSubjectTheme(subject.color).dot,
        }
      })
      .filter(Boolean) as { id: string; left: number; width: number; rowIndex: number; color: string }[]
    // startIso referenced to keep dependency explicit
  }, [blocks, timelineDates, subjects, totalDays])

  // ---- Live viewport indicator ----
  const [viewport, setViewport] = useState({ left: 0, width: 100 })

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    function update() {
      const node = scrollRef.current
      if (!node) return
      const startDay = node.scrollLeft / COL_WIDTH
      const visibleDays = (node.clientWidth - AXIS_WIDTH) / COL_WIDTH
      setViewport({
        left: Math.max(0, (startDay / totalDays) * 100),
        width: Math.min(100, (visibleDays / totalDays) * 100),
      })
    }
    update()
    el.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    return () => {
      el.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [scrollRef, totalDays, blocks.length])

  function scrollToIndex(index: number) {
    scrollRef.current?.scrollTo({ left: index * COL_WIDTH, behavior: "smooth" })
  }

  function scrollToFraction(fraction: number) {
    const index = Math.round(fraction * totalDays)
    scrollToIndex(index)
  }

  const laneCount = subjects.length

  return (
    <div className="border-b border-border bg-muted/30 px-5 py-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Schuljahresübersicht
        </span>
        <span className="text-[11px] text-muted-foreground">
          {format(timelineDates[0], "d. MMM yyyy", { locale: de })} –{" "}
          {format(timelineDates[totalDays - 1], "d. MMM yyyy", { locale: de })}
        </span>
      </div>

      <div
        className="relative select-none overflow-hidden rounded-md border border-border bg-card"
        onPointerDown={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          scrollToFraction((e.clientX - rect.left) / rect.width)
        }}
        role="slider"
        aria-label="Zeitraum im Kalender wählen"
        aria-valuenow={Math.round(viewport.left)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
      >
        {/* Month segments */}
        <div className="flex h-5 border-b border-border">
          {months.map((m) => (
            <button
              key={m.key}
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation()
                scrollToIndex(m.startIndex)
              }}
              style={{ width: `${(m.dayCount / totalDays) * 100}%` }}
              className="flex items-center justify-center overflow-hidden whitespace-nowrap border-r border-border/60 text-[10px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Mini timeline (holiday bands + block bars per lane) */}
        <div className="relative" style={{ height: laneCount * 8 + 6 }}>
          {holidayBands.map((b, i) => (
            <div
              key={`h-${i}`}
              className="absolute top-0 bottom-0 bg-amber-100"
              style={{ left: `${b.left}%`, width: `${b.width}%` }}
              aria-hidden
            />
          ))}
          {blockBars.map((b) => (
            <div
              key={b.id}
              className={cn("absolute h-1.5 rounded-full", b.color)}
              style={{ left: `${b.left}%`, width: `${b.width}%`, top: b.rowIndex * 8 + 4 }}
              aria-hidden
            />
          ))}

          {/* Viewport indicator */}
          <div
            className="pointer-events-none absolute top-0 bottom-0 rounded border-2 border-primary/70 bg-primary/10"
            style={{ left: `${viewport.left}%`, width: `${viewport.width}%` }}
            aria-hidden
          />
        </div>
      </div>
    </div>
  )
}
