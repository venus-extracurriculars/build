import { app, BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { readFileSync } from 'fs'
import { readFile, stat } from 'fs/promises'
import { basename, join, resolve } from 'path'
import { appError, toAppError } from '@shared/errors'
import type { MigrationOffer, PendingModChanges } from '@shared/modInstall'
import type { ModSessionTable, ModStatus, SafeStart } from '@shared/modSession'
import { BUILD, MODS, setInstalledMods, type ModSwitches } from '@shared/mods'
import { AUTOSAVE_ID, type PlaythroughRecord, type Settings } from '@shared/types'
import { getModsDirPath, getSaveFilePath, getSettingsPath } from '../paths'
import { bindModSession, readModSwitches } from '../services/modsService'
import { patchStoredSettings } from '../services/settingsService'
import { playthroughIds, readPlaythroughRecord, saveIdsOf } from '../services/saveService'
import { addKnownLists, KNOWN_FILE, readKnownFile, writeKnownMods, type KnownFile } from './known'
import { migrationOffer, missingMods, type SavedModUse } from './migration'
import { addDevFolder, devFolders, removeDevFolder, watchDevFolder, type DevChangeKind } from './devFolders'
import { loadMods, type LoaderResult } from './loader'
import { handleModProtocol } from './protocol'
import type { MainContext } from './require'
import { ModInvocations } from './invoke'
import { ModInstaller } from './installer'
import { isModId, isModVersion, isRecord } from './installFiles'
import { applyPending } from './pending'
import { addModSource, modSourceReader, readModSources, removeModSource } from './sources'
import { installedModInfo, ModUpdateCheck, pendingModDetails, updateCount } from './updateStatus'

/**
 * The one mod session of this run: the loader's result, held for the protocol, the bridge and
 * the Mods screen. It applies pending changes and loads mods synchronously before Electron is ready.
 */

let result: LoaderResult | null = null
const invocations = new ModInvocations()

/**
 * The ids of the mods built into this copy of the game, read before the loader adds an installed one
 * to the list: what it refuses a second copy of.
 */
const BUILT_IN = [...MODS]
const BUILT_IN_IDS: readonly string[] = BUILT_IN.map((mod) => mod.id)
const installer = new ModInstaller({
  root: getModsDirPath,
  builtIn: () => Object.fromEntries(BUILT_IN.map((mod) => [
    mod.id, { ...mod, requires: Object.fromEntries((mod.requires ?? []).map((id) => [id, '*'])) }
  ])),
  dev: () => Object.fromEntries(modSession().mods.flatMap((row) =>
    row.dev && row.manifest ? [[row.id, row.manifest]] : [])),
  allowUnreviewedMain: () => loaderSettings().allowUnreviewedMain,
  readSources: readModSources
})
const modCheck = new ModUpdateCheck(getModsDirPath)
let bootConfirmed = false
let pendingReplayFailed = false

/**
 * Holds a loader run as the session's, and makes the installed part of `MODS` what its table carries,
 * for every status with a definition, as the window gets from its copy of the table: main's shared
 * rules ask the one list, and an installed mod the list did not hold would answer off whatever its
 * switch. A rerun replaces a definition that changed and drops one whose row lost its definition or
 * is gone, so a mod a developer folder no longer holds cannot answer on from a stale entry.
 */
function hold(next: LoaderResult): void {
  invocations.replace(next.table, next.invokes)
  result = next
  setInstalledMods(next.table.mods.flatMap((mod) => (mod.def ? [mod.def] : [])), BUILT_IN_IDS)
}

/** The export names of the host modules, as the renderer reported them once it had parked them. */
let hostNames: Readonly<Record<string, readonly string[]>> | null = null

/**
 * The two loader fields of `settings.json`, read without the settings service.
 * Either field missing or malformed reads as its default.
 */
function loaderSettings(): { devFolders: string[]; allowUnreviewedMain: boolean } {
  try {
    const raw = JSON.parse(readFileSync(getSettingsPath(), 'utf8')) as Partial<Settings>
    const folders = Array.isArray(raw.devModFolders) ? raw.devModFolders.filter((f): f is string => typeof f === 'string') : []
    return { devFolders: folders, allowUnreviewedMain: raw.allowUnreviewedMain === true }
  } catch {
    return { devFolders: [], allowUnreviewedMain: false }
  }
}

/** `--no-mods` on the command line: the game starts as core, with the installed mods listed but not run. */
function safeStartOf(): SafeStart {
  return pendingReplayFailed || app.commandLine.hasSwitch('no-mods') ? 'flag' : null
}

function holdStartupStatus(next: LoaderResult): void {
  if (pendingReplayFailed) next.table.loaderError ??= 'Pending mod changes could not be applied.'
  hold(next)
}

/** Replays installer changes before loading mods, even on a safe start. */
export function startModSession(): void {
  bootConfirmed = false
  pendingReplayFailed = !applyPending(getModsDirPath())
  const { devFolders, allowUnreviewedMain } = loaderSettings()
  holdStartupStatus(loadMods({
    modsDir: getModsDirPath(),
    devFolders,
    allowUnreviewedMain,
    builtIn: BUILT_IN_IDS,
    coreVersion: BUILD.version,
    gameVersion: app.getVersion(),
    safeStart: safeStartOf(),
    log: (line) => console.log(line),
    warn: (line) => console.warn(line)
  }))
  bindModSession(modSession)
  startRecord = knownWrite(recordKnownMods)
}

/** Queues an older version for the next start. The Mods screen supplies the choice. */
export function rollbackMod(id: string, version: string): Promise<PendingModChanges> {
  return installer.rollback(id, version)
}

/** What this start read and recorded: the offer to bring mods across is worked out from it. */
interface StartRecord {
  readonly switches: ModSwitches
  readonly use: SavedModUse
}

/** `known.json` is written by one write at a time: this start's record, then each answer to the offer. */
let knownWrites: Promise<unknown> = Promise.resolve()
function knownWrite<T>(work: () => Promise<T>): Promise<T> {
  const next = knownWrites.then(work)
  knownWrites = next.catch(() => {})
  return next
}

/** This start's record once written; `null` where `mods.json` did not read. */
let startRecord: Promise<StartRecord | null> = Promise.resolve(null)

/**
 * Writes `data/mods/known.json` from the table this start settled on and the switches in
 * `mods.json`, with what the saves say of the mods they used. Runs alongside the rest of the start
 * and never stops it: a `mods.json` that will not read leaves the last record as it was, rather
 * than writing every switch at its default.
 */
async function recordKnownMods(): Promise<StartRecord | null> {
  let switches: ModSwitches
  try {
    switches = await readModSwitches()
  } catch (err) {
    const failure = toAppError(err)
    console.warn(`[mods] known.json not written: mods.json did not read: ${failure.detail ?? failure.message}`)
    return null
  }
  const use = await readSavedModUse()
  const builtIn = MODS.filter((mod) => BUILT_IN_IDS.includes(mod.id))
  const playedBefore = use.playthroughs.length > 0 || use.saveData.length > 0 || Object.keys(switches.on).length > 0
  await writeKnownMods(getModsDirPath(), { builtIn, table: modSession(), switches, playedBefore }, (line) => console.warn(line))
  return { switches, use }
}

/** The record as it stands on disk; `null` where there is none this build can read. */
async function readKnown(): Promise<KnownFile | null> {
  try {
    return readKnownFile(JSON.parse(await readFile(join(getModsDirPath(), KNOWN_FILE), 'utf8')))
  } catch {
    return null
  }
}

/**
 * The offer to bring across the mods this build no longer has, from this start's record and the
 * approved list read now. `null` where nothing is missing, or the list could not be read: nothing is
 * shown, and the next start asks again.
 */
async function modMigration(): Promise<MigrationOffer | null> {
  const start = await startRecord
  if (!start) return null
  const known = await knownWrite(readKnown)
  const pending = await installer.pending().catch(() => null)
  const present = new Set([
    ...BUILT_IN_IDS, ...modSession().mods.map((row) => row.id), ...Object.keys(pending?.current ?? {})
  ])
  const missing = missingMods({ known, present, switches: start.switches, ...start.use })
  if (!missing.length && known?.fallback !== true) return null
  // A check this session made a moment ago, as the Mods screen makes on opening, is not made again.
  const sources = Date.now() - sessionCheckedAt < 60_000 ? modCheck.status().sources : (await checkMods(true)).sources
  return migrationOffer(missing, {
    known, present, sources, allowMain: loaderSettings().allowUnreviewedMain,
    resolve: (request) => installer.preview(request, sources)
  })
}

/** A save's `ex` ids, read off the file without the save's own checks: only the keys are wanted. */
async function exIdsOf(path: string): Promise<string[]> {
  try {
    const ex = (JSON.parse(await readFile(path, 'utf8')) as { ex?: unknown }).ex
    return ex && typeof ex === 'object' && !Array.isArray(ex) ? Object.keys(ex) : []
  } catch {
    return []
  }
}

/**
 * Every playthrough record, and the `ex` ids of each playthrough's newest save, which carries every
 * slice its game still holds. A playthrough or save that will not read is passed over.
 */
async function readSavedModUse(): Promise<SavedModUse> {
  const playthroughs: Pick<PlaythroughRecord, 'mods' | 'modVersions'>[] = []
  const saveData = new Set<string>()
  let ids: string[] = []
  try {
    ids = await playthroughIds()
  } catch {
    return { playthroughs, saveData: [] }
  }
  for (const id of ids) {
    try {
      const record = await readPlaythroughRecord(id)
      playthroughs.push({ mods: record.mods, modVersions: record.modVersions })
    } catch {
      // No record yet, or one that will not read.
    }
    try {
      const groups = await saveIdsOf(id)
      const saveIds = [...(groups.autosave ? [AUTOSAVE_ID] : []), ...groups.slots, ...groups.manual]
      const stamped = await Promise.all(saveIds.map(async (saveId) => ({
        path: getSaveFilePath(id, saveId),
        at: await stat(getSaveFilePath(id, saveId)).then((info) => info.mtimeMs).catch(() => -1)
      })))
      const newest = stamped.filter((one) => one.at >= 0).sort((a, b) => b.at - a.at)[0]
      if (newest) for (const one of await exIdsOf(newest.path)) saveData.add(one)
    } catch {
      // A folder that will not list has no save to read.
    }
  }
  return { playthroughs, saveData: [...saveData].sort() }
}

/** The table as it stands; empty until {@link startModSession} has run. */
export function modSession(): ModSessionTable {
  return result?.table ?? { mods: [], order: [], safeStart: null, loaderError: null, coreVersion: BUILD.version }
}

/**
 * Re-reads the manifests and reruns every check without requiring any `main.js` again: each one
 * already required hands back what it exported the first time. What the window reads on its next
 * load is then this run's table, and `MODS` holds its definitions.
 */
export function rerunModChecks(): void {
  const before = result
  const { devFolders, allowUnreviewedMain } = loaderSettings()
  const next = loadMods({
    modsDir: getModsDirPath(),
    devFolders,
    allowUnreviewedMain,
    builtIn: BUILT_IN_IDS,
    coreVersion: BUILD.version,
    gameVersion: app.getVersion(),
    safeStart: safeStartOf(),
    log: (line) => console.log(line),
    warn: (line) => console.warn(line),
    requireMain: (ctx: MainContext) => {
      if (before?.mainExports.has(ctx.id)) return before.mainExports.get(ctx.id)
      // A mod whose main.js was not required at the first start cannot start now: main code is
      // loaded once, at start.
      throw new Error('main.js changed or was added since the start; restart to load it')
    }
  })
  // The routes a `main.js` registered at start stand for the session.
  const invokes = new Map([...next.invokes].map(([id, handlers]) => [id, before?.invokes.get(id) ?? handlers]))
  holdStartupStatus(before ? { ...next, routes: before.routes, invokes } : next)
}

/** Dispatches the start/result handshake; main makes the request id before the window can cancel it. */
export function invokeMod(owner: number, id: unknown, request: unknown): unknown {
  return invocations.dispatch(owner, id, request)
}

/** Cancels a checked mod's own request, without reaching the general jobs channel. */
export function cancelModInvoke(owner: number, id: unknown, requestId: unknown): void {
  invocations.cancel(owner, id, requestId)
}

/** Ends the calls a window left behind, including requests not yet claimed by the handshake. */
export function dropModInvokes(owner: number): void {
  invocations.dropOwner(owner)
}

/** Serves `vxmod://`, and watches the developer folders. Must run after `ready`. */
export function handleModSession(): void {
  handleModProtocol({
    served: () => result?.served ?? new Map(),
    routes: () => result?.routes ?? new Map(),
    hostNames: () => hostNames
  })
  for (const folder of loaderSettings().devFolders) watchDevFolder(folder, devFolderChanged)
}

/** Marks a mod the renderer could not load as off for the session, so `vxmod://<id>/…` stops serving it. */
function markFailed(id: string, status: ModStatus, message: string): void {
  if (!result) return
  const entry = result.table.mods.find((mod) => mod.id === id && mod.def !== null)
  if (!entry || entry.status !== 'loaded') return
  entry.status = status
  entry.message = message
  const served = new Map(result.served)
  const servedEntry = served.get(id)
  if (servedEntry) served.set(id, { ...servedEntry, loaded: false })
  result = { ...result, served, table: { ...result.table, order: result.table.order.filter((one) => one !== id) } }
  const invokes = new Map(result.invokes)
  invokes.delete(id)
  result = { ...result, invokes }
  invocations.replace(result.table, invokes)
  console.warn(`[mods] ${id}: ${status}: ${message}`)
}

/**
 * A developer folder changed. For a renderer-side change the checks are rerun first, so the
 * reload the window makes reads a fresh table; `main.js` cannot be swapped in place, so that is
 * only told. Every window hears of it and decides what to offer.
 */
function devFolderChanged(folder: string, kind: DevChangeKind, files: readonly string[]): void {
  const id = result?.table.mods.find((mod) => mod.dev && mod.folder === resolve(folder))?.id ?? basename(folder)
  if (kind === 'renderer') rerunModChecks()
  console.log(`[mods] ${id}: ${kind === 'main' ? 'main.js' : files.join(', ')} changed in ${folder}`)
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.webContents.isDestroyed()) window.webContents.send('mods:devChanged', { id, kind })
  }
}

