import { formatISO, parseISO } from "date-fns"
import type { Tables, TablesInsert } from "./database.types"
import { supabase } from "./supabase"
import type { Material, Reference, ScheduledBlock, Student, Subject, SubjectColor, SubTopic, Topic } from "./types"
import { normalizeReferences } from "./reference-utils"

export interface CurriculumData {
  subjects: Subject[]
  students: Student[]
  topics: Topic[]
  blocks: ScheduledBlock[]
}

/** Serialisiert Schreiboperationen pro User (verhindert parallele delete+insert-Races). */
const userSyncChains = new Map<string, Promise<void>>()

function enqueueUserSync(userId: string, task: () => Promise<void>): Promise<void> {
  const prev = userSyncChains.get(userId) ?? Promise.resolve()
  const next = prev.then(task, task)
  userSyncChains.set(
    userId,
    next.catch(() => {}),
  )
  return next
}

function toDate(value: string): Date {
  return parseISO(value)
}

function toDateString(date: Date): string {
  return formatISO(date, { representation: "date" })
}

function materialFromRow(row: Tables<"materials">): Material {
  return {
    id: row.id,
    name: row.name,
    folder: row.folder ?? undefined,
    storagePath: row.storage_path ?? undefined,
  }
}

function parseReferences(raw: unknown, subTopicId: string, legacyPoints: Record<string, number>): Reference[] {
  const fromDb = (raw as Reference[] | null) ?? []
  return normalizeReferences(subTopicId, fromDb, legacyPoints)
}

function subTopicFromRow(row: Tables<"sub_topics">, materials: Material[]): SubTopic {
  const legacyPoints = (row.points as Record<string, number>) ?? {}
  return {
    id: row.id,
    topicId: row.topic_id,
    name: row.name,
    durationInDays: row.duration_in_days,
    bufferInDays: row.buffer_in_days,
    materials,
    references: parseReferences(row.reference_items, row.id, legacyPoints),
    differentiation: {
      support: row.differentiation_support,
      challenge: row.differentiation_challenge,
    },
  }
}

function blockFromRow(row: Tables<"scheduled_blocks">): ScheduledBlock {
  type LegacySubTopic = SubTopic & { points?: Record<string, number> }
  const raw = row.topic_snapshot as unknown as Topic & { children: LegacySubTopic[] }
  const topicReference: Topic = {
    ...raw,
    children: raw.children.map((st) => {
      const legacy = st as LegacySubTopic
      return {
        ...legacy,
        references: normalizeReferences(legacy.id, legacy.references, legacy.points ?? {}),
      }
    }),
  }
  return {
    id: row.id,
    topicId: row.topic_id,
    subjectId: row.subject_id,
    startDate: toDate(row.start_date),
    endDate: toDate(row.end_date),
    topicReference,
    understandingLevel: row.understanding_level,
    completedSubTopics: row.completed_sub_topics,
    differentiation: {
      support: row.differentiation_support,
      challenge: row.differentiation_challenge,
    },
    materials: (row.materials as unknown as Material[]) ?? [],
  }
}

function subjectToRow(userId: string, subject: Subject): TablesInsert<"subjects"> {
  return {
    id: subject.id,
    user_id: userId,
    name: subject.name,
    color: subject.color,
  }
}

function studentToRow(userId: string, student: Student): TablesInsert<"students"> {
  return {
    id: student.id,
    user_id: userId,
    name: student.name,
  }
}

function topicToRow(userId: string, topic: Topic): TablesInsert<"topics"> {
  return {
    id: topic.id,
    user_id: userId,
    subject_id: topic.subjectId,
    name: topic.name,
  }
}

function subTopicToRow(userId: string, subTopic: SubTopic, sortOrder: number): TablesInsert<"sub_topics"> {
  return {
    id: subTopic.id,
    user_id: userId,
    topic_id: subTopic.topicId,
    name: subTopic.name,
    duration_in_days: subTopic.durationInDays,
    buffer_in_days: subTopic.bufferInDays,
    differentiation_support: subTopic.differentiation.support,
    differentiation_challenge: subTopic.differentiation.challenge,
    points: {},
    reference_items: subTopic.references as unknown as TablesInsert<"sub_topics">["reference_items"],
    sort_order: sortOrder,
  }
}

