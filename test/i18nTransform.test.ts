import { resolve } from 'path'
import { describe, expect, it } from 'vitest'
import { i18nTransform } from '../scripts/i18nTransform'

/**
 * The transform: every English line the player reads wrapped in a `t()` call whose argument
 * is the line itself, and nothing a translation must never touch — a class name, a handle, a
 * key the game draws by, or a line the writer is told — left as it stands. The plugin is
 * fed sources directly, under the ids the scopes are drawn from.
 */

type Transform = (code: string, id: string) => { code: string; map: null } | null

function transform(): Transform {
  const plugin = i18nTransform()
  return (plugin as { transform?: Transform }).transform?.bind(plugin) ?? (() => null)
}

const view = (name: string): string => resolve(`src/renderer/views/${name}`)
const table = (name: string): string => resolve(`src/renderer/views/${name}`)
const ambient = (name: string): string => resolve(`src/renderer/prompts/${name}`)

describe('a screen', () => {
  it('wraps the JSX text, the allowlisted attributes and the ternary either side', () => {
    const out = transform()(
      `export function TestView(): JSX.Element {
  const busy = true
  return (
    <button title="Save the game" className="vu-btn" aria-label="Save">
      {busy ? 'Working on it' : 'All done'}
    </button>
  )
}`,
      view('TestView.tsx')
    )
    expect(out).not.toBeNull()
    expect(out!.code).toContain(`import { t } from '../../shared/i18n/t'`)
    expect(out!.code).toContain(`title={t("Save the game")}`)
    expect(out!.code).toContain(`aria-label={t("Save")}`)
    expect(out!.code).toContain(`{busy ? t("Working on it") : t("All done")}`)
    expect(out!.code).not.toContain(`t("vu-btn")`)
  })

  it('wraps an object property the player reads, and leaves the code values beside it', () => {
    const out = transform()(
      `export const ROWS = [{ id: 'firstName', label: 'First name', hint: 'What she goes by' }]`,
      view('TestView.tsx')
    )
    expect(out!.code).toContain(`t("First name")`)
    expect(out!.code).toContain(`t("What she goes by")`)
    expect(out!.code).toContain(`id: 'firstName'`)
  })

  it('wraps a template that is only a string, and leaves one splicing a value alone', () => {
    const out = transform()(
      `const plain = \`Loading the game\`
const built = \`\${count} girls on campus\``,
      view('TestView.tsx')
    )
    expect(out!.code).toContain(`const plain = t("Loading the game")`)
    expect(out!.code).toContain(`const built = \`\${count} girls on campus\``)
  })
})

describe('a label table', () => {
  it('wraps the fields and the word lists, and leaves the ids they sit beside', () => {
    const out = transform()(
      `export const FIELDS = [{ id: 'voice', label: 'Her voice', hint: 'How she speaks' }]
export const WORDS = ['Radiant', 'Shy']`,
      table('characterFields.ts')
    )
    expect(out!.code).toContain(`t("Her voice")`)
    expect(out!.code).toContain(`t("How she speaks")`)
    expect(out!.code).toContain(`t("Radiant")`)
    expect(out!.code).toContain(`id: 'voice'`)
  })
})

describe('the authored content', () => {
  it('wraps an authored line whole, and a line splicing a value by its static part', () => {
    const out = transform()(
      `export function introScrollLines(date: number) {
  return [
    { bg: 'train_stop', text: \`\${fmt(date)}. Today is move-in day at Venus University.\` },
    { text: \`You step off the tram into the Veridan air.\` },
    { text: describeReader(stats) }
  ]
}`,
      ambient("introScript.ts")
    )
    expect(out!.code).toContain(`text: \`\${fmt(date)}\${t(". Today is move-in day at Venus University.")}\``)
    expect(out!.code).toContain(`text: t("You step off the tram into the Veridan air.")`)
    expect(out!.code).toContain(`{ bg: 'train_stop',`)
    expect(out!.code).toContain(`text: describeReader(stats)`)
  })

  it('leaves the line the writer is told exactly as it is', () => {
    const code = `export const ORIENTATION_PREMISE =
  'The reader is standing with his orientation group in the Venus Quad.'`
    expect(transform()(code, ambient("introScript.ts"))).toBeNull()
  })

  it('wraps the stranger posts, and leaves the handles they are dealt to', () => {
    const out = transform()(
      `export const MESSAGES = [
  'someone in the Kendall Library is eating an ENTIRE rotisserie chicken',
  'califonria.girl',
  strangersOnly('Duchess is so cute!! I want those tentacles on me!!!')
]`,
      ambient("feedRandoms.ts")
    )
    expect(out!.code).toContain(`t("someone in the Kendall Library is eating an ENTIRE rotisserie chicken")`)
    expect(out!.code).toContain(`'califonria.girl'`)
    expect(out!.code).toContain(`strangersOnly(t("Duchess is so cute!! I want those tentacles on me!!!"))`)
  })

  it('wraps an authored sentence in an array, and leaves a bare token the game keys on', () => {
    const out = transform()(
      `export const WELCOME = ['You finally make it back to your room.', 'settings', 'hideui']`,
      ambient("introScript.ts")
    )
    expect(out!.code).toContain(`t("You finally make it back to your room.")`)
    expect(out!.code).toContain(`'settings'`)
    expect(out!.code).toContain(`'hideui'`)
  })
})

describe('out of scope', () => {
  it('touches nothing but the screens, the label tables and the authored content', () => {
    expect(
      transform()(`export const HER_COLD = { worst: '{name} is in the worst of a cold.' }`, resolve('src/renderer/prompts/colds.ts'))
    ).toBeNull()
    expect(transform()(`export const x = 'a store line'`, resolve('src/renderer/stores/gameStore.ts'))).toBeNull()
  })
})
