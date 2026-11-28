import { describe, expect, it } from 'vitest'
import { MOD_CHECK_INTERVAL, modCheckDue, modUpdates, pendingChangeParts } from '@shared/modUpdates'
import type { InstalledModInfo, ModSourceResult } from '@shared/modInstall'
import { sourceList, sourceRelease } from './sourceFixtures'

const installed = (id: string, status: InstalledModInfo['status'] = 'loaded'): InstalledModInfo => ({
  id, name: id, version: '1.0.0', origin: 'installed', status, approved: true, otherVersions: [], requires: []
})
const sources: ModSourceResult[] = [{
  ok: true, data: { url: 'https://example.com/mods', approvedList: true, kind: 'list',
    source: sourceList(
      sourceRelease('one', '1.2.0'),
      sourceRelease('one', '1.1.0'),
      sourceRelease('one', '1.3.0', { hooks: ['absent-hook'] }),
      sourceRelease('two', '1.1.0')
    )
  }
}]
describe('mod update choices', () => {
  it('finds the highest compatible release, retains the newer refusal, and puts needs-update first', () => {
    const updates = modUpdates([installed('one'), installed('two', 'needs-update')], sources, null, false)
    expect(updates.map((item) => [item.mod.id, item.offer?.release.version])).toEqual([['two', '1.1.0'], ['one', '1.2.0']])
    expect(updates[1].unavailable?.release.version).toBe('1.3.0')
    expect(updates[1].unavailable?.problem?.missing).toEqual(['absent-hook'])
  })

  it('waits one day unless the saved check is missing or ahead of the clock', () => {
    expect(modCheckDue(null, 10)).toBe(true)
    expect(modCheckDue(10, 9)).toBe(true)
    expect(modCheckDue(10, 10 + MOD_CHECK_INTERVAL - 1)).toBe(false)
    expect(modCheckDue(10, 10 + MOD_CHECK_INTERVAL)).toBe(true)
  })

  it('keeps install, update, rollback and removal distinct from housekeeping', () => {
    const parts = pendingChangeParts({
      pending: 1, current: { one: '1.2.0', two: '0.9.0', three: '1.0.0' }, remove: ['four'],
      cleanup: { five: { keep: '2.0.0', versions: ['1.0.0'] } }
    }, [installed('one'), installed('two'), installed('four')], sources)
    expect(parts.map(({ id, action }) => [id, action])).toEqual([
      ['one', 'update'], ['two', 'restore'], ['three', 'install'], ['four', 'remove']
    ])
  })
})
