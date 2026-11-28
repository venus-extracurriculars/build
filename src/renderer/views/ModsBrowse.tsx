import { useEffect, useRef, useState, type CSSProperties, type JSX } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { SourceMod, SourceRelease } from '@vx/modkit/host/shared'
import type { FetchedModSource } from '@shared/modInstall'
import { compareModVersions, isReviewedSource, releaseProblem } from '@shared/modUpdates'
import { SelectField } from '../components/SelectField'
import { Lightbox } from '../components/Lightbox'
import { useDismissLayer } from '../components/useModalShell'
import { ModAction, ModRowError, ModsProgress, ModVersionUnavailable } from './ModsInstallPanels'
import { gestures, lift, press, cardLift } from './motion'
import type { ModInstallerPanel } from './useModInstallerPanel'

export interface BrowseSelection { source: string; id: string }

function compatibleReleases(source: FetchedModSource, mod: SourceMod, allowMain: boolean) {
  return [...mod.releases]
    .sort((a, b) => compareModVersions(b.version, a.version))
    .map((release) => ({ release, problem: releaseProblem(source, mod, release, allowMain) }))
}

/** The approved fork's cards and mod page, backed by the main process's source results. */
export function ModsBrowse({
  active, selectedId, setSelectedId, panel
}: {
  active: boolean
  selectedId: BrowseSelection | null
  setSelectedId: (selection: BrowseSelection | null) => void
  panel: ModInstallerPanel
}): JSX.Element {
  const [version, setVersion] = useState<string | null>(null)
  const [viewing, setViewing] = useState<string | null>(null)
  useDismissLayer(() => setViewing(null), viewing !== null && active)

  const group = panel.sources.find((item) => item.ok && item.data.url === selectedId?.source)
  const source = group?.ok ? group.data : undefined
  const selected = source?.source.mods.find((mod) => mod.id === selectedId?.id)
  const choices = selected && source ? compatibleReleases(source, selected, panel.allowMain) : []
  const picked = choices.find((item) => item.release.version === version)
    ?? choices.find((item) => !item.problem) ?? choices[0]
  const install = panel.installed.find((item) => item.id === selected?.id)
  const current = install?.origin === 'installed' ? install.version : undefined
  const pending = selected && panel.parts.some((part) => part.id === selected.id)
  const pageKey = source && selected ? source.url + ' ' + selected.id : ''
  const newerRefusal = picked && choices.find((item) =>
    item.problem && compareModVersions(item.release.version, picked.release.version) > 0)
  const isCurrent = Boolean(current && picked?.release.version === current)
  const refusal = install?.origin === 'built-in' ? 'Part of this build.'
    : install?.origin === 'developer' ? 'This mod is loaded from a developer folder.'
      : undefined
  const waiting = !active || panel.checking

  function pick(source: FetchedModSource, mod: SourceMod): void {
    setVersion(null)
    setSelectedId({ source: source.url, id: mod.id })
  }

  return (
    <>
      <div className="vu-mods-browse" hidden={!active}>
        {panel.checking && (
          <p className="vu-mods-blurb" role="status">Checking mod sources…</p>
        )}
        {!selected && (
          <div className="vu-mods-store-sources" aria-label="Mod sources">
            {panel.sources.map((result, index) => {
              if (!result.ok) return <section key={index} className="vu-mods-source-group">
                <h3>{result.approvedList ? 'Approved list' : result.url ?? 'Custom source'}</h3>
                <p className="vu-mods-note" data-kind="error" role="status">{result.error.message}</p>
                <ModAction disabled={panel.checking} onClick={panel.refresh}>Try again</ModAction>
              </section>
              const source = result.data
              const mods = source.source.mods.filter((mod) => mod.releases.some((release) => !release.manifest.library))
              return <section key={source.url} className="vu-mods-store-source">
                <header className="vu-mods-source-group">
                  <h3>{source.source.name}</h3>
                  {!isReviewedSource(source) && <p className="vu-mods-about">not reviewed</p>}
                </header>
                {!mods.length && <p className="vu-empty vu-empty--flush">No mods to browse.</p>}
                <div className="vu-mods-store-grid">
                  {mods.map((mod, index) => {
                    const choices = compatibleReleases(source, mod, panel.allowMain)
                    const latest = choices.find((item) => !item.problem) ?? choices[0]
                    const installed = panel.installed.find((row) => row.id === mod.id)
                    const sticker = installed?.origin === 'built-in' ? 'Part of this build'
                      : installed?.origin === 'developer' ? 'Developer folder'
                        : latest.problem ? 'Unavailable'
                          : installed?.version === latest.release.version ? 'Installed'
                            : installed ? 'Update' : null
                    const manifest = latest.release.manifest
                    return <motion.button
                      key={mod.id}
                      id={`mods-browse-${mod.id}`}
                      className="vu-mods-store-tile"
                      type="button"
                      {...gestures(false, cardLift, press)}
                      onClick={() => pick(source, mod)}
                    >
                      <div className="vu-mods-store-cover-wrap">
                        <Cover mod={mod} source={source} place={index} name={manifest.name} waiting={waiting} />
                        {sticker && <span className={`vu-sticker${sticker === 'Update' ? ' vu-sticker--accent' : ''}`}>{sticker}</span>}
                      </div>
                      <div className="vu-mods-store-caption">
                        <span className="vu-mods-name">{manifest.name}</span>
                        <span className="vu-mods-meta">by {manifest.author} · {latest.release.version}</span>
                        <p className="vu-mods-blurb vu-mods-store-excerpt">{manifest.blurb}</p>
                        {Object.keys(manifest.requires ?? {}).length > 0 && <span className="vu-mods-about">
                          Needs {Object.keys(manifest.requires ?? {}).map(panel.nameOf).join(', ')}.
                        </span>}
                      </div>
                    </motion.button>
                  })}
                </div>
              </section>
            })}
          </div>
        )}
        {selected && source && picked && (
          <div className="vu-mods-store-page" key={pageKey}>
            <motion.button type="button" className="vu-btn vu-btn--quiet"
              {...gestures(false, lift, press)} onClick={() => { setViewing(null); setSelectedId(null) }}>
              All mods
            </motion.button>
            <div className="vu-mods-store-scroll">
              <Cover mod={selected} source={source} place={source.source.mods.indexOf(selected)} name={picked.release.manifest.name} waiting={waiting} banner />
              <header className="vu-mods-store-header">
                <div>
                  <h3 className="vu-mods-detail-name">{picked.release.manifest.name}</h3>
                  <p className="vu-mods-about">by {picked.release.manifest.author} · {picked.release.version}</p>
                  {!isReviewedSource(source) && <p className="vu-mods-about">{source.source.name} · not reviewed</p>}
                  {newerRefusal?.problem && <ModVersionUnavailable version={newerRefusal.release.version} problem={newerRefusal.problem} />}
                </div>
                <div className="vu-mods-store-action">
                  {pending ? <ModAction disabled={Boolean(panel.busy)} onClick={() => panel.undo(selected.id)}>Undo</ModAction>
                    : refusal ? <p className="vu-mods-about">{refusal}</p>
                      : picked.problem && !isCurrent ? <ModVersionUnavailable version={picked.release.version} problem={picked.problem} />
                      : <ModAction id={isCurrent ? 'mods-browse-uninstall' : 'mods-install'} primary={!isCurrent}
                        disabled={Boolean(panel.busy)}
                        onClick={() => isCurrent
                          ? panel.plan({ kind: 'remove', id: selected.id }, pageKey)
                          : panel.plan({ kind: 'install', mods: { [selected.id]: {
                            version: picked.release.version, source: source.url
                          } } }, pageKey)}>
                        {isCurrent ? 'Uninstall' : current ? `Update to ${picked.release.version}`
                          : newerRefusal ? `Install ${picked.release.version}` : 'Install'}
                      </ModAction>}
                  <ModsProgress panel={panel} operation={pageKey} caption="Installing…" />
                  <ModRowError panel={panel} id={pageKey} />
                  <ModRowError panel={panel} id={selected.id} />
                </div>
              </header>
              {!!selected.screenshots?.length && <section>
                <h4 className="vu-mods-label">Screenshots</h4>
                <div className="vu-mods-store-shots">
                  {selected.screenshots.map((shot, index) => <Screenshot key={shot.url + index} source={source.url}
                    url={shot.url} caption={shot.caption} label={`Screenshot ${index + 1}`}
                    enabled={!waiting} onView={setViewing} />)}
                </div>
              </section>}
              <section>
                <h4 className="vu-mods-label">About</h4>
                <p className="vu-mods-blurb">{picked.release.manifest.blurb}</p>
              </section>
              <section>
                <h4 className="vu-mods-label">What it needs</h4>
                <p className="vu-mods-about">
                  Kit {picked.release.manifest.kit}
                  {picked.release.manifest.game ? ` · game ${picked.release.manifest.game} (advisory)` : ''}
                </p>
                {Object.entries(picked.release.manifest.requires ?? {}).map(([id, range]) =>
                  <p key={id} className="vu-mods-about">{panel.nameOf(id)} {range}</p>)}
                {picked.release.manifest.main && <p className="vu-mods-blurb">Runs code on your computer, outside the game window.</p>}
                {source.kind === 'repo' && <p className="vu-mods-note">This source has no pinned hash.</p>}
                <a className="vu-link" href={selected.repo} target="_blank" rel="noreferrer">Source</a>
              </section>
              {choices.length > 1 && <details className="vu-disc">
                <summary className="vu-disc-summary">Older versions</summary>
                <div className="vu-disc-body">
                  <SelectField id="mods-release" label="Release" value={picked.release.version}
                    disabled={Boolean(panel.busy)} onChange={setVersion}
                    options={choices.map(({ release, problem }) => ({
                      value: release.version,
                      label: problem ? `${release.version} · ${problem.message}` : release.version,
                      disabled: Boolean(problem && release.version !== current)
                    }))} />
                </div>
              </details>}
              <Changelog reviewed={isReviewedSource(source)} releases={choices.map((item) => item.release)} installed={current} />
            </div>
          </div>
        )}
      </div>
      <AnimatePresence>
        {viewing && active && <Lightbox key="shot" src={viewing} onClose={() => setViewing(null)} />}
      </AnimatePresence>
    </>
  )
}

