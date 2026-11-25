import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { installMods } from '@shared/mods'
import type { GameSave, SaveDraft } from '@shared/types'
import { semesterOf, withTransfers } from '@shared/semesters'
import { character, charInfo, playthroughRecord, restoreApi, stubApi } from './fixtures'

stubApi({ jobs: { onProgress: () => () => {} } })
const kit = await import('@vx/modkit/renderer')
const { useGameStore } = await import('../src/renderer/stores/gameStore')
const { useBunnyboardStore } = await import('../src/renderer/stores/bunnyboardStore')
const { loopState, resetLoopState, currentRun } = await import('../src/renderer/stores/loop/state')
const { prepareAutosave, writesSettled } = await import('../src/renderer/stores/loop/saves')
const { carryOf } = await import('../src/renderer/stores/semesterCarry')
const alice = character({ charId: 'alice', firstName: 'Alice' })
const bob = character({ charId: 'bob', firstName: 'Bob' })
const students = { alice, bob }
let value: { events: number }
let drafts: SaveDraft[]
const autosave = vi.fn()

beforeAll(() => installMods([
  { id: 'removal-test', name: 'test', author: 'test', version: '1.0.0', scope: 'anytime', defaultOn: true, blurb: '' },
  { id: 'off-test', name: 'off', author: 'test', version: '1.0.0', scope: 'anytime', defaultOn: false, blurb: '' }
]))
beforeEach(() => {
  useGameStore.getState().reset()
  useBunnyboardStore.getState().reset()
  resetLoopState()
  value = { events: 0 }
  drafts = []
  autosave.mockReset().mockImplementation(async (_id: string, draft: SaveDraft) => {
    drafts.push(structuredClone(draft))
    return { ok: true, data: { ...draft, saveId: 'autosave', playthroughId: 'p1', saveDate: 1 } }
  })
  stubApi({ saves: { autosave } as never })
  useGameStore.setState({
    playthroughId: 'p1', chars: ['alice', 'bob'], characters: students,
    charInfo: { alice: Object.assign(charInfo(), { ex: { other: { v: '1', data: 'preserved' } } }), bob: charInfo() },
    modValues: { 'removal-test': value }, modData: { unrelated: { v: '2', data: { kept: true } } },
    bunnyboard: { conversations: { alice: { charId: 'alice', messages: [], unread: 0, summary: 'old conversation' } }, requestsSent: ['alice'], requestsReceived: [], contactsBadge: 0 }
  })
})
afterEach(async () => { await writesSettled(); restoreApi(); vi.restoreAllMocks() })
const request = () => ({ charId: 'alice', eventId: 'event-one', reason: 'No longer attending', next: { events: 1 }, expect: value, run: currentRun() })

