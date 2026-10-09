# Continuing Semesters

By morrowkiln. Part of Venus Extracurriculars, an unofficial build; not made, endorsed or
supported by Venus Dev.

## What it adds

A finished semester can be carried into the next one, from the ending's own modal or from that
save in Load Game. Spring is followed by a Fall with a calendar of its own, then Spring again,
until the spring the reader graduates in. Seniors who graduated are gone and everybody else
moves up a year; the player drops and adds until the roster is twelve. The reader keeps his
money, inventory, phone and reputation, loses his job, and his stats slip a tier. Returning
characters keep their memories, milestones, gifts, feed and the player's notes on them.

Between two semesters the break is played: two slots a week, twelve weeks after a spring and
four after a fall. A slot goes on a text conversation with one of the girls coming back, on the
reader himself to work on a stat, or is let go by. Conversations are typed freely and judged;
the girls write first now and then, and wait for an answer. Somebody close may invite him to
come and stay: a trip takes four slots, and the days with her are real scenes. What each of
them remembers of the break is what happened in it, and the player can reword it before the
next semester starts. The break can also be skipped, which writes those memories instead.

A save made without the mod loads with it, a finished one included. A semester started by
continuing is a playthrough only a build with this mod understands.

## Switch and options

`anytime`, on by default. Off, the ending and Load Game stop offering the next semester; a
semester or a break already started keeps working. Three options: skip the break as it opens
(`BreakView.tsx`), keep seniors from graduating, and turn the Load Game offer off alone.

## How it uses the mod system

- Its entry is `src/shared/modEntries/continuing-semesters.ts`, which hands on
  `CONTINUING_SEMESTERS_MOD` from `src/shared/continuingSemestersMod.ts`.
- The two offers are hooks, registered in `src/renderer/modEntries/continuing-semesters.ts`:
  `endingChoice` beside the ending's "Return to the main menu", and `saveChoice` for a finished
  save picked in Load Game. Both prepare the finished semester first and open the break.
- The seniors option is a rule in shared code reading a switch without holding one: the rule
  keeps a flag (`setSeniorsGraduate` in `shared/term.ts`), and `modsStore.ts` sets it at boot
  and whenever a switch moves.
- The rest (the break screen, the fall calendar, the carry-over into the next semester, its
  prompts and saves) is still integrated directly; it moves onto hooks as they are added.
- `shared/modCarry.ts` lets other mods carry their own saved state across; Continuing Semesters
  is the semester extension that calls it.

## Design notes

These extend `DESIGN_GUIDE.md` for a game with this mod in it.

- **The premise is fixed**: the reader arrives at Venus University in the city of Veridan as a freshman and is played a semester at a time. The first is a spring, January 19 (a Monday, day 0) to the Friday nearest May 21; a finished one can be continued into the next — a fall, August 17 to December 18, then the spring after it — up to the spring he graduates in himself. Two slots a day, day and night; a slot holds at most one scene.

- A **term** is one semester of the reader's four years, counted from the first spring; its **season** is the half of the year it falls in. A **playthrough** is one term played as one continuous game: a folder of saves plus the one **record** (`playthrough.json`) they are all read against; before the record exists the folder holds one **enrollment** instead, the semester waiting on its timetable. Load Game calls a playthrough by the name the player gives it from inside it, and by `Playthrough N`, its place in creation order, until then or once the name is blanked. A **save** is a file in it — a slot-save at a boundary, one **autosave**, the last decision point reached, or one of ninety **manual saves** the player writes from the menu.

