import type { SecretTier } from '@shared/types'

/**
 * The authored secrets a girl's blank tiers are dealt from when nobody writes hers, each one
 * plausible of almost anyone: no family, origins, body or love life it could contradict.
 */

/** Light surprises she owns up to once they are friends. */
const FRIENDLY: readonly string[] = [
  '{name} is ranked in the top fifty worldwide at Pocket Orchard, a farming game she plays under the name LettuceQueen.',
  "{name} can recite every episode of a children's cartoon about a hedgehog detective, and still puts one on when she cannot sleep.",
  '{name} keeps a shoebox of more than three hundred fortune-cookie fortunes, sorted by how well each one came true.',
  'Every morning, {name} reads the weather forecast aloud to her houseplants, each of which has a name.',
  '{name} writes long, earnest reviews of breakfast cereals on a forum for cereal enthusiasts, under a username she will not share.',
  '{name} taught herself to juggle from library videos and can keep five beanbags in the air, though nobody has ever seen her do it.',
  '{name} has written down her dreams every morning for five years and keeps a color-coded index of the ones that come back.',
  '{name} sings sea shanties in the shower, loudly, and knows every verse of more than forty of them.',
  '{name} reads her horoscope in three different places each morning and goes with whichever one she likes best.',
  '{name} can solve a puzzle cube in under a minute, and only takes the one in her bag out when she is alone.',
  '{name} has watched all nine seasons of Gavel & Grace, a decades-old courtroom soap, twice over and is halfway through a third.',
  '{name} still sleeps with a stuffed platypus called Sergeant, who has been patched so many times he is mostly thread.',
  'Every Sunday, {name} practices calligraphy, and has filled six notebooks with the same alphabet over and over.',
  '{name} can whistle nearly any birdcall she has heard, and once kept a birdwatcher in the park searching the trees for twenty minutes.',
  '{name} paints tiny landscapes on bottle caps and leaves them in odd corners around town without ever saying who made them.',
  '{name} writes her shopping lists in a cipher she invented at eleven, and is faster at it now than at ordinary handwriting.',
  '{name} bakes bread every weekend and has kept the same sourdough starter, which she calls Gerald, alive for four years.',
  '{name} knows the rules of curling better than most people who play it, and stays up through the night to watch the championships.',
  '{name} falls asleep every night to the same eight-hour recording of rain on a tin roof, and has since middle school.',
  '{name} does jigsaw puzzles of a thousand pieces or more, then glues each one together and slides it under her bed.',
  '{name} knits tiny hats for her collection of rubber ducks, a new one for every season.',
  "{name} can name almost any car's make and model from its headlights alone, a game she never stopped playing after childhood road trips.",
  '{name} buys old postcards at flea markets and writes replies to the strangers who sent them, which she keeps in a tin.',
  '{name} practices magic tricks in front of her mirror, and can make a coin vanish so cleanly that she has never dared show anyone.'
]

/** What she keeps from most people, told once she trusts him. */
const TRUSTED: readonly string[] = [
  '{name} has failed her driving test four times, and has let everyone assume she just prefers to walk.',
  '{name} has a half-finished novel of more than two hundred thousand words on her laptop that she has never let a single person read.',
  '{name} never learned to ride a bicycle, and has spent years inventing reasons to take the bus instead.',
  '{name} still sleeps with a lamp on, and tapes over the gap under her door so nobody sees the light.',
  '{name} was caught cheating on a final exam in high school and had it quietly overlooked, and she still half expects it to come out.',
  '{name} puts a little money into a jar every month toward seeing the northern lights, and has never told anyone what the jar is for.',
  '{name} froze so completely at a singing audition when she was sixteen that she walked off without a note, and has never auditioned for anything since.',
  '{name} sees a counselor every other week for panic attacks, and books the appointments at hours when nobody would think to ask where she is.',
  '{name} quit piano lessons after one bad recital and has never played for an audience since, though she still plays silent scales on tabletops whenever she is nervous.',
  '{name} applied to an art school in secret, was accepted, and turned it down without telling anyone it had happened.',
  '{name} writes a letter to her future self every New Year, and has never been brave enough to open any of the old ones.',
  '{name} has read the same self-help book on making friends nine times, with its chapter headings underlined in four colors.',
  '{name} was suspended for a week in high school for a fight she started, and has made sure nobody she has met since knows about her temper.',
  '{name} is so afraid of hospitals that she once walked out of an emergency room with a broken wrist rather than wait to be seen.',
  '{name} has kept every birthday card she has ever been given in a shoebox, and counts them each year to see whether there are more than last time.',
  '{name} shoplifted a lipstick at fourteen, and has mailed the store an anonymous money order every year since to make up for it.',
  '{name} has a folder of floor plans she has drawn for the little bookshop she hopes to run one day, down to where the armchairs go.',
  '{name} was held back a year in elementary school, and has told everyone since that she simply started late.',
  '{name} spent years training a stutter out of herself, and avoids talking late at night because that is when it comes back.',
  '{name} gets sick with nerves before every presentation, and has thrown up beforehand more times than she can count.',
  '{name} has kept a bag packed under her bed with clothes, cash and a phone charger since she was fifteen, just in case.',
  '{name} keeps a notebook of stand-up material, and has signed up for an open mic twice only to leave before her name was called.',
  '{name} has been teaching herself sign language for three years in the hope of becoming an interpreter, and tells nobody in case she gives up.',
  '{name} keeps a list of everyone she thinks she has ever disappointed, and reads it back to herself on nights she cannot sleep.'
]

