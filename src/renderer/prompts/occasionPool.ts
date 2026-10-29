import type { OccasionEntry, PlannedOccasion } from '@shared/application'
import type { Season, TimeSlot } from '@shared/types'
import { occasionKindOf } from './occasionPrompt'

/**
 * The authored occasions a skipped occasion call is dealt from: the gala, the dance and the
 * fillers per season, the fillers split by half of the day and by whether they fall in the week
 * off, and the career fair and the concert shared by both seasons. Nothing in them names a
 * weekday, a date or the weather, and none of it is a second version of a fixed occasion. A
 * filler held all day is dealt from the day's pool.
 */

/** What kind of planned occasion a pool entry is written for. */
export type OccasionPoolKind = 'gala' | 'dance' | 'career-fair' | 'concert' | 'filler' | 'break'

/** The pool a planned occasion is filled from, by its flags and then its kind; null where none covers it. */
export function occasionPoolKindOf(planned: PlannedOccasion): OccasionPoolKind | null {
  if (planned.breakWeek) return 'break'
  const kind = occasionKindOf(planned)
  return kind === 'small-event' ? 'filler' : kind
}

/** Whether a kind's pool is split by half of the day. */
function splitByHalf(kind: OccasionPoolKind): boolean {
  return kind === 'filler' || kind === 'break'
}

/** Whether a kind's pool is shared by both seasons. */
function shared(kind: OccasionPoolKind): boolean {
  return kind === 'career-fair' || kind === 'concert'
}

/** The grab bag one pool is dealt from. */
export function occasionBagOf(
  season: Season,
  kind: OccasionPoolKind,
  time: TimeSlot | null
): string {
  const half = splitByHalf(kind) ? `.${time === 1 ? 'night' : 'day'}` : ''
  return shared(kind) ? `newGame.occasion.${kind}` : `newGame.occasion.${season}.${kind}${half}`
}

/** The entries one pool deals. */
export function occasionPoolOf(
  season: Season,
  kind: OccasionPoolKind,
  time: TimeSlot | null
): readonly OccasionEntry[] {
  const spring = season === 'spring'
  const day = time !== 1
  switch (kind) {
    case 'career-fair':
      return CAREER_FAIRS
    case 'concert':
      return CONCERTS
    case 'gala':
      return spring ? SPRING_GALAS : FALL_GALAS
    case 'dance':
      return spring ? SPRING_DANCES : FALL_DANCES
    case 'filler':
      if (spring) return day ? SPRING_DAY_FILLERS : SPRING_NIGHT_FILLERS
      return day ? FALL_DAY_FILLERS : FALL_NIGHT_FILLERS
    case 'break':
      if (spring) return day ? SPRING_DAY_BREAK : SPRING_NIGHT_BREAK
      return day ? FALL_DAY_BREAK : FALL_NIGHT_BREAK
  }
}

/** Two-day career fairs held during the day, the same in either season. */
const CAREER_FAIRS: readonly OccasionEntry[] = [
  {
    title: 'Thorne Career Expo',
    description:
      "The Thorne Career Expo fills Palaestra Stadium's biggest gymnasium with recruiters from Promenade developers, regional hospitals and Thorne Philanthropies, whose line goes out the door. Students in the one suit they own collect tote bags, stress balls and stylus pens while trying to look like they read the job descriptions."
  },
  {
    title: 'Startup Alley',
    description:
      "Startup Alley lines the Agora's ground floor with Promenade startups recruiting for jobs that pay in equity and free snacks. Every booth has a ring light, a sheet of stickers and a founder in a hoodie explaining why this one is different."
  },
  {
    title: 'Arts & Culture Hiring Days',
    description:
      'The Veridan Museum of Art, the Aquarium at Riverside, Future Cinema and the staff of Thorne Auditorium set up tables in the auditorium lobby to hire curators, keepers, ushers and stagehands. Recruiters are upfront that most positions pay in experience, and they have the canvas bags to prove it.'
  },
  {
    title: 'The Suit Fair',
    description:
      'Officially it is Finance and Consulting Recruiting, but everyone calls it the Suit Fair: Promenade banks, law firms and consulting outfits named after three dead partners take over the upper level of the Agora. Students queue in borrowed blazers for a handshake, a branded padfolio and a business card they will never use.'
  },
  {
    title: 'Hospitality Hiring Days',
    description:
      'A row of white tents goes up along the Rose Road for Hospitality Hiring Days, staffed by the resort that owns Selkie Beach, the glass hotels beside it, Lumiere Fusion and a recruiter from Club Apogee who will not say what the job is. The free sunglasses run out within the hour.'
  },
  {
    title: 'Silktown Hiring Fair',
    description:
      "Downtown's small businesses take over the ground floor of Kendall Library for the Silktown Hiring Fair: SpringMart, Bobby's Diner, Fast Eats and every family shop short a part-timer. Nobody is in a suit, and the free stuff is coupons."
  }
]

