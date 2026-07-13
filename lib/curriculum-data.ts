import type { DateRange } from "./types"

// The visible school-year window — a full school year (Aug 2026 → Jul 2027).
export const TIMELINE_START = new Date(2026, 7, 31) // Mon 31 Aug 2026
export const TIMELINE_END = new Date(2027, 6, 23) // Fri 23 Jul 2027

// Mocked vacations fed into the CalendarEngine (no UI for this yet — see debt notes).
export const HOLIDAYS: DateRange[] = [
  { start: new Date(2026, 9, 12), end: new Date(2026, 9, 23) }, // Herbstferien
  { start: new Date(2026, 10, 18), end: new Date(2026, 10, 18) }, // Buß- und Bettag
  { start: new Date(2026, 11, 23), end: new Date(2027, 0, 6) }, // Weihnachtsferien
  { start: new Date(2027, 1, 15), end: new Date(2027, 1, 19) }, // Winterferien
  { start: new Date(2027, 2, 29), end: new Date(2027, 3, 9) }, // Osterferien
  { start: new Date(2027, 4, 6), end: new Date(2027, 4, 7) }, // Christi Himmelfahrt (Brücke)
  { start: new Date(2027, 4, 18), end: new Date(2027, 4, 28) }, // Pfingstferien
]
