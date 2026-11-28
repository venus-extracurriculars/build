import { useEffect, useRef, useState } from 'react'
import type { InstalledModInfo, ModInstallPlan, ModInstallProgress, ModPlan, ModPlanRequest, PendingModChanges } from '@shared/modInstall'
import { listedReleases, modUpdates, pendingChangeParts } from '@shared/modUpdates'
import { toAppError } from '@shared/errors'
import type { Result } from '@shared/types'
import { isWebBuild } from '../platform'
import { useModBrowserStore } from '../stores/modBrowserStore'
import { useSettingsStore } from '../stores/settingsStore'

function dataOf<T>(result: Result<T>): T {
  if (!result.ok) throw result.error
  return result.data
}

type Question =
  | { kind: 'plan'; key: string; plan: ModPlan }
  | { kind: 'source'; address: string }
  | { kind: 'trust' }
  | { kind: 'restart' }

export function useModInstallerPanel(inGame: boolean, surface: 'screen' | 'notice' = 'screen') {
  const desktop = !isWebBuild()
  const sources = useModBrowserStore((state) => state.status.sources)
  const checkedAt = useModBrowserStore((state) => state.status.checkedAt)
  const allowMain = useSettingsStore((state) => state.settings?.allowUnreviewedMain === true)
  const customSources = useSettingsStore((state) => state.settings?.modSources)
  const [installed, setInstalled] = useState<readonly InstalledModInfo[]>([])
  const [pending, setPending] = useState<PendingModChanges | null>(null)
  const [question, setQuestion] = useState<Question | null>(null)
  const [orphaned, setOrphaned] = useState<readonly string[]>([])
  const [accepted, setAccepted] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const active = useRef(false)
  const [checking, setChecking] = useState(desktop && surface === 'screen')
  const [error, setError] = useState<{ key: string; message: string } | null>(null)
  const [progress, setProgress] = useState<readonly ModInstallProgress[]>([])

  async function readDisk(): Promise<void> {
    const [rows, journal] = await Promise.all([window.api.mods.installed(), window.api.mods.pending()])
    setInstalled(dataOf(rows))
    setPending(dataOf(journal))
  }

  async function refresh(): Promise<void> {
    setChecking(true)
    try {
      const listing = dataOf(await window.api.mods.sources())
      const status = dataOf(await window.api.mods.updateStatus())
      useModBrowserStore.setState({ status: { ...status, sources: listing } })
      await readDisk()
    } catch (err) {
      setError({ key: 'screen', message: toAppError(err).message })
    } finally {
      setChecking(false)
    }
  }

  async function run(key: string, action: () => Promise<void>): Promise<void> {
    if (active.current) return
    active.current = true
    setBusy(key)
    setError(null)
    setProgress([])
    try {
      await action()
    } catch (err) {
      setError({ key, message: toAppError(err).message })
    } finally {
      active.current = false
      setBusy(null)
      setProgress([])
    }
  }

  function plan(request: ModPlanRequest, key: string): void {
    void run(key, async () => {
      const next = dataOf(await window.api.mods.plan(request))
      setOrphaned(next.kind === 'remove' ? next.orphaned : [])
      setQuestion({ kind: 'plan', key, plan: next })
    })
  }

  useEffect(() => {
    if (!desktop) return
    const unsubscribe = window.api.mods.onInstallProgress((event) => {
      if (!active.current) return
      setProgress((previous) => [...previous.filter((one) => one.id !== event.id), event])
    })
    void readDisk().catch((err: unknown) => setError({ key: 'screen', message: toAppError(err).message }))
    if (surface === 'screen') void refresh()
    return unsubscribe
  }, [desktop, surface])

  function askSource(address: string): void {
    if (address.trim()) setQuestion({ kind: 'source', address: address.trim() })
  }

  function setTrust(on: boolean): void {
    if (on) {
      setAccepted(false)
      setQuestion({ kind: 'trust' })
    } else {
      void run('sources', async () => {
        dataOf(await window.api.mods.setAllowUnreviewedMain(false))
        await useSettingsStore.getState().load()
      })
    }
  }

  function removeSource(address: string): void {
    void run('sources', async () => {
      dataOf(await window.api.mods.removeSource(address))
      await useSettingsStore.getState().load()
      await refresh()
    })
  }

  function changePending(key: string, action: () => Promise<Result<PendingModChanges>>): void {
    void run(key, async () => {
      setPending(dataOf(await action()))
      await readDisk()
    })
  }

  function restart(): void {
    if (inGame) setQuestion({ kind: 'restart' })
    else void run('pending', async () => { dataOf(await window.api.mods.restart()) })
  }

  function confirm(): void {
    if (!question || (question.kind === 'trust' && !accepted)) return
    setQuestion(null)
    if (question.kind === 'plan') {
      const action = question.plan
      changePending(question.key, () => action.kind === 'install'
        ? window.api.mods.install(action)
        : action.kind === 'remove' ? window.api.mods.remove(action.id, orphaned)
          : window.api.mods.goBack(action.id, action.version))
    } else if (question.kind === 'source') {
      void run('sources', async () => {
        dataOf(await window.api.mods.addSource(question.address))
        await useSettingsStore.getState().load()
        await refresh()
      })
    } else if (question.kind === 'trust') {
      void run('sources', async () => {
        dataOf(await window.api.mods.setAllowUnreviewedMain(true))
        await useSettingsStore.getState().load()
      })
    } else {
      void run('pending', async () => { dataOf(await window.api.mods.restart()) })
    }
  }

  const updates = modUpdates(installed, sources, pending, allowMain)
  function updateAll(): void {
    plan({ kind: 'install', mods: Object.fromEntries(updates.flatMap(({ mod, offer }) => offer
      ? [[mod.id, { source: offer.source.url, version: offer.release.version }] as const] : [])) }, 'updates')
  }

  function nameOf(id: string): string {
    return installed.find((mod) => mod.id === id)?.name ?? listedReleases(id, sources, true)[0]?.release.manifest.name ?? id
  }

  function planParts(action: ModInstallPlan) {
    return action.changes.map((change) => ({
      name: change.release.manifest.name, version: change.release.version, from: change.from,
      main: change.release.manifest.main,
      custom: !sources.some((result) => result.ok && result.data.url === change.source && result.data.approvedList
        && result.data.kind === 'list'),
      source: sources.find((result) => result.ok && result.data.url === change.source),
      address: change.source
    }))
  }

  return {
    desktop, sources, checkedAt, customSources, allowMain, installed, pending, checking, error, busy, progress, updates,
    parts: pendingChangeParts(pending, installed, sources),
    question, orphaned, setOrphaned, accepted, setAccepted, confirm, cancel: () => setQuestion(null),
    plan, refresh, updateAll, nameOf, planParts, askSource, setTrust, removeSource, restart,
    undoAll: () => changePending('pending', () => window.api.mods.undoAll()),
    undo: (id: string) => changePending(id, () => window.api.mods.undoPending(id)),
    goBack: (id: string, version: string) => plan({ kind: 'rollback', id, version }, id)
  }
}

export type ModInstallerPanel = ReturnType<typeof useModInstallerPanel>
