import { expect, it } from 'vitest'
import { registerTermCarry, type ModCarryFields } from '@shared/modCarry'
import { carriedOpening, carryTerm } from '@shared/termCarry'
import { useGameStore } from '../src/renderer/stores/gameStore'
import { character, charactersById, playthroughRecord } from './fixtures'
import type { GameSave } from '@shared/types'

declare module '@shared/modCarry' { interface ModCarryFields { testArchive?: { date: number; names: string[] } } }
type ExtendedSave = GameSave & Partial<ModCarryFields>

it('asks an independent adapter to retain its field while native replay history stays fresh', () => {
  registerTermCarry('testArchive', (save, context) => {
    const archive = (save as ExtendedSave).testArchive
    return archive ? { date: archive.date - context.back, names: Object.keys(context.characters) } : undefined
  })
  const draft = useGameStore.getState().toGameSave()
  const save: ExtendedSave = { ...draft, playthroughId: '123', saveId: 'end', saveDate: 0, date: 100, testArchive: { date: 20, names: [] } }
  const characters = charactersById(character({ charId: 'graduate' }))
  const carry = carryTerm(save, playthroughRecord(), [], characters).carry
  const opening = carriedOpening(draft, carry) as ExtendedSave
  expect(opening.testArchive?.date).toBeLessThan(0)
  expect(opening.testArchive?.names).toEqual(['graduate'])
  expect(opening.replays).toEqual(draft.replays)
  expect(save.testArchive?.date).toBe(20)
  const empty: ExtendedSave = { ...save, testArchive: undefined }
  expect((carriedOpening(draft, carryTerm(empty, playthroughRecord(), [], characters).carry) as ExtendedSave).testArchive).toBeUndefined()
})
