import { writeFileSync } from 'node:fs'
import { dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse, type ParserPlugin } from '@babel/parser'
import type { Plugin } from 'vite'

/**
 * The renderer's translation transform. Every English line the player reads — a JSX text
 * node, a whitelisted attribute, a ternary's either side, a label table's field, a string
 * constant, or a line of the authored content outside the screens — is wrapped in a `t()`
 * call at build time, so the source keeps no keys and upstream copy edits flow through a
 * rebase as they are. The English line is the catalog key: a string with no catalog entry
 * reads as it always has, and the keys a build wraps are written to `i18n-extracted.json`
 * for translating.
 */

/** Forward slashes and no trailing slash, the form Vite ids come in. */
function normalize(path: string): string {
  return path.replace(/\\/g, '/')
}

const RENDERER_ROOT = `${normalize(fileURLToPath(new URL('../src/renderer', import.meta.url)))}/`
const VIEWS_DIR = `${RENDERER_ROOT}views/`
const COMPONENTS_DIR = `${RENDERER_ROOT}components/`
const PROMPTS_DIR = `${RENDERER_ROOT}prompts/`
const T_MODULE = normalize(fileURLToPath(new URL('../src/shared/i18n/t', import.meta.url)))
const EXTRACT_PATH = fileURLToPath(new URL('../i18n-extracted.json', import.meta.url))

/** JSX attributes whose literal values are lines the player reads. */
const ATTRIBUTE_ALLOWLIST = new Set([
  'title',
  'label',
  'hint',
  'note',
  'placeholder',
  'message',
  'confirmText',
  'cancelText',
  'busyText',
  'extraText',
  'retryMessage',
  'aria-label',
  'alt'
])

/**
 * The views' label tables, whose object fields and word lists carry lines the player reads.
 * Their code values — ids, keys, wire names — sit beside those and are never wrapped.
 */
const LABEL_TABLES = new Set([
  'characterFields.ts',
  'sfwFields.ts',
  'volumeFields.ts',
  'promptKindFields.ts'
])

/**
 * Authored content the player reads outside the screens: the playthrough's authored opening,
 * and the feed's stranger posts. Plain prompt files as these are, what they carry is read by
 * the prompt that feeds the model too, so only what a property allowlist names as a line of
 * text — or a sentence in a bare array — is ever wrapped: `cold.ts`'s lines to the writer, or
 * the orientation premise, sit in these files' neighbours and are left exactly as they are.
 */
const AMBIENT_FILES = new Set(['introScript.ts', 'feedRandoms.ts'])

/**
 * The marker helper a feed message may be dealt through; its argument is the post the player
 * reads, and the marker itself is code.
 */
const STRANGER_MARKER = 'strangersOnly'

/** Object property keys in a label table or an ambient file whose literal values are lines the player reads. */
const PROPERTY_ALLOWLIST = new Set([
  'label',
  'hint',
  'note',
  'description',
  'title',
  'message',
  'around',
  'text'
])

/** One parsed node, walked generically; only the shapes handled below are ever read. */
type AstNode = { type: string } & Record<string, any>

/** One source span and what it is replaced with. */
interface Edit {
  start: number
  end: number
  text: string
}

/** Every node in the tree, parents before children. */
function walk(node: unknown, visit: (node: AstNode) => void): void {
  if (node === null || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit)
    return
  }
  const typed = node as AstNode
  if (typeof typed.type !== 'string') return
  visit(typed)
  for (const key of Object.keys(typed)) {
    if (key === 'loc' || key.endsWith('Comments') || key === 'range') continue
    walk(typed[key], visit)
  }
}

/** `text` as the call a catalog key is read through. */
function tCall(text: string): string {
  return `t(${JSON.stringify(text)})`
}

/** Whether a line is one a translation could change: it carries a letter. */
function hasLetter(text: string): string | boolean {
  return /\p{L}/u.test(text)
}

/** Whether a line reads as one the player does: a sentence, not a handle, an id or a path. */
function isSentence(text: string): boolean {
  return /\s/.test(text.trim())
}

/**
 * One span of JSX text as the player reads it: the line wrapped, and the same-line spaces
 * either side of it kept, whitespace over a line break being whitespace the reader never saw
 * rendered.
 */
