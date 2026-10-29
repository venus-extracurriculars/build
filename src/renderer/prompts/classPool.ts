import type { CatalogEntry, CatalogPool } from '@shared/application'

/**
 * The authored classes a skipped catalog is dealt from: each of the four catalog pools, and
 * the interest classes a girl's own is drawn from. Codes and titles are unique across every
 * pool; PE carries no kind, and none of it is a swim class, which the scheduler adds itself.
 */

/** A pool the skipped catalog is dealt from: the four catalog pools and the interest classes. */
export type ClassPoolId = CatalogPool | 'interest'

/** The grab bag one class pool is dealt from. */
export function classBagOf(pool: ClassPoolId): string {
  return `newGame.class.${pool}`
}

/** Physical education: sports, fitness and movement classes, every one on dry land. */
const PE_CLASSES: readonly CatalogEntry[] = [
  {
    code: 'PHED 104',
    title: 'Beginning Tennis',
    description:
      'Grips, groundstrokes, the serve and the rules of scoring, played out in singles and doubles on the outdoor courts.'
  },
  {
    code: 'PHED 108',
    title: 'Volleyball',
    description:
      'Passing, setting, hitting and serve receive, built up through drills into six-a-side matches with full rotations.'
  },
  {
    code: 'PHED 110',
    title: 'Hatha Yoga',
    description:
      'Standing postures, balances, breathwork and a long final rest, held at a pace that rewards patience over flexibility.'
  },
  {
    code: 'PHED 112',
    title: 'Weight Training',
    description:
      'Safe form on the squat, bench press and deadlift, with a progressive program each student records in a training log.'
  },
  {
    code: 'PHED 115',
    title: 'Rock Climbing',
    description:
      'Knots, belaying and movement on the indoor wall, from a first top-rope route to reading a problem before stepping onto it.'
  },
  {
    code: 'PHED 117',
    title: 'Fencing',
    description:
      'Foil footwork, parries and ripostes, practiced in mask and jacket and finished with a round-robin tournament.'
  },
  {
    code: 'PHED 120',
    title: 'Badminton',
    description:
      'Clears, drops and smashes, the high serve and the low, and the court sense that wins a doubles rally.'
  },
  {
    code: 'PHED 122',
    title: 'Mat Pilates',
    description:
      'Core control, alignment and breathing through the classical mat sequence, slow enough that every repetition counts.'
  },
  {
    code: 'PHED 125',
    title: 'Distance Running',
    description:
      'Base mileage, interval days and pacing, building every runner toward a timed five-kilometer race at the end of term.'
  },
  {
    code: 'PHED 127',
    title: 'Basketball',
    description:
      'Ball handling, shooting form and team defense, with half-court drills giving way to full-court games.'
  },
  {
    code: 'PHED 130',
    title: 'Self-Defense',
    description:
      'Awareness, boundary-setting and practical escapes from grabs and holds, rehearsed until they come without thinking.'
  },
  {
    code: 'PHED 132',
    title: 'Archery',
    description:
      'Stance, anchor and release with the recurve bow, shot on the outdoor range at targets from ten meters out to thirty.'
  },
  {
    code: 'PHED 135',
    title: 'Golf',
    description:
      'Grip, stance and the full swing on the driving range, then chipping, putting and the etiquette of a round.'
  },
  {
    code: 'PHED 137',
    title: 'Soccer',
    description:
      'First touch, passing and positional play, worked through small-sided games before the full eleven take the field.'
  },
  {
    code: 'PHED 140',
    title: 'Taekwondo',
    description:
      'Stances, blocks and kicks drilled through the traditional forms, with controlled sparring and a belt test at the close of term.'
  },
  {
    code: 'PHED 142',
    title: 'Indoor Cycling',
    description:
      'Interval and endurance rides on stationary bikes, paced by cadence and heart rate and set to music.'
  },
  {
    code: 'PHED 145',
    title: 'Ultimate Disc',
    description:
      'Backhand and forehand throws, cutting and the stack offense, played in self-officiated games that run on good sportsmanship.'
  },
  {
    code: 'PHED 147',
    title: 'Table Tennis',
    description:
      'Topspin, backspin and the short serve, with footwork drills and a challenge ladder that reshuffles every week.'
  },
  {
    code: 'PHED 150',
    title: 'Tai Chi',
    description:
      'The slow, continuous movements of the short Yang-style form, practiced for balance, breath and a quieter mind.'
  },
  {
    code: 'PHED 155',
    title: 'Hiking and Trail Fitness',
    description:
      'Conditioning walks that build into weekend trail outings, with pacing, footwear, map reading and leave-no-trace practice along the way.'
  }
]