function installedForScreen(sources = modCheck.status().sources) {
  return installedModInfo(getModsDirPath(), BUILT_IN, modSession(), sources)
}

async function countModUpdates(sources: ReturnType<ModUpdateCheck['status']>['sources']): Promise<number> {
  try {
    return updateCount(installedForScreen(sources), sources, await installer.pending(), loaderSettings().allowUnreviewedMain)
  } catch {
    // There is no title-screen error for an unavailable update count.
    return 0
  }
}

/** When this session last read the sources itself, rather than finding the last check on disk. */
let sessionCheckedAt = 0

async function checkMods(force: boolean) {
  const status = await modCheck.run(force, async () => {
    const sources = await installer.sources()
    sessionCheckedAt = Date.now()
    return { sources, count: await countModUpdates(sources) }
  })
  const current = { ...status, count: await countModUpdates(status.sources) }
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.webContents.isDestroyed()) window.webContents.send('mods:updatesChanged', current)
  }
  return current
}

/** The first visible window makes a background check when the daily interval has elapsed. */
export function startModUpdateCheck(): void {
  void checkMods(false)
}

/** Registers `ipcMain.handle` for one channel, answering a `Result` as the rest of the bridge does. */
type Handle = <Args extends unknown[], T>(
  channel: string,
  listener: (event: IpcMainInvokeEvent, ...args: Args) => Promise<T> | T
) => void

