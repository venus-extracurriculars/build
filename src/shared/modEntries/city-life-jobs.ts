import type { ModDef } from '../mods'
import { CITY_LIFE_LOCATIONS_MOD, CITY_LIFE_JOBS_MOD } from '../cityLife'

const mod: ModDef = { id: CITY_LIFE_JOBS_MOD, name: 'City Life jobs', author: 'Maestro Leeds', version: '1.0.0',
    scope: 'playthrough', defaultOn: true, requires: [CITY_LIFE_LOCATIONS_MOD],
    blurb: 'Part-time jobs for the player and NPCs at the three City Life venues.',
    offNote: 'Requires City Life locations. Existing playthroughs keep their jobs and schedules.' }
export default mod
