import { describe, expect, it } from 'vitest'
import { normalizeWhisper, whisperDiscussionOpen, whisperRecall, type VenusWhisper, type WhisperComment, type WhisperIssue } from '@shared/venusWhisper'
import { withWhisperRecall } from '../src/renderer/prompts/whisperRecall'
import type { StructuredRequest } from '@shared/types'

const comment = (id: string, text: string, who = 'alex', replyTo?: string): WhisperComment => ({
  id, text, person: { id: who, name: who === 'alex' ? 'Alex' : who === 'reader' ? 'Reader' : 'Bea', handle: who },
  player: who === 'reader', mentions: [], ...(replyTo ? { replyTo } : {})
})
const issue = (day: number, comments: WhisperComment[], term = 0): WhisperIssue => ({
  id: `whisper:${term}:${day}`, term, day, title: 'Campus column', body: 'An ordinary campus afternoon.',
  subjects: ['alex'], comments, answered: [], weekly: true
})
const saved = (issues: WhisperIssue[]): VenusWhisper => ({ version: 1, people: [], issues, dismissed: [],
  author: { id: 'secret-author', name: 'PRIVATE NAME', handle: 'private_handle', voice: 'PRIVATE PERSONALITY', known: false },
  observations: [], discovery: { author: 'secret-author', term: 0, day: 1, time: 0 } })
const excerpt = (s: VenusWhisper, term = 0, day = 30, query = '') => JSON.parse(whisperRecall(s, term, day, ['alex'], query)[1])

describe('Hare & Quill archived conversation recall', () => {
  it('recalls a saved comment after the discussion closes, reloads, and later semesters without reopening posting', () => {
    const original = saved([issue(2, [comment('promise', 'I will bring the atlas.')])])
    const before = JSON.stringify(original)
    expect(whisperDiscussionOpen(original.issues[0], 0, 30)).toBe(false)
    for (const s of [original, normalizeWhisper(JSON.parse(before))]) {
      expect(excerpt(s)[0]).toMatchObject({ semester: 1, issueDay: 2, archived: true, comments: [{ name: 'Alex', text: 'I will bring the atlas.' }] })
      expect(excerpt(s, 2, 0)[0].comments[0].text).toBe('I will bring the atlas.')
    }
    expect(JSON.stringify(original)).toBe(before)
  })

  it('finds an old topic past two newer issues and six newer comments, preserving the end of a long comment', () => {
    const long = 'An ordinary preamble. '.repeat(20) + 'I will bring the astronomy atlas.'
    const original = saved([issue(2, [comment('promise', long), ...Array.from({ length: 12 }, (_, n) => comment(`noise-${n}`, `Everyday comment ${n}.`))]),
      issue(9, [comment('newer', 'Nice weather.')]), issue(16, [comment('newest', 'The flowers are blooming.')])])
    const recall = excerpt(original, 0, 30, 'What about the astronomy atlas you mentioned?')
    expect(recall[0].issueDay).toBe(2)
    expect(recall[0].comments).toContainEqual({ name: 'Alex', text: long })
    expect(recall[0].comments.length).toBeLessThanOrEqual(6)
  })

  it('keeps the parent and speaker of a reply without an @mention', () => {
    const s = saved([issue(2, [comment('offer', 'I can bring the atlas.'), comment('answer', 'Yes, please!', 'bea', 'offer')])])
    expect(excerpt(s, 0, 30, 'atlas')[0].comments).toContainEqual({ name: 'Bea', text: 'Yes, please!', inReplyTo: { name: 'Alex', text: 'I can bring the atlas.' } })
  })

  it('excludes future, dismissed and unrelated issues, and never exposes columnist identity or private profile data', () => {
    const s = saved([issue(2, [comment('old', 'Public words.')]), issue(40, [comment('future-day', 'FUTURE DAY')]),
      issue(0, [comment('future-term', 'FUTURE TERM')], 1)])
    const recall = whisperRecall(s, 0, 30, ['alex']).join('\n')
    expect(recall).toContain('Public words.')
    expect(recall).not.toMatch(/PRIVATE|private_handle|secret-author|FUTURE/)
    expect(recall).toContain('claims and comments, not proof')
    expect(recall).toContain('not fresh news or proof that a promise was fulfilled')
    expect(whisperRecall(s, 0, 30, ['unrelated'])).toEqual([])
    expect(whisperRecall({ ...s, dismissed: ['whisper:0:2'] }, 0, 30, ['alex'])).toEqual([])
  })

  it('bounds long threads with full parent quotes without dropping all recalled comments', () => {
    const s = saved([issue(2, Array.from({ length: 40 }, (_, n) => comment(`row-${n}`, `Atlas ${n} ` + 'x'.repeat(580), 'alex', n ? `row-${n - 1}` : undefined))),
      issue(9, Array.from({ length: 40 }, (_, n) => comment(`new-${n}`, 'y'.repeat(600))))])
    const lines = whisperRecall(s, 0, 30, ['alex'], 'Atlas')
    expect(lines[1].length).toBeLessThanOrEqual(6500)
    expect(JSON.parse(lines[1])[0].comments.length).toBeGreaterThan(0)
    expect(lines.join('\n').length).toBeLessThan(7400)
  })

  it('bounds JSON-escaped article text and still leaves room for comments', () => {
    const s = saved([2, 9].map(day => ({ ...issue(day, [comment('promise', 'I will bring the atlas.')]),
      body: 'Public article ' + '\u0000'.repeat(2300) })))
    const lines = whisperRecall(normalizeWhisper(s), 0, 30, ['alex'], 'Atlas?')
    expect(lines[1].length).toBeLessThanOrEqual(6500)
    expect(lines[1]).toContain('I will bring the atlas.')
  })

  it('adds recall without overwriting another mod’s schema, system or logging boundary', () => {
    const request: StructuredRequest = { system: 'Rules', user: 'Other mod context\nYOUR TURN\nAtlas?', logFrom: 18,
      schema: { name: 'scene', schema: { properties: { otherMod: { type: 'string' } } } } }
    const before = structuredClone(request)
    const result = withWhisperRecall(request, saved([issue(2, [comment('promise', 'I will bring the atlas.')])]), 0, 30, ['alex'], 'Atlas?')
    expect(result.user).toContain('I will bring the atlas.')
    expect(result.user.endsWith(request.user)).toBe(true)
    expect(result.user.slice(result.logFrom)).toBe(request.user.slice(request.logFrom))
    expect(result.schema).toBe(request.schema)
    expect(result.system).toBe(request.system)
    expect(request).toEqual(before)
    expect(withWhisperRecall(request, saved([]), 0, 30, ['alex'], '')).toBe(request)
  })
})