function materialToRow(userId: string, subTopicId: string, material: Material): TablesInsert<"materials"> {
  return {
    id: material.id,
    user_id: userId,
    sub_topic_id: subTopicId,
    name: material.name,
    folder: material.folder ?? null,
    storage_path: material.storagePath ?? null,
  }
}

function blockToRow(userId: string, block: ScheduledBlock): TablesInsert<"scheduled_blocks"> {
  return {
    id: block.id,
    user_id: userId,
    topic_id: block.topicId,
    subject_id: block.subjectId,
    start_date: toDateString(block.startDate),
    end_date: toDateString(block.endDate),
    understanding_level: block.understandingLevel,
    completed_sub_topics: block.completedSubTopics,
    differentiation_support: block.differentiation.support,
    differentiation_challenge: block.differentiation.challenge,
    topic_snapshot: block.topicReference as unknown as TablesInsert<"scheduled_blocks">["topic_snapshot"],
    materials: block.materials as unknown as TablesInsert<"scheduled_blocks">["materials"],
  }
}

export async function loadCurriculum(userId: string): Promise<CurriculumData> {
  const [subjectsRes, studentsRes, topicsRes, subTopicsRes, materialsRes, blocksRes] = await Promise.all([
    supabase.from("subjects").select("*").eq("user_id", userId).order("created_at"),
    supabase.from("students").select("*").eq("user_id", userId).order("created_at"),
    supabase.from("topics").select("*").eq("user_id", userId).order("created_at"),
    supabase.from("sub_topics").select("*").eq("user_id", userId).order("sort_order"),
    supabase.from("materials").select("*").eq("user_id", userId).order("created_at"),
    supabase.from("scheduled_blocks").select("*").eq("user_id", userId).order("start_date"),
  ])

  const error =
    subjectsRes.error ??
    studentsRes.error ??
    topicsRes.error ??
    subTopicsRes.error ??
    materialsRes.error ??
    blocksRes.error

  if (error) throw new Error(error.message)

  const materialsBySubTopic = new Map<string, Material[]>()
  for (const row of materialsRes.data ?? []) {
    const list = materialsBySubTopic.get(row.sub_topic_id) ?? []
    list.push(materialFromRow(row))
    materialsBySubTopic.set(row.sub_topic_id, list)
  }

  const subTopicsByTopic = new Map<string, SubTopic[]>()
  for (const row of subTopicsRes.data ?? []) {
    const list = subTopicsByTopic.get(row.topic_id) ?? []
    list.push(subTopicFromRow(row, materialsBySubTopic.get(row.id) ?? []))
    subTopicsByTopic.set(row.topic_id, list)
  }

  const subjects: Subject[] = (subjectsRes.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color as SubjectColor,
  }))

  const subjectIds = new Set(subjects.map((s) => s.id))

  const students: Student[] = (studentsRes.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
  }))

  const topics: Topic[] = (topicsRes.data ?? [])
    .filter((row) => subjectIds.has(row.subject_id))
    .map((row) => ({
      id: row.id,
      subjectId: row.subject_id,
      name: row.name,
      children: subTopicsByTopic.get(row.id) ?? [],
    }))

  const blocks: ScheduledBlock[] = (blocksRes.data ?? []).map(blockFromRow)

  return { subjects, students, topics, blocks }
}

export function needsCurriculumSeed(data: CurriculumData): boolean {
  if (data.subjects.length === 0) return true
  if (data.topics.length === 0) return true
  return !data.topics.some((topic) => topic.children.length > 0)
}

export async function seedCurriculumForUser(userId: string): Promise<void> {
  if (!userId) throw new Error("Nutzer-ID fehlt.")
  const { error } = await supabase.rpc("seed_curriculum_for_user", { p_user_id: userId })
  if (error) throw new Error(error.message)
}

