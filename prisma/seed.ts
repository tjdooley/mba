import { PrismaClient, Division, SessionPeriod, GameStatus } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import * as XLSX from 'xlsx'
import 'dotenv/config'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeInt(v: unknown): number {
  const n = Number(v)
  return isNaN(n) ? 0 : Math.round(n)
}

function str(v: unknown): string {
  return v == null ? '' : String(v).trim()
}

interface PlayerStat {
  name: string
  fgMade: number
  fgAttempted: number
  threesMade: number
  threesAttempted: number
  ftMade: number
  ftAttempted: number
  points: number
  rebounds: number
  assists: number
  blocks: number
  steals: number
  turnovers: number
}

interface GameBlock {
  gameNum: number
  players: PlayerStat[]
}

/**
 * Parse repeating game blocks from a team stat sheet.
 * First game label is in df.columns[0] (e.g. "Game 1\n9/14").
 * Subsequent game labels are in col 0 of the data rows.
 */
function parseTeamGames(ws: XLSX.WorkSheet): GameBlock[] {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 }) as unknown[][]
  const games: GameBlock[] = []

  function parsePlayerRow(row: unknown[]): PlayerStat | null {
    const name = str(row[1])
    if (!name || ['Team Total', 'PLAYER', 'NaN'].includes(name)) return null
    return {
      name,
      fgMade: safeInt(row[2]),
      fgAttempted: safeInt(row[3]),
      threesMade: safeInt(row[5]),
      threesAttempted: safeInt(row[6]),
      ftMade: safeInt(row[8]),
      ftAttempted: safeInt(row[9]),
      points: safeInt(row[11]),
      rebounds: safeInt(row[12]),
      assists: safeInt(row[13]),
      blocks: safeInt(row[14]),
      steals: safeInt(row[15]),
      turnovers: safeInt(row[16]),
    }
  }

  // Row 0 is the header — col 0 contains the first game label
  const firstLabel = str((rows[0] as unknown[])[0])
  const firstGameNum = parseInt(firstLabel.replace('\n', ' ').split(' ')[1])

  const firstPlayers: PlayerStat[] = []
  let i = 1
  while (i < rows.length) {
    const pname = str(rows[i][1])
    if (!pname) break
    const p = parsePlayerRow(rows[i])
    if (p) firstPlayers.push(p)
    i++
  }
  if (firstPlayers.length > 0) games.push({ gameNum: firstGameNum, players: firstPlayers })

  // Remaining games
  while (i < rows.length) {
    const label = str(rows[i][0])
    if (label.startsWith('Game')) {
      const gameNum = parseInt(label.replace('\n', ' ').split(' ')[1])
      const players: PlayerStat[] = []
      i++
      while (i < rows.length) {
        const pname = str(rows[i][1])
        if (!pname) break
        const p = parsePlayerRow(rows[i])
        if (p) players.push(p)
        i++
      }
      if (players.length > 0) games.push({ gameNum, players })
    } else {
      i++
    }
  }

  return games
}

// ---------------------------------------------------------------------------
// Full name registry — displayName → { firstName, lastName }
// Sourced from both workbook player pools
// ---------------------------------------------------------------------------

const PLAYER_NAMES: Record<string, { firstName: string; lastName: string }> = {
  // Sorted alphabetically by last name
  'Carson':        { firstName: 'Carson',      lastName: 'Aeberhard' },
  'Akim':          { firstName: 'John',        lastName: 'Akim' },
  'Mike Amend':    { firstName: 'Mike',        lastName: 'Amend' },
  'Armga':         { firstName: 'Austin',      lastName: 'Armga' },
  'Cooper':        { firstName: 'Cooper',      lastName: 'Armstrong' },
  'Justin':        { firstName: 'Justin',      lastName: 'Banzhaf' },
  'Justin Bomkamp':{ firstName: 'Justin',      lastName: 'Bomkamp' },
  'Jake B':        { firstName: 'Jacob',       lastName: 'Baryenbruch' },
  'Sam BZ':        { firstName: 'Sam',         lastName: 'Ben-Zkiri' },
  'Noah':          { firstName: 'Noah',        lastName: 'Beck' },
  'Meech':         { firstName: 'Demetrious',  lastName: 'Boyd' },
  'Boone':         { firstName: 'Roy',         lastName: 'Boone' },
  'Roy Boone':     { firstName: 'Roy',         lastName: 'Boone' },
  'Mike Brand':    { firstName: 'Mike',        lastName: 'Brand' },
  'Kevin':         { firstName: 'Kevin',       lastName: 'Branch' },
  'Klayton':       { firstName: 'Klayton',     lastName: 'Brandt' },
  'Spencer':       { firstName: 'Spencer',     lastName: 'Brink' },
  'Jamie':         { firstName: 'Jamie',       lastName: 'Bush' },
  'BJ':            { firstName: 'BJ',          lastName: 'Cook' },
  'Booch':         { firstName: 'Levon',       lastName: 'Crawford' },
  'Connor':        { firstName: 'Connor',      lastName: 'Morovits' },
  'Derek':         { firstName: 'Derek',       lastName: 'Dailey' },
  'Chandler':      { firstName: 'Chandler',    lastName: 'Diekvoss' },
  'Brandon Doll':  { firstName: 'Brandon',     lastName: 'Doll' },
  'Donais':        { firstName: 'Brian',       lastName: 'Donais' },
  'TJ':            { firstName: 'TJ',          lastName: 'Dooley' },
  'Dreher':        { firstName: 'Derek',       lastName: 'Dreher' },
  'Liam':          { firstName: 'Liam',        lastName: 'Duffy' },
  'Rob Duax':      { firstName: 'Rob',         lastName: 'Duax' },
  'Crooks':        { firstName: 'Andy',        lastName: 'Crooks' },
  'Connor sub':    { firstName: 'Connor',      lastName: 'Connor' },   // one-time sub, last name unknown
  'Sub (Ziemer)':  { firstName: 'Sub',         lastName: 'Sub' },      // one-time sub, last name unknown
  'Donny (sub)':   { firstName: 'Donny',       lastName: 'Sub' },      // guest sub, not Donny Thompson
  'Marty (sub)':   { firstName: 'Marty',       lastName: 'Sub' },      // guest sub, not Marty Petersen
  'Roy (sub)':     { firstName: 'Roy',         lastName: 'Sub' },      // guest sub, not Roy Hasenfratz
  'Cori':          { firstName: 'Cori',        lastName: 'Edmond' },
  'Eric':          { firstName: 'Eric',        lastName: '' },         // one-time sub, last name unknown
  'Sean F':        { firstName: 'Sean',        lastName: 'Fancsali' },
  'Mike F':        { firstName: 'Mike',        lastName: 'Fancsali' },
  'Dave F':        { firstName: 'Dave',        lastName: 'Filsinger' },
  'Filip':         { firstName: 'Filip',       lastName: '' },         // sub, last name unknown
  'Andy Fox':      { firstName: 'Andy',        lastName: 'Fox' },
  'Gallman':       { firstName: 'Mike',        lastName: 'Gallman' },
  'Gabe':          { firstName: 'Gabe',        lastName: '' },         // last name unknown
  'Liam (sub)':    { firstName: 'Liam',        lastName: '' },         // different from Liam Duffy, last name unknown
  'Ricky':         { firstName: 'Rick',        lastName: 'Geisler' },
  'Zack':          { firstName: 'Zack',        lastName: 'Genthe' },
  'Gibbs':         { firstName: 'Brian',       lastName: 'Gibbs' },
  'Gus':           { firstName: 'Mark',        lastName: 'Gustavson' },
  'Haag':          { firstName: 'Nate',        lastName: 'Haag' },
  'Alex':          { firstName: 'Alex',        lastName: 'Hade' },
  'Alex Hade':     { firstName: 'Alex',        lastName: 'Hade' },
  'Torin':         { firstName: 'Torin',       lastName: 'Hannah' },
  'Sir':           { firstName: 'SirJeremy',   lastName: 'Harrison' },
  'Roy':           { firstName: 'Roy',         lastName: 'Hasenfratz' },
  'Hertz':         { firstName: 'Sean',        lastName: 'Hertz' },
  'Hobert':        { firstName: 'Nathan',      lastName: 'Hobert' },
  'Lefty Andy':    { firstName: 'Andy',        lastName: 'Hosking' },
  'Pat':           { firstName: 'Pat',         lastName: 'Howe' },
  'Jeff Payton':   { firstName: 'Jeff',        lastName: 'Payton' },
  'Chazz':         { firstName: 'Chazz',       lastName: 'Huston' },
  'Alex Johnson':  { firstName: 'Alex',        lastName: 'Johnson' },
  'Fast Pat':      { firstName: 'Pat',         lastName: 'Lagman' },
  'Pat Howe':      { firstName: 'Pat',         lastName: 'Howe' },
  'Kahl':          { firstName: 'Don',         lastName: 'Kahl' },
  'Don Kahl':      { firstName: 'Don',         lastName: 'Kahl' },
  'Karls':         { firstName: 'Matt',        lastName: 'Karls' },
  'Chase Kieler':  { firstName: 'Chase',       lastName: 'Kieler' },
  'Shane Kieler':  { firstName: 'Shane',       lastName: 'Kieler' },
  'Klassy':        { firstName: 'Zach',        lastName: 'Klassy' },
  'Murph':         { firstName: 'Murph',       lastName: 'Knepfel' },
  'Danny':         { firstName: 'Danny',       lastName: 'Koss' },
  'Lewis':         { firstName: 'Nate',        lastName: 'Lewis' },
  'Detric':        { firstName: 'Detric',      lastName: 'McCain' },
  'Dillon':        { firstName: 'Dillon',      lastName: 'Mezera' },
  'Minnerly':      { firstName: 'Jeff',        lastName: 'Minnerly' },
  'Molloy':        { firstName: 'Jack',        lastName: 'Molloy' },
  'Trev Neale':    { firstName: 'Trevor',      lastName: 'Neale' },
  'Willie':        { firstName: 'Willie',      lastName: 'Nellen' },
  'Tall Matt':     { firstName: 'Matt',        lastName: 'Nonemacher' },
  'Olson':         { firstName: 'Tyler',       lastName: 'Olson' },
  'Tyler Olson':   { firstName: 'Tyler',       lastName: 'Olson' },
  'Kain':          { firstName: 'Kain',        lastName: 'Paige' },
  'Ty Parman':     { firstName: 'Ty',          lastName: 'Parman' },
  'Shravan':       { firstName: 'Shravan',     lastName: 'Parman' },
  'Parzych':       { firstName: 'Brian',       lastName: 'Parzych' },
  'Brent':         { firstName: 'Brent',       lastName: 'Perzentka' },
  'Sam P':         { firstName: 'Sam',         lastName: 'Pettegrew' },
  'Marty':         { firstName: 'Marty',       lastName: 'Petersen' },
  'Plotkin':       { firstName: 'Brian',       lastName: 'Plotkin' },
  'Macon':         { firstName: 'Macon',       lastName: 'Plewa' },
  'Johnny':        { firstName: 'Johnny',      lastName: 'Plewa' },
  'Reetz':         { firstName: 'Jordan',      lastName: 'Reetz' },
  'Ritzy':         { firstName: 'Jason',       lastName: 'Ritzenthaler' },
  'Scotty':        { firstName: 'Scott',       lastName: 'Rippl' },
  'Scotty Ripp':   { firstName: 'Scott',       lastName: 'Rippl' },
  'Nate Ray':      { firstName: 'Nate',        lastName: 'Ray' },
  'Nate Rohrer':   { firstName: 'Nate',        lastName: 'Rohrer' },
  'Timmy':         { firstName: 'Tim',         lastName: 'Russell' },
  'Tim Russell':   { firstName: 'Tim',         lastName: 'Russell' },
  'Savatski':      { firstName: 'Matt',        lastName: 'Savatski' },
  'Jake S':        { firstName: 'Jake',        lastName: 'Schroeckenthaler' },
  'Siebert':       { firstName: 'Chris',       lastName: 'Siebert' },
  'Simler':        { firstName: 'Darren',      lastName: 'Simler' },
  'Ngijol':        { firstName: 'Ngijol',      lastName: 'Songolo' },
  'Rocky':         { firstName: 'Rocky',       lastName: 'So' },
  'Ryan Staege':   { firstName: 'Ryan',        lastName: 'Staege' },
  'Staege':        { firstName: 'Jared',       lastName: 'Staege' },
  'Ty S':          { firstName: 'Ty',          lastName: 'Strangstalien' },
  'Jesse Temple':  { firstName: 'Jesse',       lastName: 'Temple' },
  'Donny':         { firstName: 'Donny',       lastName: 'Thompson' },
  'Tianen':        { firstName: 'Tianen',      lastName: '' },         // one-time sub, last name unknown
  'Tordoff':       { firstName: 'Mitch',       lastName: 'Tordoff' },
  'Towns':         { firstName: 'Jason',       lastName: 'Towns' },
  'Valentyn':      { firstName: 'Brett',       lastName: 'Valentyn' },
  'Jesus':         { firstName: 'Jesus',       lastName: 'Villagomez' },
  'Carter':        { firstName: 'Carter',      lastName: 'Voelker' },
  'Volt':          { firstName: 'Andy',        lastName: 'Voeltner' },
  'Vos':           { firstName: 'Nate',        lastName: 'Vos' },
  'Julian':        { firstName: 'Julian',      lastName: 'Walters' },
  'Watts':         { firstName: 'Dave',        lastName: 'Watts' },
  'Wedel':         { firstName: 'Tyler',       lastName: 'Wedel' },
  'Paul':          { firstName: 'Paul',        lastName: 'Wedel' },
  'Jimmy':         { firstName: 'Jimmy',       lastName: 'West' },
  'Jimmy West':    { firstName: 'Jimmy',       lastName: 'West' },
  'Winsor':        { firstName: 'Andy',        lastName: 'Winsor' },
  'Brett Wittchow':{ firstName: 'Brett',       lastName: 'Wittchow' },
  'Sam Wilk':      { firstName: 'Sam',         lastName: 'Wilkinson' },
  'Les Wilk':      { firstName: 'Les',         lastName: 'Wilkinson' },
  'Younggren':     { firstName: 'Michael',     lastName: 'Younggren' },
  'Ziemer':        { firstName: 'Jason',       lastName: 'Ziemer' },
}

