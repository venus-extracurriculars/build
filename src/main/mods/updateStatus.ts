import { mkdir } from 'fs/promises'
import { isBuiltInRow, type ModSessionTable } from '@shared/modSession'
import type { InstalledModInfo, ModSourceResult, ModUpdateStatus, PendingModChanges } from '@shared/modInstall'
import { compareModVersions, modCheckDue, modUpdates } from '@shared/modUpdates'
import type { ModDef } from '@shared/mods'
import { writeAtomicJson } from '../services/jsonFile'
import { isModId, isModVersion, modPath, readInstalledFile, readModText } from './installFiles'
import { readdirSync } from 'fs'
import { findInstalledMods, INACTIVE_RELEASE } from './layout'
import { redactUrl } from '../services/downloadService'

const FILE = 'update-check.json'
const empty: ModUpdateStatus = { checkedAt: null, sources: [], count: 0 }

export function installedModInfo(
  root: string, builtIn: readonly ModDef[], table: ModSessionTable, sources: readonly ModSourceResult[]
): InstalledModInfo[] {
  const records = readInstalledFile(root).mods
  const approved = sources.find((row) => row.ok && row.data.approvedList)
  const installed: InstalledModInfo[] = builtIn.map((mod) => ({
    id: mod.id, version: mod.version, name: mod.name, approved: false, origin: 'built-in',
    status: table.mods.find((row) => row.id === mod.id && isBuiltInRow(row))?.status ?? 'loaded',
    otherVersions: [], library: mod.library, requires: mod.requires ?? []
  }))
  for (const row of table.mods) {
    if (row.dev && row.def && !builtIn.some((mod) => mod.id === row.id)) installed.push({
      id: row.id, version: row.def.version, name: row.def.name, approved: false,
      origin: 'developer', status: row.status, otherVersions: [], library: row.def.library,
      requires: row.def.requires ?? []
    })
  }
  for (const row of findInstalledMods(root).mods) {
    if (!row.version || !isModId(row.id) || installed.some((mod) => mod.id === row.id)) continue
    const { id, version } = row
    const session = table.mods.find((item) => item.id === id && !item.dev && !isBuiltInRow(item))
    const record = Object.hasOwn(records, id) ? records[id][version] : undefined
    const withdrawn = approved?.ok
      ? approved.data.source.mods.find((item) => item.id === id)?.withdrawn?.find((item) => item.version === version)?.reason
      : undefined
    let otherVersions: string[] = []
    try {
      otherVersions = readdirSync(modPath(root, id), { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && isModVersion(entry.name) && entry.name !== version)
        .map((entry) => entry.name)
        .filter((other) => readModText(modPath(root, id, other, INACTIVE_RELEASE)) === undefined)
        .sort((a, b) => compareModVersions(b, a))
    } catch {
      // The loader already reports folders it cannot read.
    }
    installed.push({
      id, version, name: session?.def?.name ?? id, approved: record?.approved === true,
      source: typeof record?.source === 'string' ? redactUrl(record.source) : undefined,
      origin: 'installed', status: session?.status ?? 'refused', otherVersions, withdrawn,
      library: session?.def?.library, requires: session?.def?.requires ?? []
    })
  }
  return installed
}

/** Keeps the previous listing for notices and the once-a-day menu check. */
export class ModUpdateCheck {
  private cached: ModUpdateStatus | undefined
  private running: Promise<ModUpdateStatus> | undefined

  constructor(private readonly root: () => string) {}

  status(): ModUpdateStatus {
    if (this.cached) return this.cached
    try {
      const value = JSON.parse(readModText(modPath(this.root(), FILE)) ?? 'null')
      if (value && Number.isFinite(value.checkedAt) && Array.isArray(value.sources) &&
          value.sources.every((row: ModSourceResult) => row?.ok ? Array.isArray(row.data?.source?.mods) : row?.ok === false)
          && Number.isSafeInteger(value.count) && value.count >= 0) {
        return this.cached = value as ModUpdateStatus
      }
    } catch {
      // A missing or damaged cache just makes the check due.
    }
    return this.cached = empty
  }

  run(force: boolean, check: () => Promise<Omit<ModUpdateStatus, 'checkedAt'>>): Promise<ModUpdateStatus> {
    if (this.running) return this.running
    if (!force && !modCheckDue(this.status().checkedAt, Date.now())) return Promise.resolve(this.status())
    this.running = (async () => {
      let result: Omit<ModUpdateStatus, 'checkedAt'>
      try {
        result = await check()
      } catch {
        result = { sources: this.status().sources, count: 0 }
      }
      const next = this.cached = { ...result, checkedAt: Date.now() }
      try {
        await mkdir(modPath(this.root()), { recursive: true })
        await writeAtomicJson(modPath(this.root(), FILE), next, {
          code: 'MOD_UPDATE_CHECK', message: 'Could not remember the mod update check.'
        })
      } catch {
        // The current window can still use the check.
      }
      return next
    })().finally(() => { this.running = undefined })
    return this.running
  }
}

export function updateCount(
  installed: readonly InstalledModInfo[], results: readonly ModSourceResult[],
  pending: PendingModChanges, allowMain: boolean
): number {
  return results.some((row) => !row.ok) ? 0 : modUpdates(installed, results, pending, allowMain).filter((row) => row.offer).length
}