function Changelog({ reviewed, releases, installed }: {
  reviewed: boolean; releases: readonly SourceRelease[]; installed?: string
}) {
  const documented = releases.filter((release) => release.changes?.length)
  if (!documented.length) return null
  return <section className="vu-mods-store-changelog">
    <h4 className="vu-mods-label">Changelog</h4>
    {documented.map((release) => {
      const date = reviewed ? release.approved?.at : undefined
      return <div key={release.version}>
        <h5 className="vu-mods-about">
          {release.version}{date ? <> · <time dateTime={date}>{new Date(date).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'
          })}</time></> : null}
          {installed === release.version ? ' · installed' : ''}
        </h5>
        <ul className="vu-mods-changes">
          {release.changes?.map((line, index) => <li key={index}>{line}</li>)}
        </ul>
      </div>
    })}
  </section>
}

function useArtwork(source: string, url: string | undefined, enabled: boolean) {
  const [result, setResult] = useState<{ source: string; url: string; data: string | null }>()
  useEffect(() => {
    if (!enabled || !url) return
    let live = true
    void window.api.mods.image(source, url).then((image) => {
      if (live) setResult({ source, url, data: image.ok ? image.data : null })
    }, () => { if (live) setResult({ source, url, data: null }) })
    return () => { live = false }
  }, [source, url, enabled])
  return result?.source === source && result.url === url ? result.data : undefined
}