// Aliases — merge alternate spellings to one canonical displayName
const ALIASES: Record<string, string> = {
  'Tyler Olson':   'Olson',
  'Don Kahl':      'Kahl',
  'Jamie Bush':    'Jamie',
  'Roy Boone':     'Boone',
  'Scotty Ripp':   'Scotty',
  'Brand':         'Mike Brand',
  'Alex Hade':     'Alex',
  'Tim Russell':   'Timmy',
  // Sub/guest name variants
  'Donny(sub)':    'Donny (sub)',  // different person from Donny Thompson
  'Derek D (Sub)': 'Dreher',       // Derek Dreher subbing
  'Rocky/Mike':    'Rocky',        // combination entry — resolves to Rocky
  'Jack':          'Molloy',       // Jack Molloy
  'J Staege':      'Staege',       // Jared Staege
  'Stege':         'Staege',       // Jared Staege typo
  'Sam Pettegrew': 'Sam P',        // Sam Pettegrew = Sam P
  'Mike Y':        'Younggren',
  'Mike Younggren':'Younggren',
  'Jesse':         'Jesse Temple',
  'Donais':        'Donais',       // Brian Donais (canonical)
  'Brian D':       'Donais',
  'Brian Donais':  'Donais',
  'Duax':          'Rob Duax',
  'Rob':           'Rob Duax',
  'Parman':        'Ty Parman',
  'Dave':          'Dave F',       // captain listed as 'Dave' in schedule
  'Gabe':          'Gabe',         // Gabe (last name unknown) = Ponytail
  'Ponytail':      'Gabe',
  'Johnny Plewa':  'Johnny',
  'Brother Macon': 'Johnny',       // Johnny Plewa subbing on brother's team
  'Macon bro':     'Johnny',
  'Hobart':        'Hobert',
  'Nate Hobart':   'Hobert',
  'Nathan Hobert': 'Hobert',
  'Jaime Bush':    'Jamie',
  'Liam (Justin)': 'Liam (sub)',   // different person from Liam
  'Marty (sub)':   'Marty (sub)',   // different person from Marty Petersen
  'Roy (sub)':     'Roy (sub)',     // different person from Roy
  'Connor sub':    'Connor sub',    // different person from Connor Morovits
  'Sub (Ziemer)':  'Sub (Ziemer)', // unknown sub on Ziemer's team
  'Zach':          'Zack',
  'Brett':         'Brett Wittchow',
  'Andy Crooks':   'Crooks',
  'Andy Winsor':   'Winsor',
  'Don':           'Donny',        // Don Thompson captained as 'Don'
  'Don Thompson':  'Donny',
  'Nate Lewis':    'Lewis',
  'Pat Howe':      'Pat Howe',     // full name — different from Pat (captain)
  'Derek Dailey':  'Derek',
  'Tyler Wedel':   'Wedel',
  'San P':         'Sam P',        // typo for Sam P
  'Scotty Rip':    'Scotty',
  'Nate':          'Lewis',        // Nate Lewis captained as 'Nate' in stat sheet
  'Tyler O':       'Olson',
  'Trev':          'Trev Neale',
  'Tim':           'Timmy',        // Tim Russell
  'Mitch':         'Tordoff',
  'Les':           'Les Wilk',
  'Don T':         'Donny',
  'Brandon':       'Brandon Doll',
  'Brandon Doll':  'Brandon Doll',
  'Darren':        'Simler',
  'Jeff Minnerly': 'Minnerly',
  'Mitch Tordoff': 'Tordoff',
  'Jimmy West':    'Jimmy',
  'Dreher':        'Dreher',       // Derek Dreher (different from Derek Dailey)
  // New aliases added 2026-03-10
  'Trev Neal':        'Trev Neale',    // typo variant
  'Trevor':           'Trev Neale',    // Fall 2024 workbook
  'Neale':            'Trev Neale',    // Fall 2024 captain sheet
  'TJ Dooley':        'TJ',            // Fall 2025 workbook full name
  'Torin Hannah':     'Torin',         // Fall 2025 workbook full name
  'Zach Klassy':      'Klassy',        // Fall 2025 workbook full name
  'Marty Petersen':   'Marty',         // Fall 2025 workbook full name
  'Ty Strangstalein': 'Ty S',          // spelling variant
  'Brian Parzych':    'Parzych',       // Fall 2025 workbook full name
  'Jack Molloy':      'Molloy',        // Fall 2025 workbook full name
  'Roy H':            'Roy',           // Fall 2025 workbook (distinguishes from Roy Boone)
  'Tyler':            'Wedel',         // Spring 2023 captain = Tyler Wedel
  'Pat':              'Pat Howe',      // Fall 2023 captain listed as just 'Pat'
}

function canonical(raw: string): string {
  return ALIASES[raw] ?? raw
}

function isSub(displayName: string): boolean {
  const lower = displayName.toLowerCase()
  return lower.startsWith('sub') || lower.endsWith('sub') || lower.includes('(sub)')
}

function getNames(displayName: string): { firstName: string; lastName: string } {
  return PLAYER_NAMES[displayName] ?? { firstName: displayName, lastName: displayName }
}

// ---------------------------------------------------------------------------
// Rosters
// ---------------------------------------------------------------------------

// Spring 2023
const S23_ROSTERS: Record<string, string[]> = {
  'Sean F':  ['Sean F',  'Ngijol',       'Simler',      'Younggren',  'Cooper',      'Dave F'],
  'Sam P':   ['Sam P',   'Booch',        'Tyler Olson', 'BJ',         'Roy',         'Towns'],
  'Lewis':   ['Lewis',   'Reetz',        'Gibbs',       'Sir',        'Vos',         'Karls'],
  'Tyler':   ['Tyler',   'Armga',        'Jeff Minnerly','Lefty Andy','Scotty Ripp', 'Trev Neale'],
  'Ziemer':  ['Ziemer',  'Nate Ray',     'Mitch Tordoff','Akim',      'Klayton',     'Dave F'],
  'Justin':  ['Justin',  'Noah',         'Detric',      'Tim Russell','Savatski',    'Don Thompson'],
  'Connor':  ['Connor',  'Sam Wilk',     'Don Kahl',    'Mike Younggren','Plotkin',  'Dave F'],
  'Danny':   ['Danny',   'Hertz',        'Watts',       'Rocky',      'Les Wilk',    'Gallman'],
}

const S23_DIVISIONS: Record<string, Division> = {
  'Sean F':  Division.FREEHOUSE,
  'Lewis':   Division.FREEHOUSE,
  'Ziemer':  Division.FREEHOUSE,
  'Connor':  Division.FREEHOUSE,
  'Sam P':   Division.DELANEYS,
  'Tyler':   Division.DELANEYS,
  'Justin':  Division.DELANEYS,
  'Danny':   Division.DELANEYS,
}

const S23_SCHEDULE: RoundEntry[] = [
  { date: '2023-02-19', week: 1, games: [
    { home: 'Sam P',   away: 'Tyler',  court: 'Court 1 (Left Side) - 7:15', homeScore: 58,  awayScore: 70  },
    { home: 'Justin',  away: 'Danny',  court: 'Court 3 (Right Side) - 7:15', homeScore: 85, awayScore: 78  },
    { home: 'Sean F',  away: 'Lewis',  court: 'Court 1 (Left Side) - 8:15', homeScore: 67,  awayScore: 85  },
    { home: 'Ziemer',  away: 'Connor', court: 'Court 3 (Right Side) - 8:15', homeScore: 99, awayScore: 89  },
  ]},
  { date: '2023-02-26', week: 2, games: [
    { home: 'Sean F',  away: 'Ziemer', court: 'Court 1 (Left Side) - 7:15', homeScore: 89,  awayScore: 91  },
    { home: 'Lewis',   away: 'Connor', court: 'Court 3 (Right Side) - 7:15', homeScore: 99, awayScore: 81  },
    { home: 'Sam P',   away: 'Justin', court: 'Court 1 (Left Side) - 8:15', homeScore: 77,  awayScore: 68  },
    { home: 'Tyler',   away: 'Danny',  court: 'Court 3 (Right Side) - 8:15', homeScore: 91, awayScore: 75  },
  ]},
  { date: '2023-03-05', week: 3, games: [
    { home: 'Danny',   away: 'Sam P',  court: 'Court 1 (Left Side) - 7:15', homeScore: 68,  awayScore: 83  },
    { home: 'Tyler',   away: 'Justin', court: 'Court 3 (Right Side) - 7:15', homeScore: 99, awayScore: 77  },
    { home: 'Connor',  away: 'Sean F', court: 'Court 1 (Left Side) - 8:15', homeScore: 83,  awayScore: 78  },
    { home: 'Lewis',   away: 'Ziemer', court: 'Court 3 (Right Side) - 8:15', homeScore: 85, awayScore: 62  },
  ]},
  { date: '2023-03-12', week: 4, games: [
    { home: 'Lewis',   away: 'Tyler',  court: 'Court 1 (Left Side) - 7:15', homeScore: 78,  awayScore: 85  },
    { home: 'Sean F',  away: 'Sam P',  court: 'Court 3 (Right Side) - 7:15', homeScore: 86, awayScore: 74  },
    { home: 'Ziemer',  away: 'Justin', court: 'Court 1 (Left Side) - 8:15', homeScore: 85,  awayScore: 82  },
    { home: 'Connor',  away: 'Danny',  court: 'Court 3 (Right Side) - 8:15', homeScore: 79, awayScore: 76  },
  ]},
  { date: '2023-03-19', week: 5, games: [
    { home: 'Connor',  away: 'Justin', court: 'Court 1 (Left Side) - 7:15', homeScore: 75,  awayScore: 72  },
    { home: 'Ziemer',  away: 'Danny',  court: 'Court 3 (Right Side) - 7:15', homeScore: 75, awayScore: 70  },
    { home: 'Sean F',  away: 'Tyler',  court: 'Court 1 (Left Side) - 8:15', homeScore: 78,  awayScore: 76  },
    { home: 'Sam P',   away: 'Lewis',  court: 'Court 3 (Right Side) - 8:15', homeScore: 95, awayScore: 82  },
  ]},
  { date: '2023-04-02', week: 6, games: [
    { home: 'Sam P',   away: 'Ziemer', court: 'Court 1 (Left Side) - 6:30', homeScore: 98,  awayScore: 85  },
    { home: 'Connor',  away: 'Tyler',  court: 'Court 3 (Right Side) - 6:30', homeScore: 86, awayScore: 94  },
    { home: 'Lewis',   away: 'Danny',  court: 'Court 1 (Left Side) - 7:30', homeScore: 79,  awayScore: 78  },
    { home: 'Sean F',  away: 'Justin', court: 'Court 3 (Right Side) - 7:30', homeScore: 77, awayScore: 65  },
  ]},
  { date: '2023-04-16', week: 7, games: [
    { home: 'Sean F',  away: 'Danny',  court: 'Court 1 (Left Side) - 6:30', homeScore: 97,  awayScore: 81  },
    { home: 'Lewis',   away: 'Justin', court: 'Court 3 (Right Side) - 6:30', homeScore: 96, awayScore: 90  },
    { home: 'Sam P',   away: 'Connor', court: 'Court 1 (Left Side) - 7:30', homeScore: 76,  awayScore: 77  },
    { home: 'Tyler',   away: 'Ziemer', court: 'Court 3 (Right Side) - 7:30', homeScore: 80, awayScore: 84  },
  ]},
  { date: '2023-04-23', week: 8, games: [
    { home: 'Connor',  away: 'Ziemer', court: 'Court 1 (Left Side) - 6:30', homeScore: 80,  awayScore: 68  },
    { home: 'Lewis',   away: 'Sean F', court: 'Court 3 (Right Side) - 6:30', homeScore: 62, awayScore: 90  },
    { home: 'Danny',   away: 'Justin', court: 'Court 1 (Left Side) - 7:30', homeScore: 89,  awayScore: 73  },
    { home: 'Tyler',   away: 'Sam P',  court: 'Court 3 (Right Side) - 7:30', homeScore: 97, awayScore: 81  },
  ]},
  { date: '2023-04-30', week: 9, games: [
    { home: 'Danny',   away: 'Tyler',  court: 'Court 1 (Left Side) - 6:30', homeScore: 78,  awayScore: 106 },
    { home: 'Justin',  away: 'Sam P',  court: 'Court 3 (Right Side) - 6:30', homeScore: 80, awayScore: 72  },
    { home: 'Connor',  away: 'Lewis',  court: 'Court 1 (Left Side) - 7:30', homeScore: 94,  awayScore: 92  },
    { home: 'Ziemer',  away: 'Sean F', court: 'Court 3 (Right Side) - 7:30', homeScore: 94, awayScore: 79  },
  ]},
  { date: '2023-05-07', week: 10, games: [
    { home: 'Ziemer',  away: 'Lewis',  court: 'Court 1 (Left Side) - 6:30', homeScore: 96,  awayScore: 95  },
    { home: 'Sean F',  away: 'Connor', court: 'Court 3 (Right Side) - 6:30', homeScore: 87, awayScore: 81  },
    { home: 'Justin',  away: 'Tyler',  court: 'Court 1 (Left Side) - 7:30', homeScore: 80,  awayScore: 88  },
    { home: 'Sam P',   away: 'Danny',  court: 'Court 3 (Right Side) - 7:30', homeScore: 80, awayScore: 90  },
  ]},
  { date: '2023-05-14', week: 11, games: [
    { home: 'Tyler',   away: 'Sean F', court: 'Court 1 (Left Side) - 6:30', homeScore: 82,  awayScore: 53, },
    { home: 'Connor',  away: 'Ziemer', court: 'Court 1 (Left Side) - 7:30', homeScore: 96,  awayScore: 87, },
  ]},
  { date: '2023-05-21', week: 12, games: [
    { home: 'Tyler',   away: 'Connor', court: 'Court 1 (Left Side) - 6:30' },
  ]},
]