export async function syncSubjects(userId: string, subjects: Subject[]): Promise<void> {
  return enqueueUserSync(userId, async () => {
    const newIds = new Set(subjects.map((s) => s.id))

    const { data: existing, error: fetchError } = await supabase
      .from("subjects")
      .select("id")
      .eq("user_id", userId)
    if (fetchError) throw new Error(fetchError.message)

    const removedIds = (existing ?? []).map((r) => r.id).filter((id) => !newIds.has(id))
    if (removedIds.length > 0) {
      const { error: deleteError } = await supabase.from("subjects").delete().eq("user_id", userId).in("id", removedIds)
      if (deleteError) throw new Error(deleteError.message)
    }

    if (subjects.length === 0) return

    const rows = subjects.map((s) => subjectToRow(userId, s))
    const { error } = await supabase.from("subjects").upsert(rows, { onConflict: "id" })
    if (error) throw new Error(error.message)
  })
}

export async function syncStudents(userId: string, students: Student[]): Promise<void> {
  return enqueueUserSync(userId, async () => {
    const { error: deleteError } = await supabase.from("students").delete().eq("user_id", userId)
    if (deleteError) throw new Error(deleteError.message)
    if (students.length === 0) return
    const rows = students.map((s) => studentToRow(userId, s))
    const { error } = await supabase.from("students").upsert(rows, { onConflict: "id" })
    if (error) throw new Error(error.message)
  })
}

export async function syncTopics(userId: string, topics: Topic[]): Promise<void> {
  return enqueueUserSync(userId, async () => {
    if (topics.length === 0) return

    const newTopicIds = new Set(topics.map((t) => t.id))
    const newSubTopicIds = new Set(topics.flatMap((t) => t.children.map((c) => c.id)))

    const { data: existingTopics, error: topicsFetchError } = await supabase
      .from("topics")
      .select("id")
      .eq("user_id", userId)
    if (topicsFetchError) throw new Error(topicsFetchError.message)

    const removedTopicIds = (existingTopics ?? []).map((r) => r.id).filter((id) => !newTopicIds.has(id))
    if (removedTopicIds.length > 0) {
      const { error } = await supabase.from("topics").delete().eq("user_id", userId).in("id", removedTopicIds)
      if (error) throw new Error(error.message)
    }

    const topicRows = topics.map((t) => topicToRow(userId, t))
    const { error: topicError } = await supabase.from("topics").upsert(topicRows, { onConflict: "id" })
    if (topicError) throw new Error(topicError.message)

    const { data: existingSubTopics, error: subTopicsFetchError } = await supabase
      .from("sub_topics")
      .select("id")
      .eq("user_id", userId)
    if (subTopicsFetchError) throw new Error(subTopicsFetchError.message)

    const removedSubTopicIds = (existingSubTopics ?? []).map((r) => r.id).filter((id) => !newSubTopicIds.has(id))
    if (removedSubTopicIds.length > 0) {
      const { error: matDeleteError } = await supabase
        .from("materials")
        .delete()
        .eq("user_id", userId)
        .in("sub_topic_id", removedSubTopicIds)
      if (matDeleteError) throw new Error(matDeleteError.message)

      const { error: stDeleteError } = await supabase
        .from("sub_topics")
        .delete()
        .eq("user_id", userId)
        .in("id", removedSubTopicIds)
      if (stDeleteError) throw new Error(stDeleteError.message)
    }

    const subTopicRows: TablesInsert<"sub_topics">[] = []
    const materialRows: TablesInsert<"materials">[] = []
    for (const topic of topics) {
      topic.children.forEach((subTopic, index) => {
        subTopicRows.push(subTopicToRow(userId, subTopic, index))
        for (const material of subTopic.materials) {
          materialRows.push(materialToRow(userId, subTopic.id, material))
        }
      })
    }

    if (subTopicRows.length > 0) {
      const { error } = await supabase.from("sub_topics").upsert(subTopicRows, { onConflict: "id" })
      if (error) throw new Error(error.message)
    }

    if (materialRows.length > 0) {
      const childIds = [...newSubTopicIds]
      if (childIds.length > 0) {
        await supabase.from("materials").delete().eq("user_id", userId).in("sub_topic_id", childIds)
      }
      const { error } = await supabase.from("materials").upsert(materialRows, { onConflict: "id" })
      if (error) throw new Error(error.message)
    }
  })
}

