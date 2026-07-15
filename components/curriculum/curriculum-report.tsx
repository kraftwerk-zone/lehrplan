"use client"

import { ChevronRight, FileSpreadsheet } from "lucide-react"
import { useMemo, useState } from "react"
import {
  buildCurriculumReport,
  countReportReferences,
  downloadCurriculumReportExcel,
  type ReportReferenceNode,
  type ReportStudentSummary,
  type ReportSubTopicNode,
  type ReportSubjectSummary,
  type ReportTopicNode,
} from "@/lib/reporting"
import { formatAverage } from "@/lib/reference-utils"
import { getSubjectTheme } from "@/lib/subject-theme"
import type { Student, Subject, Topic } from "@/lib/types"
import { cn } from "@/lib/utils"

interface CurriculumReportViewProps {
  subjects: Subject[]
  topics: Topic[]
  students: Student[]
}

type ReportTab = "summary" | "detail"

export function CurriculumReportView({ subjects, topics, students }: CurriculumReportViewProps) {
  const [tab, setTab] = useState<ReportTab>("summary")
  const report = useMemo(() => buildCurriculumReport(subjects, topics, students), [subjects, topics, students])
  const referenceCount = countReportReferences(report.tree)
  const hasData = referenceCount > 0

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Auswertung</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Baumstruktur nach Thema, Unterthema und Verweisen mit Bewertungen pro Kind. Die Zusammenfassung ist
            fachspezifisch: Summe, Anzahl Bewertungen, NA und Durchschnitt (ohne NA) je Fach.
          </p>
        </div>
        <button
          type="button"
          disabled={!hasData && students.length === 0}
          onClick={() => downloadCurriculumReportExcel(subjects, topics, students)}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
        >
          <FileSpreadsheet className="size-4" />
          Excel exportieren
        </button>
      </header>

      {students.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
          Noch keine Kinder angelegt. Unter „Benutzer“ Kinder hinzufügen, dann Verweise bewerten.
        </p>
      ) : !hasData ? (
        <p className="rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
          Noch keine Verweise angelegt. Unterthemen konfigurieren und Verweise anlegen.
        </p>
      ) : (
        <>
          <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1" role="tablist">
            <TabButton active={tab === "summary"} onClick={() => setTab("summary")}>
              Zusammenfassung ({report.summariesBySubject.length} Fächer)
            </TabButton>
            <TabButton active={tab === "detail"} onClick={() => setTab("detail")}>
              Detail ({report.tree.length} Themen · {referenceCount} Verweise)
            </TabButton>
          </div>

          {tab === "summary" ? (
            <div className="flex flex-col gap-4">
              {report.summariesBySubject.map((subjectSummary) => (
                <SubjectSummarySection
                  key={subjectSummary.subjectId}
                  summary={subjectSummary}
                  subject={subjects.find((s) => s.id === subjectSummary.subjectId)}
                />
              ))}
            </div>
          ) : (
            <section className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="max-h-[calc(100vh-16rem)] overflow-auto p-2">
                <ReportTree tree={report.tree} />
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function SubjectSummarySection({
  summary,
  subject,
}: {
  summary: ReportSubjectSummary
  subject: Subject | undefined
}) {
  const theme = subject ? getSubjectTheme(subject.color) : null

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header
        className={cn(
          "flex items-center gap-2 border-b border-border px-4 py-3",
          theme?.chip ?? "bg-muted/50 text-foreground",
        )}
      >
        {theme && <span className={cn("size-2.5 shrink-0 rounded-full", theme.dot)} aria-hidden />}
        <h2 className="text-sm font-semibold">{summary.subjectName}</h2>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Kind</th>
              <th className="px-4 py-3 text-right">Summe Punkte</th>
              <th className="px-4 py-3 text-right">Bewertungen</th>
              <th className="px-4 py-3 text-right">NA</th>
              <th className="px-4 py-3 text-right">Ø (ohne NA)</th>
            </tr>
          </thead>
          <tbody>
            {summary.students.map((row) => (
              <SummaryRow key={row.studentName} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function SummaryRow({ row }: { row: ReportStudentSummary }) {
  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="px-4 py-2.5 font-medium text-foreground">{row.studentName}</td>
      <td className="px-4 py-2.5 text-right tabular-nums text-foreground">{row.totalPoints}</td>
      <td className="px-4 py-2.5 text-right tabular-nums text-foreground">{row.ratingCount}</td>
      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{row.naCount}</td>
      <td className="px-4 py-2.5 text-right tabular-nums text-foreground">{formatAverage(row.average)}</td>
    </tr>
  )
}

function ReportTree({ tree }: { tree: ReportTopicNode[] }) {
  return (
    <div role="tree" className="flex flex-col gap-1">
      {tree.map((topic) => (
        <TopicNode key={topic.id} topic={topic} />
      ))}
    </div>
  )
}

function TopicNode({ topic }: { topic: ReportTopicNode }) {
  const [open, setOpen] = useState(true)

  return (
    <div role="treeitem" aria-expanded={open} className="rounded-lg border border-border/60 bg-background">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-foreground hover:bg-muted/40"
      >
        <ChevronRight className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
        <span className="truncate">{topic.name}</span>
        <span className="ml-1 truncate text-xs font-normal text-muted-foreground">({topic.subjectName})</span>
      </button>

      {open && (
        <div className="border-t border-border/60 pb-2 pl-4 pr-2">
          {topic.subTopics.map((subTopic) => (
            <SubTopicNode key={subTopic.id} subTopic={subTopic} />
          ))}
        </div>
      )}
    </div>
  )
}

function SubTopicNode({ subTopic }: { subTopic: ReportSubTopicNode }) {
  const [open, setOpen] = useState(true)

  return (
    <div role="treeitem" aria-expanded={open} className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium text-foreground hover:bg-muted/40"
      >
        <ChevronRight className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
        <span className="truncate">{subTopic.name}</span>
        <span className="text-xs font-normal text-muted-foreground">({subTopic.references.length} Verweise)</span>
      </button>

      {open && (
        <div className="ml-4 border-l border-border/60 pl-3">
          {subTopic.references.map((ref) => (
            <ReferenceNode key={ref.id} reference={ref} />
          ))}
        </div>
      )}
    </div>
  )
}

function ReferenceNode({ reference }: { reference: ReportReferenceNode }) {
  const [open, setOpen] = useState(true)
  const ratedEntries = reference.studentRatings.filter((entry) => entry.rating !== "")

  return (
    <div role="treeitem" aria-expanded={open} className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left hover:bg-muted/30"
      >
        <ChevronRight
          className={cn("mt-0.5 size-3 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")}
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">{reference.typeLabel}</p>
          <p className="whitespace-pre-wrap text-sm text-foreground">{reference.text || "—"}</p>
        </div>
      </button>

      {open && (
        <div className="mb-2 ml-5 overflow-hidden rounded-md border border-border/60">
          {ratedEntries.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Noch keine Bewertungen.</p>
          ) : (
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-left text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-1.5">Kind</th>
                  <th className="px-3 py-1.5 text-right">Bewertung</th>
                </tr>
              </thead>
              <tbody>
                {ratedEntries.map((entry) => (
                  <tr key={entry.studentName} className="border-b border-border/40 last:border-0">
                    <td className="px-3 py-1.5 text-foreground">{entry.studentName}</td>
                    <td
                      className={cn(
                        "px-3 py-1.5 text-right tabular-nums",
                        entry.rating === "NA" ? "font-medium text-amber-700 dark:text-amber-300" : "text-foreground",
                      )}
                    >
                      {entry.rating}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}