/** Night concerts in Thorne Auditorium, one booked act and student openers, the same in either season. */
const CONCERTS: readonly OccasionEntry[] = [
  {
    title: 'Low Tide Choir at Thorne',
    description:
      'Low Tide Choir, a nine-piece folk band with three fiddles and a glockenspiel, plays Thorne Auditorium on a bill the SEB rounded out with a student a cappella group. Expect sing-alongs, harmonies the seashell ceiling was built for, and at least one proposal in the balcony.'
  },
  {
    title: 'VELVETINE Live',
    description:
      'Synth-pop singer VELVETINE brings her glitter-and-heartbreak tour to Thorne Auditorium, opened by a student DJ from the basement studios. The SEB had to clear a standing pit in front of the stage, and the merch line forms before the doors open.'
  },
  {
    title: 'The Pelham Quartet',
    description:
      'The Pelham Quartet, a string quartet famous for chamber arrangements of breakup songs, plays Thorne Auditorium after a student pianist opens. The acoustics make every cello line land, and the SEB hands out tissues at the door because people asked.'
  },
  {
    title: 'Big Wren at Thorne',
    description:
      "Rapper Big Wren, who grew up under the Stanchion Street overpasses, headlines Thorne Auditorium after four student rappers from the basement studios take the stage. Half the crowd is locals who knew him before he was anybody, and they make sure everyone knows it."
  },
  {
    title: 'Glass Harbor in Concert',
    description:
      "Shoegaze band Glass Harbor plays Thorne Auditorium at a volume its seashell acoustics were never designed for, and the SEB hands out earplugs at the door. A student noise-rock trio opens, and few can tell where its set ends and the headliner's soundcheck begins."
  },
  {
    title: 'An Evening with Darla Kincaid',
    description:
      'Country singer Darla Kincaid, three albums deep into songs about men who left, sells out the SEB\'s booking at Thorne Auditorium. A student bluegrass band opens, and by the encore the aisles are full of people line dancing who swore they hate country.'
  }
]

/** Spring's two-night formal galas, thrown by the SEB. */
const SPRING_GALAS: readonly OccasionEntry[] = [
  {
    title: 'The Rose & Gold',
    description:
      'The SEB rents the whole Veridan Museum of Art for two nights of the Rose & Gold, its biggest bill of the year, and seats dinner beneath the upside-down garden. Photographers work the front steps all evening, and the Girl at the Window collects more flowers than she does the rest of the semester.'
  },
  {
    title: 'Concordia Ball',
    description:
      "Named for the motto and called the Concordia by everyone who goes, the SEB's two-night ball takes over the Aquarium at Riverside, with a string quartet playing in the glass tunnel under the river. Duchess is booked for a cameo at the observation window both nights, and her handlers stress that she is not obliged to show."
  },
  {
    title: 'The Blossom Gala',
    description:
      "For two nights, the SEB turns the Riverside Mall's rooftop terrace into the Blossom Gala, with CAPC cherry trees in planters and the Threads lit pink all the way down. The dress code is black tie, a ticket costs more than most textbooks, and every inch of the river view ends up on Bunnyboard."
  },
  {
    title: 'Olympus Night',
    description:
      'Students call it Olympus: the SEB raises a white pavilion around the Jupiter statue at the North Entrance and lines the Gold Road with torches up to it for two nights. Dinner is seven courses, the orchestra plays past one, and the photo wall beneath Jupiter never has a short line.'
  }
]