const S23_STANDINGS: Record<string, { wins: number; losses: number; divisionWins: number; divisionLosses: number; pointDifferential: number }> = {
  'Ziemer':  { wins: 7, losses: 3, divisionWins: 4, divisionLosses: 2, pointDifferential: -8   },
  'Connor':  { wins: 6, losses: 4, divisionWins: 3, divisionLosses: 3, pointDifferential: -16  },
  'Sean F':  { wins: 6, losses: 4, divisionWins: 2, divisionLosses: 4, pointDifferential: 36   },
  'Lewis':   { wins: 5, losses: 5, divisionWins: 3, divisionLosses: 3, pointDifferential: 15   },
  'Tyler':   { wins: 8, losses: 2, divisionWins: 6, divisionLosses: 0, pointDifferential: 111  },
  'Sam P':   { wins: 4, losses: 6, divisionWins: 2, divisionLosses: 4, pointDifferential: -9   },
  'Justin':  { wins: 2, losses: 8, divisionWins: 2, divisionLosses: 4, pointDifferential: -64  },
  'Danny':   { wins: 2, losses: 8, divisionWins: 2, divisionLosses: 4, pointDifferential: -65  },
}

// Fall 2023
const F23_ROSTERS: Record<string, string[]> = {
  'Ricky':        ['Ricky',        'Armga',      'Sean F',     'Tyler Olson', 'Tim Russell', 'Cori'],
  'Don Thompson': ['Don Thompson', 'Siebert',    'Tordoff',    'Jeff Minnerly','Sir',        'Trev Neale'],
  'Gallman':      ['Gallman',      'Brett',      'Jake B',     'Detric',      'Savatski',    'Trev Neale'],
  'Pat':          ['Pat',          'Reetz',      'Justin',     'Don Kahl',    'Lefty Andy',  'Younggren'],
  'Winsor':       ['Winsor',       'Chandler',   'Macon',      'Wedel',       'Gibbs',       'Karls'],
  'Roy':          ['Roy',          'Ziemer',     'Danny',      'Liam',        'Fast Pat',    'Scotty Ripp'],
  'BJ':           ['BJ',           'Nate Ray',   'Noah',       'Nate Lewis',  'Akim',        'Plotkin'],
  'Towns':        ['Towns',        'Connor',     'Sam Wilk',   'Hertz',       'Watts',       'Dave F'],
}

const F23_DIVISIONS: Record<string, Division> = {
  'Towns':        Division.FREEHOUSE,
  'Gallman':      Division.FREEHOUSE,
  'Don Thompson': Division.FREEHOUSE,
  'Roy':          Division.FREEHOUSE,
  'BJ':           Division.DELANEYS,
  'Ricky':        Division.DELANEYS,
  'Winsor':       Division.DELANEYS,
  'Pat':          Division.DELANEYS,
}

const F23_SCHEDULE: RoundEntry[] = [
  { date: '2023-09-17', week: 1, games: [
    { home: 'Roy',          away: 'Towns',        court: 'Court 1 (Left Side) - 6:30', homeScore: 93, awayScore: 70 },
    { home: 'Winsor',       away: 'BJ',           court: 'Court 3 (Right Side) - 6:30', homeScore: 81, awayScore: 72 },
    { home: 'Don Thompson', away: 'Gallman',      court: 'Court 1 (Left Side) - 7:30', homeScore: 89, awayScore: 71 },
    { home: 'Ricky',        away: 'Pat',          court: 'Court 3 (Right Side) - 7:30', homeScore: 59, awayScore: 62 },
  ]},
  { date: '2023-09-24', week: 2, games: [
    { home: 'Pat',          away: 'BJ',           court: 'Court 1 (Left Side) - 6:30', homeScore: 91, awayScore: 60 },
    { home: 'Ricky',        away: 'Winsor',       court: 'Court 3 (Right Side) - 6:30', homeScore: 63, awayScore: 92 },
    { home: 'Don Thompson', away: 'Roy',          court: 'Court 1 (Left Side) - 7:30', homeScore: 68, awayScore: 87 },
    { home: 'Gallman',      away: 'Towns',        court: 'Court 3 (Right Side) - 7:30', homeScore: 82, awayScore: 66 },
  ]},
  { date: '2023-10-01', week: 3, games: [
    { home: 'Gallman',      away: 'Roy',          court: 'Court 1 (Left Side) - 6:30', homeScore: 72, awayScore: 93 },
    { home: 'Don Thompson', away: 'Towns',        court: 'Court 3 (Right Side) - 6:30', homeScore: 84, awayScore: 64 },
    { home: 'Ricky',        away: 'BJ',           court: 'Court 1 (Left Side) - 7:30', homeScore: 81, awayScore: 88 },
    { home: 'Pat',          away: 'Winsor',       court: 'Court 3 (Right Side) - 7:30', homeScore: 76, awayScore: 68 },
  ]},
  { date: '2023-10-08', week: 4, games: [
    { home: 'Don Thompson', away: 'BJ',           court: 'Court 1 (Left Side) - 6:30', homeScore: 105, awayScore: 100 },
    { home: 'Pat',          away: 'Roy',          court: 'Court 3 (Right Side) - 6:30', homeScore: 77, awayScore: 84 },
    { home: 'Ricky',        away: 'Towns',        court: 'Court 1 (Left Side) - 7:30', homeScore: 66, awayScore: 84 },
    { home: 'Gallman',      away: 'Winsor',       court: 'Court 3 (Right Side) - 7:30', homeScore: 82, awayScore: 65 },
  ]},
  { date: '2023-10-15', week: 5, games: [
    { home: 'Ricky',        away: 'Gallman',      court: 'Court 1 (Left Side) - 6:30', homeScore: 83, awayScore: 73 },
    { home: 'Winsor',       away: 'Towns',        court: 'Court 3 (Right Side) - 6:30', homeScore: 81, awayScore: 73 },
    { home: 'Roy',          away: 'BJ',           court: 'Court 1 (Left Side) - 7:30', homeScore: 103, awayScore: 64 },
    { home: 'Don Thompson', away: 'Pat',          court: 'Court 3 (Right Side) - 7:30', homeScore: 94, awayScore: 82 },
  ]},
  { date: '2023-10-22', week: 6, games: [
    { home: 'Winsor',       away: 'Roy',          court: 'Court 1 (Left Side) - 6:30', homeScore: 74, awayScore: 91 },
    { home: 'Ricky',        away: 'Don Thompson', court: 'Court 3 (Right Side) - 6:30', homeScore: 60, awayScore: 73 },
    { home: 'Gallman',      away: 'Pat',          court: 'Court 1 (Left Side) - 7:30', homeScore: 66, awayScore: 65 },
    { home: 'BJ',           away: 'Towns',        court: 'Court 3 (Right Side) - 7:30', homeScore: 66, awayScore: 80 },
  ]},
  { date: '2023-10-29', week: 7, games: [
    { home: 'Pat',          away: 'Towns',        court: 'Court 1 (Left Side) - 6:30', homeScore: 73, awayScore: 77 },
    { home: 'Gallman',      away: 'BJ',           court: 'Court 3 (Right Side) - 6:30', homeScore: 87, awayScore: 80 },
    { home: 'Don Thompson', away: 'Winsor',       court: 'Court 1 (Left Side) - 7:30', homeScore: 66, awayScore: 90 },
    { home: 'Ricky',        away: 'Roy',          court: 'Court 3 (Right Side) - 7:30', homeScore: 72, awayScore: 102 },
  ]},
  { date: '2023-11-05', week: 8, games: [
    { home: 'Pat',          away: 'Ricky',        court: 'Court 1 (Left Side) - 6:30', homeScore: 87, awayScore: 67 },
    { home: 'Gallman',      away: 'Don Thompson', court: 'Court 3 (Right Side) - 6:30', homeScore: 87, awayScore: 84 },
    { home: 'BJ',           away: 'Winsor',       court: 'Court 1 (Left Side) - 7:30', homeScore: 84, awayScore: 79 },
    { home: 'Towns',        away: 'Roy',          court: 'Court 3 (Right Side) - 7:30', homeScore: 71, awayScore: 97 },
  ]},
  { date: '2023-11-12', week: 9, games: [
    { home: 'Towns',        away: 'Gallman',      court: 'Court 1 (Left Side) - 6:30', homeScore: 81, awayScore: 84 },
    { home: 'Roy',          away: 'Don Thompson', court: 'Court 3 (Right Side) - 6:30', homeScore: 76, awayScore: 87 },
    { home: 'Winsor',       away: 'Ricky',        court: 'Court 1 (Left Side) - 7:30', homeScore: 112, awayScore: 70 },
    { home: 'BJ',           away: 'Pat',          court: 'Court 3 (Right Side) - 7:30', homeScore: 82, awayScore: 61 },
  ]},
  { date: '2023-11-19', week: 10, games: [
    { home: 'Winsor',       away: 'Pat',          court: 'Court 1 (Left Side) - 6:30', homeScore: 87, awayScore: 89 },
    { home: 'BJ',           away: 'Ricky',        court: 'Court 3 (Right Side) - 6:30', homeScore: 82, awayScore: 80 },
    { home: 'Towns',        away: 'Don Thompson', court: 'Court 1 (Left Side) - 7:30', homeScore: 100, awayScore: 96 },
    { home: 'Roy',          away: 'Gallman',      court: 'Court 3 (Right Side) - 7:30', homeScore: 96, awayScore: 77 },
  ]},
]

const F23_STANDINGS: Record<string, { wins: number; losses: number; divisionWins: number; divisionLosses: number; pointDifferential: number }> = {
  'Roy':          { wins: 9, losses: 1, divisionWins: 5, divisionLosses: 1, pointDifferential: 190  },
  'Don Thompson': { wins: 6, losses: 4, divisionWins: 3, divisionLosses: 3, pointDifferential: 29   },
  'Gallman':      { wins: 6, losses: 4, divisionWins: 3, divisionLosses: 3, pointDifferential: -21  },
  'Towns':        { wins: 4, losses: 6, divisionWins: 1, divisionLosses: 5, pointDifferential: -56  },
  'Pat':          { wins: 5, losses: 5, divisionWins: 5, divisionLosses: 1, pointDifferential: 19   },
  'Winsor':       { wins: 5, losses: 5, divisionWins: 3, divisionLosses: 3, pointDifferential: 63   },
  'BJ':           { wins: 4, losses: 6, divisionWins: 4, divisionLosses: 2, pointDifferential: -70  },
  'Ricky':        { wins: 1, losses: 9, divisionWins: 0, divisionLosses: 6, pointDifferential: -154 },
}

// Spring 2024
const S24_ROSTERS: Record<string, string[]> = {
  'Wedel':      ['Wedel',      'Armga',      'Liam',        'Lefty Andy', 'Sir',         'Gallman'],
  'Danny':      ['Danny',      'Chandler',   'Detric',      'Mike Brand', 'Scotty Ripp', 'Roy'],
  'Tyler Olson':['Tyler Olson','Reetz',      'Gibbs',       'Trev Neale', 'Mike Younggren','Ricky'],
  'Tordoff':    ['Tordoff',    'Connor',     'Macon',       'Tim Russell','Towns',       'Dave F'],
  'Lewis':      ['Lewis',      'Noah',       'Watts',       'Roy Boone',  'Vos',         'BJ'],
  'Hertz':      ['Hertz',      'Sam Wilk',   'Don Kahl',    'TJ',         'Don Thompson','Tall Matt'],
  'Ziemer':     ['Ziemer',     'Jake B',     'Nate Ray',    'Akim',       'Karls',       'Plotkin'],
  'Sean F':     ['Sean F',     'Minnerly',   'Justin',      'Kain',       'Cooper',      'Cori'],
}

const S24_DIVISIONS: Record<string, Division> = {
  'Lewis':      Division.FREEHOUSE,
  'Sean F':     Division.FREEHOUSE,
  'Danny':      Division.FREEHOUSE,
  'Hertz':      Division.FREEHOUSE,
  'Wedel':      Division.DELANEYS,
  'Ziemer':     Division.DELANEYS,
  'Tyler Olson':Division.DELANEYS,
  'Tordoff':    Division.DELANEYS,
}

