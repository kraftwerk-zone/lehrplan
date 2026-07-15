import * as XLSX from "xlsx"
import { REFERENCE_TYPE_LABELS, aggregateTopicReferences, formatRating, sortedStudents } from "./reference-utils"
import type { ReferenceType, Student, Subject, Topic } from "./types"

export interface ReportReferenceNode {
  id: string
  typeLabel: string
  text: string
  studentRatings: { studentName: string; rating: string }[]
}

export interface ReportSubTopicNode {
  id: string
  name: string
  references: ReportReferenceNode[]
}

export interface ReportTopicNode {
  id: string
  name: string
  subjectName: string
  subTopics: ReportSubTopicNode[]
}

export interface ReportStudentSummary {
  studentName: string
  totalPoints: number
  ratingCount: number
  naCount: number
  average: number | null
}

export interface CurriculumReport {
  tree: ReportTopicNode[]
  summaries: ReportStudentSummary[]
}

export function buildCurriculumReport(subjects: Subject[], topics: Topic[], students: Student[]): CurriculumReport {
  const subjectById = new Map(subjects.map((s) => [s.id, s.name]))
  const subjectOrder = subjects.map((s) => s.id)
  const orderedStudents = sortedStudents(students)

  const sortedTopics = [...topics].sort((a, b) => {
    const subjectIdx = subjectOrder.indexOf(a.subjectId) - subjectOrder.indexOf(b.subjectId)
    if (subjectIdx !== 0) return subjectIdx
    return a.name.localeCompare(b.name, "de")
  })

  const tree: ReportTopicNode[] = []

  for (const topic of sortedTopics) {
    const subTopics: ReportSubTopicNode[] = []

    for (const subTopic of topic.children) {
      if (subTopic.references.length === 0) continue

      subTopics.push({
        id: subTopic.id,
        name: subTopic.name,
        references: subTopic.references.map((ref) => ({
          id: ref.id,
          typeLabel: REFERENCE_TYPE_LABELS[ref.type as ReferenceType] ?? ref.type,
          text: ref.text,
          studentRatings: orderedStudents.map((student) => ({
            studentName: student.name,
            rating: formatRating(ref.ratings[student.id]),
          })),
        })),
      })
    }

    if (subTopics.length === 0) continue

    tree.push({
      id: topic.id,
      name: topic.name,
      subjectName: subjectById.get(topic.subjectId) ?? "—",
      subTopics,
    })
  }

  const globalByStudent = new Map<string, { total: number; na: number; rated: number }>()
  for (const student of orderedStudents) {
    globalByStudent.set(student.name, { total: 0, na: 0, rated: 0 })
  }

  for (const topic of tree) {
    for (const subTopic of topic.subTopics) {
      for (const ref of subTopic.references) {
        for (const { studentName, rating } of ref.studentRatings) {
          const entry = globalByStudent.get(studentName)
          if (!entry) continue
          if (rating === "NA") entry.na++
          else if (rating !== "") {
            entry.total += Number(rating)
            entry.rated++
          }
        }
      }
    }
  }

  const summaries: ReportStudentSummary[] = orderedStudents.map((student) => {
    const entry = globalByStudent.get(student.name) ?? { total: 0, na: 0, rated: 0 }
    return {
      studentName: student.name,
      totalPoints: entry.total,
      ratingCount: entry.rated,
      naCount: entry.na,
      average: entry.rated > 0 ? entry.total / entry.rated : null,
    }
  })

  return { tree, summaries }
}

export function countReportReferences(tree: ReportTopicNode[]): number {
  return tree.reduce(
    (sum, topic) => sum + topic.subTopics.reduce((subSum, subTopic) => subSum + subTopic.references.length, 0),
    0,
  )
}

export function downloadCurriculumReportExcel(subjects: Subject[], topics: Topic[], students: Student[]): void {
  const report = buildCurriculumReport(subjects, topics, students)
  const workbook = XLSX.utils.book_new()

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["Kind", "Summe Punkte", "Anzahl Bewertungen", "NA Anzahl", "Durchschnitt (ohne NA)"],
    ...report.summaries.map((row) => [
      row.studentName,
      row.totalPoints,
      row.ratingCount,
      row.naCount,
      row.average !== null ? Number(row.average.toFixed(2)) : "",
    ]),
  ])
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Zusammenfassung")

  const detailRows: (string | number)[][] = [
    ["Ebene", "Fach", "Thema", "Unterthema", "Verweistyp", "Verweis", "Kind", "Bewertung"],
  ]

  for (const topic of report.tree) {
    detailRows.push(["Thema", topic.subjectName, topic.name, "", "", "", "", ""])

    for (const subTopic of topic.subTopics) {
      detailRows.push(["Unterthema", "", "", subTopic.name, "", "", "", ""])

      for (const ref of subTopic.references) {
        detailRows.push(["Verweis", "", "", "", ref.typeLabel, ref.text, "", ""])

        for (const { studentName, rating } of ref.studentRatings) {
          if (!rating) continue
          detailRows.push(["Bewertung", "", "", "", "", "", studentName, rating])
        }
      }
    }
  }

  const detailSheet = XLSX.utils.aoa_to_sheet(detailRows)
  XLSX.utils.book_append_sheet(workbook, detailSheet, "Detail")

  const filename = `lehrplan-auswertung-${new Date().toISOString().slice(0, 10)}.xlsx`
  XLSX.writeFile(workbook, filename)
}

export function topicReportSummaries(topic: Topic, students: Student[]): ReportStudentSummary[] {
  return aggregateTopicReferences(topic, students).map((row) => ({
    studentName: row.studentName,
    totalPoints: row.totalPoints,
    ratingCount: row.ratedCount,
    naCount: row.naCount,
    average: row.average,
  }))
}
