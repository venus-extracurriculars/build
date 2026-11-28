import { ModAction, ModRowError } from './ModsInstallPanels'
import type { ModInstallerPanel } from './useModInstallerPanel'

export function ModsRestartOffer({ panel }: { panel: ModInstallerPanel }) {
  if (!panel.parts.length) return null
  const verbs = { install: 'Install', update: 'Update', remove: 'Remove', restore: 'Go back to' }
  return <section id="mods-restart-bar" className="vu-mods-restart" aria-label="Restart to apply">
    <div>
      <strong>Restart to apply</strong>
      <p>{panel.parts.map((part) => `${verbs[part.action]} ${part.name}${part.version ? ` ${part.version}` : ''}`).join(', ')}.</p>
      <ModRowError panel={panel} id="pending" />
    </div>
    <div className="vu-mods-actions">
      <ModAction id="mods-undo-all" disabled={Boolean(panel.busy)} onClick={panel.undoAll}>Undo</ModAction>
      <ModAction id="mods-restart" disabled={Boolean(panel.busy)} onClick={panel.restart} primary>Restart</ModAction>
    </div>
  </section>
}