const S24_SCHEDULE: RoundEntry[] = [
  { date: '2024-02-04', week: 1, games: [
    { home: 'Sean F',      away: 'Lewis',      court: 'Court 1 (Left Side) - 6:30', homeScore: 71, awayScore: 76 },
    { home: 'Ziemer',      away: 'Tyler Olson',court: 'Court 3 (Right Side) - 6:30', homeScore: 80, awayScore: 41 },
    { home: 'Danny',       away: 'Hertz',      court: 'Court 1 (Left Side) - 7:30', homeScore: 76, awayScore: 52 },
    { home: 'Wedel',       away: 'Tordoff',    court: 'Court 3 (Right Side) - 7:30', homeScore: 69, awayScore: 78 },
  ]},
  { date: '2024-02-18', week: 2, games: [
    { home: 'Wedel',       away: 'Tyler Olson',court: 'Court 1 (Left Side) - 6:30', homeScore: 85, awayScore: 80 },
    { home: 'Danny',       away: 'Lewis',      court: 'Court 3 (Right Side) - 6:30', homeScore: 84, awayScore: 88 },
    { home: 'Ziemer',      away: 'Tordoff',    court: 'Court 1 (Left Side) - 7:30', homeScore: 97, awayScore: 88 },
    { home: 'Sean F',      away: 'Hertz',      court: 'Court 3 (Right Side) - 7:30', homeScore: 82, awayScore: 63 },
  ]},
  { date: '2024-03-03', week: 4, games: [
    { home: 'Lewis',       away: 'Tyler Olson',court: 'Court 1 (Left Side) - 6:30', homeScore: 85, awayScore: 87 },
    { home: 'Sean F',      away: 'Ziemer',     court: 'Court 3 (Right Side) - 6:30', homeScore: 86, awayScore: 66 },
    { home: 'Hertz',       away: 'Tordoff',    court: 'Court 1 (Left Side) - 7:30', homeScore: 80, awayScore: 60 },
    { home: 'Danny',       away: 'Wedel',      court: 'Court 3 (Right Side) - 7:30', homeScore: 95, awayScore: 84 },
  ]},
  { date: '2024-03-10', week: 5, games: [
    { home: 'Danny',       away: 'Ziemer',     court: 'Court 1 (Left Side) - 6:30', homeScore: 103, awayScore: 95 },
    { home: 'Lewis',       away: 'Tordoff',    court: 'Court 3 (Right Side) - 6:30', homeScore: 84, awayScore: 78 },
    { home: 'Sean F',      away: 'Tyler Olson',court: 'Court 1 (Left Side) - 7:30', homeScore: 92, awayScore: 87 },
    { home: 'Hertz',       away: 'Wedel',      court: 'Court 3 (Right Side) - 7:30', homeScore: 69, awayScore: 75 },
  ]},
  { date: '2024-03-17', week: 6, games: [
    { home: 'Sean F',      away: 'Wedel',      court: 'Court 1 (Left Side) - 6:30', homeScore: 77, awayScore: 84 },
    { home: 'Hertz',       away: 'Tyler Olson',court: 'Court 3 (Right Side) - 6:30', homeScore: 88, awayScore: 85 },
    { home: 'Danny',       away: 'Tordoff',    court: 'Court 1 (Left Side) - 7:30', homeScore: 102, awayScore: 74 },
    { home: 'Lewis',       away: 'Ziemer',     court: 'Court 3 (Right Side) - 7:30', homeScore: 83, awayScore: 56 },
  ]},
  { date: '2024-03-24', week: 3, games: [
    { home: 'Sean F',      away: 'Danny',      court: 'Court 1 (Left Side) - 6:30', homeScore: 80, awayScore: 98 },
    { home: 'Hertz',       away: 'Lewis',      court: 'Court 3 (Right Side) - 6:30', homeScore: 78, awayScore: 87 },
    { home: 'Ziemer',      away: 'Wedel',      court: 'Court 1 (Left Side) - 7:30', homeScore: 72, awayScore: 94 },
    { home: 'Tordoff',     away: 'Tyler Olson',court: 'Court 3 (Right Side) - 7:30', homeScore: 83, awayScore: 94 },
  ]},
  { date: '2024-04-07', week: 7, games: [
    { home: 'Lewis',       away: 'Wedel',      court: 'Court 1 (Left Side) - 6:30', homeScore: 81, awayScore: 69 },
    { home: 'Danny',       away: 'Tyler Olson',court: 'Court 3 (Right Side) - 6:30', homeScore: 79, awayScore: 70 },
    { home: 'Hertz',       away: 'Ziemer',     court: 'Court 1 (Left Side) - 7:30', homeScore: 68, awayScore: 72 },
    { home: 'Sean F',      away: 'Tordoff',    court: 'Court 3 (Right Side) - 7:30', homeScore: 97, awayScore: 80 },
  ]},
  { date: '2024-04-14', week: 8, games: [
    { home: 'Tordoff',     away: 'Wedel',      court: 'Court 1 (Left Side) - 6:30', homeScore: 66, awayScore: 84 },
    { home: 'Hertz',       away: 'Danny',      court: 'Court 3 (Right Side) - 6:30', homeScore: 74, awayScore: 67 },
    { home: 'Tyler Olson', away: 'Ziemer',     court: 'Court 1 (Left Side) - 7:30', homeScore: 97, awayScore: 87 },
    { home: 'Lewis',       away: 'Sean F',     court: 'Court 3 (Right Side) - 7:30', homeScore: 80, awayScore: 86 },
  ]},
  { date: '2024-04-21', week: 9, games: [
    { home: 'Hertz',       away: 'Sean F',     court: 'Court 1 (Left Side) - 6:30', homeScore: 73, awayScore: 88 },
    { home: 'Tordoff',     away: 'Ziemer',     court: 'Court 3 (Right Side) - 6:30', homeScore: 80, awayScore: 98 },
    { home: 'Lewis',       away: 'Danny',      court: 'Court 1 (Left Side) - 7:30', homeScore: 89, awayScore: 80 },
    { home: 'Tyler Olson', away: 'Wedel',      court: 'Court 3 (Right Side) - 7:30', homeScore: 87, awayScore: 99 },
  ]},
  { date: '2024-04-28', week: 10, games: [
    { home: 'Tyler Olson', away: 'Tordoff',    court: 'Court 1 (Left Side) - 6:30', homeScore: 85, awayScore: 92 },
    { home: 'Wedel',       away: 'Ziemer',     court: 'Court 3 (Right Side) - 6:30', homeScore: 90, awayScore: 84 },
    { home: 'Lewis',       away: 'Hertz',      court: 'Court 1 (Left Side) - 7:30', homeScore: 86, awayScore: 65 },
    { home: 'Danny',       away: 'Sean F',     court: 'Court 3 (Right Side) - 7:30', homeScore: 84, awayScore: 85 },
  ]},
]

const S24_STANDINGS: Record<string, { wins: number; losses: number; divisionWins: number; divisionLosses: number; pointDifferential: number }> = {
  'Lewis':      { wins: 8, losses: 2, divisionWins: 5, divisionLosses: 1, pointDifferential: 85   },
  'Sean F':     { wins: 7, losses: 3, divisionWins: 4, divisionLosses: 2, pointDifferential: 53   },
  'Danny':      { wins: 6, losses: 4, divisionWins: 2, divisionLosses: 4, pointDifferential: 77   },
  'Hertz':      { wins: 3, losses: 7, divisionWins: 1, divisionLosses: 5, pointDifferential: -68  },
  'Wedel':      { wins: 7, losses: 3, divisionWins: 5, divisionLosses: 1, pointDifferential: 44   },
  'Ziemer':     { wins: 4, losses: 6, divisionWins: 3, divisionLosses: 3, pointDifferential: -23  },
  'Tyler Olson':{ wins: 3, losses: 7, divisionWins: 2, divisionLosses: 4, pointDifferential: -57  },
  'Tordoff':    { wins: 2, losses: 8, divisionWins: 2, divisionLosses: 4, pointDifferential: -111 },
}

// Fall 2024
const F24_ROSTERS: Record<string, string[]> = {
  'TJ':        ['TJ',        'Chandler',   'Ty Parman',   'Danny',      'Tim Russell', 'Ricky'],
  'Cooper':    ['Cooper',    'Armga',      'Nate Ray',    'Ziemer',     'Don Thompson','Tall Matt'],
  'Akim':      ['Akim',      'Reetz',      'Hertz',       'Tyler Olson','Zack',        'Dave F'],
  'Sir':       ['Sir',       'Sam Wilk',   'Watts',       'Roy Boone',  'Cori',        'BJ'],
  'Younggren': ['Younggren', 'Noah',       'Justin',      'Don Kahl',   'Scotty Ripp', 'Vos'],
  'Karls':     ['Karls',     'Jake B',     'Nate Lewis',  'Marty',      'Kevin',       'Gallman'],
  'Towns':     ['Towns',     'Macon',      'Sean F',      'Spencer',    'Derek',       'Roy'],
  'Neale':     ['Neale',     'Connor',     'Minnerly',    'Alex Hade',  'Carson',      'Plotkin'],
}

const F24_DIVISIONS: Record<string, Division> = {
  'TJ':        Division.FREEHOUSE,
  'Neale':     Division.FREEHOUSE,
  'Akim':      Division.FREEHOUSE,
  'Sir':       Division.FREEHOUSE,
  'Towns':     Division.DELANEYS,
  'Younggren': Division.DELANEYS,
  'Karls':     Division.DELANEYS,
  'Cooper':    Division.DELANEYS,
}

const F24_SCHEDULE: RoundEntry[] = [
  { date: '2024-09-15', week: 1, games: [
    { home: 'Neale',     away: 'Akim',      court: 'Court 1 (Left Side) - 6:30', homeScore: 83, awayScore: 67 },
    { home: 'Towns',     away: 'Cooper',    court: 'Court 3 (Right Side) - 6:30', homeScore: 59, awayScore: 87 },
    { home: 'TJ',        away: 'Sir',       court: 'Court 1 (Left Side) - 7:30', homeScore: 76, awayScore: 50 },
    { home: 'Younggren', away: 'Karls',     court: 'Court 3 (Right Side) - 7:30', homeScore: 60, awayScore: 74 },
  ]},
  { date: '2024-09-22', week: 2, games: [
    { home: 'Younggren', away: 'Cooper',    court: 'Court 1 (Left Side) - 6:30', homeScore: 73, awayScore: 97 },
    { home: 'TJ',        away: 'Akim',      court: 'Court 3 (Right Side) - 6:30', homeScore: 77, awayScore: 72 },
    { home: 'Towns',     away: 'Karls',     court: 'Court 1 (Left Side) - 7:30', homeScore: 68, awayScore: 83 },
    { home: 'Neale',     away: 'Sir',       court: 'Court 3 (Right Side) - 7:30', homeScore: 70, awayScore: 90 },
  ]},
  { date: '2024-09-29', week: 3, games: [
    { home: 'Neale',     away: 'TJ',        court: 'Court 1 (Left Side) - 6:30', homeScore: 93, awayScore: 81 },
    { home: 'Sir',       away: 'Akim',      court: 'Court 3 (Right Side) - 6:30', homeScore: 74, awayScore: 90 },
    { home: 'Towns',     away: 'Younggren', court: 'Court 1 (Left Side) - 7:30', homeScore: 74, awayScore: 78 },
    { home: 'Karls',     away: 'Cooper',    court: 'Court 3 (Right Side) - 7:30', homeScore: 74, awayScore: 85 },
  ]},
  { date: '2024-10-06', week: 4, games: [
    { home: 'TJ',        away: 'Towns',     court: 'Court 1 (Left Side) - 6:30', homeScore: 99, awayScore: 66 },
    { home: 'Akim',      away: 'Karls',     court: 'Court 3 (Right Side) - 6:30', homeScore: 72, awayScore: 74 },
    { home: 'Neale',     away: 'Cooper',    court: 'Court 1 (Left Side) - 7:30', homeScore: 67, awayScore: 64 },
    { home: 'Sir',       away: 'Younggren', court: 'Court 3 (Right Side) - 7:30', homeScore: 83, awayScore: 63 },
  ]},
  { date: '2024-10-13', week: 5, games: [
    { home: 'Neale',     away: 'Younggren', court: 'Court 1 (Left Side) - 6:30', homeScore: 72, awayScore: 64 },
    { home: 'Sir',       away: 'Cooper',    court: 'Court 3 (Right Side) - 6:30', homeScore: 87, awayScore: 98 },
    { home: 'TJ',        away: 'Karls',     court: 'Court 1 (Left Side) - 7:30', homeScore: 81, awayScore: 88 },
    { home: 'Akim',      away: 'Towns',     court: 'Court 3 (Right Side) - 7:30', homeScore: 98, awayScore: 61 },
  ]},
  { date: '2024-10-20', week: 6, games: [
    { home: 'Sir',       away: 'Karls',     court: 'Court 1 (Left Side) - 6:30', homeScore: 83, awayScore: 75 },
    { home: 'Neale',     away: 'Towns',     court: 'Court 3 (Right Side) - 6:30', homeScore: 67, awayScore: 58 },
    { home: 'Akim',      away: 'Cooper',    court: 'Court 1 (Left Side) - 7:30', homeScore: 95, awayScore: 84 },
    { home: 'TJ',        away: 'Younggren', court: 'Court 3 (Right Side) - 7:30', homeScore: 90, awayScore: 74 },
  ]},
  { date: '2024-10-27', week: 7, games: [
    { home: 'Akim',      away: 'Younggren', court: 'Court 1 (Left Side) - 6:30', homeScore: 75, awayScore: 65 },
    { home: 'TJ',        away: 'Cooper',    court: 'Court 3 (Right Side) - 6:30', homeScore: 81, awayScore: 91 },
    { home: 'Sir',       away: 'Towns',     court: 'Court 1 (Left Side) - 7:30', homeScore: 93, awayScore: 87 },
    { home: 'Neale',     away: 'Karls',     court: 'Court 3 (Right Side) - 7:30', homeScore: 76, awayScore: 67 },
  ]},
  { date: '2024-11-03', week: 8, games: [
    { home: 'Karls',     away: 'Younggren', court: 'Court 1 (Left Side) - 6:30', homeScore: 69, awayScore: 56 },
    { home: 'Sir',       away: 'TJ',        court: 'Court 3 (Right Side) - 6:30', homeScore: 89, awayScore: 95 },
    { home: 'Cooper',    away: 'Towns',     court: 'Court 1 (Left Side) - 7:30', homeScore: 107, awayScore: 94 },
    { home: 'Akim',      away: 'Neale',     court: 'Court 3 (Right Side) - 7:30', homeScore: 81, awayScore: 75 },
  ]},
  { date: '2024-11-10', week: 9, games: [
    { home: 'Sir',       away: 'Neale',     court: 'Court 1 (Left Side) - 6:30', homeScore: 70, awayScore: 92 },
    { home: 'Karls',     away: 'Towns',     court: 'Court 3 (Right Side) - 6:30', homeScore: 69, awayScore: 74 },
    { home: 'Akim',      away: 'TJ',        court: 'Court 1 (Left Side) - 7:30', homeScore: 69, awayScore: 72 },
    { home: 'Cooper',    away: 'Younggren', court: 'Court 3 (Right Side) - 7:30', homeScore: 64, awayScore: 73 },
  ]},
  { date: '2024-11-17', week: 10, games: [
    { home: 'Cooper',    away: 'Karls',     court: 'Court 1 (Left Side) - 6:30', homeScore: 88, awayScore: 85 },
    { home: 'Younggren', away: 'Towns',     court: 'Court 3 (Right Side) - 6:30', homeScore: 82, awayScore: 65 },
    { home: 'Akim',      away: 'Sir',       court: 'Court 1 (Left Side) - 7:30', homeScore: 91, awayScore: 89 },
    { home: 'TJ',        away: 'Neale',     court: 'Court 3 (Right Side) - 7:30', homeScore: 90, awayScore: 78 },
  ]},
]

