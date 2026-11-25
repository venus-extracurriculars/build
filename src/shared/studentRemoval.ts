import type { CharState, Conversation, SaveDraft } from './types'
import { SAFE_CHAR_ID } from './characterRules'
import { appError } from './errors'

/** A permanent absence in this save's timeline, independent of the initiating mod's switch. */
export interface RemovedStudent {
  owner: string
  eventId: string
  reason: string
  date: number
  semester: number
  /** Archived rather than discarded; includes other mods' data on these native records. */
  info?: CharState
  conversation?: Conversation
}

export type RemovedStudents = Record<string, RemovedStudent>

/** Refuse a damaged absence ledger instead of silently returning its students to the roster. */
export function assertRemovedStudents(value: unknown, where: string): void {
  if (value === undefined) return
  const plain = (x: unknown): x is Record<string, unknown> => Boolean(x) && typeof x === 'object' && !Array.isArray(x)
  const refuse = (): never => { throw appError('SAVE_MALFORMED', 'That save has an unreadable student-removal record.', where) }
  if (!plain(value)) refuse()
  for (const [id, row] of Object.entries(value as Record<string, unknown>)) {
    if (!SAFE_CHAR_ID.test(id) || !plain(row)) refuse()
    const removal = row as Record<string, unknown>
    if (typeof removal.owner !== 'string' || !removal.owner || typeof removal.eventId !== 'string' || !removal.eventId ||
        typeof removal.reason !== 'string' || !removal.reason || !Number.isSafeInteger(removal.date) ||
        !Number.isSafeInteger(removal.semester) || Number(removal.semester) < 0 ||
        (removal.info !== undefined && !plain(removal.info)) ||
        (removal.conversation !== undefined && !plain(removal.conversation))) refuse()
  }
}

/** Pure roster projection. The character library, prior saves and replays are never changed. */
export function withoutRemoved(ids: readonly string[], removed: RemovedStudents | undefined): string[] {
  return ids.filter(id => !Object.hasOwn(removed ?? {}, id))
}

/** A new map, retaining every surviving record by reference. */
export function withoutRemovedRecords<T>(records: Readonly<Record<string, T>>, removed: RemovedStudents | undefined): Record<string, T> {
  return Object.fromEntries(Object.entries(records).filter(([id]) => !Object.hasOwn(removed ?? {}, id)))
}

/** Current and future interactions stop; history, other students and other mods' records survive. */
export function saveWithStudentRemoved(save: SaveDraft, charId: string, removal: RemovedStudent): SaveDraft {
  const removed = { ...save.removedStudents, [charId]: removal }
  const { bunnyboard } = save
  return {
    ...save,
    removedStudents: removed,
    charInfo: withoutRemovedRecords(save.charInfo, removed),
    bunnyboard: {
      ...bunnyboard,
      conversations: withoutRemovedRecords(bunnyboard.conversations, removed),
      requestsSent: withoutRemoved(bunnyboard.requestsSent, removed),
      requestsReceived: withoutRemoved(bunnyboard.requestsReceived, removed),
      ...(bunnyboard.suggestions ? { suggestions: withoutRemoved(bunnyboard.suggestions, removed) } : {})
    },
    // Past calendar entries remain history; future plans no longer invite this student.
    events: save.events.map(event => event.date < save.date || (event.date === save.date && event.time < save.time)
      ? event : { ...event, charIds: withoutRemoved(event.charIds, removed) }),
    ...(save.pendingTransfers ? { pendingTransfers: save.pendingTransfers.filter(entry => !Object.hasOwn(removed, entry.charId)) } : {}),
    npcOverlay: save.npcOverlay ? {
      ...save.npcOverlay,
      wentOut: withoutRemoved(save.npcOverlay.wentOut, removed),
      groups: save.npcOverlay.groups.filter(group => !group.host || !Object.hasOwn(removed, group.host))
        .map(group => ({ ...group, members: withoutRemoved(group.members, removed) }))
        .filter(group => group.members.length > 0)
    } : null,
    springBreakAway: save.springBreakAway ? withoutRemoved(save.springBreakAway, removed) : save.springBreakAway,
    homecomingVisitor: save.homecomingVisitor === charId ? undefined : save.homecomingVisitor
  }
}