function Screenshot({ source, url, caption, label, enabled, onView }: {
  source: string; url: string; caption?: string; label: string; enabled: boolean; onView: (url: string) => void
}) {
  const image = useArtwork(source, url, enabled)
  if (image === null) return null
  return <figure className="vu-mods-store-shot">
    {image ? <motion.button type="button" aria-label={caption ?? label} {...gestures(false, cardLift, press)}
      onClick={() => onView(image)}><img src={image} alt="" /></motion.button>
      : <span className="vu-mods-art-wait">Loading image</span>}
    {caption && <figcaption className="vu-mods-about">{caption}</figcaption>}
  </figure>
}

function Cover({ mod, source, name, place, waiting, banner = false }: {
  mod: SourceMod; source: FetchedModSource; name: string; place: number; waiting: boolean; banner?: boolean
}): JSX.Element {
  const node = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(banner)
  useEffect(() => {
    if (!node.current || visible) return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true)
        observer.disconnect()
      }
    })
    observer.observe(node.current)
    return () => observer.disconnect()
  }, [visible])
  const image = useArtwork(source.url, mod.cover, visible && !waiting)
  const seed = [...mod.id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 0)
  const tone = COVER_TONES[Math.max(place, 0) % COVER_TONES.length]
  return <div ref={node} className={`vu-mods-store-cover${banner ? ' vu-mods-store-cover--banner' : ''}`}
    style={{ '--cover-tone': `var(${tone})`, '--cover-angle': `${seed % 360}deg` } as CSSProperties}>
    {image ? <img src={image} alt="" /> : <span aria-hidden="true">{initialsOf(name)}</span>}
  </div>
}

const COVER_TONES = [
  '--vu-cat-plans-tone', '--vu-cat-occasion-tone', '--vu-cat-class-tone', '--vu-cat-work-tone'
] as const

function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 3).map((word) => [...word][0].toUpperCase()).join('')
}
