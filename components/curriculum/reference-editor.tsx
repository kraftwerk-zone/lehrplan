"use client"

import { Plus, Trash2 } from "lucide-react"
import {
  REFERENCE_TYPES,
  REFERENCE_TYPE_LABELS,
  aggregateSubTopicReferences,
  createReference,
  formatAverage,
  sortedStudents,
} from "@/lib/reference-utils"
import type { Reference, ReferenceType, Student, StudentRating, SubTopic } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ReferenceEditorProps {
  subTopic: SubTopic
  students: Student[]
  onUpdate: (subTopic: SubTopic) => void
}

export function ReferenceEditor({ subTopic, students, onUpdate }: ReferenceEditorProps) {
  function updateReferences(references: Reference[]) {
    onUpdate({ ...subTopic, references })
  }

  function addReference(type: ReferenceType) {
    updateReferences([...subTopic.references, createReference(type)])
  }

  function updateReference(id: string, patch: Partial<Reference>) {
    updateReferences(subTopic.references.map((ref) => (ref.id === id ? { ...ref, ...patch } : ref)))
  }

  function removeReference(id: string) {
    updateReferences(subTopic.references.filter((ref) => ref.id !== id))
  }

  function setRating(referenceId: string, studentId: string, value: StudentRating | undefined) {
    const ref = subTopic.references.find((r) => r.id === referenceId)
    if (!ref) return
    const ratings = { ...ref.ratings }
    if (value === undefined) delete ratings[studentId]
    else ratings[studentId] = value
    updateReference(referenceId, { ratings })
  }

  const aggregates = aggregateSubTopicReferences(subTopic, students)

  return (
    <div className="space-y-4">
      {REFERENCE_TYPES.map((type) => {
        const items = subTopic.references.filter((ref) => ref.type === type)
        return (
          <section key={type} className="rounded-lg border border-border bg-background p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-foreground">{REFERENCE_TYPE_LABELS[type]}</h4>
              <button
                type="button"
                onClick={() => addReference(type)}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Plus className="size-3.5" /> Verweis
              </button>
            </div>

            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground">Noch keine {REFERENCE_TYPE_LABELS[type].toLowerCase()}.</p>
            ) : (
              <ul className="space-y-3">
                {items.map((ref) => (
                  <li key={ref.id} className="rounded-md border border-border/70 p-2">
                    <div className="mb-2 flex items-start gap-2">
                      <textarea
                        value={ref.text}
                        onChange={(e) => updateReference(ref.id, { text: e.target.value })}
                        rows={3}
                        placeholder="Mehrzeiliger Verweis …"
                        className="min-h-16 w-full resize-y rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                        aria-label={`${REFERENCE_TYPE_LABELS[type]} Text`}
                      />
                      <button
                        type="button"
                        onClick={() => removeReference(ref.id)}
                        className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Verweis löschen"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>

                    {students.length > 0 && (
                      <ReferenceRatingsRow
                        reference={ref}
                        students={students}
                        onSetRating={(studentId, value) => setRating(ref.id, studentId, value)}
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}

      {students.length > 0 && subTopic.references.length > 0 && (
        <AggregatedRatingsTable
          title="Summe Unterthema"
          caption="Aggregiert über alle Verweise dieses Unterthemas"
          rows={aggregates}
        />
      )}
    </div>
  )
}

interface ReferenceRatingsRowProps {
  reference: Reference
  students: Student[]
  onSetRating: (studentId: string, value: StudentRating | undefined) => void
}

function ReferenceRatingsRow({ reference, students, onSetRating }: ReferenceRatingsRowProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[20rem] border-collapse text-xs">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="py-1 pr-2 font-medium">Kind</th>
            <th className="py-1 pr-2 font-medium">Pkt</th>
            <th className="py-1 font-medium">NA</th>
          </tr>
        </thead>
        <tbody>
          {sortedStudents(students).map((student) => {
            const rating = reference.ratings[student.id]
            const isNa = rating === "NA"
            return (
              <tr key={student.id} className="border-b border-border/50">
                <td className="max-w-[8rem] truncate py-1 pr-2 text-foreground">{student.name}</td>
                <td className="py-1 pr-2">
                  <input
                    type="number"
                    min={0}
                    disabled={isNa}
                    value={typeof rating === "number" ? rating : ""}
                    placeholder="—"
                    onChange={(e) => {
                      const raw = e.target.value
                      if (raw === "") onSetRating(student.id, undefined)
                      else onSetRating(student.id, Math.max(0, Number(raw) || 0))
                    }}
                    className="w-14 rounded border border-border bg-background px-1.5 py-0.5 text-center tabular-nums outline-none focus:ring-1 focus:ring-ring disabled:opacity-40"
                    aria-label={`Punkte für ${student.name}`}
                  />
                </td>
                <td className="py-1">
                  <button
                    type="button"
                    onClick={() => onSetRating(student.id, isNa ? undefined : "NA")}
                    className={cn(
                      "rounded border px-2 py-0.5 text-[10px] font-semibold",
                      isNa
                        ? "border-amber-500/50 bg-amber-500/15 text-amber-800 dark:text-amber-200"
                        : "border-border text-muted-foreground hover:bg-accent",
                    )}
                    aria-pressed={isNa}
                  >
                    NA
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

interface AggregatedRatingsTableProps {
  title: string
  caption?: string
  rows: {
    studentName: string
    totalPoints: number
    naCount: number
    average: number | null
  }[]
}

export function AggregatedRatingsTable({ title, caption, rows }: AggregatedRatingsTableProps) {
  return (
    <section className="rounded-lg border border-dashed border-border bg-muted/20 p-3">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      {caption && <p className="mt-0.5 text-xs text-muted-foreground">{caption}</p>}
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[24rem] border-collapse text-xs">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-1.5 pr-3 font-medium">Kind</th>
              <th className="py-1.5 pr-3 font-medium">Summe</th>
              <th className="py-1.5 pr-3 font-medium">NA</th>
              <th className="py-1.5 font-medium">Ø (ohne NA)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.studentName} className="border-b border-border/50">
                <td className="py-1.5 pr-3 text-foreground">{row.studentName}</td>
                <td className="py-1.5 pr-3 tabular-nums text-foreground">{row.totalPoints}</td>
                <td className="py-1.5 pr-3 tabular-nums text-muted-foreground">{row.naCount}</td>
                <td className="py-1.5 tabular-nums text-foreground">{formatAverage(row.average)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function ReferenceRatingsCompact({ subTopic, students }: { subTopic: SubTopic; students: Student[] }) {
  const rows = aggregateSubTopicReferences(subTopic, students)
  if (rows.every((r) => r.ratedCount === 0 && r.naCount === 0)) {
    return <p className="text-[11px] text-muted-foreground">Noch keine Bewertungen.</p>
  }
  return (
    <ul className="space-y-0.5">
      {rows.map((row) => (
        <li key={row.studentId} className="flex justify-between gap-2 text-[11px]">
          <span className="truncate text-foreground">{row.studentName}</span>
          <span className="shrink-0 tabular-nums text-muted-foreground">
            {row.totalPoints} Pkt
            {row.naCount > 0 ? ` · ${row.naCount}× NA` : ""}
            {row.average !== null ? ` · Ø ${formatAverage(row.average)}` : ""}
          </span>
        </li>
      ))}
    </ul>
  )
}
