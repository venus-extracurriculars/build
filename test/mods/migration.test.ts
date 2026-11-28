import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { resolveInstall, type InstallRequest } from '@vx/modkit/host/shared'
import type { FetchedModSource, ModSourceResult } from '../../src/shared/modInstall'
import { NO_SWITCHES, type ModDef, type ModSwitches } from '../../src/shared/mods'
import { KNOWN_FILE, knownModsOf, readKnownFile, withKnownLists, type KnownFile, type KnownMod } from '../../src/main/mods/known'
import { migrationOffer, missingMods, type MissingInputs } from '../../src/main/mods/migration'
import { applyPending } from '../../src/main/mods/pending'
import { sourceList, sourceRelease } from './sourceFixtures'

/**
 * Bringing mods across: who is missing once a mod has left the build, why, which are ticked, and
 * what the approved list offers for each, against records and listings built by hand.
 */

const entry = (id: string, over: Partial<KnownMod> = {}): KnownMod => ({
  id, name: `Mod ${id}`, version: '1.0.0', scope: 'anytime', defaultOn: false, switchedOn: false, builtIn: true, ...over
})
const record = (mods: Record<string, KnownMod>, over: Partial<KnownFile> = {}): KnownFile => ({ schemaVersion: 1, mods, ...over })

function inputs(over: Partial<MissingInputs>): MissingInputs {
  return { known: null, present: new Set(), switches: NO_SWITCHES, playthroughs: [], saveData: [], ...over }
}

const APPROVED = 'https://example.com/vxsource.json'
function approved(source = sourceList(
  sourceRelease('packs', '1.0.0', { requires: { lib: '^1.0.0' } }),
  sourceRelease('packs', '1.1.0', { hooks: ['absent-hook'] }),
  sourceRelease('lib', '1.0.0', { library: true }),
  sourceRelease('extra', '2.0.0')
)): ModSourceResult[] {
  return [{ ok: true, data: { url: APPROVED, kind: 'list', approvedList: true, source } }]
}
function resolver(results: ModSourceResult[]) {
  const sources = results.flatMap((result) => result.ok ? [result.data as FetchedModSource] : [])
  return async (request: Readonly<Record<string, InstallRequest>>) => {
    const result = resolveInstall({ installed: {}, builtIn: {}, request, sources })
    return result.ok ? result.install : null
  }
}

describe('who is missing', () => {
  it('counts a default-on mod nobody switched as on, and leaves out what is built in or installed now', () => {
    const def = (id: string, defaultOn: boolean): ModDef => ({ id, name: id, author: 't', version: '1.0.0', scope: 'anytime', defaultOn, blurb: '' })
    const known = knownModsOf({
      builtIn: [def('packs', true), def('quiet', false), def('kept', true), def('other', true)],
      table: { mods: [], order: [], safeStart: null, loaderError: null, coreVersion: '0.1.0' },
      switches: { on: {}, options: {} }, previous: null
    })
    expect(known.mods.packs.switchedOn).toBe(true)
    // `kept` is built in again, `other` is installed now, and `quiet` was off and is used by nothing.
    const missing = missingMods(inputs({ known, present: new Set(['kept', 'other']) }))
    expect(missing).toEqual([{ id: 'packs', name: 'packs', reasons: ['switched-on'] }])
  })

  it('lists a mod a playthrough uses though it was switched off, and one with save data alone', () => {
    const known = record({ fixed: entry('fixed', { scope: 'playthrough' }), data: entry('data'), off: entry('off') })
    const missing = missingMods(inputs({
      known, playthroughs: [{ mods: ['fixed'], modVersions: { fixed: '1.0.0' } }, {}], saveData: ['data']
    }))
    expect(missing.map((mod) => [mod.id, mod.reasons])).toEqual([['data', ['save-data']], ['fixed', ['playthrough']]])
  })

  it('never lists a library, nor a mod left out', () => {
    const known = record({ lib: entry('lib', { switchedOn: true, library: true }), gone: entry('gone', { switchedOn: true }) }, { dismissed: ['gone'] })
    expect(missingMods(inputs({ known }))).toEqual([])
  })

  it('reads the switches and saves alone where no record came before, but only for ids the record lacks', () => {
    const switches: ModSwitches = { on: { kept: true, off: false, recorded: true }, options: {} }
    const missing = missingMods(inputs({
      known: record({ recorded: entry('recorded', { switchedOn: false }) }, { fallback: true }),
      switches, playthroughs: [{ modVersions: { played: '1.0.0' } }], saveData: ['data']
    }))
    expect(missing.map((mod) => [mod.id, mod.reasons])).toEqual([['data', ['save-data']], ['kept', ['switched-on']], ['played', ['playthrough']]])
  })

  it('marks a record begun with no earlier one as a fallback only for a player who had played', () => {
    const table = { mods: [], order: [], safeStart: null, loaderError: null, coreVersion: '0.1.0' }
    expect(knownModsOf({ builtIn: [], table, switches: NO_SWITCHES, previous: null, playedBefore: true }).fallback).toBe(true)
    expect(knownModsOf({ builtIn: [], table, switches: NO_SWITCHES, previous: null, playedBefore: false }).fallback).toBeUndefined()
    // The mark is the first record's: a later start keeps what that one said.
    expect(knownModsOf({ builtIn: [], table, switches: NO_SWITCHES, previous: record({}), playedBefore: true }).fallback).toBeUndefined()
  })

  it('keeps a left-out mod left out while it stays gone, and forgets it once the build has it again', () => {
    const def: ModDef = { id: 'gone', name: 'gone', author: 't', version: '1.0.0', scope: 'anytime', defaultOn: true, blurb: '' }
    const table = { mods: [], order: [], safeStart: null, loaderError: null, coreVersion: '0.1.0' }
    const previous = withKnownLists(record({ gone: entry('gone', { switchedOn: true }) }), { dismissed: ['gone'], offered: ['gone'] })
    const still = knownModsOf({ builtIn: [], table, switches: NO_SWITCHES, previous })
    expect(still.dismissed).toEqual(['gone'])
    const back = knownModsOf({ builtIn: [def], table, switches: NO_SWITCHES, previous })
    expect(back.dismissed).toBeUndefined()
    expect(back.offered).toBeUndefined()
  })
})