/** The session's channels: the table, read synchronously by the preload, and the rest through `handle`. */
export function registerModIpc(handle: Handle): void {
  // Synchronous: `MODS` has to hold the installed mods before any module in the window reads it.
  ipcMain.on('mods:session', (event) => {
    event.returnValue = modSession()
  })
  handle('mods:exposeHost', (_event, names: Record<string, string[]>) => {
    hostNames = names
  })
  handle('mods:failed', (_event, id: string, status: ModStatus, message: string) => {
    markFailed(id, status, typeof message === 'string' ? message : String(message))
  })
  handle('mods:noticesSeen', async (_event, seen: Record<string, string>) => {
    await patchStoredSettings((settings) => ({ ...settings, modNoticesSeen: { ...settings.modNoticesSeen, ...seen } }))
  })
  handle('mods:unversionedSeen', async (_event, playthroughId: string) => {
    if (typeof playthroughId !== 'string') return
    await patchStoredSettings((settings) => {
      const seen = Array.isArray(settings.modUnversionedSeen) ? settings.modUnversionedSeen : []
      return seen.includes(playthroughId) ? settings : { ...settings, modUnversionedSeen: [...seen, playthroughId] }
    })
  })
  handle('mods:addDevFolder', async (event) => {
    const folder = await addDevFolder(event)
    if (folder) watchDevFolder(folder, devFolderChanged)
    return folder
  })
  handle('mods:removeDevFolder', (_event, folder: string) => removeDevFolder(folder))
  handle('mods:devFolders', () => devFolders())
  handle('mods:sources', async () => (await checkMods(true)).sources)
  handle('mods:updateStatus', () => modCheck.status())
  handle('mods:pending', async () => pendingModDetails(getModsDirPath(), await installer.pending()))
  handle('mods:undoAll', () => installer.undoAll())
  handle('mods:goBack', (_event, id: string, version: string) => rollbackMod(id, version))
  handle('mods:installed', () => installedForScreen())
  handle('mods:addSource', (_event, address: unknown) => addModSource(address))
  handle('mods:removeSource', (_event, address: unknown) => removeModSource(address))
  handle('mods:setAllowUnreviewedMain', async (_event, on: unknown) => {
    if (typeof on !== 'boolean') throw appError('MOD_TRUST_SETTING', 'Choose whether to allow unreviewed main code.')
    await patchStoredSettings((settings) => ({ ...settings, allowUnreviewedMain: on }))
  })
  handle('mods:image', (_event, source: unknown, url: unknown) =>
    modSourceReader.readImage(installer.latestSources, source, url)
  )
  handle('mods:plan', (_event, request: unknown) => {
    if (isRecord(request) && request.kind === 'rollback') {
      const { id, version } = request
      const installed = installedForScreen().find((row) => row.id === id && row.origin === 'installed')
      if (!isModId(id) || !isModVersion(version) || !installed?.otherVersions.includes(version)) {
        throw appError('MOD_ROLLBACK_VERSION', 'The previous mod version is unavailable.')
      }
      return { kind: 'rollback' as const, id, version }
    }
    return installer.plan(request)
  })
  handle('mods:install', (event, plan: unknown) =>
    installer.install(plan, (progress) => {
      if (!event.sender.isDestroyed()) event.sender.send('mods:installProgress', progress)
    })
  )
  handle('mods:remove', (_event, id: unknown, orphaned: unknown) => installer.remove(id, orphaned))
  handle('mods:undoPending', (_event, id: unknown) => installer.undo(id))
  handle('mods:migration', () => modMigration())
  handle('mods:migrationAnswer', async (_event, kind: unknown, ids: unknown) => {
    if ((kind !== 'offered' && kind !== 'dismissed') || !Array.isArray(ids) || !ids.every(isModId)) {
      throw appError('MOD_MIGRATION_ANSWER', 'Expected mod ids.')
    }
    await knownWrite(() => addKnownLists(getModsDirPath(), { [kind]: ids }))
  })
  handle('mods:booted', async () => {
    if (bootConfirmed) return
    await installer.booted(modSession())
    bootConfirmed = true
  })
  handle('mods:restart', async () => {
    await installer.idle()
    app.relaunch()
    app.exit(0)
  })
}
