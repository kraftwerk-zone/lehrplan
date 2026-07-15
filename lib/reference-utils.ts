import type { Reference, ReferenceType, Student, StudentRating, SubTopic, Topic } from "./types"

export const REFERENCE_TYPES: ReferenceType[] = ["material", "book", "other"]

export const REFERENCE_TYPE_LABELS: Record<ReferenceType, string> = {
  material: "Materialverweise",
  book: "Buchverweise",
  other: "Andere Verweise",
}

export function createReference(type: ReferenceType): Reference {
  return {
    id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    text: "",
    ratings: {},
  }
}

export function sortedStudents(students: Student[]): Student[] {
  return [...students].sort((a, b) => a.name.localeCompare(b.name, "de"))
}

export function isNaRating(value: StudentRating | undefined): boolean {
  return value === "NA"
}

export function isNumericRating(value: StudentRating | undefined): value is number {
  return typeof value === "number" && !Number.isNaN(value)
}

/** Converts legacy sub-topic points into a single reference row. */
export function referencesFromLegacyPoints(subTopicId: string, points: Record<string, number>): Reference[] {
  if (Object.keys(points).length === 0) return []
  return [
    {
      id: `ref-legacy-${subTopicId}`,
      type: "other",
      text: "Übernommene Punkte",
      ratings: { ...points },
    },
  ]
}

export function normalizeReferences(
  subTopicId: string,
  references: Reference[] | undefined,
  legacyPoints: Record<string, number> | undefined,
): Reference[] {
  const list = references ?? []
  if (list.length > 0) return list
  return referencesFromLegacyPoints(subTopicId, legacyPoints ?? {})
}

export function removeStudentFromReferences(references: Reference[], studentId: string): Reference[] {
  return references.map((ref) => {
    if (!(studentId in ref.ratings)) return ref
    const { [studentId]: _removed, ...rest } = ref.ratings
    return { ...ref, ratings: rest }
  })
}

export interface StudentAggregate {
  studentId: string
  studentName: string
  totalPoints: number
  naCount: number
  ratedCount: number
  average: number | null
}

function aggregateRatings(
  students: Student[],
  collectRating: (studentId: string) => StudentRating | undefined,
): StudentAggregate[] {
  return sortedStudents(students).map((student) => {
    const rating = collectRating(student.id)
    let totalPoints = 0
    let naCount = 0
    let ratedCount = 0

    if (isNaRating(rating)) {
      naCount = 1
    } else if (isNumericRating(rating)) {
      totalPoints = rating
      ratedCount = 1
    }

    return {
      studentId: student.id,
      studentName: student.name,
      totalPoints,
      naCount,
      ratedCount,
      average: ratedCount > 0 ? totalPoints / ratedCount : null,
    }
  })
}

export function aggregateSubTopicReferences(subTopic: SubTopic, students: Student[]): StudentAggregate[] {
  return sortedStudents(students).map((student) => {
    let totalPoints = 0
    let naCount = 0
    let ratedCount = 0

    for (const ref of subTopic.references) {
      const rating = ref.ratings[student.id]
      if (isNaRating(rating)) naCount++
      else if (isNumericRating(rating)) {
        totalPoints += rating
        ratedCount++
      }
    }

    return {
      studentId: student.id,
      studentName: student.name,
      totalPoints,
      naCount,
      ratedCount,
      average: ratedCount > 0 ? totalPoints / ratedCount : null,
    }
  })
}

export function aggregateTopicReferences(topic: Topic, students: Student[]): StudentAggregate[] {
  return sortedStudents(students).map((student) => {
    let totalPoints = 0
    let naCount = 0
    let ratedCount = 0

    for (const subTopic of topic.children) {
      for (const ref of subTopic.references) {
        const rating = ref.ratings[student.id]
        if (isNaRating(rating)) naCount++
        else if (isNumericRating(rating)) {
          totalPoints += rating
          ratedCount++
        }
      }
    }

    return {
      studentId: student.id,
      studentName: student.name,
      totalPoints,
      naCount,
      ratedCount,
      average: ratedCount > 0 ? totalPoints / ratedCount : null,
    }
  })
}

export function aggregateReferenceRatings(reference: Reference, students: Student[]): StudentAggregate[] {
  return aggregateRatings(students, (studentId) => reference.ratings[studentId])
}

export function formatAverage(value: number | null): string {
  if (value === null) return "—"
  return value.toFixed(1)
}

export function formatRating(value: StudentRating | undefined): string {
  if (value === undefined) return ""
  if (isNaRating(value)) return "NA"
  return String(value)
}