const F24_STANDINGS: Record<string, { wins: number; losses: number; divisionWins: number; divisionLosses: number; pointDifferential: number }> = {
  'TJ':        { wins: 7, losses: 3, divisionWins: 5, divisionLosses: 1, pointDifferential: 72   },
  'Neale':     { wins: 7, losses: 3, divisionWins: 3, divisionLosses: 3, pointDifferential: 41   },
  'Akim':      { wins: 6, losses: 4, divisionWins: 3, divisionLosses: 3, pointDifferential: 56   },
  'Sir':       { wins: 4, losses: 6, divisionWins: 1, divisionLosses: 5, pointDifferential: -29  },
  'Cooper':    { wins: 7, losses: 3, divisionWins: 5, divisionLosses: 1, pointDifferential: 77   },
  'Karls':     { wins: 5, losses: 5, divisionWins: 3, divisionLosses: 3, pointDifferential: 15   },
  'Younggren': { wins: 3, losses: 7, divisionWins: 3, divisionLosses: 3, pointDifferential: -75  },
  'Towns':     { wins: 1, losses: 9, divisionWins: 1, divisionLosses: 5, pointDifferential: -157 },
}

// Spring 2025
const S25_ROSTERS: Record<string, string[]> = {
  'Plotkin':   ['Plotkin',   'Chandler',   'Roy Boone',   'Sean F',     'Cooper',      'Towns'],
  'Donny':     ['Donny',     'Armga',      'Justin',      'Nate Lewis', 'Karls',       'Younggren'],
  'Dave F':    ['Dave F',    'Reetz',      'Hertz',       'Mike Brand', 'Zack',        'Vos'],
  'Ricky':     ['Ricky',     'Siebert',    'Tordoff',     'Trev Neale', 'Akim',        'Scotty Ripp'],
  'Cori':      ['Cori',      'Noah',       'Nate Ray',    'Alex Hade',  'Sir',         'Carson'],
  'Roy':       ['Roy',       'Sam Wilk',   'Macon',       'Watts',      'Marty',       'Derek'],
  'Tall Matt': ['Tall Matt', 'Minnerly',   'Parman',      'Danny',      'Willie',      'TJ'],
  'Gallman':   ['Gallman',   'Jake B',     'Ziemer',      'Tyler Olson','Tim Russell', 'Wedel'],
}

const S25_DIVISIONS: Record<string, Division> = {
  'Plotkin':   Division.FREEHOUSE,
  'Tall Matt': Division.FREEHOUSE,
  'Dave F':    Division.FREEHOUSE,
  'Cori':      Division.FREEHOUSE,
  'Roy':       Division.DELANEYS,
  'Ricky':     Division.DELANEYS,
  'Donny':     Division.DELANEYS,
  'Gallman':   Division.DELANEYS,
}

const S25_SCHEDULE: RoundEntry[] = [
  { date: '2025-01-19', week: 1, games: [
    { home: 'Dave F',    away: 'Tall Matt', court: 'Court 1 (Left Side) - 6:30', homeScore: 82, awayScore: 90 },
    { home: 'Ricky',     away: 'Donny',     court: 'Court 3 (Right Side) - 6:30', homeScore: 73, awayScore: 76 },
    { home: 'Plotkin',   away: 'Cori',      court: 'Court 1 (Left Side) - 7:30', homeScore: 91, awayScore: 79 },
    { home: 'Gallman',   away: 'Roy',       court: 'Court 3 (Right Side) - 7:30', homeScore: 72, awayScore: 75 },
  ]},
  { date: '2025-01-26', week: 2, games: [
    { home: 'Gallman',   away: 'Donny',     court: 'Court 1 (Left Side) - 6:30', homeScore: 64, awayScore: 81 },
    { home: 'Dave F',    away: 'Cori',      court: 'Court 3 (Right Side) - 6:30', homeScore: 92, awayScore: 89 },
    { home: 'Ricky',     away: 'Roy',       court: 'Court 1 (Left Side) - 7:30', homeScore: 88, awayScore: 84 },
    { home: 'Plotkin',   away: 'Tall Matt', court: 'Court 3 (Right Side) - 7:30', homeScore: 77, awayScore: 69 },
  ]},
  { date: '2025-02-02', week: 3, games: [
    { home: 'Dave F',    away: 'Plotkin',   court: 'Court 1 (Left Side) - 6:30', homeScore: 80, awayScore: 89 },
    { home: 'Cori',      away: 'Tall Matt', court: 'Court 3 (Right Side) - 6:30', homeScore: 78, awayScore: 98 },
    { home: 'Ricky',     away: 'Gallman',   court: 'Court 1 (Left Side) - 7:30', homeScore: 81, awayScore: 102 },
    { home: 'Roy',       away: 'Donny',     court: 'Court 3 (Right Side) - 7:30', homeScore: 75, awayScore: 73 },
  ]},
  { date: '2025-02-16', week: 4, games: [
    { home: 'Dave F',    away: 'Gallman',   court: 'Court 1 (Left Side) - 6:30', homeScore: 69, awayScore: 79 },
    { home: 'Cori',      away: 'Donny',     court: 'Court 3 (Right Side) - 6:30', homeScore: 86, awayScore: 84 },
    { home: 'Plotkin',   away: 'Roy',       court: 'Court 1 (Left Side) - 7:30', homeScore: 65, awayScore: 74 },
    { home: 'Tall Matt', away: 'Ricky',     court: 'Court 3 (Right Side) - 7:30', homeScore: 94, awayScore: 83 },
  ]},
  { date: '2025-02-23', week: 5, games: [
    { home: 'Plotkin',   away: 'Ricky',     court: 'Court 1 (Left Side) - 6:30', homeScore: 77, awayScore: 89 },
    { home: 'Tall Matt', away: 'Roy',       court: 'Court 3 (Right Side) - 6:30', homeScore: 62, awayScore: 67 },
    { home: 'Dave F',    away: 'Donny',     court: 'Court 1 (Left Side) - 7:30', homeScore: 75, awayScore: 72 },
    { home: 'Cori',      away: 'Gallman',   court: 'Court 3 (Right Side) - 7:30', homeScore: 88, awayScore: 94 },
  ]},
  { date: '2025-03-02', week: 6, games: [
    { home: 'Cori',      away: 'Roy',       court: 'Court 1 (Left Side) - 6:30', homeScore: 89, awayScore: 59 },
    { home: 'Dave F',    away: 'Ricky',     court: 'Court 3 (Right Side) - 6:30', homeScore: 99, awayScore: 75 },
    { home: 'Tall Matt', away: 'Donny',     court: 'Court 1 (Left Side) - 7:30', homeScore: 73, awayScore: 67 },
    { home: 'Plotkin',   away: 'Gallman',   court: 'Court 3 (Right Side) - 7:30', homeScore: 82, awayScore: 85 },
  ]},
  { date: '2025-03-09', week: 7, games: [
    { home: 'Tall Matt', away: 'Gallman',   court: 'Court 1 (Left Side) - 6:30', homeScore: 74, awayScore: 61 },
    { home: 'Plotkin',   away: 'Donny',     court: 'Court 3 (Right Side) - 6:30', homeScore: 84, awayScore: 94 },
    { home: 'Cori',      away: 'Ricky',     court: 'Court 1 (Left Side) - 7:30', homeScore: 83, awayScore: 86 },
    { home: 'Dave F',    away: 'Roy',       court: 'Court 3 (Right Side) - 7:30', homeScore: 91, awayScore: 75 },
  ]},
  { date: '2025-03-16', week: 8, games: [
    { home: 'Roy',       away: 'Gallman',   court: 'Court 1 (Left Side) - 6:30', homeScore: 88, awayScore: 73 },
    { home: 'Cori',      away: 'Plotkin',   court: 'Court 3 (Right Side) - 6:30', homeScore: 74, awayScore: 81 },
    { home: 'Donny',     away: 'Ricky',     court: 'Court 1 (Left Side) - 7:30', homeScore: 91, awayScore: 95 },
    { home: 'Tall Matt', away: 'Dave F',    court: 'Court 3 (Right Side) - 7:30', homeScore: 76, awayScore: 78 },
  ]},
  { date: '2025-03-30', week: 9, games: [
    { home: 'Tall Matt', away: 'Plotkin',   court: 'Court 1 (Left Side) - 6:30', homeScore: 64, awayScore: 66 },
    { home: 'Roy',       away: 'Ricky',     court: 'Court 3 (Right Side) - 6:30', homeScore: 86, awayScore: 83 },
    { home: 'Cori',      away: 'Dave F',    court: 'Court 1 (Left Side) - 7:30', homeScore: 85, awayScore: 83 },
    { home: 'Donny',     away: 'Gallman',   court: 'Court 3 (Right Side) - 7:30', homeScore: 70, awayScore: 48 },
  ]},
  { date: '2025-04-06', week: 10, games: [
    { home: 'Donny',     away: 'Roy',       court: 'Court 1 (Left Side) - 6:30', homeScore: 57, awayScore: 63 },
    { home: 'Gallman',   away: 'Ricky',     court: 'Court 3 (Right Side) - 6:30', homeScore: 71, awayScore: 83 },
    { home: 'Tall Matt', away: 'Cori',      court: 'Court 1 (Left Side) - 7:30', homeScore: 81, awayScore: 76 },
    { home: 'Plotkin',   away: 'Dave F',    court: 'Court 3 (Right Side) - 7:30', homeScore: 84, awayScore: 81 },
  ]},
  { date: '2025-04-13', week: 11, games: [
    { home: 'Tall Matt', away: 'Ricky',     court: 'Court 1 (Left Side) - 6:30', homeScore: 101, awayScore: 74 },
    { home: 'Dave F',    away: 'Donny',     court: 'Court 1 (Left Side) - 7:30', homeScore: 77,  awayScore: 0  },
  ]},
]

const S25_STANDINGS: Record<string, { wins: number; losses: number; divisionWins: number; divisionLosses: number; pointDifferential: number }> = {
  'Plotkin':   { wins: 6, losses: 4, divisionWins: 6, divisionLosses: 0, pointDifferential: 7   },
  'Tall Matt': { wins: 6, losses: 4, divisionWins: 3, divisionLosses: 3, pointDifferential: 46  },
  'Dave F':    { wins: 5, losses: 5, divisionWins: 2, divisionLosses: 4, pointDifferential: 16  },
  'Cori':      { wins: 3, losses: 7, divisionWins: 1, divisionLosses: 5, pointDifferential: -22 },
  'Roy':       { wins: 7, losses: 3, divisionWins: 5, divisionLosses: 1, pointDifferential: -7  },
  'Ricky':     { wins: 5, losses: 5, divisionWins: 3, divisionLosses: 3, pointDifferential: -27 },
  'Donny':     { wins: 4, losses: 6, divisionWins: 3, divisionLosses: 3, pointDifferential: 29  },
  'Gallman':   { wins: 4, losses: 6, divisionWins: 1, divisionLosses: 5, pointDifferential: -42 },
}

const FALL_ROSTERS: Record<string, string[]> = {
  'Mike Brand': ['Mike Brand', 'Molloy',      'Boone',       'Staege',      'Jamie',       'Dave F'],
  'Hertz':      ['Hertz',      'Armga',       'Marty',       'Olson',       'Scotty',      'Ricky'],
  'Lewis':      ['Lewis',      'Klassy',      'Watts',       'Trev Neale',  'Ty S',        'Roy'],
  'Sean F':     ['Sean F',     'Parzych',     'Alex',        'Cooper',      'Timmy',       'Younggren'],
  'Jake B':     ['Jake B',     'Noah',        'Danny',       'Kahl',        'Hobert',      'Gallman'],
  'Macon':      ['Macon',      'Sam Wilk',    'Ty Parman',   'TJ',          'Zack',        'Sir'],
  'Ziemer':     ['Ziemer',     'Torin',       'Chase Kieler','Derek',       'Akim',        'Plotkin'],
  'Nate Ray':   ['Nate Ray',   'Minnerly',    'Shane Kieler','Wedel',       'Karls',       'Donny'],
}

// Fall 2025 divisions — FreeHouse: Lewis, Sean F, Jake B, Nate Ray / Delaney's: Brand, Hertz, Macon, Ziemer
const FALL_DIVISIONS: Record<string, Division> = {
  'Mike Brand': Division.DELANEYS,
  'Hertz':      Division.DELANEYS,
  'Macon':      Division.DELANEYS,
  'Ziemer':     Division.DELANEYS,
  'Lewis':      Division.FREEHOUSE,
  'Sean F':     Division.FREEHOUSE,
  'Jake B':     Division.FREEHOUSE,
  'Nate Ray':   Division.FREEHOUSE,
}

const SPRING_ROSTERS: Record<string, string[]> = {
  'Cooper':  ['Cooper',  'Armga',      'Macon',      'Sean F',      'Donny',       'Ricky'],
  'Olson':   ['Olson',   'Chandler',   'Trev Neale', 'Hertz',       'Jesse Temple','Younggren'],
  'Derek':   ['Derek',   'Klassy',     'Ziemer',     'Lewis',       'Carson',      'Jamie'],
  'Alex':    ['Alex',    'Nate Rohrer','Ty Parman',  'Watts',       'Boone',       'Roy'],
  'Timmy':   ['Timmy',   'Minnerly',   'Mike Brand', 'Marty',       'Ty S',        'Plotkin'],
  'TJ':      ['TJ',      'Noah',       'Chase Kieler','Danny',      'Wedel',       'Sir'],
  'Zack':    ['Zack',    'Sam Wilk',   'Shravan',    'Justin',      'Willie',      'Tall Matt'],
  'Akim':    ['Akim',    'Reetz',      'Jake B',     'Nate Ray',    'Kahl',        'Scotty'],
}

