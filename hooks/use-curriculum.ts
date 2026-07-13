"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react"
import {
  loadCurriculum,
  needsCurriculumSeed,
  seedCurriculumForUser,
  syncBlocks,
  syncStudents,
  syncSubjects,
  syncTopics,
} from "@/lib/curriculum-db"
import type { ScheduledBlock, Student, Subject, Topic } from "@/lib/types"

function applyUpdater<T>(prev: T, updater: SetStateAction<T>): T {
  return typeof updater === "function" ? (updater as (value: T) => T)(prev) : updater
}

function useDebouncedCallback<T extends unknown[]>(fn: (...args: T) => Promise<void>, delayMs: number) {
  const fnRef = useRef(fn)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  fnRef.current = fn

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return useCallback(
    (...args: T) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      return new Promise<void>((resolve, reject) => {
        timerRef.current = setTimeout(() => {
          void fnRef.current(...args).then(resolve).catch(reject)
        }, delayMs)
      })
    },
    [delayMs],
  )
}

function usePersistedState<T>(
  initial: T,
  persist: (value: T) => Promise<void>,
  skipPersistRef: React.RefObject<boolean>,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState(initial)
  const persistRef = useRef(persist)
  persistRef.current = persist

  const setPersisted = useCallback(
    (updater: SetStateAction<T>) => {
      setValue((prev) => {
        const next = applyUpdater(prev, updater)
        if (!skipPersistRef.current) {
          void persistRef.current(next).catch((err: unknown) => {
            console.error("Persist failed:", err)
          })
        }
        return next
      })
    },
    [skipPersistRef],
  )

  return [value, setPersisted]
}

export function useCurriculum(userId: string | undefined) {
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const skipPersistRef = useRef(true)

  const noopPersist = useCallback(async () => {}, [])

  const persistSubjects = useDebouncedCallback(
    async (subjects: Subject[]) => {
      if (!userId) return
      await syncSubjects(userId, subjects)
    },
    400,
  )
  const persistStudents = useDebouncedCallback(
    async (students: Student[]) => {
      if (!userId) return
      await syncStudents(userId, students)
    },
    400,
  )
  const persistTopics = useDebouncedCallback(
    async (topics: Topic[]) => {
      if (!userId) return
      await syncTopics(userId, topics)
    },
    400,
  )
  const persistBlocks = useDebouncedCallback(
    async (blocks: ScheduledBlock[]) => {
      if (!userId) return
      await syncBlocks(userId, blocks)
    },
    400,
  )

  const [subjects, setSubjects] = usePersistedState<Subject[]>(
    [],
    userId ? persistSubjects : noopPersist,
    skipPersistRef,
  )
  const [students, setStudents] = usePersistedState<Student[]>(
    [],
    userId ? persistStudents : noopPersist,
    skipPersistRef,
  )
  const [topics, setTopics] = usePersistedState<Topic[]>(
    [],
    userId ? persistTopics : noopPersist,
    skipPersistRef,
  )
  const [blocks, setBlocks] = usePersistedState<ScheduledBlock[]>(
    [],
    userId ? persistBlocks : noopPersist,
    skipPersistRef,
  )

  useEffect(() => {
    if (!userId) {
      skipPersistRef.current = true
      setReady(true)
      setLoading(false)
      return
    }

    let cancelled = false
    skipPersistRef.current = true

    async function init() {
      const uid = userId as string
      setLoading(true)
      setError(null)

      try {
        let data = await loadCurriculum(uid)
        if (needsCurriculumSeed(data)) {
          await seedCurriculumForUser(uid)
          data = await loadCurriculum(uid)
        }

        if (cancelled) return

        setSubjects(data.subjects)
        setStudents(data.students)
        setTopics(data.topics)
        setBlocks(data.blocks)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Daten konnten nicht geladen werden.")
        }
      } finally {
        if (!cancelled) {
          skipPersistRef.current = false
          setLoading(false)
          setReady(true)
        }
      }
    }

    void init()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  return {
    subjects,
    students,
    topics,
    blocks,
    setSubjects,
    setStudents,
    setTopics,
    setBlocks,
    loading,
    ready,
    error,
  }
}
