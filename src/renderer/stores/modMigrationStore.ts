import { create } from 'zustand'
import type { MigrationOffer } from '@shared/modInstall'
import { isWebBuild } from '../platform'
import { useUiStore } from './uiStore'

/**
 * The offer to bring across the mods this build no longer has: asked of main once after boot, on
 * the title screen, and again whenever the Mods screen reads its sources. It opens by itself once per
 * start, and only while it holds a mod that can be installed and has not been offered before; the
 * Installed tab's banner reopens it until every mod in it is dealt with.
 */
interface MigrationState {
  offer: MigrationOffer | null
  open: boolean
}

export const useModMigrationStore = create<MigrationState>(() => ({ offer: null, open: false }))

/** Whether the offer has opened by itself this start. */
let opened = false
let reading: Promise<void> | null = null

/** Asks main for the offer, and opens it where it is owed and the title screen is showing. */
export async function checkModMigration(mayOpen: boolean): Promise<void> {
  if (isWebBuild()) return
  reading ??= (async () => {
    try {
      const result = await window.api.mods.migration()
      if (result.ok) useModMigrationStore.setState({ offer: result.data })
    } finally {
      reading = null
    }
  })()
  await reading
  const fresh = useModMigrationStore.getState().offer?.rows.filter((row) => row.offer && !row.offered).map((row) => row.id) ?? []
  if (!mayOpen || opened || !fresh.length || useUiStore.getState().view !== 'mainMenu') return
  opened = true
  useModMigrationStore.setState({ open: true })
  void window.api.mods.migrationAnswer('offered', fresh)
}

/** Whether the title screen has asked this start. */
let titleAsked = false

/** The title screen's one ask of a start, once the boot's cover has lifted. */
export function checkModMigrationAtTitle(): void {
  if (titleAsked) return
  titleAsked = true
  void checkModMigration(true)
}

export function openModMigration(): void {
  useModMigrationStore.setState({ open: true })
}

export function closeModMigration(): void {
  useModMigrationStore.setState({ open: false })
}

/** Leaves one mod out for good: it is not offered again, and can still be installed from Browse. */
export async function leaveModOut(id: string): Promise<void> {
  const result = await window.api.mods.migrationAnswer('dismissed', [id])
  if (!result.ok) throw result.error
  const offer = useModMigrationStore.getState().offer
  const rows = offer?.rows.filter((row) => row.id !== id) ?? []
  useModMigrationStore.setState((state) => ({
    offer: rows.length ? { rows } : null,
    open: state.open && rows.length > 0
  }))
}
