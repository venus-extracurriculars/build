# Character Dynamics

One optional Venus Extracurriculars mod, with one setup screen for two independent choices:

- **Starting relationship:** Ex-girlfriend, Resentful, Rival, or Antagonist. Each girl assigned a relationship requires her own explanation, up to 1,200 characters. This establishes background, not a permanent mood or a reward in stats.
- **Personality nudges:** 34 optional traits. Several can be applied to the same girl, gently supplementing her existing personality and voice. Search the palette by name or description, then drag a trait or use the click-to-place alternative.

## Playing

Enable **Character Dynamics** in the main menu's **Mods** screen before starting a playthrough. It is off by default and has no required mods. After the name question in New Game or Quickstart, the setup displays the selected roster. Choose a relationship and explain it, drag personality tags onto her card, or use either section by itself. A click-to-place alternative is available: select a tag, then click the girl's Add button. Tags can be removed individually. Unassigned girls are unchanged.

Continue is available when every chosen relationship has a nonblank explanation. Selecting no choices is valid. The setup establishes that girls with written shared history already know the reader; it does not grant affection, contact details, intimacy, trust reveals, or native relationship milestones. A prior relationship is history before this playthrough, not a new breakup or kiss for the ledger to award.

The choices are specific to this playthrough and do not rewrite reusable character files, native traits, or character notes. Changing the Mods switch affects future playthroughs, as with other playthrough-scoped mods. Existing playthroughs without this mod remain unchanged.

## Viewing choices during play

Open a girl's Bunnyboard profile and find **Backstory → Character Dynamics**. A small button and summary open a separate, read-only panel with her assigned traits, their meanings, her starting relationship, and the explanation entered during setup. Choices are shown from the currently loaded save. Girls with no assigned choices have no extra button.

The player-authored choices can be read before the native backstory is unlocked; the girl's own undiscovered backstory remains locked. **Starting background** records the setup rather than claiming she still feels the same way. Reading the panel does not edit her character file, notes, memories, or saved choices. Carried choices remain readable when the mod's effects are inactive.

## Trait catalog

The original ten choices remain: Headstrong, Guarded, Mischievous, Tenderhearted, Competitive, Impulsive, Self-assured, Reserved, Idealistic, and Prickly.

Additional choices:

- **Humor and expression:** Witty, Dramatic, Pun-loving, Deadpan, Goofy, Easily flustered.
- **Warmth and connection:** Flirtatious, Romantic, Affectionate, Protective, Sentimental, Empathetic.
- **Curiosity and spontaneity:** Adventurous, Curious, Rebellious, Dreamy, Superstitious, Social butterfly.
- **Outlook:** Observant, Meticulous, Skeptical, Ambitious, Easygoing, Philosophical.

All choices use the same catalog for setup, saved-choice display, and prompt guidance. Adding these options does not assign any new traits to existing saves. Tags do not change stats, schedules, consent, or native game trait switches.

## AI behavior

Scene and DM hooks supply short guidance for the characters being written. The slot-opening request includes only its askers, breakup correspondents, and posters. Other characters' background is not dumped into unrelated requests. The guidance preserves original personalities, treats multiple traits as gentle situational tendencies, and gives later memories and current relationships precedence over initial feelings. Private history is not an instruction to announce it publicly.

These are prompt instructions, not deterministic personality mechanics. Actual dialogue depends on the selected model and the rest of the story context. No separate generation call is made for tags, and the mod requires neither Story Memory nor SQLite.

## Persistence and semester integration

New saves, enrollments, and `modCarry` use the `exCharacterDynamics` field, following the shared build's convention for mod-owned data. The enrollment switch is `exCharacterDynamicsEnabled`. Read-only compatibility helpers accept the earlier unprefixed fields from prerelease builds; the prefixed values take precedence, and subsequent saves use only the new name. Loading does not modify existing files, and no game schema-version bump is needed.

`exCharacterDynamics` is an optional, versioned field on the enrollment and each save. Keeping it on enrollment preserves it if the registrar is left and resumed. `exCharacterDynamicsEnabled` also freezes this mod's enrollment choice, so changing the main-menu switch before resuming cannot accidentally activate or discard the setup. The game store loads, resets, and serializes the choices explicitly; absent data stays absent and older saves need no schema upgrade. The stored object is preserved even when its effects are not active. Unknown future tags are retained on disk but are not applied by this version.

