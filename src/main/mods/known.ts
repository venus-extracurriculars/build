import { readFileSync } from 'fs'
import { mkdir, readFile } from 'fs/promises'
import { join, resolve } from 'path'
import { switchedOn, type ModDef, type ModScope, type ModSwitches } from '@shared/mods'
import { isBuiltInRow, type ModSessionTable } from '@shared/modSession'
import { toAppError } from '@shared/errors'
import { writeAtomicJson, writeAtomicTextSync } from '../services/jsonFile'

/**
 * `data/mods/known.json`: the mods this build had at its last start, and whether each one's switch
 * was on. Written by main at every start, once the session table is settled, so that a mod which
 * later leaves the build can still be told apart: `mods.json` holds only the switches a player
 * changed, and a default-on mod nobody touched has no entry there.
 *
 *     { "schemaVersion": 1, "mods": { "<id>": { id, name?, version, scope, defaultOn, switchedOn, builtIn, library? } },
 *       "fallback"?: true, "offered"?: [ids], "dismissed"?: [ids] }
 *
 * By id, as `installed.json` is, so a later field on one mod's entry needs no new format.
 *
 * The three top-level fields belong to the offer to bring missing mods across. `fallback` marks a
 * record begun with no earlier one by a player who had already played, whose missing mods are
 * also read off the switches and saves they left. `offered` holds the mods the offer has been
 * shown with, and `dismissed` those the player left out or removed: neither is offered again.
 * An id in either is dropped at a start whose build has that mod, so a mod that returns and
 * then leaves once more is offered afresh.
 */

/** The file, beside the id folders and `installed.json`. */
export const KNOWN_FILE = 'known.json'

/** One mod as this build had it. */
export interface KnownMod {
  readonly id: string
  /** Absent on an entry written before names were recorded. */
  readonly name?: string
  readonly version: string
  readonly scope: ModScope
  readonly defaultOn: boolean
  /** The player's own switch where they set one, else the mod's default; playthroughs are not asked. */
  readonly switchedOn: boolean
  /** Part of this build, rather than installed under `data/mods/`. */
  readonly builtIn: boolean
  /** Present, and true, only for a library. */
  readonly library?: true
}

export interface KnownFile {
  readonly schemaVersion: 1
  readonly mods: Readonly<Record<string, KnownMod>>
  readonly fallback?: true
  readonly offered?: readonly string[]
  readonly dismissed?: readonly string[]
}

export interface KnownInputs {
  /** The mods built into this copy of the game, rows or not. */
  readonly builtIn: readonly ModDef[]
  /** The settled session table: its installed rows with a definition count, developer folders do not. */
  readonly table: ModSessionTable
  /** `mods.json` as it stands. */
  readonly switches: ModSwitches
  /** The file as the last start left it, parsed; anything not of this shape is ignored. */
  readonly previous: unknown
  /** Whether the player had played before, which marks a record begun with no earlier one as a fallback. */
  readonly playedBefore?: boolean
}

/** Whether a value has every field of one entry, with the right types. */
function isKnownMod(value: unknown): value is KnownMod {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const mod = value as Record<string, unknown>
  return typeof mod.id === 'string' && typeof mod.version === 'string'
    && (mod.scope === 'anytime' || mod.scope === 'playthrough')
    && typeof mod.defaultOn === 'boolean' && typeof mod.switchedOn === 'boolean' && typeof mod.builtIn === 'boolean'
}

/** A previous file of this shape, its entries and lists checked; `null` for a file of any other. */
export function readKnownFile(previous: unknown): KnownFile | null {
  if (typeof previous !== 'object' || previous === null) return null
  const file = previous as { schemaVersion?: unknown; mods?: unknown; fallback?: unknown; offered?: unknown; dismissed?: unknown }
  if (file.schemaVersion !== 1 || typeof file.mods !== 'object' || file.mods === null || Array.isArray(file.mods)) return null
  const ids = (value: unknown): string[] => Array.isArray(value)
    ? [...new Set(value.filter((id): id is string => typeof id === 'string'))].sort() : []
  const offered = ids(file.offered)
  const dismissed = ids(file.dismissed)
  return {
    schemaVersion: 1,
    mods: Object.fromEntries(Object.entries(file.mods).filter((entry): entry is [string, KnownMod] => isKnownMod(entry[1]) && entry[1].id === entry[0])),
    ...(file.fallback === true ? { fallback: true as const } : {}),
    ...(offered.length ? { offered } : {}),
    ...(dismissed.length ? { dismissed } : {})
  }
}

/**
 * The record for this start. Every mod of this build is written afresh. An entry the last file
 * held for a mod this build no longer has is kept as it was: that mod's last known state is what
 * the record is for once it has left.
 */
