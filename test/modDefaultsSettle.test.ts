import { afterEach, expect, it, vi } from 'vitest'
import type { ModDef, ModSwitches } from '../src/shared/mods'

/** The mods store at boot, against a stubbed disk: what it reads, and what it writes back. */
async function boot(options: {
  stored: ModSwitches
  playthroughs: { ok: true; data: unknown[] } | { ok: false; error: unknown }
}): Promise<{ switches: ModSwitches; written: ModSwitches[] }> {
  vi.resetModules()
  const mods = await import('../src/shared/mods')
  const list = mods.MODS as ModDef[]
  list.push({
    id: 'fixture-was-on',
    name: 'Was on',
    author: 'fixture',
    version: '1',
    scope: 'anytime',
    defaultOn: true,
    blurb: ''
  })
  const written: ModSwitches[] = []
  vi.stubGlobal('window', {
    api: {
      mods: {
        get: async () => ({ ok: true, data: options.stored }),
        set: async (switches: ModSwitches) => {
          written.push(switches)
          return { ok: true, data: undefined }
        }
      },
      saves: { playthroughs: async () => options.playthroughs }
    }
  })
  const { useModsStore } = await import('../src/renderer/stores/modsStore')
  await useModsStore.getState().load()
  return { switches: useModsStore.getState().switches, written }
}

/** Every shipped mod that used to start on, already settled, so only the fixture is in question. */
async function shippedSettled(): Promise<Record<string, boolean>> {
  const { MODS } = await import('../src/shared/mods')
  return Object.fromEntries(MODS.filter((mod) => mod.defaultOn === true).map((mod) => [mod.id, true]))
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('keeps a mod that used to start on for a player who has a playthrough, and writes it down', async () => {
  const { switches, written } = await boot({
    stored: { on: {}, options: {} },
    playthroughs: { ok: true, data: [{}] }
  })
  expect(switches.on['fixture-was-on']).toBe(true)
  expect(written.at(-1)?.on['fixture-was-on']).toBe(true)
})

it('writes it off for a player with no playthrough', async () => {
  const { switches } = await boot({
    stored: { on: {}, options: {} },
    playthroughs: { ok: true, data: [] }
  })
  expect(switches.on['fixture-was-on']).toBe(false)
})

it('leaves a switch the player set, and writes nothing when there is nothing to settle', async () => {
  const { switches, written } = await boot({
    stored: { on: { ...(await shippedSettled()), 'fixture-was-on': false }, options: {} },
    playthroughs: { ok: true, data: [{}] }
  })
  expect(switches.on['fixture-was-on']).toBe(false)
  expect(written).toEqual([])
})

it('settles nothing when the playthroughs cannot be listed', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const { switches, written } = await boot({
    stored: { on: {}, options: {} },
    playthroughs: { ok: false, error: { code: 'X', message: 'x' } }
  })
  expect(switches.on['fixture-was-on']).toBeUndefined()
  expect(written).toEqual([])
})
