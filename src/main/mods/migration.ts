import type { InstallChange, InstallRequest } from '@vx/modkit/host/shared'
import type { MigrationOffer, MigrationReason, MigrationRow, ModSourceResult } from '@shared/modInstall'
import type { ModSwitches } from '@shared/mods'
import { listedReleases } from '@shared/modUpdates'
import type { PlaythroughRecord } from '@shared/types'
import type { KnownFile } from './known'

/**
 * The mods a player had that this build no longer has, and the offer to bring them across: who is
 * missing is worked out from the record and the saves alone, and what each one is offered at from
 * the approved list.
 */

/** What the saves say of the mods they were played with. */
export interface SavedModUse {
  /** Each playthrough record's `mods` and `modVersions`. */
  readonly playthroughs: readonly Pick<PlaythroughRecord, 'mods' | 'modVersions'>[]
  /** The ids with a slice in a save's `ex`. */
  readonly saveData: readonly string[]
}

export interface MissingInputs extends SavedModUse {
  /** The record as this start wrote it; `null` where it could not be. */
  readonly known: KnownFile | null
  /** Built in now, a row of this start's session, or staged to install at the next start. */
  readonly present: ReadonlySet<string>
  readonly switches: ModSwitches
}

export interface MissingMod {
  readonly id: string
  /** Where the record has it. */
  readonly name?: string
  readonly reasons: readonly MigrationReason[]
}

/** Whether the player's earlier start had no record to read, so the switches and saves stand in for it. */
function fallbackOf(known: KnownFile | null): boolean {
  return known === null || known.fallback === true
}

/**
 * Missing = mods the record says were on, or that a playthrough or a save uses, less those built in,
 * installed or staged now, less those left out. A recorded mod that was off and is used by nothing is
 * not missing, and a library never is: it comes in with what requires it. A record begun with no
 * earlier one also counts the mods `mods.json` has switched on, and those used by playthroughs or saves,
 * that it has no entry for.
 */
export function missingMods(inputs: MissingInputs): MissingMod[] {
  const used = new Set(inputs.playthroughs.flatMap((record) => [
    ...(Array.isArray(record.mods) ? record.mods : []),
    ...(record.modVersions && typeof record.modVersions === 'object' ? Object.keys(record.modVersions) : [])
  ]))
  const data = new Set(inputs.saveData)
  const known = inputs.known?.mods ?? {}
  const dismissed = new Set(inputs.known?.dismissed ?? [])
  const reasonsOf = (id: string, on: boolean): MigrationReason[] => [
    ...(on ? ['switched-on' as const] : []),
    ...(used.has(id) ? ['playthrough' as const] : []),
    ...(data.has(id) ? ['save-data' as const] : [])
  ]
  const missing = new Map<string, MissingMod>()
  for (const entry of Object.values(known)) {
    if (entry.library) continue
    const reasons = reasonsOf(entry.id, entry.switchedOn)
    if (reasons.length) missing.set(entry.id, { id: entry.id, ...(entry.name ? { name: entry.name } : {}), reasons })
  }
  if (fallbackOf(inputs.known)) {
    const explicit = Object.entries(inputs.switches.on).filter(([, on]) => on === true).map(([id]) => id)
    for (const id of new Set([...explicit, ...used, ...data])) {
      if (Object.hasOwn(known, id)) continue
      missing.set(id, { id, reasons: reasonsOf(id, inputs.switches.on[id] === true) })
    }
  }
  return [...missing.values()]
    .filter((mod) => !inputs.present.has(mod.id) && !dismissed.has(mod.id))
    .sort((a, b) => a.id.localeCompare(b.id))
}

/** Ticked to start with: a mod the player had on, or that a playthrough is fixed to. Save data alone is not. */
export function tickedOf(reasons: readonly MigrationReason[]): boolean {
  return reasons.includes('switched-on') || reasons.includes('playthrough')
}

export interface OfferInputs {
  readonly known: KnownFile | null
  readonly present: ReadonlySet<string>
  readonly sources: readonly ModSourceResult[]
  readonly allowMain: boolean
  /** The changes one request would make, resolved as an install plan is; `null` where it cannot be. */
  readonly resolve: (request: Readonly<Record<string, InstallRequest>>) => Promise<readonly InstallChange[] | null>
}

/**
 * The offer, against the approved list alone: each missing mod at the newest approved release that
 * loads on this core and resolves with its requirements, or with no release while the list has none.
 * A record begun with no earlier one adds, unticked, every mod the list says the bundle carried that
 * is not here and not left out. `null` where the approved list could not be read, and where nothing is
 * left to list.
 */
export async function migrationOffer(missing: readonly MissingMod[], inputs: OfferInputs): Promise<MigrationOffer | null> {
  const approved = inputs.sources.find((result) => result.ok
    ? result.data.approvedList && result.data.kind === 'list' : result.approvedList)
  if (!approved?.ok) return null
  const listing = [approved]
  const offered = new Set(inputs.known?.offered ?? [])
  const dismissed = new Set(inputs.known?.dismissed ?? [])

  const rowOf = async (id: string, name: string | undefined, reasons: readonly MigrationReason[], bundled: boolean): Promise<MigrationRow | null> => {
    const releases = listedReleases(id, listing, inputs.allowMain)
    if (releases.some((item) => item.release.manifest.library)) return null
    let offer: MigrationRow['offer']
    for (const item of releases) {
      if (item.problem) continue
      const changes = await inputs.resolve({ [id]: { version: item.release.version, source: item.source.url } })
      if (!changes) continue
      offer = {
        version: item.release.version,
        source: item.source.url,
        main: changes.some((change) => change.release.manifest.main === true),
        with: changes.filter((change) => change.id !== id).map((change) => ({
          id: change.id, name: change.release.manifest.name, version: change.release.version,
          ...(change.from ? { from: change.from } : {})
        }))
      }
      break
    }
    if (bundled && !offer) return null
    return {
      id,
      name: releases[0]?.release.manifest.name ?? name ?? id,
      reasons,
      bundled,
      ticked: !bundled && offer !== undefined && tickedOf(reasons),
      offered: offered.has(id),
      ...(offer ? { offer } : {})
    }
  }

  const rows: MigrationRow[] = []
  for (const mod of missing) {
    const row = await rowOf(mod.id, mod.name, mod.reasons, false)
    if (row) rows.push(row)
  }
  if (fallbackOf(inputs.known)) {
    const listed = new Set(rows.map((row) => row.id))
    for (const mod of approved.data.source.mods) {
      if (mod.bundledIn === undefined || listed.has(mod.id) || inputs.present.has(mod.id) || dismissed.has(mod.id)) continue
      const row = await rowOf(mod.id, undefined, [], true)
      if (row) rows.push(row)
    }
  }
  if (!rows.length) return null
  const rank = (row: MigrationRow): number => row.bundled ? 2 : row.ticked ? 0 : 1
  return { rows: rows.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name)) }
}
