import { afterEach, expect, it, vi } from 'vitest'
import { emptyLorebook, readLorebookRecord, type LorebookRecord } from '@shared/lorebookRecord'
import { setSharedModRules } from '@shared/modRules'
import {
  availableLore,
  effectiveLorebook,
  LOREBOOK,
  SHIPPED_BOOK,
  lorebookBlock,
  loreEntryById,
  placeEntryOf,
  registerLoreEntries,
  rumorPoolOf,
  type LoreRegistrationOptions,
  type ShippedLoreEntry
} from '../src/renderer/prompts/lorebook'
import { restoreApi, stubApi } from './fixtures'

const cleanups: (() => void)[] = []

afterEach(() => {
  for (const stop of cleanups.reverse()) stop()
  cleanups.length = 0
  setSharedModRules(() => false)
  restoreApi()
  vi.restoreAllMocks()
})

const entry = (ref = 'fixture_venue', id = 'fixture_venue'): ShippedLoreEntry => ({
  ref,
  id,
  keys: ['Fixture Venue'],
  text: 'A quiet venue.',
  bg: 'fixture_venue'
})

function register(
  owner: string,
  entries: readonly ShippedLoreEntry[],
  options: LoreRegistrationOptions = {}
): () => void {
  const stop = registerLoreEntries(owner, entries, options)
  cleanups.push(stop)
  return stop
}

const injected = (book = SHIPPED_BOOK) => lorebookBlock('Fixture Venue', { book }).join('\n')

it('updates held catalogues, copies authored data, and follows the live owner switch', () => {
  const held = LOREBOOK
  const heldBook = SHIPPED_BOOK
  const authored = entry()
  let on = false
  setSharedModRules(id => id === 'fixture' && on)
  register('fixture', [authored])
  authored.text = 'Mutated'
  ;(authored.keys as string[]).push('Leaked key')

  expect(LOREBOOK).toBe(held)
  expect(SHIPPED_BOOK).toBe(heldBook)
  expect(LOREBOOK.find(one => one.ref === authored.ref)).toMatchObject({
    text: 'A quiet venue.',
    keys: ['Fixture Venue']
  })
  expect(injected()).toBe('')
  expect(loreEntryById(authored.id!)).toBeNull()
  expect(placeEntryOf(heldBook, authored.id!)).toBeNull()
  expect(availableLore().some(one => one.ref === authored.ref)).toBe(false)

  on = true
  expect(injected()).toContain('A quiet venue.')
  expect(loreEntryById(authored.id!)).not.toBeNull()
  expect(placeEntryOf(heldBook, authored.id!)).not.toBeNull()
  expect(rumorPoolOf(heldBook).some(one => one.handle === authored.ref)).toBe(true)

  on = false
  expect(injected()).toBe('')
  expect(rumorPoolOf(heldBook).some(one => one.handle === authored.ref)).toBe(false)
})

it('keeps edits readable while off, restores them when enabled, and leaves custom lore alone', () => {
  let available = false
  register('fixture', [entry()], { available: () => available })
  const record: LorebookRecord = {
    ...emptyLorebook(),
    edits: { fixture_venue: { keys: ['Edited Venue'], text: 'Player-authored venue.' } },
    custom: [{ id: 'custom1', keys: ['Custom Place'], text: 'Custom text.' }]
  }
  const book = effectiveLorebook(record)

  expect(book.find(one => one.handle === 'fixture_venue')?.text).toBe('Player-authored venue.')
  expect(lorebookBlock('Edited Venue', { book })).toEqual([])
  expect(lorebookBlock('Custom Place', { book }).join(' ')).toContain('Custom text.')
  available = true
  expect(lorebookBlock('Edited Venue', { book }).join(' ')).toContain('Player-authored venue.')
  expect(record.edits.fixture_venue.text).toBe('Player-authored venue.')
})

it('rejects collisions and malformed batches atomically without replacing existing entries', () => {
  const before = [...LOREBOOK]
  expect(() => registerLoreEntries('fixture', [entry('fresh'), entry(before[0].ref)])).toThrow()
  expect(() => registerLoreEntries('fixture', [entry('one', 'shared'), entry('two', 'shared')])).toThrow()
  expect(() => registerLoreEntries('fixture', [{ ...entry(), keys: [] }])).toThrow()
  expect(() => registerLoreEntries('fixture', [entry('__proto__')])).toThrow()
  expect(() => registerLoreEntries('fixture', [
    { keys: ['X'], text: 'X' } as unknown as ShippedLoreEntry
  ])).toThrow()
  expect(() => registerLoreEntries(undefined as unknown as string, [entry()])).toThrow()
  expect(LOREBOOK).toEqual(before)

  register('fixture', [entry()])
  expect(() => registerLoreEntries('other', [entry()])).toThrow()
  expect(() => registerLoreEntries('fixture', [entry('another', 'another')])).toThrow()
  expect(LOREBOOK.filter(one => one.ref === 'fixture_venue')).toHaveLength(1)
})

it.each(['Probe_B', 'bad-id', ' space ', ''])('rejects an unfindable place ID atomically: %j', id => {
  const before = [...LOREBOOK]
  expect(() => registerLoreEntries('fixture', [
    entry('batch_one', 'batch_one'),
    entry('fixture_bad', id)
  ])).toThrow()
  expect(LOREBOOK).toEqual(before)
})