describe('a removed mod', () => {
  let root = ''
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  it('is left out as its removal is applied, so the next start does not offer it back', () => {
    root = mkdtempSync(join(tmpdir(), 'vu-migrate-'))
    mkdirSync(join(root, 'packs', '1.0.0'), { recursive: true })
    writeFileSync(join(root, KNOWN_FILE), JSON.stringify(record({ packs: entry('packs', { builtIn: false, switchedOn: true }) })))
    writeFileSync(join(root, 'pending.json'), JSON.stringify({ pending: 1, current: {}, remove: ['packs'] }))
    expect(applyPending(root, () => {})).toBe(true)
    const known = readKnownFile(JSON.parse(readFileSync(join(root, KNOWN_FILE), 'utf8')))
    expect(known?.dismissed).toEqual(['packs'])
    expect(missingMods(inputs({ known }))).toEqual([])
  })
})

describe('the offer', () => {
  it('offers the newest approved release that loads, with its requirements, ticked where it was on', async () => {
    const sources = approved()
    const offer = await migrationOffer(
      [{ id: 'packs', reasons: ['switched-on'] }, { id: 'extra', name: 'Extra', reasons: ['save-data'] }],
      { known: record({}, { offered: ['extra'] }), present: new Set(), sources, allowMain: false, resolve: resolver(sources) }
    )
    expect(offer?.rows.map((row) => [row.id, row.ticked, row.offered, row.offer?.version, row.offer?.with.map((one) => one.id)])).toEqual([
      ['packs', true, false, '1.0.0', ['lib']],
      ['extra', false, true, '2.0.0', []]
    ])
  })

  it('shows a mod the list does not have with no release, and offers it once the list has it', async () => {
    const missing = [{ id: 'later', name: 'Later', reasons: ['switched-on' as const] }]
    const without = approved()
    const before = await migrationOffer(missing, { known: record({}), present: new Set(), sources: without, allowMain: false, resolve: resolver(without) })
    expect(before?.rows).toEqual([expect.objectContaining({ id: 'later', name: 'Later', ticked: false })])
    expect(before?.rows[0].offer).toBeUndefined()
    const listed = approved(sourceList(sourceRelease('later', '1.0.0')))
    const after = await migrationOffer(missing, { known: record({}), present: new Set(), sources: listed, allowMain: false, resolve: resolver(listed) })
    expect(after?.rows[0]).toMatchObject({ ticked: true, offer: { version: '1.0.0' } })
  })

  it('shows nothing while the approved list cannot be read', async () => {
    const sources: ModSourceResult[] = [{ ok: false, approvedList: true, error: { code: 'OFFLINE', message: 'Offline.' } }]
    expect(await migrationOffer([{ id: 'packs', reasons: ['switched-on'] }], {
      known: record({}), present: new Set(), sources, allowMain: false, resolve: resolver(sources)
    })).toBeNull()
  })

  it('adds the bundle’s mods unticked for a player with no earlier record, but not one here or left out', async () => {
    const source = sourceList(sourceRelease('packs', '1.0.0'), sourceRelease('extra', '2.0.0'), sourceRelease('kept', '1.0.0'), sourceRelease('gone', '1.0.0'), sourceRelease('new', '1.0.0'))
    const listed = { ...source, mods: source.mods.map((mod) => mod.id === 'new' ? mod : { ...mod, bundledIn: '0.7.0' }) }
    const sources = approved(listed)
    const offer = await migrationOffer([{ id: 'packs', reasons: ['switched-on'] }], {
      known: record({}, { fallback: true, dismissed: ['gone'] }), present: new Set(['kept']), sources, allowMain: false, resolve: resolver(sources)
    })
    expect(offer?.rows.map((row) => [row.id, row.bundled, row.ticked])).toEqual([['packs', false, true], ['extra', true, false]])
    const recorded = await migrationOffer([], { known: record({}), present: new Set(), sources, allowMain: false, resolve: resolver(sources) })
    expect(recorded).toBeNull()
  })
})
