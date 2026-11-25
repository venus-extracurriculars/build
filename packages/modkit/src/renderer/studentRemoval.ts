import type { Result } from '../bridge/shared'
import { declaredHooksNow, refusedAsForeign } from './attribution'

/** One permanent absence, committed together with its owner's next save slice. */
export interface StudentRemovalRequest {
  charId: string
  eventId: string
  reason: string
  next: unknown
  /** The owner's exact live save-field value that this result was calculated from. */
  expect: unknown
  run: object
}

export interface StudentRemovalHost {
  remove(modId: string, request: StudentRemovalRequest): Promise<Result<null>>
}

let host: StudentRemovalHost | null = null

/** Core binds the save lane. Mods do not supply an implementation. */
export function bindStudentRemoval(next: StudentRemovalHost | null): void { host = next }

/**
 * Permanently removes a student from this save, preserving an archive and their library files.
 * The removal and the owner's next save slice commit together or neither does. Only a settled
 * story landing is eligible; a scene, replay, Creator, pending text, stale run or disabled owner
 * is refused without side effects. A matching event retry cannot apply the effect twice.
 * Disabling or uninstalling the initiating mod does not restore the student.
 */
export async function removeStudent(modId: string, request: StudentRemovalRequest): Promise<Result<null>> {
  const declared = declaredHooksNow()?.declared(modId)
  if (refusedAsForeign(modId, 'removeStudent') || (declared && !declared.includes('renderer:removeStudent'))) {
    return { ok: false, error: { code: 'MOD_WRITE_FOREIGN', message: 'That student removal was refused.' } }
  }
  if (!host) return { ok: false, error: { code: 'MOD_WRITE_NO_GAME', message: 'There is no game to save into.' } }
  try {
    return await host.remove(modId, { ...request, next: structuredClone(request.next) })
  } catch {
    return { ok: false, error: { code: 'MOD_WRITE_INVALID', message: 'That student removal could not be read.' } }
  }
}