/** Spring's one-night formal or themed dances, in a campus venue. */
const SPRING_DANCES: readonly OccasionEntry[] = [
  {
    title: 'Quiet Hours Formal',
    description:
      'The SEB hands out wireless headphones at the door of Kendall Library for the Quiet Hours Formal, a silent disco on three channels among the engraved shelves. Students in suits and gowns dance in total silence, which the librarians allowed on the condition that it stays that way.'
  },
  {
    title: 'Prom Redux',
    description:
      'Prom Redux is the SEB\'s second chance for anyone whose high school prom went badly, held in the Agora between the two indoor waterfalls. There are corsages at the door, a balloon arch for photos and a crowning at midnight that is taken far more seriously than it should be.'
  },
  {
    title: 'The Butterfly Ball',
    description:
      'The CAPC dims the Whitman Greenhouse for the Butterfly Ball, a pastel-dress-code dance strung through the orchard with the butterfly enclosure open as its centerpiece. Volunteers check every guest for stowaways on the way out.'
  },
  {
    title: 'Rooftop Formal',
    description:
      'The SEB clears the rooftop running track at Palaestra Stadium for the Rooftop Formal, with a DJ in the middle lane and string lights hung lap after lap. Couples slow dance where the sprinters usually stretch, and somebody always tries to run a lap in heels.'
  }
]

/** Fall's two-night formal galas, thrown by the SEB. */
const FALL_GALAS: readonly OccasionEntry[] = [
  {
    title: 'The Carousel Ball',
    description:
      'For two nights the SEB rents out all of Pier 44 for the Carousel Ball, and guests in black tie ride the antique carousel and the ferris wheel for free. It is the most photographed weekend of the year, mostly from the top of the wheel.'
  },
  {
    title: 'Premiere Night',
    description:
      'Premiere Night is the SEB\'s two-night gala at Future Cinema, which rolls a red carpet across both floors of gilded marble and velvet. Guests are announced by name on the way in, the big screen shows a reel of student films, and the press wall is staffed by real photographers who were paid more than any of the directors.'
  },
  {
    title: 'The Ember Gala',
    description:
      'The SEB books the glass sky lobby of a Promenade tower for the Ember Gala, two nights of amber candlelight, a jazz band and a Lumiere Fusion tasting menu forty floors up. It is the most expensive ticket student government sells, and the window tables are the most fought over.'
  },
  {
    title: 'The Lantern Ball',
    description:
      'The Lantern Ball pitches white marquees across the hills of Green Hill Park for two nights, with paper lanterns strung down the cobbled paths between them. The SEB runs shuttles from the Venus Quad, and every year a couple or two wanders off toward the marble memorials where people propose.'
  }
]

/** Fall's one-night formal or themed dances, in a campus venue. */
const FALL_DANCES: readonly OccasionEntry[] = [
  {
    title: 'High Rollers Formal',
    description:
      'The SEB turns the Pino-Cola Lounge into a casino for the High Rollers Formal, with play-money blackjack where the ping pong tables were and a dance floor between the arcade machines. The dress code is black tie, and the chips buy raffle tickets for prizes nobody can fit in a dorm room.'
  },
  {
    title: 'Speakeasy Formal',
    description:
      'The password for the Speakeasy Formal goes up on Bunnyboard an hour before the doors open, and the SEB means it. Inside, the Agora is dressed as a Prohibition-era club, with a swing band by the waterfalls and mocktails served in teacups.'
  },
  {
    title: 'Firelight Formal',
    description:
      'The CAPC lights every sunken fire pit in the Venus Quad for the Firelight Formal, an evening of semi-formal dress and a string band under the gazebos. The SEB hands out marshmallows for roasting, which do not get along with anyone\'s formalwear.'
  },
  {
    title: 'Black & White Ball',
    description:
      'The dress code for the Black & White Ball is enforced at the door of the Whitman Greenhouse: black, white, or turned away. Inside, the CAPC has strung white lights through the orchard, and a pianist plays a white grand beside the tropical pond.'
  }
]