/** Humanities: history, philosophy, literature, languages and religion. */
const HUMANITIES_CLASSES: readonly CatalogEntry[] = [
  {
    code: 'HIST 110',
    title: 'The Ancient Mediterranean World',
    description:
      'Greece, Rome and their neighbors from the Bronze Age collapse to the fall of the Western Empire, read through the sources they left behind.',
    kind: 'lecture'
  },
  {
    code: 'PHIL 101',
    title: 'Introduction to Philosophy',
    description:
      'Knowledge, mind, free will and the good life, argued through short readings from Plato to the present.',
    kind: 'lecture'
  },
  {
    code: 'ENGL 220',
    title: 'The Nineteenth-Century Novel',
    description:
      'Long books for long evenings: Austen, the Brontës, Dickens, Eliot and Tolstoy on marriage, money and ambition.',
    kind: 'lecture'
  },
  {
    code: 'ENGL 240',
    title: 'The Personal Essay',
    description:
      'A writing workshop in memoir and the personal essay, reading masters of the form and turning in a polished essay every three weeks.',
    kind: 'project'
  },
  {
    code: 'SPAN 101',
    title: 'Elementary Spanish I',
    description:
      'Everyday conversation, the present tense and the vocabulary of food, family and travel, taught almost entirely in Spanish.',
    kind: 'lecture'
  },
  {
    code: 'JPN 101',
    title: 'Elementary Japanese I',
    description:
      'Hiragana, katakana and the first hundred kanji, with the polite speech of greetings, shopping and asking the way.',
    kind: 'lecture'
  },
  {
    code: 'RELS 150',
    title: 'World Religions',
    description:
      'The scriptures, rituals and calendars of Hinduism, Buddhism, Judaism, Christianity and Islam, studied side by side and on their own terms.',
    kind: 'lecture'
  },
  {
    code: 'HIST 245',
    title: 'The Silk Roads',
    description:
      'Caravans, monasteries and markets across Asia from the Han dynasty to the Mongols, traced through the goods and ideas they carried.',
    kind: 'lecture'
  },
  {
    code: 'HIST 290',
    title: 'Oral History Workshop',
    description:
      'Students record, transcribe and archive interviews with members of the surrounding community, learning the craft and ethics of history told aloud.',
    kind: 'project'
  },
  {
    code: 'CLAS 205',
    title: 'Greek and Roman Mythology',
    description:
      'Gods, heroes and monsters in the epics and plays where they first appear, and in the paintings and films that keep retelling them.',
    kind: 'lecture'
  }
]

/** Arts: studio art, music, theater, film, design, dance and photography. */
const ARTS_CLASSES: readonly CatalogEntry[] = [
  {
    code: 'ARTS 110',
    title: 'Drawing I',
    description:
      'Line, value and proportion drawn from observation in graphite and charcoal, working from still lifes, interiors and the clothed figure.',
    kind: 'project'
  },
  {
    code: 'ARTS 130',
    title: 'Ceramics: Wheel Throwing',
    description:
      "Centering, pulling and trimming on the potter's wheel, through to glazing and firing a finished set of cups and bowls.",
    kind: 'project'
  },
  {
    code: 'MUS 105',
    title: 'Music Appreciation',
    description:
      'How to listen to a symphony, a string quartet and an opera, on a tour of the concert tradition from Bach to the present.',
    kind: 'lecture'
  },
  {
    code: 'MUS 140',
    title: 'Music Theory I',
    description:
      'Scales, intervals, chords and four-part harmony, with ear training and sight-singing to make the notation audible.',
    kind: 'lecture'
  },
  {
    code: 'THEA 120',
    title: 'Acting I',
    description:
      'Voice, movement and scene study, building toward two-person scenes performed for an audience in the last week of term.',
    kind: 'project'
  },
  {
    code: 'FILM 200',
    title: 'Film History',
    description:
      'Silent comedy, the Hollywood studios, the European new waves and beyond, with a screening every week and the vocabulary to discuss it.',
    kind: 'lecture'
  },
  {
    code: 'DSGN 150',
    title: 'Typography',
    description:
      'The anatomy of letterforms and the craft of setting text for print and screen, ending in a booklet designed from cover to colophon.',
    kind: 'project'
  },
  {
    code: 'DANC 140',
    title: 'Contemporary Dance',
    description:
      'Floor work, release technique and improvisation, culminating in a short piece the class choreographs and performs together.',
    kind: 'project'
  },
  {
    code: 'ARTH 210',
    title: 'Modern Art',
    description:
      'From Impressionism to Abstract Expressionism, the movements, manifestos and scandals that remade painting between 1860 and 1960.',
    kind: 'lecture'
  },
  {
    code: 'PHOT 120',
    title: 'Black-and-White Photography',
    description:
      'Manual exposure, film developing and enlarging in the darkroom, toward a portfolio of a dozen finished silver gelatin prints.',
    kind: 'project'
  }
]

