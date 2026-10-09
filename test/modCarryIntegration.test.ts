import { expect, it } from 'vitest'
import { registerTermCarry, type ModCarryFields } from '@shared/modCarry'
import { daysToNextTerm, seasonOf } from '@shared/term'
import { carriedOpening, carryTerm } from '@shared/termCarry'
import { useGameStore } from '../src/renderer/stores/gameStore'
import { keptFrom } from '../src/renderer/stores/newGame'
import { character, charactersById, playthroughRecord } from './fixtures'
import type { GameSave } from '@shared/types'

declare module '@shared/modCarry' {
  interface ModCarryFields {
    testArchive?: { date: number; term: number; names: string[] }
  }
}
type ExtendedSave = GameSave & Partial<ModCarryFields>

registerTermCarry('testArchive', (save, context) => {
  const archive = (save as ExtendedSave).testArchive
  return archive
    ? {
        date: archive.date - context.back,
        term: context.term,
        names: Object.values(context.characters).map((c) => c.firstName)
      }
    : undefined
})

it.each([0, 1])('carries an independent archive through term %i, including names outside the next roster', (term) => {
  const draft = useGameStore.getState().toGameSave()
  const save: ExtendedSave = {
    ...draft,
    playthroughId: '123', saveId: 'end', saveDate: 0,
    date: 100, money: 900, replays: { 20: { 0: 'old-replay' } },
    testArchive: { date: 20, term, names: [] }
  }
  const before = structuredClone(save)
  const characters = charactersById(character({ charId: 'graduate', firstName: 'Alumna' }))
  const { carried } = keptFrom([], {
    playthroughId: save.playthroughId,
    save,
    record: playthroughRecord({ term: { index: term } }),
    characters
  })
  // The continuation may be saved and loaded before the next semester is opened.
  const carry = JSON.parse(JSON.stringify(carried.carry)) as typeof carried.carry
  const opening = carriedOpening(draft, carry) as ExtendedSave
  expect(opening.testArchive).toEqual({
    date: 20 - daysToNextTerm(seasonOf(term)), term, names: ['Alumna']
  })
  expect(opening.money).toBe(900)
  expect(opening.replays).toEqual(draft.replays)
  expect(opening.date).toBe(draft.date)
  expect(save).toEqual(before)
  expect(draft).not.toHaveProperty('testArchive')
})

it('does not invent an archive or restore an unregistered field into another start', () => {
  const draft = useGameStore.getState().toGameSave()
  const save: ExtendedSave = { ...draft, playthroughId: '123', saveId: 'end', saveDate: 0 }
  const carry = carryTerm(save, playthroughRecord(), []).carry
  const withUnknown = { ...carry, unregisteredArchive: { text: 'Ignore' } }
  const opening = carriedOpening(draft, withUnknown)
  expect(carry).not.toHaveProperty('testArchive')
  expect(opening).not.toHaveProperty('testArchive')
  expect(opening).not.toHaveProperty('unregisteredArchive')
  expect(draft).not.toHaveProperty('testArchive')
})
