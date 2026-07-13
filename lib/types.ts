// Domain model for the Professional Curriculum Planner (Lehrplan)

export type SubjectColor = "blue" | "emerald" | "amber" | "sky" | "rose"

export interface Subject {
  id: string
  name: string
  color: SubjectColor // Semantic color mapping -> lane + block palette
}

export interface Material {
  id: string
  name: string
  // Optional folder path (segments separated by "/") used to render the
  // file-tree view, e.g. "Arbeitsblätter/Woche 1". Empty/undefined = root.
  folder?: string
  /** Supabase Storage path when the material is an uploaded file. */
  storagePath?: string
}

/** A pupil in the class roster (managed below the catalog). */
export interface Student {
  id: string
  name: string
}

export interface SubTopic {
  id: string
  topicId: string
  name: string
  durationInDays: number // active teaching time (work days)
  bufferInDays: number // PufferDays for overflow / review (work days)
  materials: Material[]
  // Points awarded per pupil for this sub-topic. Keyed by Student.id.
  points: Record<string, number>
  differentiation: {
    support: string
    challenge: string
  }
}

export interface Topic {
  id: string
  subjectId: string
  name: string
  children: SubTopic[]
}

export interface ScheduledBlock {
  id: string
  topicId: string
  subjectId: string
  startDate: Date
  endDate: Date // Calculated purely via CalendarEngine
  topicReference: Topic // Synthetic snapshot of the Topic at drop-time
  understandingLevel: number // 0-100 slider value
  completedSubTopics: number
  differentiation: {
    support: string
    challenge: string
  }
  materials: Material[]
}

export interface DateRange {
  start: Date
  end: Date
}

// ---- Derived helpers -------------------------------------------------------

/**
 * Total Topic Duration = Σ(SubTopic[i].durationInDays + SubTopic[i].bufferInDays)
 * Pure, derived calculation.
 */
export function getTopicTotalDuration(topic: Topic): number {
  return topic.children.reduce((sum, st) => sum + st.durationInDays + st.bufferInDays, 0)
}
