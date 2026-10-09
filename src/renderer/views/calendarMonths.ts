import { FINAL_DATE } from '@shared/classes'
import { WEEK_DAY_HEADERS } from '@shared/jobs'
import { activeSeason, type Season } from '@shared/term'
import { formatGameDate, weekdayOf } from '../prompts/gameDate'

/** The day-of-month for a date index, read off the shared formatter. */
export function dayOfMonth(date: number): number {
  return Number(formatGameDate(date).split(' ')[1])
}

/** `"May"` — the month name alone, for the navigation header. */
export function monthName(date: number): string {
  return formatGameDate(date).split(' ')[0]
}

/** One calendar month the semester touches, in full: its first and last `date` index. */
export interface Month {
  first: number
  last: number
}

/** Each season's months, worked out the first time a semester of that season opens a calendar. */
const MONTHS_BY_SEASON = new Map<Season, readonly Month[]>()

/**
 * The months the semester being played touches, each drawn whole: the first one's days before
 * day 0 and the last one's after the semester's end are on the grid, dimmed, so a month is
 * always a month and the arrows never change the shape of what they page.
 */
export function monthsOf(): readonly Month[] {
  const season = activeSeason()
  const known = MONTHS_BY_SEASON.get(season)
  if (known) return known
  const months: Month[] = []
  let first = 1 - dayOfMonth(0)
  while (first <= FINAL_DATE) {
    let next = first + 28
    while (dayOfMonth(next) !== 1) next++
    months.push({ first, last: next - 1 })
    first = next
  }
  MONTHS_BY_SEASON.set(season, months)
  return months
}

/** Which of {@link monthsOf} a date falls in. */
export function monthIndexOf(date: number): number {
  return Math.max(
    0,
    monthsOf().findIndex((month) => date >= month.first && date <= month.last)
  )
}

/** How many days one row of the grid holds, and how many rows it always draws. */
const WEEK_LENGTH = WEEK_DAY_HEADERS.length
const GRID_ROWS = 6

/**
 * The date index of every cell of a month's grid: six Sunday-first rows, the months either side
 * filling the first and the last out, so a cell is the same cell in every month.
 */
export function gridCellsOf(month: Month): number[] {
  const lead = weekdayOf(month.first)
  return Array.from({ length: WEEK_LENGTH * GRID_ROWS }, (_, i) => month.first - lead + i)
}
