import { checkCompat, hookNameKind, type SourceMod, type SourceRelease } from '@vx/modkit/host/shared'
import { compareVersions, parseVersion } from '../../packages/modkit/src/shared/range'
import type { FetchedModSource, InstalledModInfo, ModSourceResult, PendingModChanges } from './modInstall'

export const MOD_CHECK_INTERVAL = 24 * 60 * 60 * 1000

export function modCheckDue(checkedAt: number | null, now: number): boolean {
  return checkedAt === null || now < checkedAt || now - checkedAt >= MOD_CHECK_INTERVAL
}

export function compareModVersions(a: string, b: string): number {
  const left = parseVersion(a)
  const right = parseVersion(b)
  return left && right ? compareVersions(left, right) : 0
}

export function releaseProblem(source: FetchedModSource, mod: SourceMod, release: SourceRelease, allowMain: boolean): string | undefined {
  const withdrawal = mod.withdrawn?.find((item) => item.version === release.version)
  if (withdrawal) return withdrawal.reason
  const compat = checkCompat(release.manifest.hooks.filter((hook) => hookNameKind(hook).kind !== 'export'))
  if (compat.status !== 'loads') return compat.message
  if (release.manifest.main && !allowMain && !isReviewedSource(source)) return 'This mod has unreviewed main code.'
  return undefined
}

export function isReviewedSource(source: FetchedModSource): boolean {
  return source.approvedList && source.kind === 'list'
}

export interface ListedModRelease {
  source: FetchedModSource
  mod: SourceMod
  release: SourceRelease
  problem?: string
}

export function listedReleases(id: string, results: readonly ModSourceResult[], allowMain: boolean): ListedModRelease[] {
  // For equal versions use source order, which puts the approved list first.
  return results.flatMap((result) => {
    if (!result.ok) return []
    const source = result.data
    const mod = source.source.mods.find((item) => item.id === id)
    if (!mod) return []
    return mod.releases.map((release) => ({ source, mod, release, problem: releaseProblem(source, mod, release, allowMain) }))
  }).sort((a, b) => compareModVersions(b.release.version, a.release.version))
}

export function modUpdates(
  installed: readonly InstalledModInfo[], results: readonly ModSourceResult[],
  pending: PendingModChanges | null, allowMain: boolean
) {
  return installed.flatMap((mod) => {
    if (mod.origin !== 'installed' || mod.library || (pending && (Object.hasOwn(pending.current, mod.id) || pending.remove.includes(mod.id)))) return []
    const newer = listedReleases(mod.id, results, allowMain)
      .filter(({ release }) => compareModVersions(release.version, mod.version) > 0)
    const offer = newer.find((item) => !item.problem)
    const unavailable = newer.find((item) => item.problem && (!offer || compareModVersions(item.release.version, offer.release.version) > 0))
    return offer || unavailable ? [{ mod, offer, unavailable }] : []
  }).sort((a, b) => Number(b.mod.status === 'needs-update') - Number(a.mod.status === 'needs-update'))
}

export function pendingChangeParts(pending: PendingModChanges | null, installed: readonly InstalledModInfo[], sources: readonly ModSourceResult[]) {
  if (!pending) return []
  const display = (id: string) => installed.find((row) => row.id === id)?.name
    ?? listedReleases(id, sources, true)[0]?.release.manifest.name ?? id
  return [
    ...Object.entries(pending.current).map(([id, version]) => {
      const row = installed.find((mod) => mod.id === id)
      return { id, name: display(id), version, action: !row ? 'install' as const
        : compareModVersions(version, row.version) < 0 ? 'restore' as const : 'update' as const }
    }),
    ...pending.remove.map((id) => ({ id, name: display(id), version: undefined, action: 'remove' as const }))
  ]
}
