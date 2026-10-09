import type { ModDef } from '../mods'
import '../storyMemoryCarry'

const mod: ModDef = {
  id: 'story-memory', name: 'Story Memory', author: 'Maestro Leeds', version: '1.0.0',
  scope: 'anytime', defaultOn: true,
  blurb: 'Remember lasting story developments and find relevant past encounters with a local SQLite index.',
  offNote: 'Keeps facts and corrections in saves. Stops extraction and extra recall. Native character notes stay available.'
}
export default mod