/** Spring's half-day things during the day. */
const SPRING_DAY_FILLERS: readonly OccasionEntry[] = [
  {
    title: 'Fountain Coin Count',
    description:
      "CAPC volunteers in waders pull the semester's coins out of the Concord Fountain and count them on folding tables in the Venus Quad. A small crowd watches closely, as though their wishes were being audited."
  },
  {
    title: 'Ask Duchess',
    description:
      "The Aquarium at Riverside offers half-price student admission for the afternoon while Duchess's keeper takes questions in the observation room. Most of the questions are whether she remembers anyone, and the keeper's answer is a careful maybe."
  },
  {
    title: 'Speed Chess Open',
    description:
      'The chess club takes over the study desks of the Pino-Cola Lounge for an afternoon speed chess open, three minutes a side. Anyone can enter, the clocks get slapped hard enough to hear from the ping pong tables, and a freshman always wins.'
  },
  {
    title: 'Crate Day at Freights',
    description:
      'Freights Books & Records drags its bargain bins onto the Stanchion Street sidewalk for Crate Day, with dollar records and paperbacks sold by the pound. Students walk away with armfuls of vinyl and nothing to play it on.'
  },
  {
    title: 'Abandoned Bike Auction',
    description:
      'Campus security auctions off every bike left chained behind the Lowrises since last year, in the courtyard of Lowrise 1. Bidding starts at five dollars, and at least one student buys back a bike that was stolen from them.'
  },
  {
    title: 'Silktown Skyline Protest',
    description:
      'Downtown residents march from Green Hill Park to city hall against yet another Promenade tower, carrying hand-painted signs about the skyline. A few students join in, holding signs they were handed on the way.'
  },
  {
    title: 'Pastel Palace Test Batch',
    description:
      'Pastel Palace hands out free samples of an unreleased pastry outside its Stanchion Street storefront and asks for votes on Bunnyboard. The line is long, the samples are small, and singles are told they can take two.'
  },
  {
    title: 'SEB Blood Drive',
    description:
      "The SEB runs a blood drive on the Agora's ground floor, with nurses from a Downtown clinic and cookies for afterward. Every donor gets a sticker, and Bunnyboard keeps a running list of who fainted."
  },
  {
    title: 'Steps Debate',
    description:
      'The debate team argues absurd motions on the steps of Kendall Library for anyone passing between classes, the favorite being "This House Would Date Frederic Thorne". Spectators vote by standing on one side of the steps or the other.'
  },
  {
    title: 'Free Sketch Day',
    description:
      'The Veridan Museum of Art waives admission for students carrying a sketchbook, and art majors fill every bench beneath the upside-down garden. The guards keep a respectful distance from anyone drawing the Girl at the Window.'
  },
  {
    title: 'Latte Art Throwdown',
    description:
      'Baristas from across the city pour latte art head to head in the vault of Reserve Bank Cafe while a judge squints at each cup. Spectators get to drink the losing entries.'
  },
  {
    title: 'Dodgeball Finals',
    description:
      'The intramural dodgeball league plays its finals in a Palaestra Stadium gymnasium, where teams in shirts printed with bad puns throw harder than the rules allow. The bleachers are full of friends who came to watch somebody get hit.'
  }
]

/** Spring's half-day things in the evening. */
const SPRING_NIGHT_FILLERS: readonly OccasionEntry[] = [
  {
    title: 'Stalestein Poetry Slam',
    description:
      'The Stalestein turns its small stage over to a poetry slam judged by three regulars holding up scorecards. Students read about heartbreak, the bikers snap along, and nobody is spared the scores.'
  },
  {
    title: 'Love Between Gods Quote-Along',
    description:
      'Future Cinema screens "Love Between Gods" for a crowd that knows every line, armed with props handed out at the door. Every time someone on screen says "Meet me where Gold crosses Rose", the whole theater says it with them.'
  },
  {
    title: 'Dumpling Showdown',
    description:
      'Eastern Buffet hosts an eating showdown for anyone who thinks they can join the champions framed by the register, timed by the owner himself. Spectators pay the usual twelve dollars and eat steadily through the whole thing.'
  },
  {
    title: 'PARADISO Song Drop',
    description:
      'BTB Arcade unlocks a new song pack for PARADISO, and the line runs around the block from the moment the doors open. Players sweat through the new tracks in front of a crowd, and the leaderboard has changed hands by midnight.'
  },
  {
    title: 'Astronomy Club Star Party',
    description:
      'The astronomy club sets up telescopes on the highest hill in Green Hill Park, far enough from the Promenade towers to see the stars. Members explain what everything is to anyone who walks up, and couples on blankets pretend to listen.'
  },
  {
    title: "Bobby's Diner Trivia",
    description:
      "Bobby's Diner keeps the kitchen open late for trivia night, with the questions read by the current Bobby from behind the counter. Tables of students lose, reliably, to a booth of retirees who have been winning for twenty years."
  },
  {
    title: 'Night Bloom Walk',
    description:
      'The CAPC keeps the Whitman Greenhouse open after dark for its night-blooming flowers, with the paths lit low and volunteers pointing them out. Most people get lost in the maze on purpose.'
  },
  {
    title: 'Elysium Porch Crawl',
    description:
      'Every porch light in Elysium Village goes on for the porch crawl, and residents set out drinks and snacks for anybody walking the row. It is the one night an underclassman can get into an Elysium party without knowing anyone.'
  },
  {
    title: 'Basement Sessions',
    description:
      'Thorne Auditorium opens its basement practice rooms for the night, each one hosting a different student act. Listeners drift from door to door, and the walls are thick enough that nobody hears the next band until they walk in on it.'
  },
  {
    title: 'Stanchion Night Market',
    description:
      'Vendors set up stalls between the overpass pillars of Stanchion Street, selling skewers, secondhand clothes and handmade jewelry under the hanging lanterns. The CuteTea on the street runs a half-price stall for anyone with a student ID.'
  },
  {
    title: 'Food Court Karaoke',
    description:
      "Once the Agora's food court closes, the SEB rolls a karaoke machine out in front of the waterfalls and lets anyone sign up. The song list is enormous, and the same three songs are sung all night."
  },
  {
    title: 'Apogee Student Night',
    description:
      'Club Apogee waives its cover for anyone with a student ID, though the drink prices stay exactly where they are. Students who have never been up crowd the glass section to look straight down forty floors.'
  }
]