export function knownModsOf(inputs: KnownInputs): KnownFile {
  const entryOf = (def: ModDef, builtIn: boolean): KnownMod => ({
    id: def.id,
    name: def.name,
    version: def.version,
    scope: def.scope,
    defaultOn: def.defaultOn,
    switchedOn: switchedOn(inputs.switches, def.id, [def]),
    builtIn,
    ...(def.library ? { library: true as const } : {})
  })
  const previous = readKnownFile(inputs.previous)
  const mods: Record<string, KnownMod> = { ...previous?.mods }
  const present = new Set<string>()
  for (const def of inputs.builtIn) {
    mods[def.id] = entryOf(def, true)
    present.add(def.id)
  }
  for (const row of inputs.table.mods) {
    // Any row of this build, read or not, developer folder or not, is not a mod that left.
    present.add(row.id)
    // A row with no definition stands for no mod, and a developer folder is not an install.
    if (row.def === null || row.dev || isBuiltInRow(row)) continue
    if (inputs.builtIn.some((def) => def.id === row.id)) continue
    mods[row.id] = entryOf(row.def, false)
  }
  const sorted = Object.keys(mods).sort().map((id) => [id, mods[id]] as const)
  const offered = (previous?.offered ?? []).filter((id) => !present.has(id))
  const dismissed = (previous?.dismissed ?? []).filter((id) => !present.has(id))
  const fallback = previous ? previous.fallback === true : inputs.playedBefore === true
  return {
    schemaVersion: 1,
    mods: Object.fromEntries(sorted),
    ...(fallback ? { fallback: true as const } : {}),
    ...(offered.length ? { offered } : {}),
    ...(dismissed.length ? { dismissed } : {})
  }
}

/** Reads the file under `modsDir`: `undefined` where there is none or it is not JSON. */
async function readKnownJson(path: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch {
    // No file, or one that is not JSON: nothing carries over.
    return undefined
  }
}

/** Whether a parsed file was written by a newer build, which this one must leave as it is. */
function fromNewerBuild(file: unknown): boolean {
  const version = (file as { schemaVersion?: unknown } | null | undefined)?.schemaVersion
  return typeof version === 'number' && version > 1
}

/**
 * Writes this start's record under `modsDir`, atomically. A previous file that will not read or
 * parse is replaced; one a newer build wrote is left as it is, since this build would drop what
 * it cannot read. Never throws: a failed write is warned of and the start goes on.
 */
export async function writeKnownMods(modsDir: string, inputs: Omit<KnownInputs, 'previous'>, warn: (line: string) => void): Promise<void> {
  const path = join(resolve(modsDir), KNOWN_FILE)
  try {
    const previous = await readKnownJson(path)
    if (fromNewerBuild(previous)) {
      warn(`[mods] ${KNOWN_FILE} not written: the file is from a newer build`)
      return
    }
    await mkdir(resolve(modsDir), { recursive: true })
    await writeAtomicJson(path, knownModsOf({ ...inputs, previous }), { code: 'KNOWN_UNWRITABLE', message: `Could not save ${KNOWN_FILE}.` })
  } catch (err) {
    const failure = toAppError(err)
    warn(`[mods] ${KNOWN_FILE} not written: ${failure.detail ?? failure.message}`)
  }
}

/** The file with ids added to its `offered` and `dismissed` lists. */
export function withKnownLists(file: KnownFile, add: { offered?: readonly string[]; dismissed?: readonly string[] }): KnownFile {
  const merged = (list: readonly string[] | undefined, more: readonly string[] | undefined): string[] =>
    [...new Set([...(list ?? []), ...(more ?? [])])].sort()
  const offered = merged(file.offered, add.offered)
  const dismissed = merged(file.dismissed, add.dismissed)
  const { offered: _offered, dismissed: _dismissed, ...rest } = file
  return { ...rest, ...(offered.length ? { offered } : {}), ...(dismissed.length ? { dismissed } : {}) }
}

/**
 * Adds ids to the record's `offered` and `dismissed` lists, atomically. There is nothing to add to
 * where the record is missing, unreadable or from a newer build: the next start writes one afresh.
 * Throws where the write fails.
 */
export async function addKnownLists(modsDir: string, add: { offered?: readonly string[]; dismissed?: readonly string[] }): Promise<KnownFile | null> {
  const path = join(resolve(modsDir), KNOWN_FILE)
  const raw = await readKnownJson(path)
  const file = fromNewerBuild(raw) ? null : readKnownFile(raw)
  if (!file) return null
  const next = withKnownLists(file, add)
  await writeAtomicJson(path, next, { code: 'KNOWN_UNWRITABLE', message: `Could not save ${KNOWN_FILE}.` })
  return next
}

/**
 * Marks mods dismissed as their removal is applied at start, before the journal that asked for it
 * is deleted, so the offer never brings back a mod the player removed. A removal of a mod the
 * record does not hold, or with no record to write to, marks nothing. Throws where the write fails.
 */
export function dismissRemovedSync(modsDir: string, ids: readonly string[]): void {
  if (!ids.length) return
  const path = join(resolve(modsDir), KNOWN_FILE)
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return
  }
  const file = fromNewerBuild(raw) ? null : readKnownFile(raw)
  if (!file) return
  const removed = ids.filter((id) => Object.hasOwn(file.mods, id))
  if (!removed.length || removed.every((id) => file.dismissed?.includes(id))) return
  writeAtomicTextSync(path, JSON.stringify(withKnownLists(file, { dismissed: removed }), null, 2), {
    code: 'KNOWN_UNWRITABLE', message: `Could not save ${KNOWN_FILE}.`
  })
}
