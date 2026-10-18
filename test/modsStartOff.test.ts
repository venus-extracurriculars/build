import { expect, it } from 'vitest'
import { MODS } from '@shared/mods'

/**
 * The mods that were on for a player who never touched them in Venus Extracurriculars 0.2.0, the
 * last release before every mod started off. Only these may still say `defaultOn: true`: the
 * game reads it once, to keep them on for whoever was already playing. Any other mod saying it
 * would be switched on for every existing player by an update, which is what the rule prevents.
 */
const ON_IN_0_2_0 = [
  'breakthrough',
  'city-life-jobs',
  'city-life-locations',
  'custom-soundtracks',
  'incoming-texts',
  'meanwhile-conversations',
  'photo-feature',
  'plot-twist',
  'story-memory',
  'text-regeneration',
  'venus-whisper'
]

it('keeps defaultOn: true to the mods that shipped on before every mod started off', () => {
  const claiming = MODS.filter((mod) => mod.defaultOn === true).map((mod) => mod.id)
  expect(claiming.filter((id) => !ON_IN_0_2_0.includes(id))).toEqual([])
})
