import { addDays, startOfDay } from "date-fns"
import type { CalendarEngine } from "./calendar-engine"
import { computeBlockSpan } from "./placement"
import { getTopicTotalDuration, type ScheduledBlock } from "./types"

/**
 * Re-positions a single block to a new start date and cascades the change to
 * neighbouring blocks in the SAME subject lane:
 *   - blocks lying AFTER the anchor are pushed later (forward) if they collide,
 *   - blocks lying BEFORE the anchor are pushed earlier (backward) if they collide.
 * Relative order is always preserved and every block keeps its work-day length.
 */
export function rescheduleWithCascade(
  engine: CalendarEngine,
  blocks: ScheduledBlock[],
  anchorId: string,
  newRawStart: Date,
): ScheduledBlock[] {
  const anchor = blocks.find((b) => b.id === anchorId)
  if (!anchor) return blocks

  // 1. Re-span the anchor at its new location.
  const anchorSpan = computeBlockSpan(engine, newRawStart, anchor.topicReference)
  const next = new Map<string, ScheduledBlock>(blocks.map((b) => [b.id, b]))
  next.set(anchorId, { ...anchor, startDate: anchorSpan.startDate, endDate: anchorSpan.endDate })

  const laneOthers = blocks.filter((b) => b.subjectId === anchor.subjectId && b.id !== anchorId)

  // 2. Forward pass: push blocks that start on/after the anchor.
  const rightGroup = laneOthers
    .filter((b) => startOfDay(b.startDate).getTime() >= startOfDay(anchorSpan.startDate).getTime())
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())

  let cursorEnd = anchorSpan.endDate
  for (const block of rightGroup) {
    const overlaps = startOfDay(block.startDate).getTime() <= startOfDay(cursorEnd).getTime()
    if (overlaps) {
      const newStart = engine.nextWorkDay(addDays(cursorEnd, 1))
      const span = computeBlockSpan(engine, newStart, block.topicReference)
      next.set(block.id, { ...block, startDate: span.startDate, endDate: span.endDate })
      cursorEnd = span.endDate
    } else {
      cursorEnd = block.endDate
    }
  }

  // 3. Backward pass: push blocks that start before the anchor.
  const leftGroup = laneOthers
    .filter((b) => startOfDay(b.startDate).getTime() < startOfDay(anchorSpan.startDate).getTime())
    .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())

  let cursorStart = anchorSpan.startDate
  for (const block of leftGroup) {
    const overlaps = startOfDay(block.endDate).getTime() >= startOfDay(cursorStart).getTime()
    if (overlaps) {
      const latestEnd = engine.previousWorkDay(addDays(cursorStart, -1))
      const length = getTopicTotalDuration(block.topicReference)
      const newStart = engine.startForEnd(latestEnd, length)
      const span = computeBlockSpan(engine, newStart, block.topicReference)
      next.set(block.id, { ...block, startDate: span.startDate, endDate: span.endDate })
      cursorStart = span.startDate
    } else {
      cursorStart = block.startDate
    }
  }

  return blocks.map((b) => next.get(b.id) ?? b)
}
