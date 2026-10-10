import { registerTermCarry } from './modCarry'
import type { CharacterDynamics } from './characterDynamics'

declare module './modCarry' {
  interface ModCarryFields { characterDynamics?: CharacterDynamics }
}

// Retain even absent girls and unrecognized future tags. Applying a tag is the prompt's job.
registerTermCarry('characterDynamics', save =>
  save.characterDynamics ? structuredClone(save.characterDynamics) : undefined
)