it.each(['custom1', 'custom2', 'custom99'])('reserves the player-created handle %s', ref => {
  const before = [...LOREBOOK]
  expect(() => registerLoreEntries('fixture', [
    entry('batch_one', 'batch_one'),
    entry(ref, 'fixture_bad')
  ])).toThrow()
  expect(LOREBOOK).toEqual(before)
  const book = effectiveLorebook({
    ...emptyLorebook(),
    custom: [{ id: 'custom1', keys: ['Custom Place'], text: 'Player-created text.' }]
  })
  expect(book.filter(one => one.handle === 'custom1')).toHaveLength(1)
  expect(lorebookBlock('Custom Place', { book }).join(' ')).toContain('Player-created text.')
})

it('contains a throwing availability rule, warns once, and preserves unrelated lore', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  let broken = true
  const available = vi.fn(() => {
    if (broken) throw new Error('Fixture rule failed')
    return true
  })
  register('fixture', [entry()], { available })
  register('healthy-fixture', [{
    ...entry('healthy_venue', 'healthy_venue'),
    keys: ['Healthy Venue'],
    text: 'Healthy mod content.'
  }], { available: () => true })

  expect(lorebookBlock('zzzz_unmatched', { book: SHIPPED_BOOK })).toEqual([])
  expect(lorebookBlock('Kendall', { book: SHIPPED_BOOK }).join(' ')).toContain('Kendall')
  expect(loreEntryById('kendall_library')).not.toBeNull()
  expect(placeEntryOf(SHIPPED_BOOK, 'kendall_library')).not.toBeNull()
  expect(available).not.toHaveBeenCalled()
  expect(warn).not.toHaveBeenCalled()

  const lines = lorebookBlock('Fixture Venue and Healthy Venue', { book: SHIPPED_BOOK }).join(' ')
  expect(lines).toContain('Healthy mod content.')
  expect(lines).not.toContain('A quiet venue.')
  expect(availableLore().some(one => one.ref === 'fixture_venue')).toBe(false)
  expect(rumorPoolOf(SHIPPED_BOOK).some(one => one.handle === 'fixture_venue')).toBe(false)
  expect(loreEntryById('fixture_venue')).toBeNull()
  expect(placeEntryOf(SHIPPED_BOOK, 'fixture_venue')).toBeNull()
  expect(warn).toHaveBeenCalledTimes(1)
  expect(warn).toHaveBeenCalledWith(expect.stringContaining('fixture'), expect.any(Error))

  broken = false
  expect(injected()).toContain('A quiet venue.')
  broken = true
  expect(injected()).toBe('')
  expect(warn).toHaveBeenCalledTimes(1)
})

it('uses deterministic owner ordering and scopes idempotent disposal to its own registration', () => {
  const native = [...LOREBOOK]
  const heldBook = SHIPPED_BOOK
  const stopB = register('z-fixture', [entry('z_venue', 'z_venue')], { available: () => true })
  const stopA = register('a-fixture', [entry('a_venue', 'a_venue')], { available: () => true })
  expect(LOREBOOK.slice(0, 2).map(one => one.ref)).toEqual(['a_venue', 'z_venue'])
  stopA()
  expect(LOREBOOK[0].ref).toBe('z_venue')
  expect(SHIPPED_BOOK).toBe(heldBook)
  stopB()
  stopB()
  expect(LOREBOOK).toEqual(native)
})

it('withholds removed entries from old snapshots and ignores a stale disposer after reinstall', () => {
  const stop = register('fixture', [entry()], { available: () => true })
  const oldBook = effectiveLorebook(null)
  expect(injected(oldBook)).toContain('A quiet venue.')
  stop()
  expect(injected(oldBook)).toBe('')
  expect(placeEntryOf(oldBook, 'fixture_venue')).toBeNull()
  register('fixture', [entry()], { available: () => true })
  stop()
  expect(injected()).toContain('A quiet venue.')
})

it('preserves absent mod edits through native load, unrelated editing, save and reinstall', async () => {
  let disk: LorebookRecord = {
    ...emptyLorebook(),
    edits: { fixture_venue: { text: 'My retained venue.' } }
  }
  stubApi({ lorebook: {
    read: async () => ({ ok: true, data: structuredClone(disk) }),
    write: async (_id, record) => {
      disk = structuredClone(record)
      return { ok: true, data: undefined }
    }
  } })
  const { useLorebookStore: store, lorebookSettled } = await import('../src/renderer/stores/lorebookStore')
  try {
    await store.getState().load('fixture-save')
    expect(store.getState().record.edits.fixture_venue.text).toBe('My retained venue.')
    const current = store.getState()
    expect(current.editSetting('An unrelated setting edit.', current.revision)).toBe(true)
    await lorebookSettled()
    const reread = readLorebookRecord(JSON.parse(JSON.stringify(disk)), 'fixture')
    expect(reread.edits.fixture_venue.text).toBe('My retained venue.')
    register('fixture', [entry()], { available: () => true })
    await store.getState().load('fixture-save')
    expect(injected(store.getState().book)).toContain('My retained venue.')
  } finally {
    store.getState().drop()
    await lorebookSettled()
  }
})
