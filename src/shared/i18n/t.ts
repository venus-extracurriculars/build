/**
 * The app's own translation layer, read by every tree. Every key is the English line itself,
 * so a string without a catalog entry reads as it always has and a missing pack changes
 * nothing; the renderer's boot is what puts a pack in, so in main the key always shows.
 */

/** The pack the app translates through; an empty one is English. */
let dictionary: Readonly<Record<string, string>> = {}

/** The pack `boot` or a language switch has read in. */
export function setDictionary(pack: Readonly<Record<string, string>>): void {
  dictionary = pack
}

/**
 * `key` as the player reads it: the pack's line for it, or the key itself. `params` fills
 * `{name}` holes in whichever of the two the answer came from.
 */
export function t(key: string, params?: Readonly<Record<string, string | number>>): string {
  const line = dictionary[key] ?? key
  if (params === undefined) return line
  return line.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole
  )
}