export async function upsertSubject(userId: string, subject: Subject): Promise<void> {
  const { error } = await supabase.from("subjects").upsert(subjectToRow(userId, subject))
  if (error) throw new Error(error.message)
}

export async function deleteSubjectRow(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from("subjects").delete().eq("user_id", userId).eq("id", id)
  if (error) throw new Error(error.message)
}

export async function upsertStudent(userId: string, student: Student): Promise<void> {
  const { error } = await supabase.from("students").upsert(studentToRow(userId, student))
  if (error) throw new Error(error.message)
}

export async function deleteStudentRow(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from("students").delete().eq("user_id", userId).eq("id", id)
  if (error) throw new Error(error.message)
}

export async function upsertTopic(userId: string, topic: Topic): Promise<void> {
  const { error: topicError } = await supabase.from("topics").upsert(topicToRow(userId, topic))
  if (topicError) throw new Error(topicError.message)

  const childIds = topic.children.map((c) => c.id)
  if (childIds.length > 0) {
    await supabase.from("materials").delete().eq("user_id", userId).in("sub_topic_id", childIds)
  }
  await supabase.from("sub_topics").delete().eq("user_id", userId).eq("topic_id", topic.id)

  if (topic.children.length > 0) {
    const subTopicRows = topic.children.map((subTopic, index) => subTopicToRow(userId, subTopic, index))
    const { error } = await supabase.from("sub_topics").upsert(subTopicRows, { onConflict: "id" })
    if (error) throw new Error(error.message)

    const materialRows: TablesInsert<"materials">[] = []
    for (const subTopic of topic.children) {
      for (const material of subTopic.materials) {
        materialRows.push(materialToRow(userId, subTopic.id, material))
      }
    }
    if (materialRows.length > 0) {
      const { error: matError } = await supabase.from("materials").upsert(materialRows, { onConflict: "id" })
      if (matError) throw new Error(matError.message)
    }
  }
}

export async function deleteTopicRow(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from("topics").delete().eq("user_id", userId).eq("id", id)
  if (error) throw new Error(error.message)
}

export async function upsertSubTopic(userId: string, subTopic: SubTopic, sortOrder: number): Promise<void> {
  const { error } = await supabase.from("sub_topics").upsert(subTopicToRow(userId, subTopic, sortOrder))
  if (error) throw new Error(error.message)

  await supabase.from("materials").delete().eq("user_id", userId).eq("sub_topic_id", subTopic.id)
  if (subTopic.materials.length > 0) {
    const rows = subTopic.materials.map((m) => materialToRow(userId, subTopic.id, m))
    const { error: matError } = await supabase.from("materials").upsert(rows, { onConflict: "id" })
    if (matError) throw new Error(matError.message)
  }
}

export async function deleteSubTopicRow(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from("sub_topics").delete().eq("user_id", userId).eq("id", id)
  if (error) throw new Error(error.message)
}

export async function syncBlocks(userId: string, blocks: ScheduledBlock[]): Promise<void> {
  return enqueueUserSync(userId, async () => {
    const { error: deleteError } = await supabase.from("scheduled_blocks").delete().eq("user_id", userId)
    if (deleteError) throw new Error(deleteError.message)

    if (blocks.length === 0) return

    const rows = blocks.map((b) => blockToRow(userId, b))
    const { error } = await supabase.from("scheduled_blocks").upsert(rows, { onConflict: "id" })
    if (error) throw new Error(error.message)
  })
}

export async function deleteBlockRow(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from("scheduled_blocks").delete().eq("user_id", userId).eq("id", id)
  if (error) throw new Error(error.message)
}