/** Department courses at the intro and intermediate levels, which also serve as major classes. */
const MISC_CLASSES: readonly CatalogEntry[] = [
  {
    code: 'BIO 110',
    title: 'Principles of Biology',
    description:
      'Cells, genes, evolution and ecology, the four big ideas of the life sciences, with a weekly lab to see them at work.',
    kind: 'lecture'
  },
  {
    code: 'BIO 220',
    title: 'Genetics',
    description:
      "From Mendel's peas to modern genomics: inheritance, gene expression, mutation and the tools that read and edit DNA.",
    kind: 'lecture'
  },
  {
    code: 'BIO 240',
    title: 'Human Anatomy and Physiology',
    description:
      'The organ systems of the human body, how each is built and how each works, learned on models and in the dissection lab.',
    kind: 'lecture'
  },
  {
    code: 'BIO 315',
    title: 'Field Ecology',
    description:
      'Students design and carry out a study of a local population or habitat, from sampling plan to final report.',
    kind: 'project'
  },
  {
    code: 'CHEM 111',
    title: 'General Chemistry I',
    description:
      'Atoms, bonds, stoichiometry and the gas laws, with problem sets each week and lab sessions to match.',
    kind: 'lecture'
  },
  {
    code: 'CHEM 230',
    title: 'Organic Chemistry I',
    description:
      'The structure and reactions of carbon compounds, with mechanisms drawn arrow by arrow until they become second nature.',
    kind: 'lecture'
  },
  {
    code: 'CHEM 340',
    title: 'Biochemistry',
    description:
      "Proteins, enzymes and metabolism, following the molecules that turn a meal into a muscle's work.",
    kind: 'lecture'
  },
  {
    code: 'PHYS 101',
    title: 'Physics I: Mechanics',
    description:
      'Motion, forces, energy and momentum, built on algebra and trigonometry and tested on real carts, springs and pendulums.',
    kind: 'lecture'
  },
  {
    code: 'PHYS 202',
    title: 'Electricity and Magnetism',
    description:
      "Charges, fields, circuits and waves, from Coulomb's law to the four equations that unify them.",
    kind: 'lecture'
  },
  {
    code: 'ASTR 105',
    title: 'The Solar System',
    description:
      'The sun, planets, moons and comets, what we know of them and how, with telescope viewing on clear evenings.',
    kind: 'lecture'
  },
  {
    code: 'GEOL 101',
    title: 'Physical Geology',
    description:
      'Minerals, rocks, plate tectonics and the slow work of water and ice, with field trips to read the landscape firsthand.',
    kind: 'lecture'
  },
  {
    code: 'ENVS 120',
    title: 'Introduction to Environmental Science',
    description:
      'Climate, water, energy and biodiversity as connected systems, and the science behind the policy arguments over each.',
    kind: 'lecture'
  },
  {
    code: 'ENVS 310',
    title: 'Sustainable Design Studio',
    description:
      'Teams audit the energy and water use of a building on campus and present a costed plan to make it greener.',
    kind: 'project'
  },
  {
    code: 'PSYC 101',
    title: 'Introduction to Psychology',
    description:
      'Perception, memory, learning, emotion and disorder, a survey of the mind and the experiments that mapped it.',
    kind: 'lecture'
  },
  {
    code: 'PSYC 210',
    title: 'Developmental Psychology',
    description:
      'How people change from infancy to old age, in body, thought and language and in the relationships that shape them.',
    kind: 'lecture'
  },
  {
    code: 'PSYC 230',
    title: 'Social Psychology',
    description:
      'Conformity, persuasion, prejudice and attraction, and the classic studies of how other people change what we do.',
    kind: 'lecture'
  },
  {
    code: 'PSYC 250',
    title: 'Research Methods in Psychology',
    description:
      'Students design, run and write up an original experiment, from hypothesis and consent forms to statistics and a poster.',
    kind: 'project'
  },
  {
    code: 'SOC 101',
    title: 'Introduction to Sociology',
    description:
      'Class, race, gender, family and religion as social forces, and the methods sociologists use to see them.',
    kind: 'lecture'
  },
  {
    code: 'SOC 240',
    title: 'Urban Sociology',
    description:
      'Cities as places people make and are made by: neighborhoods, segregation, gentrification and the street life between them.',
    kind: 'lecture'
  },
  {
    code: 'ANTH 102',
    title: 'Cultural Anthropology',
    description:
      "Kinship, ritual, exchange and belief across the world's cultures, studied through ethnographies of everyday life.",
    kind: 'lecture'
  },
  {
    code: 'ANTH 260',
    title: 'Ethnographic Fieldwork',
    description:
      'Students choose a community on or near campus, observe and interview its members through the term and write a short ethnography.',
    kind: 'project'
  },
  {
    code: 'ECON 101',
    title: 'Principles of Microeconomics',
    description:
      'Supply, demand, prices and the choices of households and firms, with the graphs that make them precise.',
    kind: 'lecture'
  },
  {
    code: 'ECON 102',
    title: 'Principles of Macroeconomics',
    description:
      'Growth, inflation, unemployment and the tools central banks and governments use to steer a national economy.',
    kind: 'lecture'
  },
  {
    code: 'ECON 201',
    title: 'Intermediate Microeconomics',
    description:
      'Consumer and producer theory done properly with calculus, through to market structure, game theory and welfare.',
    kind: 'lecture'
  },
  {
    code: 'POLS 110',
    title: 'American Government',
    description:
      'The Constitution, Congress, the presidency and the courts, and how parties, interest groups and voters work the machinery.',
    kind: 'lecture'
  },
  {
    code: 'POLS 220',
    title: 'International Relations',
    description:
      'War, trade, alliances and international institutions, read through the theories that try to explain how states behave.',
    kind: 'lecture'
  },
  {
    code: 'POLS 245',
    title: 'Model United Nations',
    description:
      'Students represent assigned countries in simulated committee sessions, researching positions and drafting resolutions for a closing conference.',
    kind: 'project'
  },
  {
    code: 'BUS 101',
    title: 'Introduction to Business',
    description:
      'How firms are organized, financed, staffed and marketed, a tour of the functions a business degree goes on to cover.',
    kind: 'lecture'
  },
  {
    code: 'ACCT 201',
    title: 'Financial Accounting',
    description:
      'Journal entries, balance sheets, income statements and cash flow, the language every company reports itself in.',
    kind: 'lecture'
  },
  {
    code: 'FIN 220',
    title: 'Corporate Finance',
    description:
      'The time value of money, risk and return, valuation and capital budgeting, the arithmetic behind every investment decision.',
    kind: 'lecture'
  },
  {
    code: 'MKTG 210',
    title: 'Principles of Marketing',
    description:
      'Segmentation, branding, pricing and promotion, and the research that tells a company who its customers really are.',
    kind: 'lecture'
  },
  {
    code: 'MKTG 320',
    title: 'Marketing Campaign Workshop',
    description:
      'Teams build a full campaign for a local client, from research and creative brief to the pitch presented in the final week.',
    kind: 'project'
  },
  {
    code: 'MGMT 230',
    title: 'Organizational Behavior',
    description:
      "Motivation, leadership, teams and workplace culture, and the research on why people work well together or don't.",
    kind: 'lecture'
  },
  {
    code: 'MGMT 250',
    title: 'Entrepreneurship',
    description:
      'Students take a business idea from first sketch to a tested plan, interviewing customers along the way and pitching to a panel at the end of term.',
    kind: 'project'
  },
  {
    code: 'CS 110',
    title: 'Introduction to Programming',
    description:
      'Variables, loops, functions and lists in a high-level language, written and debugged through weekly programming assignments.',
    kind: 'lecture'
  },
  {
    code: 'CS 210',
    title: 'Data Structures',
    description:
      'Lists, stacks, trees, hash tables and graphs, how to build them and how to tell which one a problem calls for.',
    kind: 'lecture'
  },
  {
    code: 'CS 240',
    title: 'Algorithms',
    description:
      'Sorting, searching, graph algorithms and dynamic programming, with proofs of why they work and how fast.',
    kind: 'lecture'
  },
  {
    code: 'CS 260',
    title: 'Web Development',
    description:
      'Page structure, styling, scripting and databases, combined over the term into a working web application each student designs and deploys.',
    kind: 'project'
  },
  {
    code: 'CS 280',
    title: 'Game Development',
    description:
      'Students prototype, playtest and polish a small video game, learning engine basics, level design and the feel of good controls.',
    kind: 'project'
  },
  {
    code: 'CS 350',
    title: 'Software Engineering',
    description:
      'Teams of four plan, build, test and ship a real application over the term, with code reviews, sprints and a closing demo day.',
    kind: 'project'
  },
  {
    code: 'ENGR 101',
    title: 'Introduction to Engineering Design',
    description:
      'Teams sketch, prototype and test solutions to small real-world problems, learning computer-aided design, shop safety and the design process.',
    kind: 'project'
  },
  {
    code: 'ENGR 210',
    title: 'Statics',
    description:
      'Forces and moments on bodies at rest, and the free-body diagrams behind every bridge, truss and bookshelf.',
    kind: 'lecture'
  },
  {
    code: 'ENGR 280',
    title: 'Robotics Lab',
    description:
      'Teams build and program a small mobile robot, adding sensors and motors week by week until it can run a course on its own.',
    kind: 'project'
  },
  {
    code: 'EE 220',
    title: 'Circuit Analysis',
    description:
      "Resistors, capacitors and inductors, Kirchhoff's laws and alternating current, checked against real circuits on the lab bench.",
    kind: 'lecture'
  },
  {
    code: 'ME 240',
    title: 'Thermodynamics',
    description:
      'Energy, heat, work and entropy, applied to engines, refrigerators and power plants.',
    kind: 'lecture'
  },
  {
    code: 'ARCH 110',
    title: 'Architectural Design Studio I',
    description:
      'Drawing, model-making and the basics of space, light and structure, worked out through a sequence of small building projects.',
    kind: 'project'
  },
  {
    code: 'MATH 121',
    title: 'Calculus I',
    description:
      'Limits, derivatives and the beginnings of integration, with applications to rates, motion and optimization.',
    kind: 'lecture'
  },
  {
    code: 'MATH 220',
    title: 'Linear Algebra',
    description:
      'Vectors, matrices, determinants and eigenvalues, the machinery behind computer graphics, data analysis and much of modern science.',
    kind: 'lecture'
  },
  {
    code: 'MATH 230',
    title: 'Discrete Mathematics',
    description:
      'Logic, sets, counting, induction and graphs, and the habit of writing a proof that holds up.',
    kind: 'lecture'
  },
  {
    code: 'STAT 200',
    title: 'Introductory Statistics',
    description:
      'Describing data, probability, sampling, confidence intervals and hypothesis tests, worked on real data sets.',
    kind: 'lecture'
  },
  {
    code: 'DATA 250',
    title: 'Data Science Practicum',
    description:
      'Students clean, analyze and visualize a real public data set over the term, presenting their findings in a written report and a short talk.',
    kind: 'project'
  },
  {
    code: 'NURS 210',
    title: 'Foundations of Nursing Practice',
    description:
      'Patient assessment, vital signs, safety and communication, practiced in the simulation lab before the first clinical placement.',
    kind: 'lecture'
  },
  {
    code: 'NURS 230',
    title: 'Pharmacology',
    description:
      'How the major classes of drugs act on the body, their doses, interactions and side effects, and how a nurse gives them safely.',
    kind: 'lecture'
  },
  {
    code: 'PUBH 101',
    title: 'Introduction to Public Health',
    description:
      'Epidemics, vaccines, clean water and health inequality, and how the health of a whole population is measured and improved.',
    kind: 'lecture'
  },
  {
    code: 'KIN 220',
    title: 'Exercise Physiology',
    description:
      'How the heart, lungs and muscles respond to exercise and adapt to training, measured in the lab on the students themselves.',
    kind: 'lecture'
  },
  {
    code: 'NUTR 150',
    title: 'Human Nutrition',
    description:
      'Carbohydrates, fats, proteins, vitamins and minerals, what each does in the body and how to read the science behind diet advice.',
    kind: 'lecture'
  },
  {
    code: 'COMM 110',
    title: 'Public Speaking',
    description:
      'Students prepare and deliver informative, persuasive and impromptu speeches, coached on structure, delivery and nerves.',
    kind: 'project'
  },
  {
    code: 'COMM 230',
    title: 'Interpersonal Communication',
    description:
      'Listening, conflict, self-disclosure and nonverbal cues, and what research says about talking with the people closest to us.',
    kind: 'lecture'
  },
  {
    code: 'JOUR 210',
    title: 'News Reporting and Writing',
    description:
      'Students cover campus and city beats on deadline, learning interviewing, fact-checking and the inverted pyramid.',
    kind: 'project'
  },
  {
    code: 'MDST 220',
    title: 'Media and Society',
    description:
      'Television, advertising, news and social media, and the ways they shape what audiences believe about themselves and the world.',
    kind: 'lecture'
  },
  {
    code: 'EDUC 201',
    title: 'Foundations of Education',
    description:
      'The history, philosophy and politics of schooling, with weekly observations in a local classroom.',
    kind: 'lecture'
  },
  {
    code: 'EDUC 310',
    title: 'Curriculum and Lesson Design',
    description:
      'Students write a unit of lessons and teach it to their classmates, from learning objectives and activities to fair assessment.',
    kind: 'project'
  },
  {
    code: 'CRIM 101',
    title: 'Introduction to Criminology',
    description:
      'Why crime happens, how it is measured and how police, courts and prisons respond, weighed against the evidence.',
    kind: 'lecture'
  },
  {
    code: 'LING 101',
    title: 'Introduction to Linguistics',
    description:
      "Sounds, words, sentences and meaning, and how the world's languages differ from one another and change over time.",
    kind: 'lecture'
  }
]