const SPRING_DIVISIONS: Record<string, Division> = {
  'Cooper': Division.FREEHOUSE,
  'TJ':     Division.FREEHOUSE,
  'Zack':   Division.FREEHOUSE,
  'Derek':  Division.FREEHOUSE,
  'Olson':  Division.DELANEYS,
  'Alex':   Division.DELANEYS,
  'Timmy':  Division.DELANEYS,
  'Akim':   Division.DELANEYS,
}

// ---------------------------------------------------------------------------
// Schedules
// ---------------------------------------------------------------------------

interface GameEntry {
  home: string; away: string; court: string
  homeScore?: number; awayScore?: number
}
interface RoundEntry {
  date: string; week: number; games: GameEntry[]
}

const FALL_SCHEDULE: RoundEntry[] = [
  { date: '2025-09-14', week: 1, games: [
    { home: 'Lewis',    away: 'Sean F',   court: 'Court 1 (Left Side) - 6:30',  homeScore: 97,  awayScore: 67  },
    { home: 'Mike Brand', away: 'Hertz',  court: 'Court 3 (Right Side) - 6:30', homeScore: 61,  awayScore: 66  },
    { home: 'Jake B',   away: 'Nate Ray', court: 'Court 1 (Left Side) - 7:30',  homeScore: 75,  awayScore: 77  },
    { home: 'Macon',    away: 'Ziemer',   court: 'Court 3 (Right Side) - 7:30', homeScore: 75,  awayScore: 85  },
  ]},
  { date: '2025-09-21', week: 2, games: [
    { home: 'Macon',    away: 'Hertz',    court: 'Court 1 (Left Side) - 6:30',  homeScore: 91,  awayScore: 94  },
    { home: 'Jake B',   away: 'Sean F',   court: 'Court 3 (Right Side) - 6:30', homeScore: 78,  awayScore: 69  },
    { home: 'Mike Brand', away: 'Ziemer', court: 'Court 1 (Left Side) - 7:30',  homeScore: 85,  awayScore: 80  },
    { home: 'Lewis',    away: 'Nate Ray', court: 'Court 3 (Right Side) - 7:30', homeScore: 74,  awayScore: 67  },
  ]},
  { date: '2025-09-28', week: 3, games: [
    { home: 'Lewis',    away: 'Jake B',   court: 'Court 1 (Left Side) - 6:30',  homeScore: 61,  awayScore: 68  },
    { home: 'Nate Ray', away: 'Sean F',   court: 'Court 3 (Right Side) - 6:30', homeScore: 73,  awayScore: 61  },
    { home: 'Mike Brand', away: 'Macon',  court: 'Court 1 (Left Side) - 7:30',  homeScore: 76,  awayScore: 77  },
    { home: 'Ziemer',   away: 'Hertz',    court: 'Court 3 (Right Side) - 7:30', homeScore: 83,  awayScore: 81  },
  ]},
  { date: '2025-10-05', week: 4, games: [
    { home: 'Jake B',   away: 'Mike Brand', court: 'Court 1 (Left Side) - 6:30', homeScore: 89, awayScore: 79  },
    { home: 'Sean F',   away: 'Ziemer',   court: 'Court 3 (Right Side) - 6:30', homeScore: 88,  awayScore: 101 },
    { home: 'Lewis',    away: 'Hertz',    court: 'Court 1 (Left Side) - 7:30',  homeScore: 69,  awayScore: 80  },
    { home: 'Nate Ray', away: 'Macon',    court: 'Court 3 (Right Side) - 7:30', homeScore: 88,  awayScore: 91  },
  ]},
  { date: '2025-10-12', week: 5, games: [
    { home: 'Lewis',    away: 'Macon',    court: 'Court 1 (Left Side) - 6:30',  homeScore: 84,  awayScore: 81  },
    { home: 'Nate Ray', away: 'Hertz',    court: 'Court 3 (Right Side) - 6:30', homeScore: 66,  awayScore: 75  },
    { home: 'Jake B',   away: 'Ziemer',   court: 'Court 1 (Left Side) - 7:30',  homeScore: 57,  awayScore: 84  },
    { home: 'Sean F',   away: 'Mike Brand', court: 'Court 3 (Right Side) - 7:30', homeScore: 104, awayScore: 103 },
  ]},
  { date: '2025-10-19', week: 6, games: [
    { home: 'Nate Ray', away: 'Ziemer',   court: 'Court 1 (Left Side) - 6:30',  homeScore: 73,  awayScore: 86  },
    { home: 'Lewis',    away: 'Mike Brand', court: 'Court 3 (Right Side) - 6:30', homeScore: 110, awayScore: 87 },
    { home: 'Sean F',   away: 'Hertz',    court: 'Court 1 (Left Side) - 7:30',  homeScore: 78,  awayScore: 101 },
    { home: 'Jake B',   away: 'Macon',    court: 'Court 3 (Right Side) - 7:30', homeScore: 83,  awayScore: 73  },
  ]},
  { date: '2025-10-26', week: 7, games: [
    { home: 'Sean F',   away: 'Macon',    court: 'Court 1 (Left Side) - 6:30',  homeScore: 81,  awayScore: 96  },
    { home: 'Jake B',   away: 'Hertz',    court: 'Court 3 (Right Side) - 6:30', homeScore: 53,  awayScore: 60  },
    { home: 'Nate Ray', away: 'Mike Brand', court: 'Court 1 (Left Side) - 7:30', homeScore: 78, awayScore: 70  },
    { home: 'Lewis',    away: 'Ziemer',   court: 'Court 3 (Right Side) - 7:30', homeScore: 91,  awayScore: 88  },
  ]},
  { date: '2025-11-02', week: 8, games: [
    { home: 'Ziemer',   away: 'Macon',    court: 'Court 1 (Left Side) - 6:30',  homeScore: 80,  awayScore: 92  },
    { home: 'Nate Ray', away: 'Jake B',   court: 'Court 3 (Right Side) - 6:30', homeScore: 76,  awayScore: 53  },
    { home: 'Hertz',    away: 'Mike Brand', court: 'Court 1 (Left Side) - 7:30', homeScore: 79, awayScore: 62  },
    { home: 'Sean F',   away: 'Lewis',    court: 'Court 3 (Right Side) - 7:30', homeScore: 62,  awayScore: 78  },
  ]},
  { date: '2025-11-09', week: 9, games: [
    { home: 'Nate Ray', away: 'Lewis',    court: 'Court 1 (Left Side) - 6:30',  homeScore: 78,  awayScore: 80  },
    { home: 'Ziemer',   away: 'Mike Brand', court: 'Court 3 (Right Side) - 6:30', homeScore: 88, awayScore: 90 },
    { home: 'Sean F',   away: 'Jake B',   court: 'Court 1 (Left Side) - 7:30',  homeScore: 93,  awayScore: 101 },
    { home: 'Hertz',    away: 'Macon',    court: 'Court 3 (Right Side) - 7:30', homeScore: 90,  awayScore: 92  },
  ]},
  { date: '2025-11-16', week: 10, games: [
    { home: 'Hertz',    away: 'Ziemer',   court: 'Court 1 (Left Side) - 6:30',  homeScore: 89,  awayScore: 94  },
    { home: 'Macon',    away: 'Mike Brand', court: 'Court 3 (Right Side) - 6:30', homeScore: 75, awayScore: 61 },
    { home: 'Sean F',   away: 'Nate Ray', court: 'Court 1 (Left Side) - 7:30',  homeScore: 69,  awayScore: 99  },
    { home: 'Jake B',   away: 'Lewis',    court: 'Court 3 (Right Side) - 7:30', homeScore: 91,  awayScore: 95  },
  ]},
]

const SPRING_SCHEDULE: RoundEntry[] = [
  { date: '2026-01-18', week: 1, games: [
    { home: 'TJ',     away: 'Zack',   court: 'Court 1 (Left Side) - 6:30',  homeScore: 73,  awayScore: 70  },
    { home: 'Derek',  away: 'Cooper', court: 'Court 3 (Right Side) - 6:30', homeScore: 85,  awayScore: 70  },
    { home: 'Olson',  away: 'Akim',   court: 'Court 1 (Left Side) - 7:30',  homeScore: 90,  awayScore: 86  },
    { home: 'Alex',   away: 'Timmy',  court: 'Court 3 (Right Side) - 7:30', homeScore: 67,  awayScore: 70  },
  ]},
  { date: '2026-01-25', week: 2, games: [
    { home: 'Alex',   away: 'Akim',   court: 'Court 1 (Left Side) - 6:30',  homeScore: 106, awayScore: 70  },
    { home: 'Olson',  away: 'Timmy',  court: 'Court 3 (Right Side) - 6:30', homeScore: 70,  awayScore: 65  },
    { home: 'Derek',  away: 'Zack',   court: 'Court 1 (Left Side) - 7:30',  homeScore: 81,  awayScore: 90  },
    { home: 'TJ',     away: 'Cooper', court: 'Court 3 (Right Side) - 7:30', homeScore: 85,  awayScore: 90  },
  ]},
  { date: '2026-02-01', week: 3, games: [
    { home: 'TJ',     away: 'Derek',  court: 'Court 1 (Left Side) - 6:30',  homeScore: 81,  awayScore: 65  },
    { home: 'Cooper', away: 'Zack',   court: 'Court 3 (Right Side) - 6:30', homeScore: 85,  awayScore: 65  },
    { home: 'Olson',  away: 'Alex',   court: 'Court 1 (Left Side) - 7:30',  homeScore: 69,  awayScore: 97  },
    { home: 'Timmy',  away: 'Akim',   court: 'Court 3 (Right Side) - 7:30', homeScore: 69,  awayScore: 79  },
  ]},
  { date: '2026-02-15', week: 4, games: [
    { home: 'Alex',   away: 'Derek',  court: 'Court 1 (Left Side) - 6:30',  homeScore: 111, awayScore: 85  },
    { home: 'Olson',  away: 'TJ',     court: 'Court 3 (Right Side) - 6:30', homeScore: 60,  awayScore: 81  },
    { home: 'Timmy',  away: 'Cooper', court: 'Court 1 (Left Side) - 7:30',  homeScore: 74,  awayScore: 85  },
    { home: 'Akim',   away: 'Zack',   court: 'Court 3 (Right Side) - 7:30', homeScore: 100, awayScore: 98  },
  ]},
  { date: '2026-02-22', week: 5, games: [
    { home: 'Cooper', away: 'Akim',   court: 'Court 1 (Left Side) - 6:30',  homeScore: 71,  awayScore: 89  },
    { home: 'Derek',  away: 'Timmy',  court: 'Court 3 (Right Side) - 6:30', homeScore: 100, awayScore: 77  },
    { home: 'Zack',   away: 'Olson',  court: 'Court 1 (Left Side) - 7:30',  homeScore: 62,  awayScore: 74  },
    { home: 'TJ',     away: 'Alex',   court: 'Court 3 (Right Side) - 7:30', homeScore: 62,  awayScore: 64  },
  ]},
  { date: '2026-03-01', week: 6, games: [
    { home: 'Alex',   away: 'Zack',   court: 'Court 1 (Left Side) - 6:30',  homeScore: 83,  awayScore: 75  },
    { home: 'Olson',  away: 'Cooper', court: 'Court 3 (Right Side) - 6:30', homeScore: 68,  awayScore: 82  },
    { home: 'Timmy',  away: 'TJ',     court: 'Court 1 (Left Side) - 7:30',  homeScore: 77,  awayScore: 99  },
    { home: 'Akim',   away: 'Derek',  court: 'Court 3 (Right Side) - 7:30', homeScore: 75,  awayScore: 74  },
  ]},
  { date: '2026-03-08', week: 7, games: [
    { home: 'Zack',   away: 'Timmy',  court: 'Court 1 (Left Side) - 6:30' },
    { home: 'TJ',     away: 'Akim',   court: 'Court 3 (Right Side) - 6:30' },
    { home: 'Cooper', away: 'Alex',   court: 'Court 1 (Left Side) - 7:30' },
    { home: 'Derek',  away: 'Olson',  court: 'Court 3 (Right Side) - 7:30' },
  ]},
  { date: '2026-03-15', week: 8, games: [
    { home: 'Akim',   away: 'Olson',  court: 'Court 1 (Left Side) - 6:30' },
    { home: 'Timmy',  away: 'Alex',   court: 'Court 3 (Right Side) - 6:30' },
    { home: 'Cooper', away: 'Derek',  court: 'Court 1 (Left Side) - 7:30' },
    { home: 'Zack',   away: 'TJ',     court: 'Court 3 (Right Side) - 7:30' },
  ]},
  { date: '2026-03-29', week: 9, games: [
    { home: 'Cooper', away: 'TJ',     court: 'Court 1 (Left Side) - 6:30' },
    { home: 'Zack',   away: 'Derek',  court: 'Court 3 (Right Side) - 6:30' },
    { home: 'Timmy',  away: 'Olson',  court: 'Court 1 (Left Side) - 7:30' },
    { home: 'Akim',   away: 'Alex',   court: 'Court 3 (Right Side) - 7:30' },
  ]},
  { date: '2026-04-12', week: 10, games: [
    { home: 'Akim',   away: 'Timmy',  court: 'Court 1 (Left Side) - 6:30' },
    { home: 'Alex',   away: 'Olson',  court: 'Court 3 (Right Side) - 6:30' },
    { home: 'Derek',  away: 'TJ',     court: 'Court 1 (Left Side) - 7:30' },
    { home: 'Zack',   away: 'Cooper', court: 'Court 3 (Right Side) - 7:30' },
  ]},
]

// ---------------------------------------------------------------------------
// Standings
// ---------------------------------------------------------------------------