/** Spring's half-day things during the day in spring break, put on by the city or the students who stayed. */
const SPRING_DAY_BREAK: readonly OccasionEntry[] = [
  {
    title: 'Wristband Day at Pier 44',
    description:
      'With campus mostly shut, Pier 44 hands a free ride wristband to anybody with a student ID. The few students who stayed share the carousel with every family in town.'
  },
  {
    title: 'Silk River Paddle',
    description:
      'The city parks department leads a guided kayak trip down the Silk River from the Downtown docks, past the Selkie Beach hotels and under the ferris wheel at Pier 44. Students left on campus make up half the group, and the guide tells the same jokes every trip.'
  },
  {
    title: "Stayers' Brunch",
    description:
      "Bobby's Diner runs a half-price brunch for students who stayed through the break, and the current Bobby comes out of the kitchen to ask each table why they didn't go somewhere."
  },
  {
    title: 'Courtyard Yard Sale',
    description:
      'The students left in the Lowrises spread a yard sale across the Lowrise 2 courtyard, selling whatever their neighbors left behind in the shared kitchens. Prices are low, and questions about ownership go unanswered.'
  },
  {
    title: 'Selkie Sandcastle Contest',
    description:
      'The resort that owns Selkie Beach runs a sandcastle contest for the tourist crowd, judged by a lifeguard from his tall chair. Students who stayed enter in teams and lose, every time, to a family of four with real tools.'
  },
  {
    title: 'Silktown History Walk',
    description:
      'A retired mill worker leads the city\'s free walking tour through Downtown\'s brick mill buildings, finishing at the Veridan Museum of Art in front of the Girl at the Window. He tells everyone who she was, and it is a different story every time.'
  }
]

/** Spring's half-day things in the evening in spring break, put on by the city or the students who stayed. */
const SPRING_NIGHT_BREAK: readonly OccasionEntry[] = [
  {
    title: 'Quad Campout',
    description:
      'The students who stayed pitch tents around the Concord Fountain, since there is nobody around to stop them. The CAPC files a complaint about the grass, and nobody reads it.'
  },
  {
    title: 'CuteTea Game Marathon',
    description:
      'The Stanchion Street CuteTea keeps its tables open until dawn for the students left in town, lending its whole board game shelf to anyone who buys a drink. By midnight the regulars have taught the stayers every rule wrong.'
  },
  {
    title: 'Empty Fridge Potluck',
    description:
      'The few upperclassmen left in Elysium Village pool whatever is in their fridges for a potluck on one patio, porch lights on for anyone else still around. Nobody admits which dish they made.'
  },
  {
    title: 'Leaderboard Night at BTB',
    description:
      'With no lines at BTB Arcade for once, the students who stayed spend the night chasing scores on the oldest cabinets in the back. A few records older than anyone playing finally fall.'
  },
  {
    title: 'Eastern Buffet All-Nighter',
    description:
      'Eastern Buffet becomes the unofficial clubhouse of everyone who stayed for the break, a long table of students playing cards until sunrise on one twelve-dollar entry each.'
  },
  {
    title: 'Threads After Dark',
    description:
      'The Riverside Mall projects a light show onto the Threads after closing for the tourists in town, with the kinetic sculpture turning in time to the music. The best view is from the rooftop terrace, and the handful of students left in town get there first.'
  }
]