The shared entry imports a `modCarry` adapter. It copies choices independently of switches, retaining historical entries for girls no longer in the active roster. The setup component accepts all returning character IDs and makes those girls read-only, including returning girls with no tags. Only new girls can receive fresh choices. The integration with Continuing Semesters passes the outgoing choices and returning IDs into that same screen; carried history is never re-entered as a new starting relationship.

On continuation, setup is skipped if there are no newcomers or this mod is off. At Finalize, New Game supplies the settled choices to `carriedOpening` alongside the other carried fields; otherwise its older snapshot would overwrite choices just made for newcomers. Returning girls retain their actual relationship flags and memories through Continuing Semesters' existing logic. A returning girl without old choices cannot be assigned a retroactive background by enabling this mod later.

## Code map

| File | Responsibility |
| --- | --- |
| `src/shared/modEntries/character-dynamics.ts` | Discovery, author credit, optional playthrough switch. |
| `src/shared/characterDynamics.ts` | Saved shape, catalog, required reasons, and settling new choices without changing returning girls. |
| `src/shared/characterDynamicsCarry.ts` | Pure semester retention adapter. |
| `src/renderer/views/CharacterDynamicsModal.tsx` | One setup screen, drag/drop, click alternative, validation, read-only returnees. |
| `src/renderer/vu_styles/CharacterDynamics.css` | Native theme roles, scroll areas, character cards, searchable trait palette. |
| `src/renderer/views/CharacterDynamicsBackstory.tsx`, `src/renderer/vu_styles/CharacterDynamicsBackstory.css` | Compact Backstory link and separate read-only trait/background panel. |
| `src/renderer/views/ContactPage.tsx` | Displays the link from the current save while preserving native discovery gates. |
| `src/renderer/views/NewGameView.tsx` | Setup sequence, enrollment, first-save data, and initial acquaintance. |
| `src/shared/types.ts`, `src/shared/saveRules.ts` | Optional enrollment/save field without changing schema versions. |
| `src/renderer/stores/gameStore.ts` | Save round-trip and clearing data between runs. |
| `src/renderer/modEntries/character-dynamics.ts` | Additive hooks; native mod gating applies. |
| `src/renderer/prompts/characterDynamics.ts` | Character-scoped instructions preserving the original personality. |
| Scene, texting, slot prompt inputs and their store projections | Pass the same saved choices into each request snapshot. |
| `test/characterDynamics.test.ts` | Validation, data retention, cross-run isolation, carry, and hook routing. |

## Branches and validation

The `mod/character-dynamics` branch starts from `core` and contains only this feature. A separate integration branch combines it with `main` and supplies Continuing Semesters' context. Shared mod lists are discovered automatically; no manual registration or shared documentation section is needed.

Validate typechecks and the test suite, then exercise New Game and Quickstart, required explanations, multiple tags, duplicate drops, removal, no selections, resumed enrollment, save reload, and returning versus new girls in a continued semester. Check day/night themes, reduced motion, and the supported stage sizes. Use synthetic story backgrounds for test captures.

Validated on the integrated 0.3.1 build:

- All three typechecks and the desktop build pass.
- Full suite including the expanded trait catalog and separate viewing panel: 163 test files, 2,101 passed and one skipped.
- Isolated Electron checks exercised drag/drop, multiple tags, duplicate drops, removal, click-to-place, required reasons, both themes, and several window sizes.
- New Game and Quickstart wrote the choices into their first saves. Disabled Quickstart skipped the screen and did not inherit another run's choices.
- Continuing Semesters preserved returning girls' choices, memories, and relationship flags, plus a newcomer's new relationship and tags, through enrollment, leaving/resuming the registrar, and the first save.
- A disabled continuation retained stored choices without opening setup or enabling its effects.
- Compatibility checks loaded unprefixed prerelease data, continued its semester, resumed an unprefixed enrollment, and verified that the next save writes only `exCharacterDynamics`. Prefixed values take precedence; a frozen `false` enrollment choice is preserved.

- The expanded palette was checked with search, no results, clearing search, a new-trait drop, and saving the selection.
- The separate panel was checked in both themes, with Close and Escape, traits only, history only, no choices, an empty native backstory, and a contact not yet added. Viewing retained the saved choices and native discovery flags unchanged.
- All 34 traits plus a long starting explanation fit a scrollable panel with the footer visible at the supported stage sizes.

UI tests used canned generation results and synthetic saves; live model behavior still needs playtesting.
