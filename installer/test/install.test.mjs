// The patch against a tiny stand-in for the game: a failed marker leaves the game as it was, and a
// normal install comes back out byte for byte. Run with `npm test` (no game needed).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import asar from '@electron/asar'

const HERE = dirname(fileURLToPath(import.meta.url))
const INSTALLER = join(HERE, '..')
const GAME_VERSION = '9.9.9'
const sha = async (path) => createHash('sha256').update(await readFile(path)).digest('hex')

async function put(path, text) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, text)
}

/** An official `out`, this build's `out` (one code file changed), and a game folder made of the first. */
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 've-installer-test-'))
  for (const [side, code] of [['base', 'official'], ['build', 'modded']]) {
    await put(join(root, side, 'out/main/index.js'), `console.log('${code}')\n`)
    await put(join(root, side, 'out/renderer/picture.png'), 'not really a picture')
  }
  const app = join(root, 'app')
  await put(join(app, 'package.json'), '{"name":"venus-university","main":"out/main/index.js"}')
  await put(join(app, 'out/main/index.js'), "console.log('official')\n")
  await put(join(app, 'out/renderer/picture.png'), 'not really a picture')
  const game = join(root, 'game')
  await mkdir(join(game, 'resources'), { recursive: true })
  await asar.createPackage(app, join(game, 'resources/app.asar'))
  await writeFile(join(game, 'resources/build-manifest.json'), JSON.stringify({ version: GAME_VERSION }))
  await writeFile(join(game, 'Venus University.exe'), 'stand-in')

  const out = join(root, 'dist')
  execFileSync(process.execPath, [
    join(INSTALLER, 'build.mjs'), '--base', join(root, 'base/out'), '--build', join(root, 'build/out'),
    '--game-version', GAME_VERSION, '--out', out
  ], { stdio: 'pipe' })
  const patch = join(out, (await readdir(out)).find((name) => name.startsWith('venus-extracurriculars-')), 'patch.mjs')
  return { root, game, patch }
}

function run(patch, command, game, fail) {
  const args = [...(fail ? ['--import', join(HERE, 'fail-marker.mjs')] : []), patch, command, game]
  return spawnSync(process.execPath, args, { env: { ...process.env, FAIL: fail ?? '' }, encoding: 'utf8' })
}

for (const fail of ['write', 'rename']) {
  test(`a marker that fails to ${fail} leaves the game as it was`, async () => {
    const { root, game, patch } = await fixture()
    const res = join(game, 'resources')
    const before = await sha(join(res, 'app.asar'))
    const result = run(patch, 'install', game, fail)
    assert.notEqual(result.status, 0, result.stdout)
    assert.match(result.stdout + result.stderr, /put back as it was/)
    assert.equal(await sha(join(res, 'app.asar')), before)
    assert.deepEqual((await readdir(res)).sort(), ['app.asar', 'build-manifest.json'])
    // And nothing stops a later install.
    assert.equal(run(patch, 'install', game).status, 0)
    await rm(root, { recursive: true, force: true })
  })
}

test('install puts the build in, and uninstall restores the game byte for byte', async () => {
  const { root, game, patch } = await fixture()
  const res = join(game, 'resources')
  const before = await sha(join(res, 'app.asar'))
  assert.equal(run(patch, 'install', game).status, 0)
  const installed = join(root, 'installed')
  asar.extractAll(join(res, 'app.asar'), installed)
  assert.equal(await readFile(join(installed, 'out/main/index.js'), 'utf8'), "console.log('modded')\n")
  assert.ok(existsSync(join(res, 'venus-extracurriculars.json')))
  const again = run(patch, 'install', game)
  assert.notEqual(again.status, 0)
  assert.match(again.stdout + again.stderr, /already installed/)
  assert.equal(run(patch, 'uninstall', game).status, 0)
  assert.equal(await sha(join(res, 'app.asar')), before)
  assert.deepEqual((await readdir(res)).sort(), ['app.asar', 'build-manifest.json'])
  await rm(root, { recursive: true, force: true })
})
