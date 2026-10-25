import { create } from 'zustand'
import { setDictionary } from '@shared/i18n/t'

/** The language the app is drawn in, and the pack behind it. */

interface LangStoreState {
  /** The code the app is drawn in; `en`, the game's own, until something has put a pack in. */
  code: string
  /**
   * Raised by every language switch, so the app remounts and each translated line redresses;
   * the first apply leaves it standing.
   */
  version: number
  /** Reads the pack behind `code` and draws the app in it. A boot's one-time apply. */
  load: (code: string) => Promise<void>
  /** Reads the pack behind `code` and remounts the app onto it. A switch, from wherever the language is chosen. */
  switchTo: (code: string) => Promise<void>
}

/**
 * The pack behind `code`, put in before the app is drawn in it. A read that fails is a
 * warning the app continues past in English, not one it dies on.
 */
async function applyPack(code: string): Promise<void> {
  setDictionary({})
  if (code === 'en') return
  const pack = await window.api.lang.read(code)
  if (!pack.ok) {
    console.warn('[lang] the pack could not be read; the app stays in English.', pack.error)
    return
  }
  if (pack.data !== null) setDictionary(pack.data)
}

export const useLangStore = create<LangStoreState>((set, get) => ({
  code: 'en',
  version: 0,

  load: async (code) => {
    await applyPack(code)
    set({ code })
  },

  switchTo: async (code) => {
    if (code === get().code) return
    await applyPack(code)
    set({ code, version: get().version + 1 })
  }
}))
