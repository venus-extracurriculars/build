/**
 * Continuing Semesters' hooks: the ways on from a finished semester into the break before the
 * next one, from the ending's modal and from a save picked in Load Game.
 */
import { CONTINUING_SEMESTERS } from '@shared/continuingSemestersMod'
import { optionOn } from '@shared/mods'
import { hasNextTerm, seasonOf, seasonWords, termIndexOf, termLabel } from '@shared/term'
import { useGameStore } from '../stores/gameStore'
import { useModsStore } from '../stores/modsStore'
import { resolveContinuation, stageContinuation } from '../stores/newGame'
import { registerHooks, type WayOn } from '../mods/hooks'

/** Reads the finished semester first; the break opens on it once the game is left. */
function intoTheBreak(playthroughId: string, saveId?: string): WayOn['prepare'] {
  return async () => {
    const next = await resolveContinuation(playthroughId, saveId)
    if (!next) return null
    return () => {
      stageContinuation(next)
      return 'break'
    }
  }
}

registerHooks(CONTINUING_SEMESTERS, {
  endingChoice: ({ reason, playthroughId }) => {
    if (reason !== 'gameComplete' || !playthroughId) return undefined
    if (!hasNextTerm(useGameStore.getState().termIndex)) return undefined
    return {
      label: `Continue to ${seasonWords().endBreak}`,
      prepare: intoTheBreak(playthroughId)
    }
  },

  saveChoice: ({ playthroughId, save }) => {
    const switches = useModsStore.getState().switches
    if (!optionOn(switches, CONTINUING_SEMESTERS, 'offer-in-load-game')) return undefined
    const term = termIndexOf(save.record)
    if (!save.summary?.graduationSeen || !hasNextTerm(term)) return undefined
    const endBreak = seasonWords(seasonOf(term)).endBreak
    return {
      title: 'The semester is over',
      message: `You can load this save to say your goodbyes, or carry it on through ${endBreak} into the ${termLabel(term + 1)}.`,
      label: `Start ${endBreak}`,
      prepare: intoTheBreak(playthroughId, save.saveId)
    }
  }
})
