# Optional mod continuity between semesters

Requires Continuing Semesters. The integration asks each installed mod to carry its own saved state; no other feature mod is required. Disabled features retain data without generation or prompt effects. Unrelated new games remain fresh.

Each adapter registers in `shared/modCarry.ts`. Continuing Semesters supplies the outgoing roster, original term and its own date offset, then includes registered fields in the opening save. The native save-field inventory remains exhaustive for fields not owned by a registered mod.

Plot Twist preserves its text. Breakthrough retains earned spirit and dated outcomes, refunds interrupted activation and resets settlement guards. Story Memory archives recaps, facts, corrections and hidden state, preserving original semester labels and private/timeline boundaries. Meanwhile retains up to 50 saved conversations and names of graduated speakers. Venus Whisper retains its author, issues, comments and original semester dates. These policies are implemented and tested in their respective mod branches.

SQLite remains a disposable per-playthrough index rebuilt from the new save. Native calendar replays keep Continuing Semesters' existing policy; this adapter does not reinterpret them. No migration can recover records already discarded by an older continuation; continue from its preceding ending save to retain them.
