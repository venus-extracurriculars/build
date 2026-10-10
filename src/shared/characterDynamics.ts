/** Per-playthrough story choices; never edits a reusable character or her native traits. */
export const CHARACTER_DYNAMICS_MOD = 'character-dynamics'
export const DYNAMICS_REASON_LIMIT = 1200

export const STARTING_RELATIONSHIPS = [
  { id: 'ex-girlfriend', name: 'Ex-girlfriend', hint: 'How did the relationship end?', direction: 'They dated before this playthrough and separated. Their present relationship can develop differently.' },
  { id: 'resentful', name: 'Resentful', hint: 'What happened to upset her?', direction: 'She began with a grievance against the reader. Trust and subsequent events can change how she feels.' },
  { id: 'rival', name: 'Rival', hint: 'What are they competing over?', direction: 'They began as rivals over the stated goal. Competition need not prevent affection or cooperation.' },
  { id: 'antagonist', name: 'Antagonist', hint: 'Which of her goals conflicts with yours?', direction: 'Her initial goals conflicted with the reader\'s. Give her understandable motives, not constant hostility.' }
] as const

export const PERSONALITY_NUDGES = [
  { id: 'headstrong', name: 'Headstrong', hint: 'A little firmer in her convictions.' },
  { id: 'guarded', name: 'Guarded', hint: 'A little slower to share personal feelings.' },
  { id: 'mischievous', name: 'Mischievous', hint: 'A little more inclined toward playful teasing.' },
  { id: 'tenderhearted', name: 'Tenderhearted', hint: 'A little more attentive to hurt feelings.' },
  { id: 'competitive', name: 'Competitive', hint: 'A little more drawn to friendly challenges.' },
  { id: 'impulsive', name: 'Impulsive', hint: 'A little more likely to act on a feeling.' },
  { id: 'self-assured', name: 'Self-assured', hint: 'A little more direct and willing to initiate.' },
  { id: 'reserved', name: 'Reserved', hint: 'A little more expressive through small gestures.' },
  { id: 'idealistic', name: 'Idealistic', hint: 'A little more guided by hopes and principles.' },
  { id: 'prickly', name: 'Prickly', hint: 'A little quicker to bristle, with room to soften.' }
] as const

export type StartingRelationship = typeof STARTING_RELATIONSHIPS[number]['id']
export type PersonalityNudge = typeof PERSONALITY_NUDGES[number]['id']

export interface CharacterDynamic {
  relationship?: { kind: string; reason: string }
  traits: string[]
}

export interface CharacterDynamics {
  version: 1
  characters: Record<string, CharacterDynamic>
}

export const emptyCharacterDynamics = (): CharacterDynamics => ({ version: 1, characters: {} })

/** Read known fields defensively; the original save object is retained separately, unchanged. */
export function dynamicFor(data: CharacterDynamics | undefined, charId: string): CharacterDynamic {
  const entry = data?.version === 1 ? data.characters?.[charId] : undefined
  const traits = Array.isArray(entry?.traits)
    ? [...new Set(entry.traits.filter(id => PERSONALITY_NUDGES.some(tag => tag.id === id)))]
    : []
  const relationship = entry?.relationship
  return {
    traits,
    ...(STARTING_RELATIONSHIPS.some(tag => tag.id === relationship?.kind) &&
      typeof relationship?.reason === 'string'
      ? { relationship: { kind: relationship.kind, reason: relationship.reason } }
      : {})
  }
}

/** A selected relationship cannot be committed with a blank or oversized explanation. */
export function invalidDynamicsReasons(data: CharacterDynamics, editable: readonly string[]): string[] {
  return editable.filter(id => {
    const relationship = dynamicFor(data, id).relationship
    return relationship && (!relationship.reason.trim() || relationship.reason.length > DYNAMICS_REASON_LIMIT)
  })
}

/** Keep inherited girls byte-for-byte in meaning; only the offered new girls can be edited. */
export function settleCharacterDynamics(
  draft: CharacterDynamics,
  editable: readonly string[],
  inherited?: CharacterDynamics
): CharacterDynamics {
  if (invalidDynamicsReasons(draft, editable).length > 0) throw new Error('A starting relationship needs an explanation.')
  const characters = structuredClone(inherited?.characters ?? {})
  for (const id of editable) {
    const entry = dynamicFor(draft, id)
    const relationship = entry.relationship
      ? { ...entry.relationship, reason: entry.relationship.reason.trim() }
      : undefined
    delete characters[id]
    if (relationship || entry.traits.length > 0) {
      characters[id] = { traits: entry.traits, ...(relationship ? { relationship } : {}) }
    }
  }
  return { version: 1, characters }
}

/** The setup establishes acquaintance only. No affection, contact access, or milestones. */
export function dynamicsKnowsReader(data: CharacterDynamics | undefined, charId: string): boolean {
  return Boolean(dynamicFor(data, charId).relationship?.reason.trim())
}