function jsxTextEdit(value: string): string | null {
  const lead = /^[ \t]*/.exec(value)![0]
  const trail = /[ \t]*$/.exec(value)![0]
  const text = value
    .slice(lead.length, value.length - trail.length)
    .replace(/[ \t]*\n[ \t]*/g, ' ')
    .trim()
  if (text === '' || !hasLetter(text)) return null
  const leadOut = value.startsWith('\n') ? '' : lead
  const trailOut = value.endsWith('\n') ? '' : trail
  return `${leadOut ? `{${JSON.stringify(leadOut)}}` : ''}{${tCall(text)}}${trailOut ? `{${JSON.stringify(trailOut)}}` : ''}`
}

/**
 * One string literal's replacement, or null where it carries nothing a translation could
 * change.
 */
function literalEdit(text: string): string | null {
  if (text.trim() === '' || !hasLetter(text)) return null
  // CSS class modifiers ride template literals inside className expressions.
  if (/^\s*vu-/.test(text)) return null
  // SVG path data and icon glyphs.
  if (/^[mM][\d\s]/.test(text.trim())) return null
  // A bare word without spaces — lowercase, camelCase or hyphenated — is a code value.
  if (!/\s/.test(text.trim()) && /^[a-z][a-zA-Z-]*$/.test(text.trim())) return null
  return tCall(text)
}

