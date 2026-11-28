import { ConfirmModal } from '../components/ConfirmModal'
import { useModBrowserStore } from '../stores/modBrowserStore'
import { ModAction, ModRowError, ModsInstallQuestion, ModsProgress } from './ModsInstallPanels'
import { useModInstallerPanel } from './useModInstallerPanel'

export function MissingModsNotice({ theme }: { theme: 'day' | 'night' }) {
  const missing = useModBrowserStore((state) => state.missing)
  const panel = useModInstallerPanel(false, 'notice')
  if (!missing) return null
  const restartNeeded = missing.mods.some((mod) => Object.hasOwn(panel.pending?.current ?? {}, mod.id))
  return <>
    <ConfirmModal
      id="mods-missing-notice"
      theme={theme}
      title={restartNeeded ? 'Restart needed' : missing.mods.length === 1 ? 'This game needs a mod' : 'This game needs mods'}
      message={<>
        <ul className="vu-mods-missing-rows">
          {missing.mods.map((mod) => {
            const version = panel.pending?.current[mod.id]
            return <li key={mod.id} className="vu-mods-missing-row">
              <div className="vu-mods-missing-row-heading">
                <span>{version ? `${mod.name} ${version} is ready to install.` : `${mod.name} isn’t installed.`}</span>
                {mod.install && !version && <ModAction disabled={Boolean(panel.busy || panel.question)}
                  onClick={() => { if (mod.install) panel.plan(mod.install, mod.id) }}>Install</ModAction>}
              </div>
              <ModsProgress panel={panel} operation={mod.id} />
              <ModRowError panel={panel} id={mod.id} />
            </li>
          })}
        </ul>
        {restartNeeded && <p>Restart to apply the mod changes before you open this game.</p>}
        <ModRowError panel={panel} id="pending" />
        <ModRowError panel={panel} id="screen" />
      </>}
      confirmText={restartNeeded ? 'Restart' : 'Continue'}
      cancelText={restartNeeded ? 'Later' : 'Cancel'}
      busy={Boolean(panel.busy)}
      lockOut={Boolean(panel.question)}
      confirmDisabled={Boolean(panel.question)}
      onConfirm={restartNeeded ? panel.restart : () => missing.answer(true)}
      onCancel={() => { if (!panel.question) missing.answer(false) }}
    />
    <ModsInstallQuestion panel={panel} theme={theme} />
  </>
}