/** Fall's half-day things during the day. */
const FALL_DAY_FILLERS: readonly OccasionEntry[] = [
  {
    title: 'Kendall Book Sale',
    description:
      'Kendall Library sells off its withdrawn books on tables in the main lobby, a dollar a bag and fill it yourself. Some students leave with a textbook for the class they are failing, others with a ten-pound atlas they cannot explain.'
  },
  {
    title: 'Chalk the Gold Road',
    description:
      'The CAPC hands out buckets of chalk and gives every club a square of the Gold Road to draw on, with a prize for the best. By late afternoon the road is a mile of mascots, portraits of Thorne and at least one thing that has to be hosed off.'
  },
  {
    title: 'Lotterdale Chili Cook-Off',
    description:
      'A dozen Silktown cooks bring their chili to Lotterdale Market and let anyone with a spoon vote. Students come for the free tasting and leave, as always, with a lamp they did not need.'
  },
  {
    title: 'Laser Tag Open',
    description:
      "The laser tag arena on the Riverside Mall's lower floors hosts an open tournament for teams of four, with the bracket posted by the entrance. The pre-med students take it the most seriously, and nobody knows why."
  },
  {
    title: 'Flu Shot Clinic',
    description:
      'The campus health center sets up a free flu shot clinic in the Agora, with a sticker and a lollipop for anybody who does not cry. The line moves faster than the one for coffee.'
  },
  {
    title: 'Secret Menu Crawl',
    description:
      'Fast Eats prints a stamp card for all five of its locations, each one serving a single item off its secret menu, and students ride the Loop between them to collect the set. A full card wins a T-shirt nobody would wear outside.'
  },
  {
    title: 'Abolish the 8AM',
    description:
      'Students rally at the Jupiter statue at the North Entrance with signs demanding later classes, led by a club founded for this and nothing else. The administration responds with a polite letter and an intern carrying donuts.'
  },
  {
    title: 'Orchard Picking at Whitman',
    description:
      'The CAPC lets students into the Whitman Greenhouse orchard to pick whatever is ripe, one paper bag per person. Volunteers check the bags at the exit, and the bruised fruit goes to the butterflies.'
  },
  {
    title: 'Carousel Workshop Open House',
    description:
      "The restorers who keep Pier 44's antique carousel turning open their workshop for an afternoon, with half-painted horses propped on sawhorses and tools older than anyone holding them. Visitors are allowed to sand, but never to paint."
  },
  {
    title: 'Elysium Croquet Tournament',
    description:
      'Upperclassmen in Elysium Village lay out a croquet course across the lawns between the townhouses and play it in blazers they insist they own for this. Spectators are handed lemonade and expected to clap politely.'
  }
]

