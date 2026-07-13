import { addDays, differenceInDays } from "date-fns"
import type { CalendarEngine } from "./calendar-engine"
import { COL_WIDTH } from "./layout"
import type { Topic } from "./types"

export interface SubTopicSpan {
  subTopicId: string
  name: string
  startDate: Date
  activeEndDate: Date // last active teaching day (before buffer)
  endDate: Date // last buffer day
  durationInDays: number
  bufferInDays: number
}

export interface BlockSpan {
  startDate: Date
  endDate: Date
  subSpans: SubTopicSpan[]
}

/**
 * Given a drop start date and a Topic snapshot, compute the exact chronological
 * span of the block and each of its SubTopics, skipping weekends/holidays.
 */
export function computeBlockSpan(engine: CalendarEngine, rawStart: Date, topic: Topic): BlockSpan {
  const subSpans: SubTopicSpan[] = []
  let cursor = engine.nextWorkDay(rawStart)

  for (const st of topic.children) {
    const startDate = engine.nextWorkDay(cursor)
    const activeEndDate = engine.calculateEndDate(startDate, st.durationInDays)
    const endDate =
      st.bufferInDays > 0 ? engine.calculateEndDate(startDate, st.durationInDays + st.bufferInDays) : activeEndDate

    subSpans.push({
      subTopicId: st.id,
      name: st.name,
      startDate,
      activeEndDate,
      endDate,
      durationInDays: st.durationInDays,
      bufferInDays: st.bufferInDays,
    })

    cursor = addDays(endDate, 1)
  }

  const startDate = subSpans.length ? subSpans[0].startDate : engine.nextWorkDay(rawStart)
  const endDate = subSpans.length ? subSpans[subSpans.length - 1].endDate : startDate

  return { startDate, endDate, subSpans }
}

/** Column index of a date relative to the timeline start. */
export function dateToIndex(timelineStart: Date, date: Date): number {
  return differenceInDays(date, timelineStart)
}

/** Absolute left / width (px) for an inclusive date range on the grid. */
export function rangeToBox(timelineStart: Date, start: Date, end: Date) {
  const startIndex = dateToIndex(timelineStart, start)
  const endIndex = dateToIndex(timelineStart, end)
  return {
    left: startIndex * COL_WIDTH,
    width: (endIndex - startIndex + 1) * COL_WIDTH,
    startIndex,
    endIndex,
  }
}
