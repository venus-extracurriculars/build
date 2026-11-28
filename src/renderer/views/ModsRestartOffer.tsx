import { ModAction, ModRowError } from './ModsInstallPanels'
import type { ModInstallerPanel } from './useModInstallerPanel'

export function ModsRestartOffer({ panel }: { panel: ModInstallerPanel }) {
  if (!panel.parts.length) return null
  const verbs = { install: 'install', update: 'update', remove: 'remove', restore: 'go back to' } as const
  const groups = new Map<keyof typeof verbs, string[]>()
  for (const part of panel.parts) {
    if (part.library) continue
    const names = groups.get(part.action) ?? []
    names.push(part.version ? `${part.name} ${part.version}` : part.name)
    groups.set(part.action, names)
  }
  const summary = Array.from(groups, ([action, names], index) => {
    const verb = verbs[action]
    return `${index === 0 ? verb[0].toUpperCase() + verb.slice(1) : verb} ${names.join(' and ')}`
  }).join(', ')
  return <section id="mods-restart-bar" className="vu-mods-restart" aria-label="Restart to apply">
    <div>
      <strong>Restart to apply</strong>
      <p>{summary || 'Apply mod changes'}</p>
      <ModRowError panel={panel} id="pending" />
    </div>
    <div className="vu-mods-actions">
      <ModAction id="mods-undo-all" disabled={Boolean(panel.busy)} onClick={panel.undoAll}>Undo</ModAction>
      <ModAction id="mods-restart" disabled={Boolean(panel.busy)} onClick={panel.restart} primary>Restart</ModAction>
    </div>
  </section>
}
