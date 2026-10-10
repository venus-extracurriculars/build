import * as asar from '@electron/asar'
import { createHash } from 'node:crypto'
import { createReadStream, existsSync } from 'node:fs'
import { cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'

/**
 * Adapted from the patcher of naudh1r's Venus University Photo Feature mod (AGPL-3.0-only),
 * https://github.com/naudh1r/venus-university.
 *
 * Installs a build of Venus Extracurriculars into an official Venus University folder, and takes
 * it out again.
 *
 * The game's code lives in `resources/app.asar`. Installing swaps the code files the build
 * changes for its own and adds the files its mods bring (City Life's backgrounds, say). Nothing
 * of the game's own is touched beyond its code: the art, fonts, music, characters and the
 * player's `data` folder stay exactly as they are, and none of them are in this download.
 * Uninstalling puts the original `app.asar` back from the copy made at install time.
 */

// Run by the game's own exe (ELECTRON_RUN_AS_NODE), Electron's `fs` would read `app.asar` as a
// folder; this makes it the plain file it is, so the backup is a byte copy.
process.noAsar = true

const HERE = dirname(fileURLToPath(import.meta.url))
const PAYLOAD = join(HERE, 'payload')
const EXE = 'Venus University.exe'
/** Files the packed app keeps outside `app.asar`, as electron-builder was told to. */
const UNPACK = '**/node_modules/7zip-bin/**'

const expected = JSON.parse(await readFile(join(PAYLOAD, 'expected.json'), 'utf8'))
const NAME = expected.build

/**
 * Mods that used to be installed on their own, by their own setup. Their code is in this build
 * now; a game that still has one is told to take it out first, rather than refused for a
 * mismatch it would not understand.
 */
const STANDALONE = [
  { marker: 'continuing-semesters-mod.json', name: 'Continuing Semesters' },
  { marker: 'photo-mod.json', name: 'Photo Feature' }
]

const paths = (game) => {
  const res = join(game, 'resources')
  return {
    res,
    asar: join(res, 'app.asar'),
    unpacked: join(res, 'app.asar.unpacked'),
    backup: join(res, 'app.asar.extracurriculars-backup'),
    backupUnpacked: join(res, 'app.asar.unpacked.extracurriculars-backup'),
    marker: join(res, 'venus-extracurriculars.json'),
    manifest: join(res, 'build-manifest.json')
  }
}

/** A `/`-joined path inside the archive, in the form the archive reader looks it up by. */
const native = (rel) => rel.split('/').join(sep)

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex')

/** The hash of a file too big to want in memory: `app.asar` itself. */
async function hashFile(path) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest('hex')
}

function fail(message) {
  console.error(`\n  ${message}\n`)
  process.exit(1)
}