const FALL_STANDINGS: Record<string, {
  wins: number; losses: number; divisionWins: number; divisionLosses: number; pointDifferential: number
}> = {
  'Lewis':      { wins: 8, losses: 2, divisionWins: 5, divisionLosses: 1, pointDifferential: 70   },
  'Nate Ray':   { wins: 5, losses: 5, divisionWins: 4, divisionLosses: 2, pointDifferential: 41   },
  'Jake B':     { wins: 5, losses: 5, divisionWins: 3, divisionLosses: 3, pointDifferential: -19  },
  'Sean F':     { wins: 1, losses: 9, divisionWins: 0, divisionLosses: 6, pointDifferential: -155 },
  'Hertz':      { wins: 7, losses: 3, divisionWins: 3, divisionLosses: 3, pointDifferential: 66   },
  'Macon':      { wins: 6, losses: 4, divisionWins: 4, divisionLosses: 2, pointDifferential: 21   },
  'Ziemer':     { wins: 6, losses: 4, divisionWins: 3, divisionLosses: 3, pointDifferential: 48   },
  'Mike Brand': { wins: 2, losses: 8, divisionWins: 2, divisionLosses: 4, pointDifferential: -72  },
}

const SPRING_STANDINGS: Record<string, {
  wins: number; losses: number; divisionWins: number; divisionLosses: number; pointDifferential: number
}> = {
  'Cooper': { wins: 4, losses: 2, divisionWins: 2, divisionLosses: 1, pointDifferential: 17  },
  'TJ':     { wins: 4, losses: 2, divisionWins: 2, divisionLosses: 1, pointDifferential: 55  },
  'Derek':  { wins: 2, losses: 4, divisionWins: 1, divisionLosses: 2, pointDifferential: -14 },
  'Zack':   { wins: 1, losses: 5, divisionWins: 1, divisionLosses: 2, pointDifferential: -36 },
  'Alex':   { wins: 5, losses: 1, divisionWins: 2, divisionLosses: 1, pointDifferential: 97  },
  'Akim':   { wins: 4, losses: 2, divisionWins: 1, divisionLosses: 2, pointDifferential: -9  },
  'Olson':  { wins: 3, losses: 3, divisionWins: 2, divisionLosses: 1, pointDifferential: -42 },
  'Timmy':  { wins: 1, losses: 5, divisionWins: 1, divisionLosses: 2, pointDifferential: -68 },
}

// ---------------------------------------------------------------------------
// Main seed
// ---------------------------------------------------------------------------

