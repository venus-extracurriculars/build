import { ConfirmModal } from '../components/ConfirmModal'
import { useModBrowserStore } from '../stores/modBrowserStore'
import { useUiStore } from '../stores/uiStore'

export function MissingModsNotice({ theme }: { theme: 'day' | 'night' }) {
  const missing = useModBrowserStore((state) => state.missing)
  if (!missing) return null
  return <ConfirmModal
    id="mods-missing-notice"
    theme={theme}
    title={missing.mods.length === 1 ? 'This game needs a mod' : 'This game needs mods'}
    message={<ul className="vu-mods-notice-list">
      {missing.mods.map((mod) => <li key={mod.id} className="vu-mods-notice-row">
        <span>{mod.name} isn’t installed.</span>
        {mod.install && <button type="button" className="vu-btn vu-btn--quiet" onClick={() => {
          missing.answer(false)
          const ui = useUiStore.getState()
          ui.closeModal('loadGame')
          useModBrowserStore.setState({ initialRequest: mod.install ?? null })
          ui.openModal('mods')
        }}>Install</button>}
      </li>)}
    </ul>}
    confirmText="Continue"
    cancelText="Cancel"
    onConfirm={() => missing.answer(true)}
    onCancel={() => missing.answer(false)}
  />
}