/** The deepest of her secrets, told once she is devoted to him. */
const DEVOTED: readonly string[] = [
  '{name} spent most of a year in a hospital bed at ten with an illness her doctors could not name at first, and taught herself to read properly from the books the nurses brought her.',
  'When {name} was eight, she was separated from everyone at a crowded fair and spent a whole night alone before she was found. She still cannot stand in a crowd without first finding the exits.',
  '{name} was in a car that slid off an icy road and rolled when she was fourteen, and she hung upside down in her seatbelt for an hour before help came.',
  '{name} was bullied so badly in middle school that she ate lunch in a bathroom stall for most of two years, and has never told anyone how long it went on.',
  'The house {name} grew up in burned down when she was eleven, and the only thing she carried out was a library book that was not even hers.',
  '{name} once found a stranger collapsed on a sidewalk and did CPR until the ambulance came, and she never found out whether he lived.',
  "{name}'s grandmother, the person she was closest to growing up, no longer recognizes her, and {name} still visits her as the polite young woman who comes to help.",
  '{name} won a national story contest at twelve, and the next year a teacher accused her of copying it in front of the whole class. She has never shown anyone a story of hers since.',
  '{name} had a childhood friend who moved away without saying goodbye when they were ten, and she wrote to her every week for a year without ever getting an answer.',
  '{name} nearly drowned at nine when a riptide pulled her out past the swimmers, and the lifeguard who brought her back told her she had been under for over a minute.',
  '{name} was away at an exam the day her dog of twelve years had to be put down, and she never got to say goodbye to him.',
  '{name} trained as a gymnast for eight years until a coach told her at fourteen, in front of the whole team, that she would never be good enough. She quit that night and never went back.',
  '{name} spent a night in a police station at sixteen after being mistaken for a shoplifter, and nobody came to collect her until morning.',
  '{name} kept a diary from the age of nine until it was found and read aloud at a sleepover when she was fifteen. She burned every page that night and has never kept a diary since.',
  '{name} once waited a whole day at a bus station for someone who had promised to come for her, and they never came.',
  '{name} was left behind by her hiking group on a mountain trail at fourteen and spent the night alone in a space blanket, listening for the search party.',
  "{name} was accused of stealing money from a teacher's desk at thirteen, and though she was cleared, people in her town never quite stopped believing she did it.",
  "{name} lost on the final question of a televised children's quiz show at eleven, and the clip of her face still goes around online as a joke.",
  '{name} had a seizure in the middle of a school play at twelve, in front of the entire audience, and still has to sit down alone for a minute before she walks onto any stage.',
  '{name} was the last person to talk to a teacher she adored before he died suddenly, and she has never told anyone what he said to her.',
  '{name} found out at sixteen that the drawings that had won her prizes for years had been quietly finished by the adult who coached her, and that none of the prizes were really hers.',
  '{name} was caught in a crowd crush at a concert at fifteen and came to on the grass with a stranger holding her hand. She still never stands anywhere in a crowd she cannot see a way out of.',
  '{name} spent the summer she turned thirteen caring for a relative after a stroke, feeding and bathing him every day, and fell so far behind that she nearly had to repeat the year.',
  '{name} trained for a year for a scholarship competition at sixteen and was disqualified on the day over a rule nobody had told her about. She still keeps the envelope with her score in it, unopened.'
]

/** The grab bag one tier's secrets are dealt from. */
export function secretBagOf(tier: SecretTier): string {
  return `newGame.secret.${tier}`
}

/** One pooled secret said of her: `{name}` is her first name. */
export function secretFor(template: string, firstName: string): string {
  return template.split('{name}').join(firstName)
}

/** Every tier's secrets, each with `{name}` where her first name goes. */
export const SECRET_POOLS: Record<SecretTier, readonly string[]> = { friendly: FRIENDLY, trusted: TRUSTED, devoted: DEVOTED }