**Terms.** A playthrough's record names the term it is — nothing, where it is the first spring — and the season is read off that. The two seasons' calendars hold the semester's own milestones (orientation, add/drop, the two exam weeks, the week off, the wind-down, the last day) on the same day of the term, so every date the loop tests is one constant in both, and only the names, the holidays and the closures differ; a table that drifts fails at load. A fall ends on a send-off rather than a ceremony and nobody graduates out of it; Veridan's sky is rolled the same way in either. A finished semester — a save taken after its last morning, the reader not past the debt floor — is continued from its ending's modal or from that save in Load Game, until the spring the reader graduates in, which ends the story. Continuing opens the break first and the roster screen after it. The break is a run of slots, two to a week — twelve weeks after a spring, four after a fall — spent one at a time on its own screen, which opens on the reader's stats a tier down each. A slot goes on a text conversation with one returning girl whose number he has, on himself, or is let go by. A slot on himself is typed as a scene alone is: one call narrates it in a few lines, at home and with nobody from the university in it, and says which stats it exercised, and each of those is paid as an hour alone pays during a semester; nothing is spent until that reply is in. Each week past the first opens on whatever the girls send on their own: who writes is decided locally from how she stood with him when the semester ended — a lover most weeks of a summer and once in a winter, somebody friendly every third week of a summer, somebody who only knows him once a summer, everybody close in the last week of either break and in the middle of a summer, and nobody who has soured on him or has not his number, and of those due only one writes in an ordinary week and two in those two, a lover first and then whoever has written least — and one call writes all of that week's texts, asking for the cards first where there are none. Reading them is free; writing back opens a conversation on them and spends the slot, and nothing is lost by leaving them: she does not write again while one is waiting, but for the last week's, every later call about her is told she is still waiting and does not hold it against him, and one never answered is filed on her thread. Somebody close to him — a lover only, over a winter — may ask him to come and stay, in a conversation or in what she sends on her own; the reply and reach-out calls are told when she may, the judgement says whether she did, and the invitation waits on an answer that costs nothing. One invitation stands at a time, nobody makes another for two weeks after the last was made, or after he is home from the trip it led to, and she makes one a break, two where he is with her. A yes books four slots from the next second slot of a week — the way out, two with her, the way back — which nothing else may be spent in, and one trip is booked at a time; turning her down is remembered against him only by a lover, or the second time. The two legs are a line or two in the scene's box and no call. Each slot with her is a scene the engine itself runs down the goodbye's path (`enterTrip`): the finished save with the break's stats and memories on it, stood on the epilogue's slot with no playthrough behind it so that nothing is written, the premise and the NOW lines the break's own, the university's own backgrounds withheld, and none of the engine's bookkeeping. Once it has closed, one call judges the whole scene against her card — a verdict, a summary, up to two memories, the stats it exercised, paid as a scene with company pays, and whichever of a scene's own milestones the two of them reached in person, folded onto her on the day of that slot when the next semester is generated — its lines are read out as a scene's ending is, and the break takes the screen back with the slot spent. The first text spends the slot; a conversation runs to six texts of his, each answered by its own call, and ends on her sign-off to the last one, on her cutting it short, or on his own goodbye once she has answered, and nothing else can be done until it has been judged. The first conversation of a break asks one call for a card per returning girl — where she is, what she wants, what she expects of him, what would hurt and what would delight her — which is never shown, and which every reply and every judgement is written against. A second call judges each finished conversation: warmer, cooler or neutral, one line to the player saying why, a summary for the conversations that follow, up to two memories on the verdict's own side, and what he promised, kept or went back on. A memory is strong, loved or hated, only when the conversation with her before went the same way; texting pays no stat. The break is over once its memories are written, and the player may reword or blank each line before going on, as he may after a scene. A break with a conversation or a slot on himself in it, or with every slot spent, is closed locally from what happened and no call: what each conversation left her with, one promise he never kept, and — for a lover, or after a summer for anybody friendly or closer, where he had her number — never having heard from him at all. The newest five of what conversations left are kept, and everything a visit left besides; each of those is dated on the day of its slot, and the rest into the break's last days. A break ended with nothing done in it is the one written for him: one call asks what each returning girl who has met him remembers of it, more of it the closer the two were. The break is its own record in the finished semester's folder (`break.json`, on the playthrough's row in the browser), written after every slot and every edit and removed once the next semester has been generated from it; it belongs to the semester, so continuing any of its finished saves resumes it where it stood, and a backup does not carry it. The roster screen then opens on whoever is still enrolled: after a spring everybody moves up a year and the seniors are gone, after a fall nobody moves; the player drops and adds until there are twelve, and the reader is not asked who he is again. The start generates a whole new semester for that roster as New Game does, telling the class and profile calls what is already settled about a returning student, and takes the break's memories and the reader's stats as the break closed them, sending no call about it; its conversations, and what she sent that he never answered, are filed on each returning girl's thread, dated on the slots they fell in. The new playthrough's opening save takes over his money, inventory, phone, tallies and reputation, his stats as the break left them, and every returning girl's memories, milestones, gifts and feed, each date moved back by the days between the two day 0s so it falls before the new term and still names the day it happened; a skipped break's memories are dated into its last days, so they are what she feels on arrival, and a played one's on the days they happened; both fade like any other. His job, his plans and class records, what the map had learned, her suspicions, and every thread with a boss or with somebody not coming back are left behind. A returning girl who held a job still works for the same employer: her shifts are placed again round her new classes, and one who had no job is left to the profile call. The first morning is a scroll back onto campus and one scene: somebody he has never met, a freshman first, or the girl he is closest to when nobody is new.

- **The term being played is module state** (`shared/term.ts`): every date the renderer formats and every fixed occasion it names is read against the active term, so whatever enters a game, announces one or enrolls for one names it first. A screen outside any game passes the season of the playthrough it is dating. Main holds no active term: where it needs the season it reads the record.

## After a game update

`node scripts/seasonCheck.mjs <old-ref> [<new-ref>]` lists the lines an update added that may
assume the first spring: a month, a season, a class year or a hard-coded day. Each hit that
speaks of the calendar wants a fall wording; a field added to the save wants a line in the
tables at the foot of `src/shared/termCarry.ts`, which the typecheck asks for on its own.

## Reuse

Everything written for this mod may be used by other mods under the game's AGPL licence, with or
without asking. Venus Dev may additionally use any of it in the official game on whatever terms
he chooses, with no credit needed.
