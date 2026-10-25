import { readFile } from 'fs/promises'
import { appError, messageOf } from '@shared/errors'
import { isLanguageCode, LANG_PACK_MAX_BYTES, parseLangPack } from '@shared/langPack'
import { getLangPackPath, getShippedLangPackPath } from '../paths'

/**
 * The translation packs: one file per language, either the one a build ships under
 * `assets/lang`, or the one a player or a mod has put under `/data/lang`, which wins. Read
 * here and nowhere else; the app never writes one.
 */

/**
 * `lang:read` — the pack for `code`, or null where none is installed. A file that cannot be
 * read, or is not a record of translated lines, is an error the caller warns over and
 * continues past in English, not one the boot dies on; a language with no pack at all is
 * untranslated, not broken.
 */
export async function readLangPack(code: string): Promise<Record<string, string> | null> {
  if (!isLanguageCode(code)) {
    throw appError('LANG_PACK_CODE_INVALID', 'That language is not one this build knows.', code)
  }
  for (const path of [getLangPackPath(code), getShippedLangPackPath(code)]) {
    let bytes: Buffer
    try {
      bytes = await readFile(path)
    } catch (err) {
      const errno = (err as NodeJS.ErrnoException).code
      // A root holding no pack for it is the next root's to answer, not a failure.
      if (errno === 'ENOENT' || errno === 'ENOTDIR') continue
      throw appError(
        'LANG_PACK_UNREADABLE',
        'Could not read the language pack.',
        `${path}: ${messageOf(err)}`
      )
    }
    if (bytes.byteLength > LANG_PACK_MAX_BYTES) {
      throw appError(
        'LANG_PACK_TOO_LARGE',
        'The language pack is too large to read.',
        `${path} spans ${bytes.byteLength} bytes`
      )
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(bytes.toString('utf8'))
    } catch (err) {
      throw appError(
        'LANG_PACK_MALFORMED',
        'The language pack is not valid JSON.',
        `${path}: ${messageOf(err)}`
      )
    }
    const pack = parseLangPack(parsed)
    if (pack === null) {
      throw appError(
        'LANG_PACK_MALFORMED',
        'The language pack is not a record of translated lines.',
        path
      )
    }
    return pack
  }
  // No pack anywhere: the English the game is written in shows through every line of it.
  return null
}