async function main() {
  console.log('🌱 Starting seed...')

  await prisma.careerStat.deleteMany()
  await prisma.sessionStat.deleteMany()
  await prisma.gameStat.deleteMany()
  await prisma.teamRoster.deleteMany()
  await prisma.game.deleteMany()
  await prisma.team.deleteMany()
  await prisma.session.deleteMany()
  await prisma.player.deleteMany()
  console.log('✅ Cleared existing data')

  // Parse stat sheets
  const s23StatsWb  = XLSX.readFile('prisma/data/Spring_2023_MBA_Stats.xlsx')
  const f23StatsWb  = XLSX.readFile('prisma/data/Fall_2023_MBA_Stats.xlsx')
  const s24StatsWb  = XLSX.readFile('prisma/data/Spring_2024_MBA_Stats.xlsx')
  const f24StatsWb  = XLSX.readFile('prisma/data/Fall_2024_MBA_Stats.xlsx')
  const s25StatsWb  = XLSX.readFile('prisma/data/Spring_2025_MBA_Stats.xlsx')
  const fallStatsWb   = XLSX.readFile('prisma/data/Fall_2025_MBA_Stats.xlsx')
  const springStatsWb = XLSX.readFile('prisma/data/Spring_2026_MBA_Stats_1.xlsx')

  const S23_STAT_SHEETS: Record<string, string> = {
    'Sean F': 'SeanF', 'Sam P': 'SamP', 'Lewis': 'Nate', 'Tyler': 'Wedel',
    'Ziemer': 'Ziemer', 'Justin': 'Justin', 'Connor': 'Connor', 'Danny': 'Danny',
  }
  const s23Stats: Record<string, GameBlock[]> = {}
  for (const [cap, sheet] of Object.entries(S23_STAT_SHEETS)) {
    s23Stats[cap] = parseTeamGames(s23StatsWb.Sheets[sheet])
  }

  const F23_STAT_SHEETS: Record<string, string> = {
    'Ricky': 'Ricky', 'Don Thompson': 'Don', 'Gallman': 'Gallman', 'Pat': 'Pat',
    'Winsor': 'Winsor', 'Roy': 'Roy', 'BJ': 'BJ', 'Towns': 'Towns',
  }
  const f23Stats: Record<string, GameBlock[]> = {}
  for (const [cap, sheet] of Object.entries(F23_STAT_SHEETS)) {
    f23Stats[cap] = parseTeamGames(f23StatsWb.Sheets[sheet])
  }

  const S24_STAT_SHEETS: Record<string, string> = {
    'Wedel': 'Wedel', 'Danny': 'Danny', 'Tyler Olson': 'Olson', 'Tordoff': 'Tordoff',
    'Lewis': 'Lewis', 'Hertz': 'Hertz', 'Ziemer': 'Ziemer', 'Sean F': 'Sean F',
  }
  const s24Stats: Record<string, GameBlock[]> = {}
  for (const [cap, sheet] of Object.entries(S24_STAT_SHEETS)) {
    s24Stats[cap] = parseTeamGames(s24StatsWb.Sheets[sheet])
  }

  const F24_STAT_SHEETS: Record<string, string> = {
    'Sir': 'Sir', 'TJ': 'TJ', 'Cooper': 'Cooper', 'Akim': 'Akim',
    'Younggren': 'Younggren', 'Karls': 'Karls', 'Towns': 'Towns', 'Neale': 'Neale',
  }
  const f24Stats: Record<string, GameBlock[]> = {}
  for (const [cap, sheet] of Object.entries(F24_STAT_SHEETS)) {
    f24Stats[cap] = parseTeamGames(f24StatsWb.Sheets[sheet])
  }

  const S25_STAT_SHEETS: Record<string, string> = {
    'Plotkin': 'Plotkin', 'Donny': 'Donny', 'Dave F': 'Dave F', 'Ricky': 'Ricky',
    'Cori': 'Cori', 'Roy': 'Roy', 'Tall Matt': 'Tall Matt', 'Gallman': 'Gallman',
  }
  const s25Stats: Record<string, GameBlock[]> = {}
  for (const [cap, sheet] of Object.entries(S25_STAT_SHEETS)) {
    s25Stats[cap] = parseTeamGames(s25StatsWb.Sheets[sheet])
  }

  // Fall stat sheets use captain last name as sheet name
  const FALL_STAT_SHEETS: Record<string, string> = {
    'Mike Brand': 'Brand', 'Hertz': 'Hertz', 'Lewis': 'Lewis', 'Sean F': 'Sean F',
    'Jake B': 'Jake B', 'Macon': 'Macon', 'Ziemer': 'Ziemer', 'Nate Ray': 'Nate Ray',
  }
  const fallStats: Record<string, GameBlock[]> = {}
  for (const [cap, sheet] of Object.entries(FALL_STAT_SHEETS)) {
    fallStats[cap] = parseTeamGames(fallStatsWb.Sheets[sheet])
  }

  const SPRING_STAT_SHEETS: Record<string, string> = {
    'Cooper': 'Cooper', 'Olson': 'Tyler Olson', 'Derek': 'Derek',
    'Alex': 'Alex', 'Timmy': 'Timmy', 'TJ': 'TJ', 'Zack': 'Zack', 'Akim': 'Akim',
  }
  const springStats: Record<string, GameBlock[]> = {}
  for (const [cap, sheet] of Object.entries(SPRING_STAT_SHEETS)) {
    springStats[cap] = parseTeamGames(springStatsWb.Sheets[sheet])
  }

  // Collect all unique canonical displayNames
  const allNames = new Set<string>()
  const allRosters = [
    ...Object.values(S23_ROSTERS), ...Object.values(F23_ROSTERS),
    ...Object.values(S24_ROSTERS), ...Object.values(F24_ROSTERS),
    ...Object.values(S25_ROSTERS),
    ...Object.values(FALL_ROSTERS), ...Object.values(SPRING_ROSTERS),
  ]
  for (const players of allRosters) players.forEach(p => { if (!isSub(p)) allNames.add(p) })

  const allStatMaps = [s23Stats, f23Stats, s24Stats, f24Stats, s25Stats, fallStats, springStats]
  for (const statMap of allStatMaps) {
    for (const games of Object.values(statMap)) {
      for (const g of games) g.players.forEach(p => {
        const cn = canonical(p.name)
        if (!isSub(cn)) allNames.add(cn)
      })
    }
  }

  // Create Players
  const playerIdMap: Record<string, string> = {}
  for (const displayName of allNames) {
    if (isSub(displayName)) continue
    const { firstName, lastName } = getNames(displayName)
    const player = await prisma.player.create({
      data: { firstName, lastName, displayName, isActive: true },
    })
    playerIdMap[displayName] = player.id
  }
  console.log(`✅ Created ${allNames.size} players`)

  // ---- Helper: insert game stats ----
  async function insertGameStats(gameId: string, block: GameBlock) {
    for (const p of block.players) {
      const cname = canonical(p.name)
      const pid = playerIdMap[cname]
      if (!pid) { console.warn(`⚠️  Unknown player: "${p.name}" → "${cname}"`); continue }
      const exists = await prisma.gameStat.findUnique({ where: { gameId_playerId: { gameId, playerId: pid } } })
      if (exists) continue
      await prisma.gameStat.create({
        data: {
          gameId, playerId: pid,
          fgMade: p.fgMade, fgAttempted: p.fgAttempted,
          threesMade: p.threesMade, threesAttempted: p.threesAttempted,
          ftMade: p.ftMade, ftAttempted: p.ftAttempted,
          points: p.points, rebounds: p.rebounds, assists: p.assists,
          blocks: p.blocks, steals: p.steals, turnovers: p.turnovers,
        },
      })
    }
  }

  // ---- Helper: build session stats ----
  async function buildSessionStats(sessionId: string, statMap: Record<string, GameBlock[]>) {
    type Agg = { gamesPlayed: number; fgMade: number; fgAttempted: number; threesMade: number; threesAttempted: number; ftMade: number; ftAttempted: number; points: number; rebounds: number; assists: number; blocks: number; steals: number; turnovers: number }
    const aggs: Record<string, Agg> = {}
    for (const games of Object.values(statMap)) {
      for (const g of games) {
        for (const p of g.players) {
          const cn = canonical(p.name)
          if (!playerIdMap[cn]) continue
          if (!aggs[cn]) aggs[cn] = { gamesPlayed: 0, fgMade: 0, fgAttempted: 0, threesMade: 0, threesAttempted: 0, ftMade: 0, ftAttempted: 0, points: 0, rebounds: 0, assists: 0, blocks: 0, steals: 0, turnovers: 0 }
          const a = aggs[cn]
          a.gamesPlayed++; a.fgMade += p.fgMade; a.fgAttempted += p.fgAttempted
          a.threesMade += p.threesMade; a.threesAttempted += p.threesAttempted
          a.ftMade += p.ftMade; a.ftAttempted += p.ftAttempted
          a.points += p.points; a.rebounds += p.rebounds; a.assists += p.assists
          a.blocks += p.blocks; a.steals += p.steals; a.turnovers += p.turnovers
        }
      }
    }
    for (const [dn, agg] of Object.entries(aggs)) {
      await prisma.sessionStat.create({ data: { sessionId, playerId: playerIdMap[dn], ...agg } })
    }
  }

  // ---------------------------------------------------------------------------
  // Spring 2023
  // ---------------------------------------------------------------------------

  const spring2023 = await prisma.session.create({
    data: {
      name: 'Spring 2023', period: SessionPeriod.SPRING, year: 2023,
      startDate: new Date('2023-02-19'), endDate: new Date('2023-05-21'), isActive: false,
    },
  })

  const s23TeamIds: Record<string, string> = {}
  for (const [cap, players] of Object.entries(S23_ROSTERS)) {
    const team = await prisma.team.create({
      data: { sessionId: spring2023.id, captainId: playerIdMap[cap], division: S23_DIVISIONS[cap], ...S23_STANDINGS[cap] },
    })
    s23TeamIds[cap] = team.id
    for (const pName of players) {
      const pid = playerIdMap[pName]
      if (!pid) { console.warn(`⚠️  No player id for S23 roster: ${pName}`); continue }
      await prisma.teamRoster.create({ data: { teamId: team.id, playerId: pid, isSub: false } })
    }
  }

  for (const round of S23_SCHEDULE) {
    for (const g of round.games) {
      const game = await prisma.game.create({
        data: {
          sessionId: spring2023.id,
          homeTeamId: s23TeamIds[g.home], awayTeamId: s23TeamIds[g.away],
          scheduledAt: new Date(round.date), court: g.court, week: round.week,
          isPlayoff: round.week >= 11,
          playoffRound: round.week === 11 ? 1 : round.week === 12 ? 3 : null,
          status: g.homeScore != null ? GameStatus.FINAL : GameStatus.SCHEDULED,
          homeScore: g.homeScore ?? 0, awayScore: g.awayScore ?? 0,
        },
      })
      if (g.homeScore == null) continue
      const homeBlock = s23Stats[g.home]?.find(b => b.gameNum === round.week)
      const awayBlock = s23Stats[g.away]?.find(b => b.gameNum === round.week)
      if (homeBlock) await insertGameStats(game.id, homeBlock)
      if (awayBlock) await insertGameStats(game.id, awayBlock)
    }
  }
  console.log('✅ Spring 2023 games + stats')
  await buildSessionStats(spring2023.id, s23Stats)
  console.log('✅ Spring 2023 session stats')

  // ---------------------------------------------------------------------------
  // Fall 2023
  // ---------------------------------------------------------------------------

  const fall2023 = await prisma.session.create({
    data: {
      name: 'Fall 2023', period: SessionPeriod.FALL, year: 2023,
      startDate: new Date('2023-09-17'), endDate: new Date('2023-11-19'), isActive: false,
    },
  })

  const f23TeamIds: Record<string, string> = {}
  for (const [cap, players] of Object.entries(F23_ROSTERS)) {
    const team = await prisma.team.create({
      data: { sessionId: fall2023.id, captainId: playerIdMap[cap], division: F23_DIVISIONS[cap], ...F23_STANDINGS[cap] },
    })
    f23TeamIds[cap] = team.id
    for (const pName of players) {
      const pid = playerIdMap[pName]
      if (!pid) { console.warn(`⚠️  No player id for F23 roster: ${pName}`); continue }
      await prisma.teamRoster.create({ data: { teamId: team.id, playerId: pid, isSub: false } })
    }
  }

  for (const round of F23_SCHEDULE) {
    for (const g of round.games) {
      const game = await prisma.game.create({
        data: {
          sessionId: fall2023.id,
          homeTeamId: f23TeamIds[g.home], awayTeamId: f23TeamIds[g.away],
          scheduledAt: new Date(round.date), court: g.court, week: round.week,
          isPlayoff: false,
          status: g.homeScore != null ? GameStatus.FINAL : GameStatus.SCHEDULED,
          homeScore: g.homeScore ?? 0, awayScore: g.awayScore ?? 0,
        },
      })
      if (g.homeScore == null) continue
      const homeBlock = f23Stats[g.home]?.find(b => b.gameNum === round.week)
      const awayBlock = f23Stats[g.away]?.find(b => b.gameNum === round.week)
      if (homeBlock) await insertGameStats(game.id, homeBlock)
      if (awayBlock) await insertGameStats(game.id, awayBlock)
    }
  }
  console.log('✅ Fall 2023 games + stats')
  await buildSessionStats(fall2023.id, f23Stats)
  console.log('✅ Fall 2023 session stats')

  // ---------------------------------------------------------------------------
  // Spring 2024
  // ---------------------------------------------------------------------------

  const spring2024 = await prisma.session.create({
    data: {
      name: 'Spring 2024', period: SessionPeriod.SPRING, year: 2024,
      startDate: new Date('2024-02-04'), endDate: new Date('2024-05-19'), isActive: false,
    },
  })

  const s24TeamIds: Record<string, string> = {}
  for (const [cap, players] of Object.entries(S24_ROSTERS)) {
    const team = await prisma.team.create({
      data: { sessionId: spring2024.id, captainId: playerIdMap[cap], division: S24_DIVISIONS[cap], ...S24_STANDINGS[cap] },
    })
    s24TeamIds[cap] = team.id
    for (const pName of players) {
      const pid = playerIdMap[pName]
      if (!pid) { console.warn(`⚠️  No player id for S24 roster: ${pName}`); continue }
      await prisma.teamRoster.create({ data: { teamId: team.id, playerId: pid, isSub: false } })
    }
  }

  for (const round of S24_SCHEDULE) {
    for (const g of round.games) {
      const game = await prisma.game.create({
        data: {
          sessionId: spring2024.id,
          homeTeamId: s24TeamIds[g.home], awayTeamId: s24TeamIds[g.away],
          scheduledAt: new Date(round.date), court: g.court, week: round.week,
          isPlayoff: false,
          status: g.homeScore != null ? GameStatus.FINAL : GameStatus.SCHEDULED,
          homeScore: g.homeScore ?? 0, awayScore: g.awayScore ?? 0,
        },
      })
      if (g.homeScore == null) continue
      const homeBlock = s24Stats[g.home]?.find(b => b.gameNum === round.week)
      const awayBlock = s24Stats[g.away]?.find(b => b.gameNum === round.week)
      if (homeBlock) await insertGameStats(game.id, homeBlock)
      if (awayBlock) await insertGameStats(game.id, awayBlock)
    }
  }
  console.log('✅ Spring 2024 games + stats')
  await buildSessionStats(spring2024.id, s24Stats)
  console.log('✅ Spring 2024 session stats')

  // ---------------------------------------------------------------------------
  // Fall 2024
  // ---------------------------------------------------------------------------

  const fall2024 = await prisma.session.create({
    data: {
      name: 'Fall 2024', period: SessionPeriod.FALL, year: 2024,
      startDate: new Date('2024-09-15'), endDate: new Date('2024-12-15'), isActive: false,
    },
  })

  const f24TeamIds: Record<string, string> = {}
  for (const [cap, players] of Object.entries(F24_ROSTERS)) {
    const team = await prisma.team.create({
      data: { sessionId: fall2024.id, captainId: playerIdMap[cap], division: F24_DIVISIONS[cap], ...F24_STANDINGS[cap] },
    })
    f24TeamIds[cap] = team.id
    for (const pName of players) {
      const pid = playerIdMap[pName]
      if (!pid) { console.warn(`⚠️  No player id for F24 roster: ${pName}`); continue }
      await prisma.teamRoster.create({ data: { teamId: team.id, playerId: pid, isSub: false } })
    }
  }

  for (const round of F24_SCHEDULE) {
    for (const g of round.games) {
      const game = await prisma.game.create({
        data: {
          sessionId: fall2024.id,
          homeTeamId: f24TeamIds[g.home], awayTeamId: f24TeamIds[g.away],
          scheduledAt: new Date(round.date), court: g.court, week: round.week,
          isPlayoff: false,
          status: g.homeScore != null ? GameStatus.FINAL : GameStatus.SCHEDULED,
          homeScore: g.homeScore ?? 0, awayScore: g.awayScore ?? 0,
        },
      })
      if (g.homeScore == null) continue
      const homeBlock = f24Stats[g.home]?.find(b => b.gameNum === round.week)
      const awayBlock = f24Stats[g.away]?.find(b => b.gameNum === round.week)
      if (homeBlock) await insertGameStats(game.id, homeBlock)
      if (awayBlock) await insertGameStats(game.id, awayBlock)
    }
  }
  console.log('✅ Fall 2024 games + stats')
  await buildSessionStats(fall2024.id, f24Stats)
  console.log('✅ Fall 2024 session stats')

  // ---------------------------------------------------------------------------
  // Spring 2025
  // ---------------------------------------------------------------------------

  const spring2025 = await prisma.session.create({
    data: {
      name: 'Spring 2025', period: SessionPeriod.SPRING, year: 2025,
      startDate: new Date('2025-01-19'), endDate: new Date('2025-05-04'), isActive: false,
    },
  })

  const s25TeamIds: Record<string, string> = {}
  for (const [cap, players] of Object.entries(S25_ROSTERS)) {
    const team = await prisma.team.create({
      data: { sessionId: spring2025.id, captainId: playerIdMap[cap], division: S25_DIVISIONS[cap], ...S25_STANDINGS[cap] },
    })
    s25TeamIds[cap] = team.id
    for (const pName of players) {
      const pid = playerIdMap[pName]
      if (!pid) { console.warn(`⚠️  No player id for S25 roster: ${pName}`); continue }
      await prisma.teamRoster.create({ data: { teamId: team.id, playerId: pid, isSub: false } })
    }
  }

  for (const round of S25_SCHEDULE) {
    for (const g of round.games) {
      const game = await prisma.game.create({
        data: {
          sessionId: spring2025.id,
          homeTeamId: s25TeamIds[g.home], awayTeamId: s25TeamIds[g.away],
          scheduledAt: new Date(round.date), court: g.court, week: round.week,
          isPlayoff: round.week >= 11,
          playoffRound: round.week === 11 ? 1 : null,
          status: g.homeScore != null ? GameStatus.FINAL : GameStatus.SCHEDULED,
          homeScore: g.homeScore ?? 0, awayScore: g.awayScore ?? 0,
        },
      })
      if (g.homeScore == null) continue
      const homeBlock = s25Stats[g.home]?.find(b => b.gameNum === round.week)
      const awayBlock = s25Stats[g.away]?.find(b => b.gameNum === round.week)
      if (homeBlock) await insertGameStats(game.id, homeBlock)
      if (awayBlock) await insertGameStats(game.id, awayBlock)
    }
  }
  console.log('✅ Spring 2025 games + stats')
  await buildSessionStats(spring2025.id, s25Stats)
  console.log('✅ Spring 2025 session stats')

  // ---------------------------------------------------------------------------
  // Fall 2025
  // ---------------------------------------------------------------------------

  const fall2025 = await prisma.session.create({
    data: {
      name: 'Fall 2025', period: SessionPeriod.FALL, year: 2025,
      startDate: new Date('2025-09-14'), endDate: new Date('2025-11-16'), isActive: false,
    },
  })

  const fallTeamIds: Record<string, string> = {}
  for (const [cap, players] of Object.entries(FALL_ROSTERS)) {
    const team = await prisma.team.create({
      data: {
        sessionId: fall2025.id,
        captainId: playerIdMap[cap],
        division: FALL_DIVISIONS[cap],
        ...FALL_STANDINGS[cap],
      },
    })
    fallTeamIds[cap] = team.id
    for (const pName of players) {
      const pid = playerIdMap[pName]
      if (!pid) { console.warn(`⚠️  No player id for Fall roster: ${pName}`); continue }
      await prisma.teamRoster.create({ data: { teamId: team.id, playerId: pid, isSub: false } })
    }
  }

  for (const round of FALL_SCHEDULE) {
    for (const g of round.games) {
      const game = await prisma.game.create({
        data: {
          sessionId: fall2025.id,
          homeTeamId: fallTeamIds[g.home],
          awayTeamId: fallTeamIds[g.away],
          scheduledAt: new Date(round.date),
          court: g.court,
          week: round.week,
          isPlayoff: false,
          status: g.homeScore != null ? GameStatus.FINAL : GameStatus.SCHEDULED,
          homeScore: g.homeScore ?? 0,
          awayScore: g.awayScore ?? 0,
        },
      })
      if (g.homeScore == null) continue
      const homeBlock = fallStats[g.home]?.find(b => b.gameNum === round.week)
      const awayBlock = fallStats[g.away]?.find(b => b.gameNum === round.week)
      if (homeBlock) await insertGameStats(game.id, homeBlock)
      if (awayBlock) await insertGameStats(game.id, awayBlock)
    }
  }
  console.log('✅ Fall 2025 games + stats')

  await buildSessionStats(fall2025.id, fallStats)
  console.log('✅ Fall 2025 session stats')

  // ---------------------------------------------------------------------------
  // Spring 2026
  // ---------------------------------------------------------------------------

  const spring2026 = await prisma.session.create({
    data: {
      name: 'Spring 2026', period: SessionPeriod.SPRING, year: 2026,
      startDate: new Date('2026-01-18'), isActive: true,
    },
  })

  const springTeamIds: Record<string, string> = {}
  for (const [cap, players] of Object.entries(SPRING_ROSTERS)) {
    const team = await prisma.team.create({
      data: {
        sessionId: spring2026.id,
        captainId: playerIdMap[cap],
        division: SPRING_DIVISIONS[cap],
        ...SPRING_STANDINGS[cap],
      },
    })
    springTeamIds[cap] = team.id
    for (const pName of players) {
      const pid = playerIdMap[pName]
      if (!pid) { console.warn(`⚠️  No player id for Spring roster: ${pName}`); continue }
      await prisma.teamRoster.create({ data: { teamId: team.id, playerId: pid, isSub: false } })
    }
  }

  for (const round of SPRING_SCHEDULE) {
    for (const g of round.games) {
      const isCompleted = g.homeScore != null
      const game = await prisma.game.create({
        data: {
          sessionId: spring2026.id,
          homeTeamId: springTeamIds[g.home],
          awayTeamId: springTeamIds[g.away],
          scheduledAt: new Date(round.date),
          court: g.court,
          week: round.week,
          isPlayoff: false,
          status: isCompleted ? GameStatus.FINAL : GameStatus.SCHEDULED,
          homeScore: g.homeScore ?? 0,
          awayScore: g.awayScore ?? 0,
        },
      })
      if (!isCompleted) continue
      const homeBlock = springStats[g.home]?.find(b => b.gameNum === round.week)
      const awayBlock = springStats[g.away]?.find(b => b.gameNum === round.week)
      if (homeBlock) await insertGameStats(game.id, homeBlock)
      if (awayBlock) await insertGameStats(game.id, awayBlock)
    }
  }
  console.log('✅ Spring 2026 games + stats')

  await buildSessionStats(spring2026.id, springStats)
  console.log('✅ Spring 2026 session stats')

  // ---------------------------------------------------------------------------
  // Career Stats
  // ---------------------------------------------------------------------------

  const allPlayers = await prisma.player.findMany()
  for (const player of allPlayers) {
    const sessions = await prisma.sessionStat.findMany({ where: { playerId: player.id } })
    if (sessions.length === 0) continue
    type CareerAgg = { sessionsPlayed: number; gamesPlayed: number; fgMade: number; fgAttempted: number; threesMade: number; threesAttempted: number; ftMade: number; ftAttempted: number; points: number; rebounds: number; assists: number; blocks: number; steals: number; turnovers: number }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const career = sessions.reduce((acc: CareerAgg, s: any) => ({
      sessionsPlayed:  acc.sessionsPlayed + 1,
      gamesPlayed:     acc.gamesPlayed + s.gamesPlayed,
      fgMade:          acc.fgMade + s.fgMade,
      fgAttempted:     acc.fgAttempted + s.fgAttempted,
      threesMade:      acc.threesMade + s.threesMade,
      threesAttempted: acc.threesAttempted + s.threesAttempted,
      ftMade:          acc.ftMade + s.ftMade,
      ftAttempted:     acc.ftAttempted + s.ftAttempted,
      points:          acc.points + s.points,
      rebounds:        acc.rebounds + s.rebounds,
      assists:         acc.assists + s.assists,
      blocks:          acc.blocks + s.blocks,
      steals:          acc.steals + s.steals,
      turnovers:       acc.turnovers + s.turnovers,
    }), { sessionsPlayed: 0, gamesPlayed: 0, fgMade: 0, fgAttempted: 0, threesMade: 0, threesAttempted: 0, ftMade: 0, ftAttempted: 0, points: 0, rebounds: 0, assists: 0, blocks: 0, steals: 0, turnovers: 0 })
    await prisma.careerStat.create({ data: { playerId: player.id, ...career } })
  }
  console.log('✅ Career stats')
  console.log('🏀 Seed complete!')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())