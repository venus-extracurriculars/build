import { PLOT_TWIST_MOD } from '@shared/plotTwists'
import { plotTwistBlock } from '../prompts/plotTwist'
import { registerHooks } from './hooks'

registerHooks(PLOT_TWIST_MOD, {
  prompts: { scene: { lines: ({ state }) => plotTwistBlock(state.exPlotTwist) } }
})
