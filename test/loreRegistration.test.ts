import { afterEach, expect, it } from 'vitest'
import { emptyLorebook, readLorebookRecord } from '@shared/lorebookRecord'
import { setSharedModRules } from '@shared/modRules'
import { availableLore, effectiveLorebook, LOREBOOK, SHIPPED_BOOK, lorebookBlock, loreEntryById,
  placeEntryOf, registerLoreEntries, rumorPoolOf, type ShippedLoreEntry } from '../src/renderer/prompts/lorebook'
import { restoreApi, stubApi } from './fixtures'

const cleanups: (() => void)[] = []
afterEach(() => { for (const stop of cleanups.reverse()) stop(); cleanups.length = 0; setSharedModRules(() => false); restoreApi() })
const entry = (ref = 'fixture_venue', id = 'fixture_venue'): ShippedLoreEntry => ({ref,id,keys:['Fixture Venue'],text:'A quiet venue.',bg:'fixture_venue'})
const register = (owner: string, entries: readonly ShippedLoreEntry[], options = {}) => {
 const stop=registerLoreEntries(owner,entries,options); cleanups.push(stop); return stop
}
const injected = (book = SHIPPED_BOOK) => lorebookBlock('Fixture Venue', {book}).join('\n')

it('updates held catalogues, copies the authored data, and follows the live owner switch', () => {
 const held=LOREBOOK, heldBook=SHIPPED_BOOK, authored=entry();let on=false
 setSharedModRules(id => id==='fixture' && on)
 register('fixture',[authored]);authored.text='Mutated';(authored.keys as string[]).push('Leaked key')
 expect(LOREBOOK).toBe(held);expect(SHIPPED_BOOK).toBe(heldBook)
 expect(LOREBOOK.find(e=>e.ref===authored.ref)).toMatchObject({text:'A quiet venue.',keys:['Fixture Venue']})
 expect(injected()).toBe('');expect(loreEntryById(authored.id!)).toBeNull();expect(placeEntryOf(heldBook,authored.id!)).toBeNull()
 expect(availableLore().some(e=>e.ref===authored.ref)).toBe(false)
 on=true;expect(injected()).toContain('A quiet venue.');expect(loreEntryById(authored.id!)).not.toBeNull()
 expect(placeEntryOf(heldBook,authored.id!)).not.toBeNull();expect(rumorPoolOf(heldBook).some(e=>e.handle===authored.ref)).toBe(true)
 on=false;expect(injected()).toBe('');expect(rumorPoolOf(heldBook).some(e=>e.handle===authored.ref)).toBe(false)
})

it('keeps player edits readable while off, restores them when enabled, and leaves custom lore alone', () => {
 let available=false;register('fixture',[entry()],{available:()=>available})
 const record={...emptyLorebook(),edits:{fixture_venue:{keys:['Edited Venue'],text:'Player-authored venue.'}},custom:[{id:'custom1',keys:['Custom Place'],text:'Custom text.'}]}
 const book=effectiveLorebook(record)
 expect(book.find(e=>e.handle==='fixture_venue')?.text).toBe('Player-authored venue.')
 expect(lorebookBlock('Edited Venue',{book})).toEqual([])
 expect(lorebookBlock('Custom Place',{book}).join(' ')).toContain('Custom text.')
 available=true;expect(lorebookBlock('Edited Venue',{book}).join(' ')).toContain('Player-authored venue.')
 expect(record.edits.fixture_venue.text).toBe('Player-authored venue.')
})

it('rejects collisions and malformed batches atomically without replacing native or sibling entries', () => {
 const before=[...LOREBOOK]
 expect(()=>registerLoreEntries('fixture',[entry('fresh'),entry(before[0].ref)])).toThrow()
 expect(()=>registerLoreEntries('fixture',[entry('one','shared'),entry('two','shared')])).toThrow()
 expect(()=>registerLoreEntries('fixture',[{...entry(),keys:[]}])).toThrow()
 expect(()=>registerLoreEntries('fixture',[entry('__proto__')])).toThrow()
 expect(()=>registerLoreEntries('fixture',[{keys:['X'],text:'X'} as unknown as ShippedLoreEntry])).toThrow()
 expect(()=>registerLoreEntries(undefined as unknown as string,[entry()])).toThrow()
 expect(LOREBOOK).toEqual(before)
 register('fixture',[entry()]);expect(()=>registerLoreEntries('other',[entry()])).toThrow()
 expect(()=>registerLoreEntries('fixture',[entry('another','another')])).toThrow()
 expect(LOREBOOK.filter(e=>e.ref==='fixture_venue')).toHaveLength(1)
})

it('uses deterministic owner ordering and scopes idempotent disposal to its own registration', () => {
 const native=[...LOREBOOK], heldBook=SHIPPED_BOOK
 const stopB=register('z-fixture',[entry('z_venue','z_venue')],{available:()=>true})
 const stopA=register('a-fixture',[entry('a_venue','a_venue')],{available:()=>true})
 expect(LOREBOOK.slice(0,2).map(e=>e.ref)).toEqual(['a_venue','z_venue'])
 stopA();expect(LOREBOOK[0].ref).toBe('z_venue');expect(SHIPPED_BOOK).toBe(heldBook)
 stopB();stopB();expect(LOREBOOK).toEqual(native)
})

it('withholds removed entries from old prompt snapshots and ignores a stale disposer after reinstall', () => {
 const stop=register('fixture',[entry()],{available:()=>true});const oldBook=effectiveLorebook(null)
 expect(injected(oldBook)).toContain('A quiet venue.')
 stop();expect(injected(oldBook)).toBe('');expect(placeEntryOf(oldBook,'fixture_venue')).toBeNull()
 register('fixture',[entry()],{available:()=>true});stop()
 expect(injected()).toContain('A quiet venue.')
})

it('preserves absent mod edits through native load, unrelated editing, save and reinstall', async () => {
 let disk={...emptyLorebook(),edits:{fixture_venue:{text:'My retained venue.'}}}
 stubApi({lorebook:{read:async()=>({ok:true,data:structuredClone(disk)}),write:async(_id,record)=>{disk=structuredClone(record) as typeof disk;return {ok:true,data:undefined}}}})
 const {useLorebookStore:store,lorebookSettled}=await import('../src/renderer/stores/lorebookStore')
 try {
  await store.getState().load('fixture-save')
  expect(store.getState().record.edits.fixture_venue.text).toBe('My retained venue.')
  const current=store.getState();expect(current.editSetting('An unrelated setting edit.',current.revision)).toBe(true)
  await lorebookSettled()
  const reread=readLorebookRecord(JSON.parse(JSON.stringify(disk)),'fixture')
  expect(reread.edits.fixture_venue.text).toBe('My retained venue.')
  register('fixture',[entry()],{available:()=>true});await store.getState().load('fixture-save')
  expect(injected(store.getState().book)).toContain('My retained venue.')
 } finally {store.getState().drop();await lorebookSettled()}
})
