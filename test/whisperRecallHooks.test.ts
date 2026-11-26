import './fixtures/maestroModelKit'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { calendarOf } from '@shared/semesters'
import { DEFAULT_MEMORY_BUDGETS } from '@shared/settingsRules'
import { normalizeWhisper, VENUS_WHISPER_MOD } from '@shared/venusWhisper'
import { useGameStore } from '../src/renderer/stores/gameStore'
import { setHookRules } from '../src/renderer/mods/hooks'
import { buildScenePrompt, buildContinuationPrompt, buildClosingPrompt, type PromptState } from '../src/renderer/prompts/scenePrompt'
import { buildTextingPrompt } from '../src/renderer/prompts/textingPrompt'
import '../src/renderer/modEntries/venus-whisper'
import '../src/renderer/modEntries/story-memory'
import { character, charInfo, charactersById, playthroughRecord } from './fixtures'

const alex = character({ charId: 'a', firstName: 'Alex' })
const promise = 'I will bring the astronomy atlas.'
const action = 'What about the astronomy atlas you mentioned in Hare & Quill?'
const game = () => useGameStore.getState()
function state(): PromptState {
  return { romance: { female: 'sexuality', male: 'sexuality' }, readerPronouns: 'he', playthroughId: 'p', date: 30, time: 0,
    backgrounds: { interior: ['library'], exterior: ['quad'] }, lorebook: [],
    charInfo: { a: charInfo({ nameKnown: true }) }, npcRelationships: {}, roster: [], classes: {}, playerSchedule: {}, classRosters: {},
    calendar: calendarOf('spring', [], {}), bg: null, classCode: null, projectClass: null, playerJob: null,
    jobId: null, visitJobId: null, giftNotes: [], emotions: {}, onStage: [], lessNsfwText: false,
    memoryBudgets: DEFAULT_MEMORY_BUDGETS, history: {}, cgReady: {}, customCgReady: {}, outfitReady: {}, roomReady: {} }
}
function requests(s = state()) {
  return [buildScenePrompt([alex], action, s, '', ''),
    buildContinuationPrompt([alex], action, [], s, '', '', null, 1),
    buildClosingPrompt([alex], [{ speaker: 'alex_rose', text: action }], s, '', '', null),
    buildTextingPrompt(alex, s.charInfo.a, undefined, action, { ...s, memoryBudget: 2 }, '')]
}
beforeEach(() => {
  game().reset()
  setHookRules({ isOn: id => id === VENUS_WHISPER_MOD, order: () => 0 })
  useGameStore.setState({ playthroughId: 'p', date: 30, time: 0, chars: ['a'], cast: ['a'],
    characters: charactersById(alex), charInfo: state().charInfo,
    exVenusWhisper: normalizeWhisper({ version: 1, issues: [2, 9, 16].map(day => ({
      id: `whisper:0:${day}`, term: 0, day, title: 'Campus column', body: 'An ordinary afternoon.', subjects: ['a'],
      comments: [{ id: `comment-${day}`, text: day === 2 ? promise : 'Nice weather today.', player: false, mentions: [],
        person: { id: 'a', name: 'Alex Rose', handle: 'alex' } }], answered: [], weekly: true
    })) }) })
})
afterEach(() => { game().reset(); setHookRules({ isOn: () => true, order: () => 0 }) })

it('recalls archived comments once in actual scene and DM builders after save/load, independently of Story Memory', () => {
  const save = { ...game().toGameSave(), playthroughId: 'p', saveId: 'test', saveDate: 0 }
  game().reset()
  game().loadSave(save, playthroughRecord({ chars: ['a'] }), charactersById(alex))
  const before = JSON.stringify(game().exVenusWhisper)
  for (const request of requests()) {
    expect(request.user).toContain(promise)
    expect(request.user.split('PUBLIC CAMPUS GOSSIP:')).toHaveLength(2)
    expect(request.user).toContain('"archived":true')
    expect(request.storyMemory).toBeUndefined()
  }
  expect(JSON.stringify(game().exVenusWhisper)).toBe(before)
})

it('coexists with the enabled Story Memory request payload', () => {
  setHookRules({ isOn: id => [VENUS_WHISPER_MOD, 'story-memory'].includes(id), order: id => id === VENUS_WHISPER_MOD ? 0 : 1 })
  const s = { ...state(), storyMemory: { playthroughId: 'p', date: 30, time: 0 as const, names: { a: 'Alex', reader: 'Reader' }, records: [] } }
  for (const request of requests(s)) {
    expect(request.user).toContain(promise)
    expect(request.storyMemory?.playthroughId).toBe('p')
    expect(request.storyMemory?.query).toContain('astronomy atlas')
  }
})

it('omits archive recall when the mod is disabled, in Creator/replay, or outside its playthrough', () => {
  setHookRules({ isOn: () => false, order: () => 0 })
  for (const request of requests()) expect(request.user).not.toContain(promise)
  setHookRules({ isOn: id => id === VENUS_WHISPER_MOD, order: () => 0 })
  for (const patch of [{ createdScene: {} as NonNullable<ReturnType<typeof game>['createdScene']> }, { replaying: {} }, { playthroughId: null }]) {
    useGameStore.setState(patch)
    for (const request of requests()) expect(request.user).not.toContain(promise)
    useGameStore.setState({ playthroughId: 'p', createdScene: null, replaying: null })
  }
  expect(buildScenePrompt([alex], action, { ...state(), playthroughId: 'other-save' }, '', '').user).not.toContain(promise)
})
