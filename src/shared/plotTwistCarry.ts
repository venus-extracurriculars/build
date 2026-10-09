import { registerTermCarry } from './modCarry'

declare module './modCarry' { interface ModCarryFields { exPlotTwist?: string } }
registerTermCarry('exPlotTwist', save => typeof save.exPlotTwist === 'string' ? save.exPlotTwist : undefined)