/** Fall's half-day things in the evening. */
const FALL_NIGHT_FILLERS: readonly OccasionEntry[] = [
  {
    title: 'Cover Night at the Stalestein',
    description:
      'Student bands at the Stalestein each play one famous album start to finish, drawn from a hat at the start of the night. The results range from tribute to crime.'
  },
  {
    title: 'Vault Heist Mystery',
    description:
      'Reserve Bank Cafe runs a mystery night built on its own unsolved heist, with actors playing the suspects and clues hidden around the vault. Every year, the teams of students accuse the barista, and every year they are wrong.'
  },
  {
    title: 'CuteTea League Finals',
    description:
      'The board game league plays its finals at the Stanchion Street CuteTea, borrowing every copy of every game in the shop. Spectators crowd the tables with bubble tea, and at least one friendship ends before closing.'
  },
  {
    title: 'Tunnel Nights',
    description:
      'The Aquarium at Riverside stays open late for an over-21 evening, with a bar at the mouth of the glass tunnel under the river. Couples take their drinks under the riverbed, and the jellyfish room\'s waiting list is suspended for the night.'
  },
  {
    title: 'Movies on Green Hill',
    description:
      'The city parks department hangs a screen on the slope of Green Hill Park and shows an old romance to anyone who brings a blanket. Students claim the best spots early and talk through the whole film.'
  },
  {
    title: 'Stand-Up in the Agora',
    description:
      "The comedy club runs an open stand-up night on the Agora's second level, five minutes per comic and a light that means stop. Half the jokes are about Frederic Thorne, who is rumored to be in the audience in a fake mustache."
  },
  {
    title: 'Lumiere Student Seating',
    description:
      'Lumiere Fusion opens one dinner seating at a student price, and the chef uses it to try out dishes too strange for the paying crowd. Diners are asked to fill in a comment card, and most leave it blank because they are not sure what they ate.'
  },
  {
    title: 'Kendall Lock-In',
    description:
      'The library club stays in Kendall Library after closing for a scavenger hunt through the stacks, with clues hidden in the screened terminals and inside books nobody has checked out in years. The winners get their names on a brass plate on the shelf where the last clue was.'
  },
  {
    title: 'After Hours at Freights',
    description:
      'Freights Books & Records clears its lobby after closing for an acoustic jam, and anyone with an instrument can sit in under the signed photos of musicians who played there before. The rest of the store stays open, and the curtained reading nooks are never empty.'
  },
  {
    title: 'Glow Swim',
    description:
      "Palaestra Stadium turns off its pool lights and drops glow sticks in the water for a late swim, with music on the deck and lifeguards in neon. The swim team pretends to be above it and stays until closing."
  }
]

/** Fall's half-day things during the day in Thanksgiving break, put on for Friendsgiving week. */
const FALL_DAY_BREAK: readonly OccasionEntry[] = [
  {
    title: 'Pie Bake-Off',
    description:
      "Lowrise 3's kitchen volunteers judge a pie bake-off ahead of Friendsgiving, open to anyone with an oven and a family recipe. The winner gets a ribbon, and the losing pies are gone in about ten minutes."
  },
  {
    title: 'Grocery Shuttle',
    description:
      'The SEB runs free shuttles to SpringMart so students can shop for Friendsgiving, and SpringMart hands out recipe cards at the door. By the afternoon there is no stuffing mix left anywhere in town.'
  },
  {
    title: 'Centerpiece Workshop',
    description:
      'The CAPC hosts a centerpiece workshop in the Whitman Greenhouse, handing out cuttings, gourds and twine to anyone setting a Friendsgiving table. The results are carried home with great pride and some soil.'
  },
  {
    title: 'Can Sculpture Drive',
    description:
      'The SEB collects canned food in the Agora for a Silktown food bank, stacking every donation into a sculpture that grows as the day goes on. The engineering students have taken over the design by lunchtime.'
  },
  {
    title: 'Gratitude Wall',
    description:
      'The CAPC puts up a wall of sticky notes in the Venus Quad asking what students are thankful for. By the afternoon, half the notes thank Freddy and the other half are anonymous confessions.'
  }
]

/** Fall's half-day things in the evening in Thanksgiving break, put on for Friendsgiving week. */
const FALL_NIGHT_BREAK: readonly OccasionEntry[] = [
  {
    title: 'Turkey Shoot at BTB',
    description:
      'BTB Arcade runs a tournament on its old light-gun cabinets, and the prize is a frozen turkey. The winner, every year, has no idea how to cook it in a Lowrise kitchen.'
  },
  {
    title: 'Lights Test at Pier 44',
    description:
      'Pier 44 switches on its holiday lights for a test run ahead of the season, and students drift down the boardwalk to ride the carousel under them before the crowds arrive.'
  },
  {
    title: 'Townie Night at the Stalestein',
    description:
      'Silktown kids home from colleges elsewhere pack the Stalestein for the holiday week, and the students who wander in are outnumbered by people who went to high school together. The bartender knows all of their parents.'
  },
  {
    title: 'Holiday Double Feature',
    description:
      'Future Cinema runs a double feature of old holiday movies, with free popcorn for anyone who shows a student ID. The audience heckles the first film and cries at the second.'
  },
  {
    title: 'Gravy Rehearsal',
    description:
      "Lowrise 3's kitchen volunteers do a practice run of their Friendsgiving dishes and let anyone wander in to taste the failures. There are several, and they all get eaten."
  }
]