describe('permanent student removal through the public kit', () => {
  it('archives the student and their other-mod data in the same disk commit as the case update', async () => {
    const before = useGameStore.getState()
    const result = await kit.removeStudent('removal-test', request())
    expect(result.ok).toBe(true)
    expect(drafts).toHaveLength(1)
    const saved = drafts[0]
    expect(saved.ex?.['removal-test'].data).toEqual({ events: 1 })
    expect(saved.ex?.unrelated).toEqual(before.modData.unrelated)
    expect(saved.removedStudents?.alice.info).toMatchObject({ ex: { other: { data: 'preserved' } } })
    expect(saved.removedStudents?.alice.conversation?.summary).toBe('old conversation')
    expect(saved.charInfo.alice).toBeUndefined()
    expect(saved.charInfo.bob).toBeDefined()
    expect(saved.bunnyboard.conversations.alice).toBeUndefined()
    expect(useGameStore.getState().chars).toEqual(['bob'])
    expect(useGameStore.getState().characters).toEqual({ bob })
    expect(students).toEqual({ alice, bob })
    expect(before.chars).toEqual(['alice', 'bob'])
    expect(before.charInfo.alice).toMatchObject({ ex: { other: { data: 'preserved' } } })
  })

  it('leaves both native state and mod state untouched when the disk refuses the save', async () => {
    autosave.mockResolvedValue({ ok: false, error: { code: 'SAVE_WRITE_FAILED', message: 'disk full' } })
    expect((await kit.removeStudent('removal-test', request())).ok).toBe(false)
    expect(useGameStore.getState().chars).toEqual(['alice', 'bob'])
    expect(useGameStore.getState().removedStudents).toEqual({})
    expect(useGameStore.getState().modValues['removal-test']).toBe(value)
  })

  it('waits for persistence, and never applies an old completion to a newly loaded game', async () => {
    let release!: () => void
    autosave.mockImplementation(async () => {
      await new Promise<void>(resolve => { release = resolve })
      return { ok: true, data: {} }
    })
    const writing = kit.removeStudent('removal-test', request())
    await vi.waitFor(() => expect(autosave).toHaveBeenCalledOnce())
    expect(useGameStore.getState().chars).toEqual(['alice', 'bob'])
    useGameStore.getState().reset()
    useGameStore.setState({ playthroughId: 'p2', chars: ['alice'], characters: { alice } })
    release()
    await writing
    expect(useGameStore.getState().chars).toEqual(['alice'])
    expect(useGameStore.getState().removedStudents).toEqual({})
  })

  it('refuses scenes, disabled owners and a replaced expected case before writing', async () => {
    expect((await kit.removeStudent('off-test', request())).ok).toBe(false)
    expect((await kit.removeStudent('removal-test', { ...request(), expect: {} })).ok).toBe(false)
    useGameStore.setState({ cast: ['alice'], currentSceneTranscript: [{ speaker: 'alice', text: 'Hi.' }], awaitingInput: true })
    expect((await kit.removeStudent('removal-test', request())).ok).toBe(false)
    expect(autosave).not.toHaveBeenCalled()
    expect(useGameStore.getState().chars).toEqual(['alice', 'bob'])
  })

  it('is idempotent and fences captures taken before removal', async () => {
    const staleCapture = prepareAutosave(null)
    const call = request()
    expect((await kit.removeStudent('removal-test', call)).ok).toBe(true)
    expect((await kit.removeStudent('removal-test', call)).ok).toBe(true)
    await staleCapture()
    expect(autosave).toHaveBeenCalledOnce()
    expect(useGameStore.getState().modValues['removal-test']).toEqual({ events: 1 })
  })

  it('keeps the absence on a native reload without consulting the initiating mod', async () => {
    const before = { ...useGameStore.getState().toGameSave(), scene: null } as GameSave
    const record = playthroughRecord({ chars: ['alice', 'bob'] })
    await kit.removeStudent('removal-test', request())
    const saved = { ...drafts[0], playthroughId: 'p1', saveId: 'autosave', saveDate: 1 } as GameSave
    useGameStore.getState().reset()
    loopState.record = record
    useGameStore.getState().loadSave(saved, record, students)
    expect(useGameStore.getState().chars).toEqual(['bob'])
    expect(useGameStore.getState().characters.alice).toBeUndefined()
    expect(useGameStore.getState().toGameSave().removedStudents?.alice.eventId).toBe('event-one')
    // Loading a genuinely earlier save restores its earlier timeline, not a global deletion.
    useGameStore.getState().loadSave(before, record, students)
    expect(useGameStore.getState().chars).toEqual(['alice', 'bob'])
  })

  it('carries the native archive across semesters and refuses re-entry through pending transfers', async () => {
    await kit.removeStudent('removal-test', request())
    const game = useGameStore.getState()
    const view = withTransfers(semesterOf(playthroughRecord({ chars: ['alice', 'bob'] })), game)
    expect(view.chars).toEqual(['bob'])
    const handoff = carryOf(game, view)
    expect(handoff.carry.removedStudents).toEqual(game.removedStudents)
    expect(handoff.continuing).not.toContain('alice')
    useGameStore.setState({ pendingTransfers: [{ charId: 'alice', profile: charInfo(), state: charInfo() }], pendingCharacters: { alice } })
    useGameStore.getState().admitTransfers()
    expect(useGameStore.getState().chars).not.toContain('alice')
  })
})
