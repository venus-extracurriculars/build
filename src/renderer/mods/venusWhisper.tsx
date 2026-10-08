import { VENUS_WHISPER_MOD, whisperRecall, whisperHasUnread, whisperTerm } from '@shared/venusWhisper'
import { useGameStore } from '../stores/gameStore'
import { startWhisperDelivery } from '../stores/whisperDelivery'
import { VenusWhisperPage } from '../views/VenusWhisperModal'
import { WhisperIcon } from '../components/BunnyboardFeatureIcons'
import { modIsOn, useModsStore } from '../stores/modsStore'
import { registerHooks } from './hooks'
import { recordWhisperObservations } from '../stores/whisperObservations'

function Mark() {
  const unread = useGameStore(s => whisperHasUnread(s.exVenusWhisper, whisperTerm(s), s.date))
  return <><WhisperIcon />{unread && <span className="vu-bb-unread-dot" aria-label="Unread issues" />}</>
}
let stopDelivery: (() => void) | undefined
registerHooks(VENUS_WHISPER_MOD, {
  bunnyboardPage: { id: 'whisper', word: 'WHISPER', Mark, Page: VenusWhisperPage },
  gameEntered: () => { stopDelivery?.(); stopDelivery = startWhisperDelivery() },
  slotSettled: recordWhisperObservations,
  prompts: {
    scene: { lines: ({ cast, state }) => {
      const game = useGameStore.getState()
      if (!game.playthroughId || game.createdScene || game.replaying || game.playthroughId !== state.playthroughId) return []
      return whisperRecall(game.exVenusWhisper, whisperTerm(game), state.date, cast.map(c => c.charId))
    } },
    dm: { lines: ({ character, state }) => {
      const game = useGameStore.getState()
      if (!game.playthroughId || game.createdScene || game.replaying) return []
      return whisperRecall(game.exVenusWhisper, whisperTerm(game), state.date, [character.charId])
    } }
  }
})

// Leaving or replacing the playthrough cancels pending delivery and its timer.
useGameStore.subscribe((state, previous) => {
  if (state.playthroughId !== previous.playthroughId || state.loads !== previous.loads) {
    stopDelivery?.(); stopDelivery = undefined
  }
})

useModsStore.subscribe(() => {
  const game = useGameStore.getState()
  if (!modIsOn(VENUS_WHISPER_MOD)) { stopDelivery?.(); stopDelivery = undefined }
  else if (!stopDelivery && game.playthroughId && !game.createdScene && !game.replaying) stopDelivery = startWhisperDelivery()
})
