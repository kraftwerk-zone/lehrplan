import type { SubjectColor } from "./types"

// Full class strings so Tailwind's scanner keeps them in the build.
export interface SubjectTheme {
  dot: string
  laneAccent: string // left rail strip in the timeline
  laneTint: string // subtle row background
  chip: string // sidebar subject header
  // Confident block palette (understandingLevel >= 50)
  blockBg: string
  blockText: string
  blockBorder: string
  subBg: string
  subBorder: string
}

const THEMES: Record<SubjectColor, SubjectTheme> = {
  blue: {
    dot: "bg-blue-500",
    laneAccent: "bg-blue-500",
    laneTint: "bg-blue-50/40",
    chip: "bg-blue-100 text-blue-900",
    blockBg: "bg-blue-100",
    blockText: "text-blue-900",
    blockBorder: "border-blue-300",
    subBg: "bg-blue-200/70",
    subBorder: "border-blue-400/70",
  },
  emerald: {
    dot: "bg-emerald-500",
    laneAccent: "bg-emerald-500",
    laneTint: "bg-emerald-50/40",
    chip: "bg-emerald-100 text-emerald-900",
    blockBg: "bg-emerald-100",
    blockText: "text-emerald-900",
    blockBorder: "border-emerald-300",
    subBg: "bg-emerald-200/70",
    subBorder: "border-emerald-400/70",
  },
  amber: {
    dot: "bg-amber-500",
    laneAccent: "bg-amber-500",
    laneTint: "bg-amber-50/40",
    chip: "bg-amber-100 text-amber-900",
    blockBg: "bg-amber-100",
    blockText: "text-amber-900",
    blockBorder: "border-amber-300",
    subBg: "bg-amber-200/70",
    subBorder: "border-amber-400/70",
  },
  sky: {
    dot: "bg-sky-500",
    laneAccent: "bg-sky-500",
    laneTint: "bg-sky-50/40",
    chip: "bg-sky-100 text-sky-900",
    blockBg: "bg-sky-100",
    blockText: "text-sky-900",
    blockBorder: "border-sky-300",
    subBg: "bg-sky-200/70",
    subBorder: "border-sky-400/70",
  },
  rose: {
    dot: "bg-rose-500",
    laneAccent: "bg-rose-500",
    laneTint: "bg-rose-50/40",
    chip: "bg-rose-100 text-rose-900",
    blockBg: "bg-rose-100",
    blockText: "text-rose-900",
    blockBorder: "border-rose-300",
    subBg: "bg-rose-200/70",
    subBorder: "border-rose-400/70",
  },
}

export function getSubjectTheme(color: SubjectColor): SubjectTheme {
  return THEMES[color]
}
