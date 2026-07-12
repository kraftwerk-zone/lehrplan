import type { DateRange, Student, Subject, Topic } from "./types"

// Starter class roster (editable below the catalog).
export const INITIAL_STUDENTS: Student[] = [
  { id: "c-1", name: "Anna B." },
  { id: "c-2", name: "Ben K." },
  { id: "c-3", name: "Clara M." },
  { id: "c-4", name: "David P." },
]

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

export const SUBJECTS: Subject[] = [
  { id: "s-math", name: "Mathematik", color: "blue" },
  { id: "s-deutsch", name: "Deutsch", color: "rose" },
  { id: "s-sachkunde", name: "Sachunterricht", color: "emerald" },
  { id: "s-musik", name: "Musik", color: "amber" },
  { id: "s-sport", name: "Sport", color: "sky" },
]

export const INITIAL_TOPICS: Topic[] = [
  {
    id: "t-zahlenraum",
    subjectId: "s-math",
    name: "Zahlenraum 100",
    children: [
      {
        id: "st-orientierung",
        topicId: "t-zahlenraum",
        name: "Orientierung im Hunderterfeld",
        durationInDays: 3,
        bufferInDays: 1,
        materials: [
          { id: "m-1", name: "Hunderterfeld (laminiert)" },
          { id: "m-2", name: "Arbeitsblatt Zahlenreihe" },
        ],
        points: {},
        differentiation: {
          support: "Zahlenreihe bis 20 als Brücke, Partnerarbeit",
          challenge: "Zahlenrätsel bis 1000, freie Muster erfinden",
        },
      },
      {
        id: "st-buendeln",
        topicId: "t-zahlenraum",
        name: "Bündeln & Stellenwert",
        durationInDays: 4,
        bufferInDays: 2,
        materials: [{ id: "m-3", name: "Dienes-Material" }],
        points: {},
        differentiation: {
          support: "Konkretes Legen mit Zehnerstangen",
          challenge: "Stellenwerttabelle bis Tausender",
        },
      },
    ],
  },
  {
    id: "t-addition",
    subjectId: "s-math",
    name: "Halbschriftliche Addition",
    children: [
      {
        id: "st-add-strategien",
        topicId: "t-addition",
        name: "Rechenstrategien entwickeln",
        durationInDays: 5,
        bufferInDays: 2,
        materials: [{ id: "m-4", name: "Rechenkonferenz-Karten" }],
        points: {},
        differentiation: {
          support: "Schrittweises Rechnen mit Zahlenstrahl",
          challenge: "Eigene Strategien begründen & vergleichen",
        },
      },
    ],
  },
  {
    id: "t-lesen",
    subjectId: "s-deutsch",
    name: "Lesen: Ganzschrift",
    children: [
      {
        id: "st-einstieg-buch",
        topicId: "t-lesen",
        name: "Einstieg & Leseerwartung",
        durationInDays: 2,
        bufferInDays: 1,
        materials: [{ id: "m-5", name: "Klassensatz Lektüre" }],
        points: {},
        differentiation: {
          support: "Hörbuch parallel, reduzierte Kapitel",
          challenge: "Lesetagebuch mit Reflexionsfragen",
        },
      },
      {
        id: "st-lesetagebuch",
        topicId: "t-lesen",
        name: "Lesetagebuch führen",
        durationInDays: 6,
        bufferInDays: 2,
        materials: [{ id: "m-6", name: "Vorlage Lesetagebuch" }],
        points: {},
        differentiation: {
          support: "Satzanfänge vorgegeben",
          challenge: "Perspektivwechsel schreiben",
        },
      },
    ],
  },
  {
    id: "t-wetter",
    subjectId: "s-sachkunde",
    name: "Wetter & Jahreszeiten",
    children: [
      {
        id: "st-wetter-beobachten",
        topicId: "t-wetter",
        name: "Wetter beobachten & messen",
        durationInDays: 4,
        bufferInDays: 1,
        materials: [{ id: "m-7", name: "Wetterstation (Set)" }],
        points: {},
        differentiation: {
          support: "Symbolkarten für Wetterphänomene",
          challenge: "Messreihe über zwei Wochen auswerten",
        },
      },
    ],
  },
  {
    id: "t-rhythmus",
    subjectId: "s-musik",
    name: "Rhythmus & Notation",
    children: [
      {
        id: "st-bodypercussion",
        topicId: "t-rhythmus",
        name: "Bodypercussion",
        durationInDays: 2,
        bufferInDays: 0,
        materials: [{ id: "m-8", name: "Rhythmuskarten" }],
        points: {},
        differentiation: {
          support: "Feste Bewegungsmuster nachmachen",
          challenge: "Eigene Rhythmen komponieren",
        },
      },
    ],
  },
]