/** The game folder: given, or the folder the download was unpacked into, or asked for. */
async function findGame(given) {
  const candidates = [given, process.cwd(), resolve(HERE, '..')].filter(Boolean)
  for (const dir of candidates) {
    if (existsSync(join(dir, EXE))) return resolve(dir)
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = (await rl.question(`Path to your Venus University folder (where "${EXE}" is): `))
    .trim()
    .replace(/^"|"$/g, '')
  rl.close()
  if (!answer || !existsSync(join(answer, EXE))) fail(`"${EXE}" was not found in that folder.`)
  return resolve(answer)
}

/** Refuses a folder that is not the official version this build was made for. */
async function checkBase(p, force) {
  for (const mod of STANDALONE) {
    if (existsSync(join(p.res, mod.marker))) {
      fail(
        `This game has ${mod.name} installed on its own. ${NAME} already includes it.\n` +
          `  Uninstall ${mod.name} with its own setup first, then run this again. Nothing was changed.`
      )
    }
  }
  const manifest = JSON.parse(await readFile(p.manifest, 'utf8').catch(() => 'null'))
  if (!manifest) fail('This folder has no build-manifest.json, so it is not an official build.')
  if (manifest.version !== expected.gameVersion) {
    const message = `${NAME} ${expected.buildVersion} is for Venus University ${expected.gameVersion}, but this folder is ${manifest.version}.`
    if (!force) fail(`${message} Nothing was changed.`)
    console.warn(`  warning: ${message} Continuing because of --force.`)
  }
  const listed = new Set(asar.listPackage(p.asar).map((f) => f.replace(/\\/g, '/').replace(/^\//, '')))
  for (const [rel, hash] of Object.entries(expected.base)) {
    const ok = listed.has(rel) && sha256(asar.extractFile(p.asar, native(rel))) === hash
    if (!ok) {
      const message = `The game's ${rel} is not the official ${expected.gameVersion} one.`
      if (!force) fail(`${message} Nothing was changed. Is another mod installed?`)
      console.warn(`  warning: ${message} Continuing because of --force.`)
    }
  }
}

/**
 * The marker of an install that something has since undone, or null. A game update replaces
 * `app.asar` but leaves this build's marker and backup behind. That backup is then code the game
 * has moved on from, and restoring it would put it back over whatever is there now.
 */
async function undone(p) {
  const marker = JSON.parse(await readFile(p.marker, 'utf8').catch(() => 'null'))
  if (!marker?.asar || !existsSync(p.asar)) return null
  return (await hashFile(p.asar)) !== marker.asar ? marker : null
}

/** Deletes what an undone install left behind: its backups and its marker. */
async function clearLeftovers(p) {
  await rm(p.backup, { force: true })
  await rm(p.backupUnpacked, { recursive: true, force: true })
  await rm(p.marker, { force: true })
}

async function install(game, force) {
  const p = paths(game)
  if (!existsSync(p.asar)) fail('resources/app.asar is missing; this does not look like the game.')
  if (existsSync(p.marker)) {
    if (!(await undone(p))) fail(`${NAME} is already installed. Uninstall it first.`)
    console.log("  The game's code was replaced after an earlier install; clearing what that left behind...")
    await clearLeftovers(p)
  }
  await checkBase(p, force)

  console.log('  This is the official game.')
  console.log('  Backing up the original game code...')
  await cp(p.asar, p.backup)
  if (existsSync(p.unpacked)) await cp(p.unpacked, p.backupUnpacked, { recursive: true })

  const work = await mkdtemp(join(tmpdir(), 'venus-extracurriculars-'))
  try {
    console.log(`  Adding ${NAME}...`)
    asar.extractAll(p.asar, work)
    for (const rel of expected.remove) await rm(join(work, rel), { force: true })
    for (const rel of expected.put) {
      await mkdir(dirname(join(work, rel)), { recursive: true })
      await cp(join(PAYLOAD, 'files', rel), join(work, rel))
    }
    await asar.createPackageWithOptions(work, p.asar, { unpack: UNPACK })
    // Inside the try: an install whose marker cannot be written is undone like any other failure,
    // or the game would run the build while Uninstall said it was not there.
    // Written beside the marker and renamed onto it, so a marker is whole or not there at all.
    await writeFile(
      `${p.marker}.tmp`,
      JSON.stringify(
        {
          build: expected.build,
          buildVersion: expected.buildVersion,
          gameVersion: expected.gameVersion,
          // The archive as this install left it: uninstall restores the backup only over this.
          asar: await hashFile(p.asar)
        },
        null,
        2
      )
    )
    await rename(`${p.marker}.tmp`, p.marker)
  } catch (error) {
    // Anything half-written goes back to the original before the error is reported.
    await cp(p.backup, p.asar)
    if (existsSync(p.backupUnpacked)) {
      await rm(p.unpacked, { recursive: true, force: true })
      await cp(p.backupUnpacked, p.unpacked, { recursive: true })
    }
    await rm(`${p.marker}.tmp`, { force: true }).catch(() => {})
    await rm(p.marker, { force: true }).catch(() => {})
    await rm(p.backup, { force: true })
    await rm(p.backupUnpacked, { recursive: true, force: true })
    fail(`Install failed and the game was put back as it was: ${error.message}`)
  } finally {
    await rm(work, { recursive: true, force: true })
  }

  console.log(`\n  Done. ${NAME} is installed in:\n  ${game}\n`)
  console.log('  Every mod can be turned on or off from Mods on the main menu.\n')
}

async function uninstall(game) {
  const p = paths(game)
  if (!existsSync(p.marker)) fail(`${NAME} is not installed in this folder.`)
  if (await undone(p)) {
    await clearLeftovers(p)
    console.log(
      `  The game's code was replaced after ${NAME} was installed (a game update, most likely),\n` +
        '  so it is no longer in the game. Its backup is from before that change and was deleted\n' +
        '  rather than restored.\n' +
        `\n  Done. Nothing else was changed in:\n  ${game}\n`
    )
    return
  }
  if (!existsSync(p.backup)) fail('The backup of the game code is missing, so it cannot be restored.')

  console.log('  Restoring the original game code...')
  await rm(p.asar, { force: true })
  await rename(p.backup, p.asar)
  if (existsSync(p.backupUnpacked)) {
    await rm(p.unpacked, { recursive: true, force: true })
    await rename(p.backupUnpacked, p.unpacked)
  }
  await rm(p.marker, { force: true })
  console.log(`\n  Done. Venus University is back to the official version in:\n  ${game}\n`)
}

const [command, ...rest] = process.argv.slice(2)
const force = rest.includes('--force')
const given = rest.find((arg) => !arg.startsWith('--'))

console.log(`\n  ${NAME} ${expected.buildVersion}, unofficial (for Venus University ${expected.gameVersion})`)
console.log('  Close the game before continuing.\n')

if (command === 'install') await install(await findGame(given), force)
else if (command === 'uninstall') await uninstall(await findGame(given))
else fail('Usage: node patch.mjs install|uninstall [game folder] [--force]')
