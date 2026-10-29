/**
 * The authored lists a skipped profile call deals from: majors, weekly interests, spring break
 * plans and graduates' lives that fit almost any girl.
 */

/** Grab bag id for {@link MAJORS}. */
export const MAJOR_BAG = 'newGame.majors'
/** The majors a skipped profile is dealt. */
export const MAJORS: readonly string[] = [
  'Biology',
  'Chemistry',
  'Physics',
  'Mathematics',
  'Computer Science',
  'Mechanical Engineering',
  'Environmental Science',
  'Nursing',
  'Kinesiology',
  'Psychology',
  'Economics',
  'Political Science',
  'Anthropology',
  'Linguistics',
  'English',
  'Philosophy',
  'Art History',
  'Communications',
  'Music',
  'Fine Arts',
  'Fashion Design',
  'Architecture',
  'Business Administration',
  'Elementary Education'
]

/** One weekly interest and the place it happens at, a location id of the activity menu. */
export interface PooledActivity { location: string; doing: string }
/** Grab bag id for {@link ACTIVITIES}. */
export const ACTIVITY_BAG = 'newGame.activities'
/** The weekly interests a skipped profile is dealt, three at each place of the activity menu. */
export const ACTIVITIES: readonly PooledActivity[] = [
  { location: 'green_hill_park', doing: 'jogging the cobbled paths of Green Hill Park' },
  { location: 'green_hill_park', doing: 'practicing yoga on the hillside lawns of Green Hill Park' },
  { location: 'green_hill_park', doing: 'reading on a bench beneath the memorials in Green Hill Park' },
  { location: 'palaestra_stadium', doing: 'swimming laps in the pool at Palaestra Stadium' },
  { location: 'palaestra_stadium', doing: 'running on the rooftop track at Palaestra Stadium' },
  { location: 'palaestra_stadium', doing: 'practicing her serve on the tennis courts at Palaestra Stadium' },
  { location: 'thorne_auditorium', doing: 'practicing piano in the practice rooms under Thorne Auditorium' },
  { location: 'thorne_auditorium', doing: 'recording songs in the basement studios of Thorne Auditorium' },
  { location: 'thorne_auditorium', doing: 'catching the student recitals at Thorne Auditorium' },
  { location: 'whitman_greenhouse', doing: 'sketching orchids in the Whitman Greenhouse' },
  { location: 'whitman_greenhouse', doing: 'doing homework by the tropical pond in the Whitman Greenhouse' },
  { location: 'whitman_greenhouse', doing: 'volunteering to tend the orchard at the Whitman Greenhouse' },
  { location: 'venus_quad', doing: 'journaling in a shaded gazebo on the Venus Quad' },
  { location: 'venus_quad', doing: 'watching passersby from the fire pits on the Venus Quad' },
  { location: 'venus_quad', doing: 'making a wish at the Concord Fountain on the Venus Quad' },
  { location: 'freights_books', doing: 'browsing the manga shelves at Freights' },
  { location: 'freights_books', doing: 'digging through the bargain vinyl at Freights' },
  { location: 'freights_books', doing: 'reading in a curtained nook at Freights' },
  { location: 'btb_arcade', doing: 'chasing a spot on the PARADISO leaderboard at BTB Arcade' },
  { location: 'btb_arcade', doing: 'playing the retro cabinets at BTB Arcade' },
  { location: 'btb_arcade', doing: 'feeding tokens into the claw machines at BTB Arcade' },
  { location: 'pino_cola_lounge', doing: 'playing ping pong at the Pino-Cola Lounge' },
  { location: 'pino_cola_lounge', doing: 'gaming on the console setups at the Pino-Cola Lounge' },
  { location: 'pino_cola_lounge', doing: 'trying every seasonal soda flavor at the Pino-Cola Lounge' },
  { location: 'stalestein_bar', doing: 'performing at the open mic at the Stalestein' },
  { location: 'stalestein_bar', doing: 'catching the local bands at the Stalestein' },
  { location: 'stalestein_bar', doing: 'playing darts in the back of the Stalestein' },
  { location: 'cutetea', doing: 'working through the bubble tea menu at CuteTea' },
  { location: 'cutetea', doing: 'learning a new board game at CuteTea' },
  { location: 'cutetea', doing: 'doing crosswords over boba at CuteTea' }
]

/** Grab bag id for {@link SPRING_BREAK_PLANS}. */
export const SPRING_BREAK_BAG = 'newGame.springBreak'
/** The spring break plans a skipped profile is dealt, each one leaving campus. */
export const SPRING_BREAK_PLANS: readonly string[] = [
  'Go home to see her parents.',
  "Drive down to her aunt's place on the coast.",
  "Fly home for her cousin's wedding.",
  "Spend a quiet week on her grandparents' farm.",
  'Take a solo road trip through the desert.',
  'Go camping in the mountains.',
  'Catch up with her old friends back home.',
  'Spend the week skiing in Colorado.',
  'Fly to Tokyo on money she has saved all year.',
  'Volunteer at a wildlife rescue upstate.',
  'Housesit for a family friend two states over.',
  'Take the train out to stay with her godparents.',
  'Go on a silent meditation retreat in the countryside.',
  'Fly to Cancun for a week in the sun.',
  'Rent a cabin by a lake and do nothing at all.',
  'Join her parents on a Caribbean cruise.',
  "Help out at her family's restaurant back home.",
  'Take a week-long pottery workshop in New Mexico.',
  'Visit a pen pal in Montreal.',
  'Fly to Iceland to chase the northern lights.',
  'Drive to a music festival in Texas.',
  'Visit her grandmother in Florida.',
  'Hike a stretch of the Appalachian Trail.',
  'Ride every roller coaster in Orlando.'
]

/** Grab bag id for {@link PURSUITS}. */
export const PURSUIT_BAG = 'newGame.pursuits'
/** What a skipped profile says a graduate is doing now, each away from Veridan and read after "is now". */
export const PURSUITS: readonly string[] = [
  'starting a graduate program in Boston',
  'teaching English at a high school in Osaka',
  'working at a nonprofit in Washington, D.C.',
  'backpacking across Southeast Asia',
  'living with her parents while she applies for jobs',
  'working at a startup in San Francisco',
  'waiting tables in New York while she works out what comes next',
  'volunteering on a sea turtle project in Costa Rica',
  'taking a gap year in Lisbon',
  "starting a master's degree in Edinburgh",
  'pulling espresso at a café in Portland',
  'job hunting from a tiny apartment in Chicago',
  'traveling around Europe on a rail pass',
  "helping run her family's business back home",
  'working as an au pair in Paris',
  'tutoring high schoolers in Baltimore',
  'doing a year of service in New Orleans',
  'working remotely from her hometown',
  'house-sitting her way around New Zealand',
  'working the front desk at a hotel in Honolulu',
  'giving tours at a history museum in Philadelphia',
  'saving up for grad school by working two jobs in Austin',
  'interning at a city council office in Seattle',
  'living on a sailboat with friends in the Florida Keys'
]
