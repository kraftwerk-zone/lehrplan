import { addDays, eachDayOfInterval, isWeekend, isWithinInterval, startOfDay } from "date-fns"
import type { DateRange, ScheduledBlock } from "./types"

/**
 * The CalendarEngine is the single source of truth for date arithmetic.
 * School planning does not align with standard chronological time, so we skip
 * weekends and registered holidays when consuming instructional days.
 */
export class CalendarEngine {
  private holidays: DateRange[]

  constructor(holidays: DateRange[] = []) {
    this.holidays = holidays.map((h) => ({
      start: startOfDay(h.start),
      end: startOfDay(h.end),
    }))
  }

  /** A work day is not a weekend and not inside any registered holiday interval. */
  isWorkDay(date: Date): boolean {
    const d = startOfDay(date)
    if (isWeekend(d)) return false
    for (const h of this.holidays) {
      if (isWithinInterval(d, { start: h.start, end: h.end })) return false
    }
    return true
  }

  isHoliday(date: Date): boolean {
    const d = startOfDay(date)
    if (isWeekend(d)) return false
    return this.holidays.some((h) => isWithinInterval(d, { start: h.start, end: h.end }))
  }

  /**
   * Returns the first work day on or after the provided date.
   */
  nextWorkDay(date: Date): Date {
    let cursor = startOfDay(date)
    // Safety bound to avoid infinite loops (e.g. a year of holidays).
    let guard = 0
    while (!this.isWorkDay(cursor) && guard < 366) {
      cursor = addDays(cursor, 1)
      guard++
    }
    return cursor
  }

  /**
   * Loops chronologically, decrementing the required day count only when the
   * evaluated date resolves to a work day. A 3-day SubTopic starting Friday
   * therefore maps to Friday, Monday and Tuesday.
   *
   * Returns the date of the LAST consumed work day (inclusive end).
   */
  calculateEndDate(startDate: Date, totalDays: number, bufferDays = 0): Date {
    const required = Math.max(1, totalDays + bufferDays)
    let cursor = this.nextWorkDay(startDate)
    let consumed = 0
    let guard = 0

    while (guard < 366 * 3) {
      if (this.isWorkDay(cursor)) {
        consumed++
        if (consumed >= required) return cursor
      }
      cursor = addDays(cursor, 1)
      guard++
    }
    return cursor
  }

  /** Returns the first work day on or before the provided date. */
  previousWorkDay(date: Date): Date {
    let cursor = startOfDay(date)
    let guard = 0
    while (!this.isWorkDay(cursor) && guard < 366) {
      cursor = addDays(cursor, -1)
      guard++
    }
    return cursor
  }

  /**
   * Given an inclusive end date and a work-day length, returns the start work
   * day such that exactly `workDayCount` work days span [start, endDate].
   * Used by the cascade to push preceding blocks earlier while preserving length.
   */
  startForEnd(endDate: Date, workDayCount: number): Date {
    const required = Math.max(1, workDayCount)
    let cursor = this.previousWorkDay(endDate)
    let counted = 1
    let guard = 0
    while (counted < required && guard < 366 * 3) {
      cursor = addDays(cursor, -1)
      if (this.isWorkDay(cursor)) counted++
      guard++
    }
    return cursor
  }

  /**
   * Generates a continuous array of Date objects representing the visible grid,
   * agnostic of work days. The UI styles weekends/holidays using the flags above.
   */
  generateTimeline(start: Date, end: Date): Date[] {
    return eachDayOfInterval({ start: startOfDay(start), end: startOfDay(end) })
  }

  /** Count of work days between two inclusive dates. */
  countWorkDays(start: Date, end: Date): number {
    return this.generateTimeline(start, end).filter((d) => this.isWorkDay(d)).length
  }

  /**
   * Collision detection isolated to a single Subject.
   * Overlap: Max(StartA, StartB) <= Min(EndA, EndB).
   */
  hasCollision(
    candidate: { subjectId: string; startDate: Date; endDate: Date },
    blocks: ScheduledBlock[],
    ignoreBlockId?: string,
  ): boolean {
    const cs = startOfDay(candidate.startDate).getTime()
    const ce = startOfDay(candidate.endDate).getTime()
    return blocks.some((b) => {
      if (b.id === ignoreBlockId) return false
      if (b.subjectId !== candidate.subjectId) return false
      const bs = startOfDay(b.startDate).getTime()
      const be = startOfDay(b.endDate).getTime()
      return Math.max(cs, bs) <= Math.min(ce, be)
    })
  }
}
