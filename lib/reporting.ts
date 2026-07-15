import * as XLSX from "xlsx"
import {
  REFERENCE_TYPE_LABELS,
  aggregateTopicReferences,
  formatAverage,
  formatRating,
  sortedStudents,
} from "./reference-utils"
import type { ReferenceType, Student, Subject, Topic } from "./types"

export interface ReportDetailRow {
  subjectName: string
  topicName: string
  subTopicName: string
  referenceType: string
  referenceText: string
  studentName: string
  rating: string
}

export interface ReportStudentSummary {
  studentName: string
  totalPoints: number
  naCount: number
  average: number | null
}

export interface CurriculumReport {
  details: ReportDetailRow[]
  summaries: ReportStudentSummary[]
}

export function buildCurriculumReport(subjects: Subject[], topics: Topic[], students: Student[]): CurriculumReport {
  const subjectById = new Map(subjects.map((s) => [s.id, s.name]))
  const details: ReportDetailRow[] = []

  for (const topic of topics) {
    const subjectName = subjectById.get(topic.subjectId) ?? "—"
    for (const subTopic of topic.children) {
      for (const ref of subTopic.references) {
        for (const student of sortedStudents(students)) {
          details.push({
            subjectName,
            topicName: topic.name,
            subTopicName: subTopic.name,
            referenceType: REFERENCE_TYPE_LABELS[ref.type as ReferenceType] ?? ref.type,
            referenceText: ref.text,
            studentName: student.name,
            rating: formatRating(ref.ratings[student.id]),
          })
        }
      }
    }
  }

  const globalByStudent = new Map<string, { total: number; na: number; rated: number }>()
  for (const student of sortedStudents(students)) {
    globalByStudent.set(student.name, { total: 0, na: 0, rated: 0 })
  }

  for (const row of details) {
    const entry = globalByStudent.get(row.studentName)
    if (!entry) continue
    if (row.rating === "NA") entry.na++
    else if (row.rating !== "") {
      entry.total += Number(row.rating)
      entry.rated++
    }
  }

  const summaries: ReportStudentSummary[] = sortedStudents(students).map((student) => {
    const entry = globalByStudent.get(student.name) ?? { total: 0, na: 0, rated: 0 }
    return {
      studentName: student.name,
      totalPoints: entry.total,
      naCount: entry.na,
      average: entry.rated > 0 ? entry.total / entry.rated : null,
    }
  })

  return { details, summaries }
}

export function downloadCurriculumReportExcel(subjects: Subject[], topics: Topic[], students: Student[]): void {
  const report = buildCurriculumReport(subjects, topics, students)
  const workbook = XLSX.utils.book_new()

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["Kind", "Summe Punkte", "NA Anzahl", "Durchschnitt (ohne NA)"],
    ...report.summaries.map((row) => [
      row.studentName,
      row.totalPoints,
      row.naCount,
      row.average !== null ? Number(row.average.toFixed(2)) : "",
    ]),
  ])
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Zusammenfassung")

  const detailSheet = XLSX.utils.aoa_to_sheet([
    ["Fach", "Thema", "Unterthema", "Verweistyp", "Verweis", "Kind", "Bewertung"],
    ...report.details.map((row) => [
      row.subjectName,
      row.topicName,
      row.subTopicName,
      row.referenceType,
      row.referenceText,
      row.studentName,
      row.rating,
    ]),
  ])
  XLSX.utils.book_append_sheet(workbook, detailSheet, "Detail")

  const filename = `lehrplan-auswertung-${new Date().toISOString().slice(0, 10)}.xlsx`
  XLSX.writeFile(workbook, filename)
}

/** Per-topic summary rows (for aggregated topic panel). */
export function topicReportSummaries(topic: Topic, students: Student[]): ReportStudentSummary[] {
  return aggregateTopicReferences(topic, students).map((row) => ({
    studentName: row.studentName,
    totalPoints: row.totalPoints,
    naCount: row.naCount,
    average: row.average,
  }))
}
