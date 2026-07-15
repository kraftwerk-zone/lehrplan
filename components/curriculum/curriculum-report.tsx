"use client"

import { useMemo, useState } from "react"
import { FileSpreadsheet } from "lucide-react"
import { buildCurriculumReport, downloadCurriculumReportExcel } from "@/lib/reporting"
import { formatAverage } from "@/lib/reference-utils"
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

  const hasData = report.details.length > 0

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Auswertung</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Alle Themen, Unterthemen und Verweise mit Bewertungen pro Kind. Kinder alphabetisch sortiert; Summe,
            NA-Anzahl und Durchschnitt (ohne NA).
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
          Noch keine Verweise mit Bewertungen. Unterthemen konfigurieren und Verweise anlegen.
        </p>
      ) : (
        <>
          <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1" role="tablist">
            <TabButton active={tab === "summary"} onClick={() => setTab("summary")}>
              Zusammenfassung ({report.summaries.length} Kinder)
            </TabButton>
            <TabButton active={tab === "detail"} onClick={() => setTab("detail")}>
              Detail ({report.details.length} Zeilen)
            </TabButton>
          </div>

          {tab === "summary" ? (
            <section className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[32rem] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3">Kind</th>
                      <th className="px-4 py-3 text-right">Summe Punkte</th>
                      <th className="px-4 py-3 text-right">NA</th>
                      <th className="px-4 py-3 text-right">Ø (ohne NA)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.summaries.map((row) => (
                      <tr key={row.studentName} className="border-b border-border/60 last:border-0">
                        <td className="px-4 py-2.5 font-medium text-foreground">{row.studentName}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-foreground">{row.totalPoints}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{row.naCount}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-foreground">
                          {formatAverage(row.average)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <section className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="max-h-[calc(100vh-16rem)] overflow-auto">
                <table className="w-full min-w-[56rem] border-collapse text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                    <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2.5">Fach</th>
                      <th className="px-3 py-2.5">Thema</th>
                      <th className="px-3 py-2.5">Unterthema</th>
                      <th className="px-3 py-2.5">Typ</th>
                      <th className="min-w-[12rem] px-3 py-2.5">Verweis</th>
                      <th className="px-3 py-2.5">Kind</th>
                      <th className="px-3 py-2.5 text-right">Bewertung</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.details.map((row, index) => (
                      <tr
                        key={`${row.subTopicName}-${row.referenceText}-${row.studentName}-${index}`}
                        className="border-b border-border/40 last:border-0 hover:bg-muted/30"
                      >
                        <td className="whitespace-nowrap px-3 py-2 text-foreground">{row.subjectName}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-foreground">{row.topicName}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-foreground">{row.subTopicName}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{row.referenceType}</td>
                        <td className="max-w-xs px-3 py-2 text-foreground">
                          <span className="line-clamp-3 whitespace-pre-wrap">{row.referenceText || "—"}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-foreground">{row.studentName}</td>
                        <td
                          className={cn(
                            "whitespace-nowrap px-3 py-2 text-right tabular-nums",
                            row.rating === "NA" ? "font-medium text-amber-700 dark:text-amber-300" : "text-foreground",
                          )}
                        >
                          {row.rating || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
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