export function i18nTransform(): Plugin {
  // Every key a build has wrapped, written out once it ends for the translator to fill.
  const keys = new Set<string>()

  return {
    name: 'venus-university:i18n',
    enforce: 'pre',

    transform(code: string, id: string) {
      const file = normalize(id.split('?')[0])
      const base = file.slice(file.lastIndexOf('/') + 1)
      const isScreen =
        (file.startsWith(VIEWS_DIR) || file.startsWith(COMPONENTS_DIR)) && file.endsWith('.tsx')
      const isTable = file.startsWith(VIEWS_DIR) && LABEL_TABLES.has(base)
      const isAmbient = file.startsWith(PROMPTS_DIR) && AMBIENT_FILES.has(base)
      if (!isScreen && !isTable && !isAmbient) return null

      // TSX is the typescript and jsx plugins together: the parser reads `<` as JSX the way
      // the compiler itself does in a `.tsx` file. A label table and the authored content are
      // plain TS.
      const plugins: ParserPlugin[] = isScreen ? ['typescript', 'jsx'] : ['typescript']
      let ast: AstNode
      try {
        ast = parse(code, { sourceType: 'module', plugins, errorRecovery: false }) as unknown as AstNode
      } catch {
        // Let the pipeline that reads this file for real raise the error it already would.
        return null
      }

      const edits: Edit[] = []
      const wrap = (text: string, start: number, end: number): void => {
        edits.push({ start, end, text: tCall(text) })
        keys.add(text)
      }

      walk(ast, (node) => {
        if (node.type === 'JSXText') {
          const replacement = jsxTextEdit(node.value)
          if (replacement !== null) {
            edits.push({ start: node.start, end: node.end, text: replacement })
            keys.add(node.value.replace(/[ \t]*\n[ \t]*/g, ' ').trim())
          }
          return
        }
        if (node.type === 'JSXAttribute' && node.name?.type === 'JSXIdentifier') {
          const name: string = node.name.name
          if (ATTRIBUTE_ALLOWLIST.has(name) && node.value?.type === 'StringLiteral') {
            const text: string = node.value.value
            const replacement = literalEdit(text)
            if (replacement !== null) {
              edits.push({ start: node.value.start, end: node.value.end, text: `{${replacement}}` })
              keys.add(text)
            }
          }
          return
        }
        // A ternary whose either side is a string the player reads: both sides wrapped.
        if (isScreen && node.type === 'ConditionalExpression') {
          for (const branch of [node.consequent, node.alternate]) {
            if (branch?.type === 'StringLiteral') {
              const text: string = branch.value
              const replacement = literalEdit(text)
              if (replacement !== null) {
                edits.push({ start: branch.start, end: branch.end, text: replacement })
                keys.add(text)
              }
            }
          }
          return
        }
        // An object property's literal value under a key the player reads, in any screen.
        if (
          isScreen &&
          node.type === 'ObjectProperty' &&
          node.computed !== true &&
          node.value?.type === 'StringLiteral'
        ) {
          const key =
            node.key.type === 'Identifier'
              ? (node.key.name as string)
              : node.key.type === 'StringLiteral'
                ? (node.key.value as string)
                : null
          if (key !== null && PROPERTY_ALLOWLIST.has(key)) {
            const text: string = node.value.value
            const replacement = literalEdit(text)
            if (replacement !== null) {
              edits.push({ start: node.value.start, end: node.value.end, text: replacement })
              keys.add(text)
            }
          }
          return
        }
        // Authored content: a text property the player reads. A literal is wrapped like any
        // string; a template with expressions has its static parts wrapped one by one, so the
        // date or the name spliced into the line splices into the translation around it —
        // while a template with no expressions falls to the template rule below, wrapped whole.
        if (isAmbient && node.type === 'ObjectProperty' && node.computed !== true) {
          const key =
            node.key.type === 'Identifier'
              ? (node.key.name as string)
              : node.key.type === 'StringLiteral'
                ? (node.key.value as string)
                : null
          if (key !== null && PROPERTY_ALLOWLIST.has(key)) {
            if (node.value?.type === 'StringLiteral') {
              const text: string = node.value.value
              if (literalEdit(text) !== null) {
                edits.push({ start: node.value.start, end: node.value.end, text: tCall(text) })
                keys.add(text)
              }
            } else if (node.value?.type === 'TemplateLiteral') {
              const template = node.value as AstNode
              if (template.expressions.length > 0) {
                for (const quasi of template.quasis) {
                  const text: string | null = quasi.value?.cooked ?? null
                  if (text === null || text.trim() === '' || !hasLetter(text)) continue
                  if (literalEdit(text) === null) continue
                  edits.push({ start: quasi.start, end: quasi.end, text: `\${${tCall(text)}}` })
                  keys.add(text)
                }
              }
            }
          }
          return
        }
        // Authored content: a post dealt through the stranger marker, its argument the post
        // the player reads.
        if (
          isAmbient &&
          node.type === 'CallExpression' &&
          node.callee?.type === 'Identifier' &&
          node.callee.name === STRANGER_MARKER &&
          node.arguments?.[0]?.type === 'StringLiteral'
        ) {
          const text: string = node.arguments[0].value
          if (isSentence(text)) wrap(text, node.arguments[0].start, node.arguments[0].end)
          return
        }
        // A template with no expressions is a string the same as a quoted one, whatever file
        // of the scope it stands in: the player reads it whole, and it is wrapped whole. One
        // with expressions is the authored content's alone, and only where a property
        // allowlist named it above.
        if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
          const text: string | null = node.quasis[0]?.value?.cooked ?? null
          if (text !== null) {
            const replacement = literalEdit(text)
            if (replacement !== null) {
              edits.push({ start: node.start, end: node.end, text: replacement })
              keys.add(text)
            }
          }
          return
        }
        // A label table: every object property under an allowlisted key, and word lists.
        if (isTable && node.type === 'ObjectProperty' && node.computed !== true) {
          const key =
            node.key.type === 'Identifier'
              ? (node.key.name as string)
              : node.key.type === 'StringLiteral'
                ? (node.key.value as string)
                : null
          if (key !== null && PROPERTY_ALLOWLIST.has(key) && node.value?.type === 'StringLiteral') {
            const text: string = node.value.value
            if (text.trim() !== '' && hasLetter(text)) {
              edits.push({ start: node.value.start, end: node.value.end, text: tCall(text) })
              keys.add(text)
            }
          }
          return
        }
        if (node.type === 'ArrayExpression') {
          for (const element of node.elements ?? []) {
            if (element?.type !== 'StringLiteral') continue
            const text: string = element.value
            // The authored content keeps to sentences: a bare token is a handle, an id or a
            // key the game draws by, and never a line it reads.
            if (isAmbient && !isSentence(text)) continue
            if (hasLetter(text)) {
              edits.push({ start: element.start, end: element.end, text: tCall(text) })
              keys.add(text)
            }
          }
        }
      })

      if (edits.length === 0) return null

      // Splice from the end back, so an edit's offsets are untouched by the ones before it.
      edits.sort((a, b) => b.start - a.start)
      let out = code
      for (const edit of edits) out = out.slice(0, edit.start) + edit.text + out.slice(edit.end)

      const spec = relative(dirname(file), T_MODULE).replace(/\\/g, '/')
      if (!/from\s+['"][^'"]*i18n\/t['"]/.test(code)) {
        out = `import { t } from '${spec.startsWith('.') ? spec : `./${spec}`}'\n${out}`
      }
      return { code: out, map: null }
    },

    buildEnd() {
      const catalog: Record<string, string> = {}
      for (const key of [...keys].sort()) catalog[key] = ''
      try {
        writeFileSync(EXTRACT_PATH, `${JSON.stringify(catalog, null, 2)}\n`)
      } catch {
        // A checkout the build cannot write beside itself simply writes no extraction.
      }
    }
  }
}
