import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The pack read. A pack a player put under `/data/lang` wins over the one a build ships
 * under `assets/lang`; a language with no pack at all is null, the English the game is
 * written in showing through every line of it; a file that is not a catalog is an error the
 * caller warns over, not one the boot dies on. `paths.ts` reads `app.getAppPath()` at call
 * time, so stubbing the electron module is enough to root the whole read at a temp folder.
 */
let root = ''
vi.mock('electron', () => ({
  app: { isPackaged: false, getAppPath: () => root, getPath: () => root }
}))

const { readLangPack } = await import('../src/main/services/langService')

/** Writes a pack to one of the two roots, as a player or a build would. */
async function seed(where: 'data' | 'assets', code: string, body: unknown): Promise<void> {
  const dir = join(root, where, 'lang')
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, `${code}.json`), typeof body === 'string' ? body : JSON.stringify(body))
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'lang-'))
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('readLangPack', () => {
  it('answers null for a language with no pack installed', async () => {
    await expect(readLangPack('pt-BR')).resolves.toBeNull()
  })

  it('reads the pack a build ships, its untranslated lines left out', async () => {
    await seed('assets', 'pt-BR', { Settings: 'Configurações', Blank: '' })
    await expect(readLangPack('pt-BR')).resolves.toEqual({ Settings: 'Configurações' })
  })

  it('lets the pack a player put there win over the one a build ships', async () => {
    await seed('assets', 'pt-BR', { Settings: 'the shipped line' })
    await seed('data', 'pt-BR', { Settings: 'Configurações' })
    await expect(readLangPack('pt-BR')).resolves.toEqual({ Settings: 'Configurações' })
  })

  it('falls to the shipped pack where the player put none', async () => {
    await seed('assets', 'pt-BR', { Settings: 'Configurações' })
    await seed('data', 'en', { Settings: 'never read' })
    await expect(readLangPack('pt-BR')).resolves.toEqual({ Settings: 'Configurações' })
  })

  it('refuses a code a file name must never be', async () => {
    await expect(readLangPack('../saves')).rejects.toMatchObject({
      code: 'LANG_PACK_CODE_INVALID'
    })
  })

  it('refuses a file that is not a catalog, rather than guessing', async () => {
    await seed('data', 'pt-BR', { Settings: 1 })
    await expect(readLangPack('pt-BR')).rejects.toMatchObject({ code: 'LANG_PACK_MALFORMED' })
    await seed('data', 'pt-BR', 'não é um catálogo')
    await expect(readLangPack('pt-BR')).rejects.toMatchObject({ code: 'LANG_PACK_MALFORMED' })
    await seed('data', 'pt-BR', '{not json')
    await expect(readLangPack('pt-BR')).rejects.toMatchObject({ code: 'LANG_PACK_MALFORMED' })
  })
})
