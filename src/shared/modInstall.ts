import type { InstallChange, InstallRequest, ModSource } from '@vx/modkit/host/shared'
import type { AppError, Result } from './types'

export interface FetchedModSource {
  readonly url: string
  readonly kind: 'list' | 'repo'
  /** Source identity. Trust requires a matching pinned hash. */
  readonly approvedList: boolean
  readonly source: ModSource
}

export type ModSourceResult =
  | Extract<Result<FetchedModSource>, { ok: true }>
  | { readonly ok: false; readonly error: AppError; readonly url?: string; readonly approvedList: boolean }

export type ModPlanRequest =
  | { readonly kind: 'install'; readonly mods: Readonly<Record<string, InstallRequest>> }
  | { readonly kind: 'remove'; readonly id: string }
  | { readonly kind: 'rollback'; readonly id: string; readonly version: string }

export interface ModInstallPlan {
  readonly kind: 'install'
  readonly request: Extract<ModPlanRequest, { kind: 'install' }>
  readonly changes: readonly InstallChange[]
}

export type ModPlan = ModInstallPlan | Extract<ModPlanRequest, { kind: 'rollback' }> | {
  readonly kind: 'remove'
  readonly id: string
  readonly orphaned: readonly string[]
}

export interface PendingModChanges {
  readonly pending: 1
  readonly current: Readonly<Record<string, string>>
  readonly remove: readonly string[]
  readonly cleanup?: Readonly<Record<string, { readonly keep: string; readonly versions: readonly string[] }>>
}

/** Screen metadata for staged releases, including when their source is offline. */
export interface PendingModDetails extends PendingModChanges {
  readonly staged: Readonly<Record<string, { readonly name: string; readonly library?: boolean }>>
}

export type ModInstallProgress = {
  readonly id: string
  readonly version: string
} & (
  | { readonly phase: 'downloading'; readonly bytesDone: number; readonly bytesTotal: number }
  | { readonly phase: 'checking' | 'unpacking' | 'recorded' }
)

export interface InstalledModInfo {
  readonly id: string
  readonly version: string
  readonly name: string
  readonly source?: string
  readonly approved: boolean
  readonly origin: 'built-in' | 'developer' | 'installed'
  readonly status: import('./modSession').ModStatus
  readonly otherVersions: readonly string[]
  readonly withdrawn?: string
  readonly library?: boolean
  readonly requires: readonly string[]
}

export interface ModUpdateStatus {
  readonly checkedAt: number | null
  readonly sources: readonly ModSourceResult[]
  readonly count: number
}

/** Why a mod that left the build is wanted back. */
export type MigrationReason = 'switched-on' | 'playthrough' | 'save-data'

/** One mod the offer to bring mods across lists. */
export interface MigrationRow {
  readonly id: string
  readonly name: string
  readonly reasons: readonly MigrationReason[]
  /** Listed under "Also part of Venus Extracurriculars": a player with no record, and a mod the approved list says the bundle carried. */
  readonly bundled: boolean
  /** Ticked to start with: installable, and switched on or used by a playthrough. */
  readonly ticked: boolean
  /** Shown with the offer before, at a start where it could be installed. */
  readonly offered: boolean
  /** The newest approved release that loads, with what comes with it; absent while the approved list has none. */
  readonly offer?: {
    readonly version: string
    readonly source: string
    readonly main: boolean
    /** The other mods the install brings or updates, libraries included. */
    readonly with: readonly { readonly id: string; readonly name: string; readonly version: string; readonly from?: string }[]
  }
}

export interface MigrationOffer {
  readonly rows: readonly MigrationRow[]
}
