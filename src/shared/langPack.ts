/**
 * The shape of a translation pack, and the limits and the codes one is read under.
 */

/**
 * Whether `value` names a language a pack file can be read by. The code is the pack's file
 * name under `lang/`, so it is a BCP 47 shaped tag — language, then subtags in hyphens — and
 * nothing else: a name the pattern refuses is refused before it ever reaches a path.
 */
export function isLanguageCode(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z]{2,3}(-[A-Za-z0-9]{2,8}){0,2}$/.test(value)
}

/** The most bytes a pack may span, so a file swapped in cannot balloon the read. */
export const LANG_PACK_MAX_BYTES = 2 * 1024 * 1024

/** The most lines a pack may carry, so one stays a catalog rather than a corpus. */
export const LANG_PACK_MAX_ENTRIES = 20000

/**
 * A pack as the renderer translates through it: each English line the key, its translation
 * the value. Anything that is not such a record answers null — a value that is not a string
 * is a structural error, so the read warns rather than guessing — while a blank value is a
 * line nobody has translated yet, and is left out so the English key shows through it.
 */
export function parseLangPack(raw: unknown): Record<string, string> | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const entries = Object.entries(raw)
  if (entries.length > LANG_PACK_MAX_ENTRIES) return null
  const pack: Record<string, string> = {}
  for (const [key, value] of entries) {
    if (typeof value !== 'string') return null
    if (key === '' || value.trim() === '') continue
    pack[key] = value
  }
  return pack
}