/** Electives taken out of pure personal interest, each the pick of one particular kind of student. */
const INTEREST_CLASSES: readonly CatalogEntry[] = [
  {
    code: 'AGRI 140',
    title: 'Urban Beekeeping',
    description:
      'Hive inspections, swarm prevention and the honey harvest, learned by tending a rooftop colony from early brood to the last frame of comb.',
    kind: 'project'
  },
  {
    code: 'GAME 210',
    title: 'A History of Video Games',
    description:
      'From arcade cabinets to open worlds, the machines, studios and design ideas that turned a novelty into the largest entertainment medium on earth.',
    kind: 'lecture'
  },
  {
    code: 'FOOD 130',
    title: 'The World of Tea',
    description:
      'Green, white, oolong, black and pu-erh, how each is grown and processed, and the ceremonies and trade routes built around a single leaf.',
    kind: 'lecture'
  },
  {
    code: 'LIT 250',
    title: 'Tarot as Literature',
    description:
      'The seventy-eight cards read as a narrative system, from Renaissance card games to occult revival decks and the novels and poems they inspired.',
    kind: 'lecture'
  },
  {
    code: 'FOOD 220',
    title: 'Fermentation',
    description:
      'Sourdough, kimchi, kombucha and fresh cheese, made from scratch in the teaching kitchen with the microbiology explained along the way.',
    kind: 'project'
  },
  {
    code: 'ASTR 160',
    title: 'Myths of the Night Sky',
    description:
      'The constellations as the Greeks, Polynesian navigators, Chinese astronomers and others told them, learned under the real stars on clear nights.',
    kind: 'lecture'
  },
  {
    code: 'TEXT 120',
    title: 'Knitting and Fiber Arts',
    description:
      'Casting on, cables, colorwork and finishing, from a first scarf to a sweater sized to fit the knitter.',
    kind: 'project'
  },
  {
    code: 'HIST 270',
    title: 'Pirates and Privateers',
    description:
      'The real seafaring outlaws of the Caribbean and the Indian Ocean, their ships, articles and trials, and the legend that outgrew them.',
    kind: 'lecture'
  },
  {
    code: 'FILM 260',
    title: 'The Horror Film',
    description:
      'A century of monsters, slashers and haunted houses, screened weekly and read for what each era was afraid of.',
    kind: 'lecture'
  },
  {
    code: 'BIO 180',
    title: 'The Kingdom of Fungi',
    description:
      'Mushrooms, molds and lichens, identified on field walks and under the microscope, with one firm rule against tasting anything.',
    kind: 'lecture'
  },
  {
    code: 'MUS 175',
    title: 'Ukulele Ensemble',
    description:
      'Chords, strumming patterns and close harmony on the four-string ukulele, rehearsed as a group for an end-of-term concert.',
    kind: 'project'
  },
  {
    code: 'CHEM 120',
    title: 'The Chemistry of Perfume',
    description:
      'The molecules behind citrus, rose, musk and amber, blended in the lab into an original fragrance each student names and bottles.',
    kind: 'project'
  },
  {
    code: 'GAME 150',
    title: 'Tabletop Game Design',
    description:
      'Students design, prototype and playtest an original board or card game, learning the balance, pacing and rules writing that keep players at the table.',
    kind: 'project'
  },
  {
    code: 'PHIL 180',
    title: 'The Philosophy of Love',
    description:
      'Plato, the troubadours and modern philosophers on desire, devotion and jealousy, and what it means to love someone well.',
    kind: 'lecture'
  },
  {
    code: 'HIST 175',
    title: 'Fashion in the Victorian Age',
    description:
      'Corsets, crinolines and calling cards: the clothes of the nineteenth century and the strict social codes they were made to carry.',
    kind: 'lecture'
  },
  {
    code: 'CULN 110',
    title: 'Pastry Fundamentals',
    description:
      'Laminated doughs, choux, custards and tarts, baked in the teaching kitchen and judged on taste as much as on looks.',
    kind: 'project'
  },
  {
    code: 'ENVS 140',
    title: 'Birding and Field Ornithology',
    description:
      'Identifying birds by sight and song on early-morning walks, logged in a field journal that builds into a term-long species list.',
    kind: 'project'
  },
  {
    code: 'LIT 210',
    title: 'Detective Fiction',
    description:
      'From Poe and Conan Doyle to the hard-boiled and the cozy, the rules of the mystery story and the writers who broke them.',
    kind: 'lecture'
  },
  {
    code: 'ARTS 175',
    title: 'Calligraphy and Hand Lettering',
    description:
      'Italic and blackletter hands with the broad-edged pen, then brush lettering, ending in a hand-bound book of copied verse.',
    kind: 'project'
  },
  {
    code: 'RELS 220',
    title: 'Witchcraft and Magic in History',
    description:
      'Cunning folk, witch trials and ceremonial magicians from the medieval world to the modern revival, and what each age meant by the word.',
    kind: 'lecture'
  },
  {
    code: 'PSYC 160',
    title: 'The Psychology of Dreams',
    description:
      'Sleep stages, nightmares, lucid dreaming and the theories that read dreams as wish, memory or noise, with a dream journal kept all term.',
    kind: 'lecture'
  },
  {
    code: 'ARTS 160',
    title: 'Comics and Graphic Novels',
    description:
      'Panel layout, pacing, character design and inking, toward a short comic each student carries from script to printed page.',
    kind: 'project'
  },
  {
    code: 'GEOG 175',
    title: 'Mapmaking by Hand',
    description:
      'Projection, scale, lettering and hand-inked relief, applied to a finished map of a real place or an invented one.',
    kind: 'project'
  },
  {
    code: 'LING 180',
    title: 'Constructed Languages',
    description:
      'From Esperanto to the tongues of fantasy epics, how invented languages build their sounds, grammar and scripts, and why people keep making them.',
    kind: 'lecture'
  }
]

/** Every class pool, by pool. */
export const CLASS_POOLS: Record<ClassPoolId, readonly CatalogEntry[]> = {
  pe: PE_CLASSES,
  humanities: HUMANITIES_CLASSES,
  arts: ARTS_CLASSES,
  misc: MISC_CLASSES,
  interest: INTEREST_CLASSES
}
