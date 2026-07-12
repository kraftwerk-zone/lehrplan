"use client"

import { FolderTree, LogOut, Mail, Plus, Trash2, Users } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/components/auth/auth-context"
import { FilePreview } from "@/components/curriculum/file-preview"
import { GlobalFileTree, type FileSelection } from "@/components/curriculum/file-tree"
import { getSubjectTheme } from "@/lib/subject-theme"
import type { Student, Subject, SubjectColor, Topic } from "@/lib/types"
import { cn } from "@/lib/utils"

const COLOR_OPTIONS: SubjectColor[] = ["blue", "emerald", "amber", "sky", "rose"]

interface UserViewProps {
  subjects: Subject[]
  topics: Topic[]
  students: Student[]
  onAddStudent: () => void
  onUpdateStudent: (id: string, name: string) => void
  onDeleteStudent: (id: string) => void
  onAddSubject: () => void
  onUpdateSubject: (subject: Subject) => void
  onDeleteSubject: (id: string) => void
  onAddMaterial: (topicId: string, subTopicId: string, name: string, folder: string) => void
  onDeleteMaterial: (topicId: string, subTopicId: string, materialId: string) => void
}

export function UserView({
  subjects,
  topics,
  students,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onAddSubject,
  onUpdateSubject,
  onDeleteSubject,
  onAddMaterial,
  onDeleteMaterial,
}: UserViewProps) {
  const { user, logout } = useAuth()
  const [selectedFile, setSelectedFile] = useState<FileSelection | null>(null)

  const totalMaterials = topics.reduce((sum, t) => sum + t.children.reduce((a, st) => a + st.materials.length, 0), 0)
  const initials = (user?.name ?? "?")
    .split(" ")
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase()

  // Deleting the previewed file clears the preview pane.
  function handleDeleteMaterial(topicId: string, subTopicId: string, materialId: string) {
    onDeleteMaterial(topicId, subTopicId, materialId)
    if (selectedFile?.material.id === materialId) setSelectedFile(null)
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-background">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
        {/* Profile */}
        <section className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-semibold text-foreground">{user?.name}</h1>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="size-3.5" />
                <span className="truncate">{user?.email}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <LogOut className="size-4" />
              Abmelden
            </button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <Stat label="Fächer" value={subjects.length} />
            <Stat label="Kinder" value={students.length} />
            <Stat label="Materialien" value={totalMaterials} />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Subjects (configurable) */}
          <section className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <span className="inline-flex size-4 items-center justify-center rounded-sm bg-primary/15">
                  <span className="size-2 rounded-full bg-primary" />
                </span>
                Fächer
              </h2>
              <button
                type="button"
                onClick={onAddSubject}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                <Plus className="size-3.5" />
                Hinzufügen
              </button>
            </div>

            {subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">Noch keine Fächer angelegt.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {subjects.map((subject) => (
                  <li key={subject.id} className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
                    <div className="flex items-center gap-2">
                      <input
                        value={subject.name}
                        onChange={(e) => onUpdateSubject({ ...subject, name: e.target.value })}
                        className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring"
                        aria-label="Fachname"
                      />
                      <button
                        type="button"
                        onClick={() => onDeleteSubject(subject.id)}
                        className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`${subject.name} löschen`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="mr-1 text-xs text-muted-foreground">Farbe</span>
                      {COLOR_OPTIONS.map((color) => {
                        const theme = getSubjectTheme(color)
                        const active = subject.color === color
                        return (
                          <button
                            key={color}
                            type="button"
                            onClick={() => onUpdateSubject({ ...subject, color })}
                            className={cn(
                              "size-6 rounded-full ring-offset-2 ring-offset-background transition-all",
                              theme.dot,
                              active ? "ring-2 ring-foreground" : "hover:ring-2 hover:ring-border",
                            )}
                            aria-label={`Farbe ${color}`}
                            aria-pressed={active}
                          />
                        )
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Children */}
          <section className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Users className="size-4 text-muted-foreground" />
                Kinder
              </h2>
              <button
                type="button"
                onClick={onAddStudent}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                <Plus className="size-3.5" />
                Hinzufügen
              </button>
            </div>

            {students.length === 0 ? (
              <p className="text-sm text-muted-foreground">Noch keine Kinder angelegt.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {students.map((student) => (
                  <li key={student.id} className="flex items-center gap-2">
                    <input
                      value={student.name}
                      onChange={(e) => onUpdateStudent(student.id, e.target.value)}
                      className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                      aria-label="Name des Kindes"
                    />
                    <button
                      type="button"
                      onClick={() => onDeleteStudent(student.id)}
                      className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`${student.name} entfernen`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* File view: tree + preview */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
            <FolderTree className="size-4 text-muted-foreground" />
            Dateiansicht
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="max-h-[30rem] overflow-y-auto rounded-lg border border-border bg-background p-2">
              <GlobalFileTree
                subjects={subjects}
                topics={topics}
                selectedMaterialId={selectedFile?.material.id ?? null}
                onSelectFile={setSelectedFile}
                onAddMaterial={onAddMaterial}
                onDeleteMaterial={handleDeleteMaterial}
              />
            </div>
            <div className="min-h-64">
              <FilePreview selection={selectedFile} onDelete={handleDeleteMaterial} />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-background px-4 py-3">
      <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
