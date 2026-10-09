# Optional mod continuity between semesters

Requires Continuing Semesters. The integration asks each installed mod to carry its own saved state; no other feature mod is required. Disabled features retain data without generation or prompt effects. Unrelated new games remain fresh.

Each mod imports its adapter from its own `src/shared/modEntries/<id>.ts` entry. The adapter registers with `src/shared/modCarry.ts`; it is discovered regardless of whether the feature switch is on. Continuing Semesters supplies the outgoing roster, original term and its own date offset, then includes registered fields in the opening save. The native save-field inventory remains exhaustive for fields not owned by a mod's `ModCarryFields` declaration.

When those mods are installed, their adapters choose what to keep: Plot Twist preserves its text. Breakthrough retains earned spirit and dated outcomes, refunds interrupted activation and resets settlement guards. Story Memory archives recaps, facts, corrections and hidden state, preserving original semester labels and private/timeline boundaries. Meanwhile retains up to 50 saved conversations and names of graduated speakers. The Hare & Quill retains its author, issues, comments and original semester dates. These policies live in their respective mod branches; this integration does not install those features.

SQLite remains a disposable per-playthrough index rebuilt from the new save. Native calendar replays keep Continuing Semesters' existing policy; this adapter does not reinterpret them. No migration can recover records already discarded by an older continuation; continue from its preceding ending save to retain them.

## Integration and verification

This is a small extension of Continuing Semesters' continuation flow, with no separate switch. It calls the shared retention registry already provided by core. `mod/semester-carryover` is based on core and `mod/continuing-semesters`; main is combined on a separate integration branch when needed.

- `src/renderer/stores/newGame.ts`: `keptFrom` supplies the complete outgoing character map, including people absent from the next roster.
- `src/shared/termCarry.ts`: `carryTerm` calls each installed adapter; `carriedOpening` overlays only registered extension fields on the new opening save. Break processing preserves those fields alongside the native carry.
- `src/shared/termTypes.ts`: `TermCarry` includes optional `ModCarryFields`, so a saved continuation can hold them without requiring another feature.
- `test/modCarryIntegration.test.ts`: checks both semester date offsets, outgoing names, serialized continuation data, source immutability, the native replay policy, and absent/unregistered fields without AI requests.

The save-field table exclusion alone does not copy anything. Continuing Semesters provides that exclusion; these registry calls provide retention. Plot Twist therefore starts blank on rollover in a build that has Continuing Semesters but lacks this integration.
