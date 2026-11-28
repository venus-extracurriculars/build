import { useState } from 'react'
import type { MigrationReason, MigrationRow } from '@shared/modInstall'
import { toAppError } from '@shared/errors'
import { CheckField } from '../components/CheckField'
import { ConfirmModal } from '../components/ConfirmModal'
import { closeModMigration, leaveModOut, useModMigrationStore } from '../stores/modMigrationStore'
import { ModAction, ModRowError, ModsProgress } from './ModsInstallPanels'
import { ModsRestartOffer } from './ModsRestartOffer'
import { useModInstallerPanel } from './useModInstallerPanel'

const REASONS: Record<MigrationReason, string> = {
  'switched-on': 'You had it on',
  playthrough: 'A saved game uses it',
  'save-data': 'A saved game has its data'
}

/** What a row says under its name: why it is listed, then the release it would be installed at. */
function noteOf(row: MigrationRow): string {
  const release = row.offer && [
    row.offer.version,
    ...row.offer.with.map((one) => one.from ? `updates ${one.name} to ${one.version}` : `with ${one.name} ${one.version}`)
  ].join(', ')
  return [...row.reasons.map((reason) => REASONS[reason]), release].filter(Boolean).join(' · ')
}

/**
 * "Bring your mods across": the mods this build no longer has, each with why it is listed, ticked
 * where the player had it on or a saved game is fixed to it. One install plan for what is ticked,
 * then the restart bar. Nothing is installed without the button.
 */
export function ModsMigrationModal({ theme }: { theme: 'day' | 'night' }) {
  const offer = useModMigrationStore((state) => state.offer)
  const panel = useModInstallerPanel(false, 'notice')
  // Only the player's own changes: a row they have not touched is as the offer ticks it.
  const [ticks, setTicks] = useState<Record<string, boolean>>({})
  const [leaving, setLeaving] = useState<string | null>(null)
  const [leaveError, setLeaveError] = useState<{ id: string; message: string } | null>(null)
  if (!offer) return null

  const installing = panel.activePlan !== null
  const busy = Boolean(panel.busy) || leaving !== null
  const staged = (id: string): boolean => Object.hasOwn(panel.pending?.current ?? {}, id)
  const ticked = (row: MigrationRow): boolean => row.offer !== undefined && (ticks[row.id] ?? row.ticked)
  const chosen = offer.rows.filter((row) => ticked(row) && !staged(row.id))
  const restartNeeded = !installing && offer.rows.some((row) => staged(row.id))
  const onlyLater = restartNeeded && chosen.length === 0

  function bring(): void {
    panel.installNow({
      kind: 'install',
      mods: Object.fromEntries(chosen.map((row) => [row.id, { version: row.offer!.version, source: row.offer!.source }]))
    }, 'migration')
  }

  async function leave(id: string): Promise<void> {
    setLeaving(id)
    setLeaveError(null)
    try {
      await leaveModOut(id)
    } catch (err) {
      setLeaveError({ id, message: toAppError(err).message })
    } finally {
      setLeaving(null)
    }
  }

  const rowOf = (row: MigrationRow) => {
    const ready = staged(row.id)
    return <li key={row.id} className="vu-mods-missing-row vu-mods-migrate-row">
      <div className="vu-mods-missing-row-heading">
        {row.offer && !ready
          ? <CheckField id={`mods-migrate-${row.id}`} label={row.name} note={noteOf(row)} checked={ticked(row)}
            disabled={busy} onChange={(on) => setTicks((current) => ({ ...current, [row.id]: on }))} />
          : <span className="vu-check-text vu-mods-migrate-text">
            <span className="vu-check-label">{row.name}</span>
            <span className="vu-check-note">
              {ready ? `${row.name} ${panel.pending?.current[row.id]} is ready to install.` : noteOf(row)}
            </span>
          </span>}
        {!ready && <ModAction id={`mods-migrate-leave-${row.id}`} disabled={busy} onClick={() => void leave(row.id)}>Leave it out</ModAction>}
      </div>
      {!ready && !row.offer && <span className="vu-mods-row-line" data-kind="needs">Not available yet. Your data is kept.</span>}
      {!ready && row.offer?.main && <span className="vu-mods-row-line">Runs code on your computer, outside the game window.</span>}
      {leaveError?.id === row.id && <p className="vu-mods-note" data-kind="error" role="alert">{leaveError.message}</p>}
    </li>
  }

  const missing = offer.rows.filter((row) => !row.bundled)
  const bundled = offer.rows.filter((row) => row.bundled)
  return <ConfirmModal
    id="mods-migrate"
    theme={theme}
    title="Bring your mods across"
    message={<>
      {missing.length > 0 && <>
        <p>These mods are no longer part of this build. Tick the ones you want to install.</p>
        <ul className="vu-mods-missing-rows">{missing.map(rowOf)}</ul>
      </>}
      {bundled.length > 0 && <>
        <h4 className="vu-mods-label">Also part of Venus Extracurriculars</h4>
        <ul className="vu-mods-missing-rows">{bundled.map(rowOf)}</ul>
      </>}
      <ModsProgress panel={panel} operation="migration" />
      <ModRowError panel={panel} id="migration" />
      <ModRowError panel={panel} id="screen" />
      {restartNeeded && <ModsRestartOffer panel={panel} />}
    </>}
    confirmText={onlyLater ? 'Later' : 'Bring them across'}
    cancelText="Not now"
    busy={busy}
    confirmDisabled={!onlyLater && chosen.length === 0}
    onConfirm={onlyLater ? closeModMigration : bring}
    onCancel={onlyLater ? undefined : closeModMigration}
    onDismiss={closeModMigration}
  />
}
