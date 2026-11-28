import { create } from 'zustand'
import type { ModPlanRequest, ModUpdateStatus } from '@shared/modInstall'
import type { PlaythroughRecord } from '@shared/types'
import { MODS } from '@shared/mods'
import { listedReleases } from '@shared/modUpdates'
import { isWebBuild } from '../platform'
import { useModSessionStore } from './modSessionStore'
import { useSettingsStore } from './settingsStore'
import { useUiStore } from './uiStore'

export type InstallRequest = Extract<ModPlanRequest, { kind: 'install' }>

interface MissingMod {
  id: string
  name: string
  install?: InstallRequest
}

interface BrowserState {
  status: ModUpdateStatus
  missing: { mods: MissingMod[]; answer: (proceed: boolean) => void } | null
  initialRequest: InstallRequest | null
}

export const useModBrowserStore = create<BrowserState>(() => ({
  status: { checkedAt: null, sources: [], count: 0 },
  missing: null,
  initialRequest: null
}))

export function watchModUpdates(): () => void {
  if (isWebBuild()) return () => {}
  let live = true
  const receive = (status: ModUpdateStatus): void => {
    if (live && (status.checkedAt ?? 0) >= (useModBrowserStore.getState().status.checkedAt ?? 0)) {
      useModBrowserStore.setState({ status })
    }
  }
  const stop = window.api.mods.onUpdatesChanged(receive)
  void window.api.mods.updateStatus().then((result) => { if (result.ok) receive(result.data) })
  return () => { live = false; stop() }
}

/** Pauses desktop save entry at the missing-mod notice. Uses only the last received listing. */
export function confirmMissingModInstall(record: Pick<PlaythroughRecord, 'mods' | 'modVersions'>): Promise<boolean> {
  if (isWebBuild() || useUiStore.getState().view === 'game') return Promise.resolve(true)
  const state = useModBrowserStore.getState()
  const table = useModSessionStore.getState().table
  const allowMain = useSettingsStore.getState().settings?.allowUnreviewedMain === true
  const mods = [...new Set(record.mods ?? [])]
    .filter((id) => !MODS.some((mod) => mod.id === id) && !table.mods.some((mod) => mod.id === id))
    .map((id): MissingMod => {
      const releases = listedReleases(id, state.status.sources, allowMain).filter((item) => !item.release.manifest.library)
      const installable = releases.filter((item) => !item.problem)
      const offer = installable.find((item) => item.release.version === record.modVersions?.[id]) ?? installable[0]
      return {
        id, name: releases[0]?.release.manifest.name ?? id,
        install: offer ? { kind: 'install', mods: { [id]: { version: offer.release.version, source: offer.source.url } } } : undefined
      }
    })
  if (!mods.length) return Promise.resolve(true)
  state.missing?.answer(false)
  return new Promise((resolve) => {
    useModBrowserStore.setState({ missing: { mods, answer: (proceed) => {
      useModBrowserStore.setState({ missing: null })
      resolve(proceed)
    } } })
  })
}
