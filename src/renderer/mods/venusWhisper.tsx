import { VENUS_WHISPER_MOD, whisperHasUnread, whisperTerm } from '../../shared/venusWhisper'
import { withWhisperRecall } from '../prompts/whisperRecall'
import { useGameStore } from '../stores/gameStore'
import { startWhisperDelivery } from '../stores/whisperDelivery'
import { VenusWhisperPage } from '../views/VenusWhisperModal'
import { WhisperIcon } from '../components/BunnyboardFeatureIcons'
import { useModsStore } from '../stores/modsStore'
import { modIsOn } from '@vx/modkit/renderer'
import { registerHooks } from '@vx/modkit/renderer'
import { recordWhisperObservations } from '../stores/whisperObservations'
import { whisperIdentityLines } from '../../shared/whisperIdentity'
import { recordWhisperConfession, whisperConfessionRequest, whisperIdentityContext } from '../stores/whisperIdentity'

function Mark() {
  const unread = useGameStore(s => whisperHasUnread(s.exVenusWhisper, whisperTerm(s), s.date))
  return <><WhisperIcon />{unread && <span className="vu-bb-unread-dot" aria-label="Unread issues" />}</>
}
let stopDelivery: (() => void) | undefined
registerHooks(VENUS_WHISPER_MOD, {
  bunnyboardPage: { id: 'whisper', word: 'HARE & QUILL', Mark, Page: VenusWhisperPage },
  gameEntered: () => { stopDelivery?.(); stopDelivery = startWhisperDelivery() },
  slotSettled: ctx => { recordWhisperConfession(ctx); recordWhisperObservations(ctx) },
  requests: {
    ledger: whisperConfessionRequest,
    scene: (request, { cast, state, query }) => {
      const game = useGameStore.getState()
      if (!game.playthroughId || game.createdScene || game.replaying || game.playthroughId !== state.playthroughId) return request
      return withWhisperRecall(request, game.exVenusWhisper, whisperTerm(game), state.date, cast.map(c => c.charId), query)
    },
    dm: (request, { character, state, newMessage }) => {
      const game = useGameStore.getState()
      if (!game.playthroughId || game.createdScene || game.replaying) return request
      return withWhisperRecall(request, game.exVenusWhisper, whisperTerm(game), state.date, [character.charId], newMessage)
    }
  },
  prompts: {
    scene: { lines: ({ cast, state }) => {
      const game = useGameStore.getState()
      if (!game.playthroughId || game.createdScene || game.replaying || game.playthroughId !== state.playthroughId) return []
      const identity = whisperIdentityContext(state, cast)
      return identity ? whisperIdentityLines(identity) : []
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
