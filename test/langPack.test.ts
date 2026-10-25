import { describe, expect, it } from 'vitest'
import {
  isLanguageCode,
  LANG_PACK_MAX_ENTRIES,
  parseLangPack
} from '@shared/langPack'

/**
 * The pack contract: what a language file must be to reach the renderer, so a hand-swapped
 * or truncated pack can neither crash the boot nor smuggle a shape the `t()` lookup cannot
 * read — and a language code is a file name, so the shape of one is the whole of what keeps
 * it inside `lang/`.
 */

describe('isLanguageCode', () => {
  it('takes a BCP 47 shaped tag', () => {
    expect(isLanguageCode('en')).toBe(true)
    expect(isLanguageCode('pt')).toBe(true)
    expect(isLanguageCode('pt-BR')).toBe(true)
    expect(isLanguageCode('zh-Hans')).toBe(true)
  })

  it('refuses anything a file name must never be', () => {
    expect(isLanguageCode('pt_br')).toBe(false)
    expect(isLanguageCode('../saves')).toBe(false)
    expect(isLanguageCode('.')).toBe(false)
    expect(isLanguageCode('pt-BR.json')).toBe(false)
    expect(isLanguageCode('a-very-long-tag-that-is-no-language')).toBe(false)
    expect(isLanguageCode(1)).toBe(false)
  })
})

describe('parseLangPack', () => {
  it('takes a record of translated lines', () => {
    expect(parseLangPack({ Settings: 'Configurações', Save: 'Salvar' })).toEqual({
      Settings: 'Configurações',
      Save: 'Salvar'
    })
  })

  it('drops the lines nobody has translated yet, so the English key shows through them', () => {
    expect(parseLangPack({ Settings: '', Save: '   ', Close: 'Fechar' })).toEqual({ Close: 'Fechar' })
    expect(parseLangPack({ '': 'Nada' })).toEqual({})
  })

  it('refuses anything that is not a record of strings', () => {
    expect(parseLangPack(null)).toBeNull()
    expect(parseLangPack('Configurações')).toBeNull()
    expect(parseLangPack(['Configurações'])).toBeNull()
    expect(parseLangPack({ Settings: 1 })).toBeNull()
    expect(parseLangPack({ nested: { deep: 'x' } })).toBeNull()
  })

  it('refuses a record past the entry cap', () => {
    const pack: Record<string, string> = {}
    for (let i = 0; i <= LANG_PACK_MAX_ENTRIES; i++) pack[`Line ${i}`] = 'Linha'
    expect(parseLangPack(pack)).toBeNull()
  })
})
