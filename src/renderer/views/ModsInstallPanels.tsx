import { useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { APPROVED_MOD_SOURCE } from '@shared/modSource'
import type { ModReleaseProblem } from '@shared/modUpdates'
import { ConfirmModal } from '../components/ConfirmModal'
import { CheckField } from '../components/CheckField'
import { TextField } from '../components/TextField'
import { gestures, lift, press, quietLift, quietPress } from './motion'
import type { ModInstallerPanel } from './useModInstallerPanel'

export function ModAction({ children, onClick, disabled, primary = false, id }: {
  children: ReactNode; onClick: () => void; disabled?: boolean; primary?: boolean; id?: string
}) {
  return <motion.button type="button" id={id} disabled={disabled}
    className={primary ? 'vu-btn vu-btn--primary vu-btn--panel vu-paper' : 'vu-btn vu-btn--quiet'}
    {...gestures(Boolean(disabled), primary ? lift : quietLift, primary ? press : quietPress)} onClick={onClick}>
    {children}
  </motion.button>
}

export function ModRowError({ panel, id }: { panel: ModInstallerPanel; id: string }) {
  return panel.error?.key === id
    ? <p className="vu-mods-note" data-kind="error" role="alert">{panel.error.message}</p>
    : null
}

export function ModVersionUnavailable({ version, problem }: { version: string; problem: ModReleaseProblem }) {
  return <span className="vu-mods-version-unavailable">
    {version} · {problem.message}
    {problem.missing && <small>
      {problem.missing.length === 1 ? 'Missing hook' : 'Missing hooks'} · {problem.missing.join(', ')}
    </small>}
  </span>
}

export function ModsProgress({ panel, operation, caption, hideCaption = false }: {
  panel: ModInstallerPanel; operation: string; caption?: string; hideCaption?: boolean
}) {
  const active = panel.activePlan
  if (active?.key !== operation) return null
  const { changes, request } = active.plan
  const targets = changes.filter(({ id, release }) => Object.hasOwn(request.mods, id) && !release.manifest.library)
  const label = caption ?? (targets.length === 1 ? `Installing ${targets[0].release.manifest.name}…` : 'Installing mods…')
  const total = changes.reduce((sum, { release }) => sum + release.size, 0)
  const done = changes.reduce((sum, { id, release }) => {
    const event = panel.progress.find((item) => item.id === id && item.version === release.version)
    if (!event) return sum
    // Leave room on the bar for validation, unpacking and recording the transaction.
    const fraction = event.phase === 'downloading' ? 0.9 * Math.min(1, event.bytesDone / event.bytesTotal)
      : event.phase === 'checking' ? 0.9 : event.phase === 'unpacking' ? 0.95 : 1
    return sum + fraction * release.size
  }, 0)
  const percent = total ? Math.round(100 * done / total) : 0
  return <div className="vu-mods-progress">
    {!hideCaption && <p className="vu-mods-about" role="status">{label}</p>}
    <div className="vu-track" role="progressbar" aria-label={label} aria-valuenow={percent}>
      <span className="vu-bar" style={{ width: `${percent}%` }} />
    </div>
  </div>
}

export function ModsSources({ panel, authors, trustSwitch }: { panel: ModInstallerPanel; authors: ReactNode; trustSwitch: ReactNode }) {
  const [address, setAddress] = useState('')
  const approved = panel.sources.find((entry) => entry.ok ? entry.data.approvedList : entry.approvedList)
  const customResults = panel.sources.filter((entry) => entry.ok ? !entry.data.approvedList : !entry.approvedList)
  const approvedUrl = approved?.ok ? approved.data.url : approved?.url ?? APPROVED_MOD_SOURCE
  return <div className="vu-mods-sources">
    <section className="vu-mods-source-group">
      <h3>Approved list</h3>
      <p className="vu-mods-about">{approvedUrl}</p>
      <p className="vu-mods-about">{panel.checkedAt ? `Last checked ${new Date(panel.checkedAt).toLocaleString()}` : 'Waiting for first check'}</p>
      {approved?.ok === false && <p className="vu-mods-note" data-kind="error">{approved.error.message}</p>}
    </section>
    <section className="vu-mods-source-group">
      <h3>Custom sources</h3>
      {(panel.customSources ?? []).map((url, index) => {
        const result = customResults[index]
        return <div className="vu-row vu-mods-source-row" key={url}>
          <div>
            <p className="vu-mods-source-address">{url}</p>
            {result?.ok === false && <p className="vu-mods-note" data-kind="error">{result.error.message}</p>}
          </div>
          <div className="vu-mods-actions">
            <ModAction disabled={Boolean(panel.busy)} onClick={() => panel.removeSource(url)}>Remove</ModAction>
          </div>
        </div>
      })}
      <form className="vu-mods-source-form" onSubmit={(event) => {
        event.preventDefault()
        panel.askSource(address, () => setAddress(''))
      }}>
        <TextField id="mods-source-address" label="Source address" value={address} onChange={setAddress} disabled={Boolean(panel.busy)} />
        <button type="submit" className="vu-btn vu-btn--quiet" disabled={!address.trim() || Boolean(panel.busy)}>Add source</button>
      </form>
      <ModRowError panel={panel} id="sources" />
    </section>
    <section className="vu-mods-source-group vu-mods-source-row">
      <div>
        <h3 id="mods-trust-label">Allow unreviewed main code</h3>
        <p className="vu-mods-about">Changes apply at the next start.</p>
      </div>
      {trustSwitch}
    </section>
    {authors}
  </div>
}

export function ModsInstallQuestion({ panel, theme }: { panel: ModInstallerPanel; theme: 'day' | 'night' }) {
  const question = panel.question
  if (!question) return null
  const shared = { theme, onConfirm: panel.confirm, onCancel: panel.cancel, cancelText: 'Cancel' }
  if (question.kind === 'source') return <ConfirmModal {...shared} id="mods-add-source-warning" title="Add this source?" confirmText="Add"
    message={[question.address, 'Mods from this source are not reviewed by Venus Extracurriculars. Install only from people you trust.']} />
  if (question.kind === 'trust') return <ConfirmModal {...shared} id="mods-trust-warning" title="Allow unreviewed main code?" confirmText="Turn on"
    message={['Unreviewed main code can read your files and your API key, and do anything your account can.', 'Changes apply at the next start.']}
    aside={<CheckField id="mods-trust-accept" label="I understand what unreviewed main code can do" checked={panel.accepted} onChange={panel.setAccepted} />}
    confirmDisabled={!panel.accepted} />
  if (question.kind === 'restart') return <ConfirmModal {...shared} id="mods-restart-warning" title="Restart the game?"
    confirmText="Restart" message="Restarting ends the game you’re in. Save before you restart." />

  const plan = question.plan
  if (plan.kind === 'rollback') return <ConfirmModal {...shared} id="mods-rollback-plan"
    title={`Go back to ${plan.version}?`} confirmText="Go back"
    message={`${panel.nameOf(plan.id)} ${plan.version} will load at the next start.`} />
  if (plan.kind === 'remove') return <ConfirmModal {...shared} id="mods-remove-plan" title={`Remove ${panel.nameOf(plan.id)}?`} confirmText="Remove"
    message="Removal applies at the next start. What the mod saved is kept."
    aside={plan.orphaned.map((id) => <CheckField key={id} id={`mods-orphan-${id}`}
      label={`Also remove ${panel.nameOf(id)}, which nothing else uses`}
      checked={panel.orphaned.includes(id)}
      onChange={(checked) => panel.setOrphaned(checked ? [...panel.orphaned, id] : panel.orphaned.filter((one) => one !== id))} />)} />

  const changes = panel.planParts(plan)
  const confirmText = changes.length && changes.every((item) => item.from) ? 'Update' : 'Install'
  return <ConfirmModal {...shared} id="mods-install-plan" title="Review changes" confirmText={confirmText}
    message={changes.length ? changes.flatMap((part) => {
      const source = part.source?.ok ? part.source.data.source.name : part.address
      return [
        part.from ? `Update ${part.name} from ${part.from} to ${part.version}.` : `Install ${part.name} ${part.version}.`,
        ...(part.main ? [`${part.name} runs code on your computer, outside the game window.`] : []),
        ...(part.custom ? [`${part.name} from ${source} has not been reviewed by Venus Extracurriculars. Install only from people you trust.`] : [])
      ]
    }) : 'These mods are already up to date.'}
    confirmDisabled={!changes.length} />
}
