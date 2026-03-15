/**
 * prisma/seed.ts
 * MBA Basketball League — Historical Data Seed
 * Covers: Spring 2023, Fall 2023, Spring 2024, Fall 2024, Spring 2025, Fall 2025, Spring 2026
 *
 * Run with: npx prisma db seed
 * Stat + schedule workbook files must exist in prisma/data/
 */

import { PrismaClient, Division, SessionPeriod, GameStatus } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as XLSX from "xlsx";
import * as path from "path";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DATA_DIR = path.join(__dirname, "data");

// ---------------------------------------------------------------------------
// ALIASES — raw name from stat sheet → canonical displayName
// Per-sheet overrides handled via SHEET_OVERRIDES below
// ---------------------------------------------------------------------------
const ALIASES: Record<string, string | null> = {
  "Sean F": "Sean F",
  Nate: "Lewis", Lewis: "Lewis", "Nate Lewis": "Lewis",
  Reetz: "Reetz",
  Gibbs: "Gibbs",
  TJ: "TJ",
  Sir: "Sir",
  Vos: "Vos",
  Ziemer: "Ziemer",
  "Nate Ray": "Nate Ray",
  Tordoff: "Mitch", Mitch: "Mitch",
  Akim: "Akim",
  Karls: "Karls",
  Brandt: "Klayton", Klayton: "Klayton",
  Connor: "Connor",
  "Sam Wilk": "Sam Wilk", Wilkinson: "Sam Wilk",
  Kahl: "Kahl", "Don Kahl": "Kahl",
  Liam: "Liam",
  Plotkin: "Plotkin",
  Towns: "Towns",
  "Sam P": "Sam P", "San P": "Sam P", "Sam Pettegrew": "Sam P",
  Booch: "Booch",
  "Tyler O": "Tyler Olson", "Tyler Olson": "Tyler Olson", Olson: "Tyler Olson",
  Jimmy: "Jimmy",
  BJ: "BJ",
  Roy: "Roy", "Roy H": "Roy",
  Armga: "Armga",
  Minnerly: "Minnerly",
  "Lefty Andy": "Lefty Andy",
  Scotty: "Scotty", "Scotty Ripp": "Scotty",
  Trev: "Trev", "Trev Neale": "Trev", Neale: "Trev",
  Noah: "Noah",
  Detric: "Detric",
  Tim: "Tim", "Tim Russell": "Tim", Timmy: "Tim",
  "Matt S": "Savatski", Savatski: "Savatski",
  "Don T": "Don T", "Don Thompson": "Don T", Donny: "Don T",
  "Donny (sub)": "Don T", "Donny(sub)": "Don T", Don: "Don T",
  Hertz: "Hertz",
  Watts: "Watts",
  Rocky: "Rocky", "Rocky So": "Rocky", "Rocky/Mike": "Rocky",
  Les: "Les Wilk", "Les Wilk": "Les Wilk",
  Gallman: "Gallman",
  Macon: "Macon",
  Wedel: "Wedel", "Tyler Wedel": "Wedel",
  Cori: "Cori",
  "Jake B": "Jake B",
  Winsor: "Winsor", Winzor: "Winsor", Winz: "Winsor",
  Chandler: "Chandler",
  "Fast Pat": "Fast Pat",
  "Dave F": "Dave F", Filsinger: "Dave F",
  Pat: "Pat Howe", "Pat Howe": "Pat Howe",
  "Roy Boone": "Roy Boone", Boone: "Roy Boone",
  "Tall Matt": "Tall Matt",
  "Mike Brand": "Mike Brand", Brand: "Mike Brand",
  Kain: "Kain",
  Justin: "Justin", "Liam (Justin)": "Justin",
  "Alex Hade": "Alex Hade", Alex: "Alex Hade",
  Carson: "Carson",
  Spencer: "Spencer",
  Kevin: "Kevin",
  Zack: "Zack", Zach: "Zack",
  Marty: "Marty",  // default = Marty Petersen; overridden per-sheet in FA24
  Derek: "Derek", "Derek Dailey": "Derek", "Derek D (Sub)": "Derek",
  Ricky: "Ricky",
  Danny: "Danny",
  "Ty Parman": "Ty Parman", Parman: "Ty Parman",
  "Nate Hobart": "Hobert", Hobart: "Hobert", Hobert: "Hobert", "Nathan Hobert": "Hobert",
  Siebert: "Siebert",
  Shravan: "Shravan",
  Johnny: "Johnny Plewa", "Johnny Plewa": "Johnny Plewa",
  "Macon bro": "Johnny Plewa", "Brother Macon": "Johnny Plewa",
  Paul: "Paul Wedel",
  Dreher: "Dreher",
  Staege: "Staege", Stege: "Staege", "J Staege": "Staege",
  "Ryan Staege": "Ryan Staege",
  Volt: "Volt", Meech: "Meech", Murph: "Murph", Willie: "Willie",
  Haag: "Haag", Ritzy: "Ritzy", Chazz: "Chazz", Gus: "Gus", Dillon: "Dillon",
  "Brian D": "Brian Donais", "Brian Donais": "Brian Donais", Donais: "Brian Donais",
  Brandon: "Brandon Doll", "Brandon Doll": "Brandon Doll",
  "Rob Duax": "Rob Duax", Duax: "Rob Duax", Rob: "Rob Duax",
  "Mike Amend": "Mike Amend",
  "Jamie Bush": "Jamie Bush", "Jaime Bush": "Jamie Bush", Jamie: "Jamie Bush",
  Ponytail: "Gabe", Gabe: "Gabe",
  "Alex Johnson": "Alex Johnson",
  "Ty S": "Ty S",
  Carter: "Carter",
  "Nate Rohrer": "Nate Rohrer",
  Julian: "Julian",
  "Jeff Payton": "Jeff Payton",
  "Andy Fox": "Andy Fox",
  Jesse: "Jesse", "Jesse Temple": "Jesse",
  Filip: "Filip",
  Jesus: "Jesus",
  "Justin Bomkamp": "Justin Bomkamp",
  Ngijol: "Ngijol", "Ngijol Songolo": "Ngijol",
  Tianen: "Tianen",
  "Brett Wittchow": "Brett Wittchow",
  "Sub (Ziemer)": "Unknown Sub (Sir, F24)",
  "Connor sub": "Unknown Sub (Neale, F24)",
  Crooks: "Crooks", Eric: "Eric",
  "Mike F": "Mike F",
  "Mike Y": "Younggren",
  Valentyn: "Valentyn",
  Molloy: "Molloy", "Jack Molloy": "Molloy", Jack: "Molloy",
  Klassy: "Klassy", "Zach Klassy": "Klassy",
  "Torin Hannah": "Torin", Torin: "Torin",
  "Chase Kieler": "Chase", Chase: "Chase",
  "Shane Kieler": "Shane", Shane: "Shane",
  "Brian Parzych": "Parzych", Parzych: "Parzych",
  Brent: "Brent",
  "Jake S": "Jake S",
  "Sam BZ": "Sam BZ",
  "Marty Johnson": "Marty J",
  Cooper: "Cooper",
  Darren: "Darren", Simler: "Darren",
  Younggren: "Younggren",
  // Sub annotations in stat sheets — skip silently
  "Marty (sub)": null,
  "Roy (sub)": null,
  "Don T (sub)": null,
  "BJ (sub)": null,
  "Tim (sub)": null,
};

// Per-sheet overrides applied AFTER global ALIASES
const SHEET_OVERRIDES: Record<string, Record<string, Record<string, string>>> = {
  FA24: {
    TJ:    { Marty: "Marty J" }, // Marty Johnson subbing on TJ's sheet
    Towns: { Marty: "Marty J" }, // Marty Johnson subbing on Towns' sheet
    Akim:  { Marty: "Marty"   }, // Marty Petersen rostered on Akim's sheet
  },
  FA25: {
    Brand:     { Staege: "Ryan Staege" }, // Ryan Staege rostered on Brand's team
    "Nate Ray":{ Staege: "Staege", "J Staege": "Staege" }, // Jared Staege subbing
  },
};

// ---------------------------------------------------------------------------
// PLAYER_NAMES — canonical displayName → { firstName, lastName }
// ---------------------------------------------------------------------------
const PLAYER_NAMES: Record<string, { firstName: string; lastName: string }> = {
  "Sean F":       { firstName: "Sean",       lastName: "Fancsali" },
  Lewis:          { firstName: "Nate",       lastName: "Lewis" },
  Reetz:          { firstName: "Jordan",     lastName: "Reetz" },
  Gibbs:          { firstName: "Brian",      lastName: "Gibbs" },
  TJ:             { firstName: "TJ",         lastName: "Dooley" },
  Sir:            { firstName: "SirJeremy",  lastName: "Harrison" },
  Vos:            { firstName: "Nathan",     lastName: "Vos" },
  Ziemer:         { firstName: "Jason",      lastName: "Ziemer" },
  "Nate Ray":     { firstName: "Nate",       lastName: "Ray" },
  Mitch:          { firstName: "Mitch",      lastName: "Tordoff" },
  Akim:           { firstName: "Johnny",     lastName: "Akim" },
  Karls:          { firstName: "Matt",       lastName: "Karls" },
  Klayton:        { firstName: "Klayton",    lastName: "Brandt" },
  Connor:         { firstName: "Connor",     lastName: "Morovits" },
  "Sam Wilk":     { firstName: "Sam",        lastName: "Wilkinson" },
  Kahl:           { firstName: "Don",        lastName: "Kahl" },
  Liam:           { firstName: "Liam",       lastName: "Duffy" },
  Plotkin:        { firstName: "Brian",      lastName: "Plotkin" },
  Towns:          { firstName: "Jason",      lastName: "Towns" },
  "Sam P":        { firstName: "Sam",        lastName: "Pettegrew" },
  Booch:          { firstName: "Levon",      lastName: "Crawford" },
  "Tyler Olson":  { firstName: "Tyler",      lastName: "Olson" },
  Jimmy:          { firstName: "Jim",        lastName: "West" },
  BJ:             { firstName: "BJ",         lastName: "Cook" },
  Roy:            { firstName: "Roy",        lastName: "Hasenfratz" },
  Armga:          { firstName: "Austin",     lastName: "Armga" },
  Minnerly:       { firstName: "Jeff",       lastName: "Minnerly" },
  "Lefty Andy":   { firstName: "Andy",       lastName: "Hosking" },
  Scotty:         { firstName: "Scott",      lastName: "Rippl" },
  Trev:           { firstName: "Trevor",     lastName: "Neale" },
  Noah:           { firstName: "Noah",       lastName: "Beck" },
  Detric:         { firstName: "Detric",     lastName: "McCain" },
  Tim:            { firstName: "Tim",        lastName: "Russell" },
  Savatski:       { firstName: "Matt",       lastName: "Savatski" },
  "Don T":        { firstName: "Don",        lastName: "Thompson" },
  Hertz:          { firstName: "Sean",       lastName: "Hertz" },
  Watts:          { firstName: "Dave",       lastName: "Watts" },
  Rocky:          { firstName: "Rocky",      lastName: "So" },
  "Les Wilk":     { firstName: "Les",        lastName: "Wilkinson" },
  Gallman:        { firstName: "Mike",       lastName: "Gallman" },
  Macon:          { firstName: "Macon",      lastName: "Plewa" },
  Wedel:          { firstName: "Tyler",      lastName: "Wedel" },
  Cori:           { firstName: "Cori",       lastName: "Edmond" },
  "Jake B":       { firstName: "Jacob",      lastName: "Baryenbruch" },
  Winsor:         { firstName: "Andy",       lastName: "Winsor" },
  Chandler:       { firstName: "Chandler",   lastName: "Diekvoss" },
  "Fast Pat":     { firstName: "Pat",        lastName: "Lagman" },
  "Dave F":       { firstName: "David",      lastName: "Filsinger" },
  "Pat Howe":     { firstName: "Pat",        lastName: "Howe" },
  "Roy Boone":    { firstName: "Roy",        lastName: "Boone" },
  "Tall Matt":    { firstName: "Matt",       lastName: "Nonemacher" },
  "Mike Brand":   { firstName: "Mike",       lastName: "Brand" },
  Kain:           { firstName: "Kain",       lastName: "Page" },
  Justin:         { firstName: "Justin",     lastName: "Banzhaf" },
  "Alex Hade":    { firstName: "Alex",       lastName: "Hade" },
  Carson:         { firstName: "Carson",     lastName: "Aeberhard" },
  Spencer:        { firstName: "Spencer",    lastName: "Brink" },
  Kevin:          { firstName: "Kevin",      lastName: "Branch" },
  Zack:           { firstName: "Zack",       lastName: "Genthe" },
  Marty:          { firstName: "Marty",      lastName: "Petersen" },
  Derek:          { firstName: "Derek",      lastName: "Dailey" },
  Ricky:          { firstName: "Ricky",      lastName: "Geisler" },
  Danny:          { firstName: "Danny",      lastName: "Koss" },
  "Ty Parman":    { firstName: "Ty",         lastName: "Parman" },
  Hobert:         { firstName: "Nathan",     lastName: "Hobert" },
  Siebert:        { firstName: "Chris",      lastName: "Siebert" },
  Shravan:        { firstName: "Shravan",    lastName: "Parman" },
  "Johnny Plewa": { firstName: "Johnny",     lastName: "Plewa" },
  "Paul Wedel":   { firstName: "Paul",       lastName: "Wedel" },
  Dreher:         { firstName: "Derek",      lastName: "Dreher" },
  Staege:         { firstName: "Jared",      lastName: "Staege" },
  "Ryan Staege":  { firstName: "Ryan",       lastName: "Staege" },
  Volt:           { firstName: "Andy",       lastName: "Voeltner" },
  Meech:          { firstName: "Demetrious", lastName: "Boyd" },
  Murph:          { firstName: "Murphy",     lastName: "Knepfel" },
  Willie:         { firstName: "Willie",     lastName: "Nellen" },
  Haag:           { firstName: "Nate",       lastName: "Haag" },
  Ritzy:          { firstName: "Jason",      lastName: "Ritzenthaler" },
  Chazz:          { firstName: "Chazz",      lastName: "Huston" },
  Gus:            { firstName: "Mark",       lastName: "Gustavson" },
  Dillon:         { firstName: "Dillon",     lastName: "Mezera" },
  "Brian Donais": { firstName: "Brian",      lastName: "Donais" },
  "Brandon Doll": { firstName: "Brandon",    lastName: "Doll" },
  "Rob Duax":     { firstName: "Rob",        lastName: "Duax" },
  "Mike Amend":   { firstName: "Mike",       lastName: "Amend" },
  "Jamie Bush":   { firstName: "Jamie",      lastName: "Bush" },
  Gabe:           { firstName: "Gabe",       lastName: "" },
  "Alex Johnson": { firstName: "Alex",       lastName: "Johnson" },
  "Ty S":         { firstName: "Ty",         lastName: "Strangstalien" },
  Carter:         { firstName: "Carter",     lastName: "Voelker" },
  "Nate Rohrer":  { firstName: "Nate",       lastName: "Rohrer" },
  Julian:         { firstName: "Julian",     lastName: "Walters" },
  "Jeff Payton":  { firstName: "Jeff",       lastName: "Payton" },
  "Andy Fox":     { firstName: "Andy",       lastName: "Fox" },
  Jesse:          { firstName: "Jesse",      lastName: "Temple" },
  Filip:          { firstName: "Filip",      lastName: "" },
  Jesus:          { firstName: "Jesus",      lastName: "Villagomez" },
  "Justin Bomkamp": { firstName: "Justin",   lastName: "Bomkamp" },
  Ngijol:         { firstName: "Ngijol",     lastName: "Songolo" },
  Tianen:         { firstName: "Tianen",     lastName: "" },
  "Brett Wittchow": { firstName: "Brett",    lastName: "Wittchow" },
  "Unknown Sub (Sir, F24)":   { firstName: "Unknown", lastName: "Sub (Sir F24)" },
  "Unknown Sub (Neale, F24)": { firstName: "Unknown", lastName: "Sub (Neale F24)" },
  Crooks:         { firstName: "Andy",       lastName: "Crooks" },
  Eric:           { firstName: "Eric",       lastName: "" },
  "Mike F":       { firstName: "Mike",       lastName: "Fancsali" },
  Younggren:      { firstName: "Michael",    lastName: "Younggren" },
  Valentyn:       { firstName: "Brett",      lastName: "Valentyn" },
  Molloy:         { firstName: "Jack",       lastName: "Molloy" },
  Klassy:         { firstName: "Zach",       lastName: "Klassy" },
  Torin:          { firstName: "Torin",      lastName: "Hannah" },
  Chase:          { firstName: "Chase",      lastName: "Kieler" },
  Shane:          { firstName: "Shane",      lastName: "Kieler" },
  Parzych:        { firstName: "Brian",      lastName: "Parzych" },
  Brent:          { firstName: "Brent",      lastName: "Perzentka" },
  "Jake S":       { firstName: "Jake",       lastName: "Schroeckenthaler" },
  "Sam BZ":       { firstName: "Sam",        lastName: "Ben-Zkiri" },
  "Marty J":      { firstName: "Marty",      lastName: "Johnson" },
  Cooper:         { firstName: "Cooper",     lastName: "Armstrong" },
  Darren:         { firstName: "Darren",     lastName: "Simler" },
};

// ---------------------------------------------------------------------------
// SCHEDULE ALIASES — raw name in workbook schedule → captain displayName
// ---------------------------------------------------------------------------
const SCHED_ALIASES: Record<string, string> = {
  // SP23 short names used in schedule
  Sam: "Sam P", Tyler: "Wedel",
  // FA23
  Don: "Don T", Pat: "Pat Howe",
  // SP24
  Tordoff: "Mitch",
  // FA24 — prefixed with "Team "
  "Team Neale": "Trev", "Team Akim": "Akim", "Team Towns": "Towns",
  "Team Cooper": "Cooper", "Team Younngren": "Younggren",
  "Team Younggren": "Younggren", "Team TJ": "TJ",
  "Team Sir": "Sir", "Team Karls": "Karls",
  // SP25
  Donny: "Don T",
  // SP26
  Alex: "Alex Hade", Timmy: "Tim", Olson: "Tyler Olson",
  // Already-canonical pass-throughs
  "Sean F": "Sean F", Lewis: "Lewis", Ziemer: "Ziemer", Connor: "Connor",
  Justin: "Justin", Danny: "Danny", Towns: "Towns", Gallman: "Gallman",
  Roy: "Roy", BJ: "BJ", Ricky: "Ricky", Winsor: "Winsor",
  Hertz: "Hertz", "Tyler Olson": "Tyler Olson", Wedel: "Wedel",
  Mitch: "Mitch", TJ: "TJ", Sir: "Sir", Akim: "Akim",
  Karls: "Karls", Cooper: "Cooper", Younggren: "Younggren",
  Trev: "Trev", Plotkin: "Plotkin", "Dave F": "Dave F",
  Cori: "Cori", "Tall Matt": "Tall Matt", "Don T": "Don T",
  "Pat Howe": "Pat Howe", Brand: "Mike Brand", "Mike Brand": "Mike Brand",
  Macon: "Macon", "Jake B": "Jake B", "Nate Ray": "Nate Ray",
  Derek: "Derek", Zack: "Zack", "Alex Hade": "Alex Hade",
  Tim: "Tim", "Sam P": "Sam P",
};

// All valid captain displayNames (used to filter schedule parsing artifacts)
const ALL_CAPTAINS = new Set([
  "Sean F","Lewis","Ziemer","Connor","Sam P","Wedel","Justin","Danny",
  "Towns","Gallman","Don T","Roy","BJ","Ricky","Winsor","Pat Howe",
  "Hertz","Mitch","Tyler Olson",
  "Trev","Sir","Akim","TJ","Younggren","Karls","Cooper",
  "Plotkin","Dave F","Cori","Tall Matt",
  "Mike Brand","Macon","Jake B","Nate Ray",
  "Derek","Zack","Alex Hade","Tim",
]);

// ---------------------------------------------------------------------------
// SESSION DEFINITIONS
// ---------------------------------------------------------------------------
interface TeamDef {
  sheet: string;           // stat workbook sheet name
  captainDisplay: string;  // canonical displayName of captain
  roster: string[];        // 5 non-captain players, canonical displayNames
}

interface SessionDef {
  key: string;
  name: string;
  period: SessionPeriod;
  year: number;
  startDate: Date;
  endDate: Date;
  statFile: string;        // e.g. "Spring_2023_MBA_Stats.xlsx"
  workbookFile: string;    // e.g. "2_MBA_Spring_2023_Workbook.xlsx"
  scheduleSheet: string;   // sheet name within workbook
  freehouse: TeamDef[];
  delaneys: TeamDef[];
}

const SESSIONS: SessionDef[] = [
  {
    key: "SP23", name: "Spring 2023", period: "SPRING", year: 2023,
    startDate: new Date("2023-02-19"), endDate: new Date("2023-05-07"),
    statFile: "Spring_2023_MBA_Stats.xlsx",
    workbookFile: "2_MBA_Spring_2023_Workbook.xlsx", scheduleSheet: "2023 Schedule",
    freehouse: [
      { sheet: "SeanF",  captainDisplay: "Sean F",  roster: ["Ngijol","Darren","Younggren","Cooper","Dave F"] },
      { sheet: "Nate",   captainDisplay: "Lewis",   roster: ["Reetz","Gibbs","TJ","Sir","Vos"] },
      { sheet: "Ziemer", captainDisplay: "Ziemer",  roster: ["Nate Ray","Mitch","Klayton","Akim","Karls"] },
      { sheet: "Connor", captainDisplay: "Connor",  roster: ["Sam Wilk","Kahl","Liam","Plotkin","Towns"] },
    ],
    delaneys: [
      { sheet: "SamP",   captainDisplay: "Sam P",   roster: ["Booch","Tyler Olson","Jimmy","BJ","Roy"] },
      { sheet: "Wedel",  captainDisplay: "Wedel",   roster: ["Armga","Minnerly","Lefty Andy","Scotty","Trev"] },
      { sheet: "Justin", captainDisplay: "Justin",  roster: ["Noah","Detric","Tim","Savatski","Don T"] },
      { sheet: "Danny",  captainDisplay: "Danny",   roster: ["Hertz","Watts","Rocky","Les Wilk","Gallman"] },
    ],
  },
  {
    key: "FA23", name: "Fall 2023", period: "FALL", year: 2023,
    startDate: new Date("2023-09-17"), endDate: new Date("2023-11-19"),
    statFile: "Fall_2023_MBA_Stats.xlsx",
    workbookFile: "3_MBA_Fall_2023_Workbook.xlsx", scheduleSheet: "2023 Schedule",
    freehouse: [
      { sheet: "Towns",   captainDisplay: "Towns",   roster: ["Connor","Macon","Tyler Olson","Wedel","Cori"] },
      { sheet: "Gallman", captainDisplay: "Gallman", roster: ["Brett Wittchow","Jake B","Detric","Savatski","Trev"] },
      { sheet: "Don",     captainDisplay: "Don T",   roster: ["Siebert","Mitch","Minnerly","TJ","Sir"] },
      { sheet: "Roy",     captainDisplay: "Roy",     roster: ["Armga","Liam","Watts","Fast Pat","Dave F"] },
    ],
    delaneys: [
      { sheet: "BJ",     captainDisplay: "BJ",       roster: ["Nate Ray","Noah","Lewis","Akim","Plotkin"] },
      { sheet: "Ricky",  captainDisplay: "Ricky",    roster: ["Ziemer","Danny","Sean F","Tim","Scotty"] },
      { sheet: "Winsor", captainDisplay: "Winsor",   roster: ["Chandler","Sam Wilk","Hertz","Gibbs","Karls"] },
      { sheet: "Pat",    captainDisplay: "Pat Howe", roster: ["Reetz","Justin","Kahl","Lefty Andy","Younggren"] },
    ],
  },
  {
    key: "SP24", name: "Spring 2024", period: "SPRING", year: 2024,
    startDate: new Date("2024-02-04"), endDate: new Date("2024-04-28"),
    statFile: "Spring_2024_MBA_Stats.xlsx",
    workbookFile: "4_MBA_Spring_2024_Workbook.xlsx", scheduleSheet: "2024 Schedule",
    freehouse: [
      { sheet: "Sean F", captainDisplay: "Sean F",      roster: ["Minnerly","Justin","Kain","Cooper","Cori"] },
      { sheet: "Lewis",  captainDisplay: "Lewis",       roster: ["Noah","Watts","Roy Boone","Vos","BJ"] },
      { sheet: "Hertz",  captainDisplay: "Hertz",       roster: ["Sam Wilk","Kahl","TJ","Don T","Tall Matt"] },
      { sheet: "Danny",  captainDisplay: "Danny",       roster: ["Chandler","Detric","Mike Brand","Scotty","Roy"] },
    ],
    delaneys: [
      { sheet: "Ziemer", captainDisplay: "Ziemer",      roster: ["Jake B","Nate Ray","Akim","Karls","Plotkin"] },
      { sheet: "Olson",  captainDisplay: "Tyler Olson", roster: ["Reetz","Gibbs","Trev","Younggren","Ricky"] },
      { sheet: "Tordoff",captainDisplay: "Mitch",       roster: ["Connor","Macon","Tim","Towns","Dave F"] },
      { sheet: "Wedel",  captainDisplay: "Wedel",       roster: ["Armga","Liam","Lefty Andy","Sir","Gallman"] },
    ],
  },
  {
    key: "FA24", name: "Fall 2024", period: "FALL", year: 2024,
    startDate: new Date("2024-09-15"), endDate: new Date("2024-11-17"),
    statFile: "Fall_2024_MBA_Stats.xlsx",
    workbookFile: "5_MBA_Fall_2024_Workbook.xlsx", scheduleSheet: "2024 Schedule",
    freehouse: [
      { sheet: "Neale",     captainDisplay: "Trev",      roster: ["Connor","Minnerly","Alex Hade","Carson","Plotkin"] },
      { sheet: "Sir",       captainDisplay: "Sir",       roster: ["Sam Wilk","Watts","Roy Boone","Cori","BJ"] },
      { sheet: "Akim",      captainDisplay: "Akim",      roster: ["Reetz","Hertz","Marty","Derek","Dave F"] },
      { sheet: "TJ",        captainDisplay: "TJ",        roster: ["Chandler","Ty Parman","Danny","Tim","Ricky"] },
    ],
    delaneys: [
      { sheet: "Towns",     captainDisplay: "Towns",     roster: ["Jake B","Macon","Spencer","Roy","Gallman"] },
      { sheet: "Younggren", captainDisplay: "Younggren", roster: ["Noah","Justin","Kahl","Scotty","Vos"] },
      { sheet: "Karls",     captainDisplay: "Karls",     roster: ["Sean F","Lewis","Tyler Olson","Kevin","Zack"] },
      { sheet: "Cooper",    captainDisplay: "Cooper",    roster: ["Armga","Nate Ray","Ziemer","Don T","Tall Matt"] },
    ],
  },
  {
    key: "SP25", name: "Spring 2025", period: "SPRING", year: 2025,
    startDate: new Date("2025-02-02"), endDate: new Date("2025-04-27"),
    statFile: "Spring_2025_MBA_Stats.xlsx",
    workbookFile: "6_MBA_Spring_2025_Workbook.xlsx", scheduleSheet: "2025 Schedule",
    freehouse: [
      { sheet: "Plotkin",   captainDisplay: "Plotkin",   roster: ["Chandler","Roy Boone","Sean F","Cooper","Towns"] },
      { sheet: "Dave F",    captainDisplay: "Dave F",    roster: ["Reetz","Hertz","Mike Brand","Zack","Vos"] },
      { sheet: "Cori",      captainDisplay: "Cori",      roster: ["Noah","Nate Ray","Alex Hade","Sir","Carson"] },
      { sheet: "Tall Matt", captainDisplay: "Tall Matt", roster: ["Minnerly","Ty Parman","Danny","Willie","TJ"] },
    ],
    delaneys: [
      { sheet: "Donny",     captainDisplay: "Don T",     roster: ["Armga","Justin","Lewis","Karls","Younggren"] },
      { sheet: "Ricky",     captainDisplay: "Ricky",     roster: ["Siebert","Mitch","Trev","Akim","Scotty"] },
      { sheet: "Roy",       captainDisplay: "Roy",       roster: ["Sam Wilk","Macon","Watts","Marty","Derek"] },
      { sheet: "Gallman",   captainDisplay: "Gallman",   roster: ["Jake B","Ziemer","Tyler Olson","Tim","Wedel"] },
    ],
  },
  {
    key: "FA25", name: "Fall 2025", period: "FALL", year: 2025,
    startDate: new Date("2025-09-07"), endDate: new Date("2025-11-16"),
    statFile: "Fall_2025_MBA_Stats.xlsx",
    workbookFile: "7_MBA_Fall_2025_Workbook.xlsx", scheduleSheet: "2025 Schedule",
    freehouse: [
      { sheet: "Brand",    captainDisplay: "Mike Brand", roster: ["Molloy","Roy Boone","Ryan Staege","Jamie Bush","Dave F"] },
      { sheet: "Hertz",    captainDisplay: "Hertz",      roster: ["Armga","Marty","Tyler Olson","Scotty","Ricky"] },
      { sheet: "Macon",    captainDisplay: "Macon",      roster: ["Sam Wilk","Ty Parman","TJ","Zack","Sir"] },
      { sheet: "Ziemer",   captainDisplay: "Ziemer",     roster: ["Torin","Chase","Derek","Akim","Plotkin"] },
    ],
    delaneys: [
      { sheet: "Lewis",    captainDisplay: "Lewis",      roster: ["Klassy","Watts","Trev","Ty S","Roy"] },
      { sheet: "Sean F",   captainDisplay: "Sean F",     roster: ["Parzych","Alex Hade","Cooper","Tim","Younggren"] },
      { sheet: "Jake B",   captainDisplay: "Jake B",     roster: ["Noah","Danny","Kahl","Hobert","Gallman"] },
      { sheet: "Nate Ray", captainDisplay: "Nate Ray",   roster: ["Minnerly","Shane","Wedel","Karls","Don T"] },
    ],
  },
  {
    key: "SP26", name: "Spring 2026", period: "SPRING", year: 2026,
    startDate: new Date("2026-01-25"), endDate: new Date("2026-04-05"),
    statFile: "Spring_2026_MBA_Stats_1.xlsx",
    workbookFile: "MBA_Spring_2026_Workbook.xlsx", scheduleSheet: "2026 Schedule",
    freehouse: [
      { sheet: "Cooper",      captainDisplay: "Cooper",     roster: ["Armga","Macon","Sean F","Don T","Ricky"] },
      { sheet: "Derek",       captainDisplay: "Derek",      roster: ["Klassy","Ziemer","Lewis","Carson","Jamie Bush"] },
      { sheet: "TJ",          captainDisplay: "TJ",         roster: ["Noah","Chase","Danny","Wedel","Sir"] },
      { sheet: "Zack",        captainDisplay: "Zack",       roster: ["Sam Wilk","Shravan","Justin","Willie","Tall Matt"] },
    ],
    delaneys: [
      { sheet: "Tyler Olson", captainDisplay: "Tyler Olson",roster: ["Chandler","Trev","Hertz","Jesse","Younggren"] },
      { sheet: "Alex",        captainDisplay: "Alex Hade",  roster: ["Nate Rohrer","Ty Parman","Watts","Roy Boone","Roy"] },
      { sheet: "Timmy",       captainDisplay: "Tim",        roster: ["Minnerly","Mike Brand","Marty","Ty S","Plotkin"] },
      { sheet: "Akim",        captainDisplay: "Akim",       roster: ["Reetz","Jake B","Nate Ray","Kahl","Scotty"] },
    ],
  },
];

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function canonical(raw: string, sessionKey?: string, sheetName?: string): string | null {
  const t = raw.trim();
  const over = SHEET_OVERRIDES[sessionKey ?? ""]?.[sheetName ?? ""]?.[t];
  if (over !== undefined) return over;
  return ALIASES[t] ?? null;
}

function calcPoints(fgm: number, t3fgm: number, ftm: number): number {
  return (fgm - t3fgm) * 2 + t3fgm * 3 + ftm;
}

function loadWorkbook(filename: string): XLSX.WorkBook {
  return XLSX.readFile(path.join(DATA_DIR, filename), { cellDates: true });
}

// ---------------------------------------------------------------------------
// SCHEDULE PARSER
// Returns one SchedGame per unique matchup found in the workbook schedule sheet.
// Scores sourced from the row immediately following each matchup row.
// ---------------------------------------------------------------------------
interface SchedGame {
  week: number | null;
  homeCapt: string;
  awayCapt: string;
  scheduledAt: Date;
  homeScore: number | null;
  awayScore: number | null;
  court: string;
  isPlayoff: boolean;
  playoffRound: number | null;
}

function parseSchedule(wb: XLSX.WorkBook, sheetName: string): SchedGame[] {
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];

  // Read all cells into a 2D array.
  // For each cell store { v, t } so we can distinguish date cells (t === "d" or t === "n" with date format).
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  // We store raw cell objects so we can check type
  const rawRows: (XLSX.CellObject | undefined)[][] = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row: (XLSX.CellObject | undefined)[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      row.push(ws[XLSX.utils.encode_cell({ r, c })]);
    }
    rawRows.push(row);
  }
  // Helper: get cell value, converting date cells to Date objects
  const cellVal = (cell: XLSX.CellObject | undefined): unknown => {
    if (!cell) return null;
    if (cell.t === "d") return cell.v instanceof Date ? cell.v : new Date((cell.v as number));
    // xlsx with cellDates:true stores dates as JS Date in .v when t==="d"
    // but some builds store numeric serial with t==="n" and a date numFmt
    if (cell.t === "n" && typeof cell.v === "number") {
      const fmt = (cell as unknown as { z?: string }).z ?? "";
      if (fmt && /[dmy]/i.test(fmt)) {
        // Convert Excel serial to Date (1900 date system)
        return new Date(Math.round((cell.v - 25569) * 86400 * 1000));
      }
    }
    return cell.v ?? null;
  };
  const rows: (unknown)[][] = rawRows.map(row => row.map(cellVal));

  // Row index 1 (row 2): court label header — find each "Court" column
  const courtCols: { homeCol: number; awayCol: number; label: string }[] = [];
  for (let c = 0; c < (rows[1]?.length ?? 0); c++) {
    const v = rows[1][c];
    if (typeof v === "string" && v.includes("Court")) {
      courtCols.push({ homeCol: c, awayCol: c + 2, label: v });
    }
  }

  const games: SchedGame[] = [];
  const seen = new Set<string>();

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    const weekRaw = row[1];
    if (typeof weekRaw !== "string" || !weekRaw.trim()) continue;

    const isNoGames   = /no.?games?|cancel|spring break|thanksgiving|super bowl|easter/i.test(weekRaw);
    if (isNoGames) continue;

    const weekMatch   = weekRaw.match(/Week\s*(\d+)/i);
    const isWildCard  = /wild.?card/i.test(weekRaw);
    const isSemiFinal = /semi.?final/i.test(weekRaw);
    const isChampship = /championship/i.test(weekRaw);
    const isPlayoff   = isWildCard || isSemiFinal || isChampship;
    const playoffRound = isWildCard ? 1 : isSemiFinal ? 2 : isChampship ? 3 : null;
    const weekNum     = weekMatch ? parseInt(weekMatch[1]) : null;

    if (!weekNum && !isPlayoff) continue;

    // Parse scheduled date
    const dateRaw = row[0];
    let scheduledAt: Date;
    if (dateRaw instanceof Date && !isNaN(dateRaw.getTime())) {
      scheduledAt = dateRaw;
    } else if (typeof dateRaw === "number" && dateRaw > 40000) {
      // Excel date serial fallback (> 40000 = after year 2009, sanity check)
      scheduledAt = new Date(Math.round((dateRaw - 25569) * 86400 * 1000));
    } else {
      scheduledAt = new Date();
    }

    // Score row is the row immediately after the matchup row
    const scoreRow: unknown[] = rows[i + 1] ?? [];

    for (const { homeCol, awayCol, label } of courtCols) {
      const h = row[homeCol];
      const a = row[awayCol];
      if (typeof h !== "string" || typeof a !== "string") continue;
      const hTrim = h.trim();
      const aTrim = a.trim();
      if (!hTrim || !aTrim) continue;

      const hCapt = SCHED_ALIASES[hTrim] ?? hTrim;
      const aCapt = SCHED_ALIASES[aTrim] ?? aTrim;

      // Filter: skip self-matches (parsing artifacts) and unrecognised captains
      if (hCapt === aCapt) continue;
      if (!ALL_CAPTAINS.has(hCapt) || !ALL_CAPTAINS.has(aCapt)) continue;

      // Deduplicate: same pair should appear only once per week/playoff round
      const roundKey = isPlayoff ? `po${playoffRound}` : `w${weekNum}`;
      const dedupeKey = `${roundKey}::${[hCapt, aCapt].sort().join("::")}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const hs  = scoreRow[homeCol];
      const as_ = scoreRow[awayCol];
      const homeScore = typeof hs  === "number" ? Math.round(hs)  : null;
      const awayScore = typeof as_ === "number" ? Math.round(as_) : null;

      games.push({
        week: weekNum,
        homeCapt: hCapt,
        awayCapt: aCapt,
        scheduledAt,
        homeScore,
        awayScore,
        court: label,
        isPlayoff,
        playoffRound,
      });
    }
  }

  return games;
}

// ---------------------------------------------------------------------------
// STAT SHEET PARSER
// ---------------------------------------------------------------------------
interface StatRow {
  name: string;
  fgm: number; fga: number;
  t3fgm: number; t3fga: number;
  ftm: number; fta: number;
  pts: number;
  reb: number; ast: number; blk: number; stl: number; tov: number;
}

interface GameBlock {
  label: string;
  rows: StatRow[];
}

function parseStatSheet(ws: XLSX.WorkSheet): GameBlock[] {
  const games: GameBlock[] = [];
  let current: GameBlock | null = null;
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");

  for (let r = range.s.r; r <= range.e.r; r++) {
    const v = (c: number): unknown => ws[XLSX.utils.encode_cell({ r, c })]?.v ?? null;

    const cellA = v(0);
    // New game block starts when col A contains "Game"
    if (typeof cellA === "string" && cellA.includes("Game")) {
      current = { label: cellA.replace(/\n/g, " ").trim(), rows: [] };
      games.push(current);
      continue;
    }

    if (!current) continue;

    const nameRaw = v(1);
    const name = typeof nameRaw === "string" ? nameRaw.trim() : null;
    if (!name || ["team total","player","name"].includes(name.toLowerCase())) continue;

    const fgm   = Number(v(2))  || 0;
    const fga   = Number(v(3))  || 0;
    const t3fgm = Number(v(5))  || 0;
    const t3fga = Number(v(6))  || 0;
    const ftm   = Number(v(8))  || 0;
    const fta   = Number(v(9))  || 0;
    const reb   = Number(v(12)) || 0;
    const ast   = Number(v(13)) || 0;
    const blk   = Number(v(14)) || 0;
    const stl   = Number(v(15)) || 0;
    const tov   = Number(v(16)) || 0;

    if (fgm === 0 && fga === 0 && ftm === 0) continue;

    current.rows.push({
      name, fgm, fga, t3fgm, t3fga, ftm, fta,
      pts: calcPoints(fgm, t3fgm, ftm),
      reb, ast, blk, stl, tov,
    });
  }

  return games;
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------
async function main() {
  console.log("🏀 MBA Seed starting...\n");

  console.log("Clearing existing data...");
  await prisma.careerStat.deleteMany();
  await prisma.sessionStat.deleteMany();
  await prisma.gameStat.deleteMany();
  await prisma.game.deleteMany();
  await prisma.teamRoster.deleteMany();
  await prisma.team.deleteMany();
  await prisma.subPlayer.deleteMany();
  await prisma.session.deleteMany();
  await prisma.player.deleteMany();
  console.log("Done.\n");

  const playerIdByDisplay = new Map<string, string>();

  async function getOrCreatePlayer(displayName: string): Promise<string> {
    if (playerIdByDisplay.has(displayName)) return playerIdByDisplay.get(displayName)!;
    const names = PLAYER_NAMES[displayName];
    if (!names) throw new Error(`No PLAYER_NAMES entry for displayName: "${displayName}"`);
    const player = await prisma.player.create({
      data: { firstName: names.firstName, lastName: names.lastName, displayName },
    });
    playerIdByDisplay.set(displayName, player.id);
    return player.id;
  }

  for (const sess of SESSIONS) {
    console.log(`\n📅 Seeding ${sess.name}...`);

    // ── 1. Session ────────────────────────────────────────────────────────
    const session = await prisma.session.create({
      data: {
        name: sess.name,
        period: sess.period as SessionPeriod,
        year: sess.year,
        startDate: sess.startDate,
        endDate: sess.endDate,
        isActive: sess.key === "SP26",
      },
    });

    // ── 2. Teams + Rosters ────────────────────────────────────────────────
    const teamIdByCaptain = new Map<string, string>(); // captainDisplay → team.id
    const teamIdBySheet   = new Map<string, string>(); // sheet name → team.id

    const allTeams = [
      ...sess.freehouse.map(t => ({ ...t, division: "FREEHOUSE" as Division })),
      ...sess.delaneys.map(t => ({ ...t, division: "DELANEYS" as Division })),
    ];

    for (const td of allTeams) {
      const captainId = await getOrCreatePlayer(td.captainDisplay);
      const team = await prisma.team.create({
        data: { sessionId: session.id, captainId, division: td.division },
      });
      teamIdByCaptain.set(td.captainDisplay, team.id);
      teamIdBySheet.set(td.sheet, team.id);
      await prisma.teamRoster.create({ data: { teamId: team.id, playerId: captainId } });
      for (const dn of td.roster) {
        const pid = await getOrCreatePlayer(dn);
        await prisma.teamRoster.create({ data: { teamId: team.id, playerId: pid } });
      }
    }

    // ── 3. Games from schedule workbook ──────────────────────────────────
    const wbSched   = loadWorkbook(sess.workbookFile);
    const schedGames = parseSchedule(wbSched, sess.scheduleSheet);

    for (const sg of schedGames) {
      const homeTeamId = teamIdByCaptain.get(sg.homeCapt);
      const awayTeamId = teamIdByCaptain.get(sg.awayCapt);
      if (!homeTeamId || !awayTeamId) {
        console.warn(`  ⚠️  [${sess.key}] Unknown team in schedule: "${sg.homeCapt}" vs "${sg.awayCapt}"`);
        continue;
      }

      const hasScore = sg.homeScore !== null && sg.awayScore !== null;
      const status: GameStatus = hasScore ? "FINAL" : "SCHEDULED";

      await prisma.game.create({
        data: {
          sessionId:   session.id,
          homeTeamId,
          awayTeamId,
          scheduledAt: sg.scheduledAt,
          court:       sg.court,
          week:        sg.isPlayoff ? null : sg.week,
          isPlayoff:   sg.isPlayoff,
          playoffRound: sg.playoffRound,
          status,
          homeScore:   sg.homeScore ?? 0,
          awayScore:   sg.awayScore ?? 0,
        },
      });
    }

    // ── 4. GameStats from stat sheets ────────────────────────────────────
    // For each team sheet, map its N game blocks (in order) to the N scheduled
    // regular-season games for that team (ordered by week, then scheduledAt).
    const wbStats = loadWorkbook(sess.statFile);

    for (const td of allTeams) {
      if (!wbStats.SheetNames.includes(td.sheet)) {
        console.warn(`  ⚠️  Stat sheet "${td.sheet}" not found in ${sess.statFile}`);
        continue;
      }

      const teamId = teamIdBySheet.get(td.sheet)!;

      // Ordered list of regular-season game IDs for this team
      const teamGames = await prisma.game.findMany({
        where: {
          sessionId: session.id,
          isPlayoff: false,
          OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
        },
        orderBy: [{ week: "asc" }, { scheduledAt: "asc" }],
      });

      const ws = wbStats.Sheets[td.sheet];
      const gameBlocks = parseStatSheet(ws);

      for (let i = 0; i < gameBlocks.length; i++) {
        const block  = gameBlocks[i];
        const game   = teamGames[i];

        if (!game) {
          console.warn(`  ⚠️  [${sess.key}][${td.sheet}] No scheduled game for stat block ${i + 1} ("${block.label}")`);
          continue;
        }

        for (const row of block.rows) {
          // Skip sub annotations and explicit nulls silently
          if (/\(sub\)/i.test(row.name)) continue;
          const display = canonical(row.name, sess.key, td.sheet);
          if (display === null && ALIASES[row.name.trim()] === null) continue; // explicit skip
          if (!display) {
            console.warn(`  ⚠️  [${sess.key}][${td.sheet}] Unresolved name: "${row.name}"`);
            continue;
          }

          // Siebert in FA25 is a long-term sub for Shane Kieler (Nate Ray's team).
          // His stats are always credited to Nate Ray's teamId regardless of which
          // sheet he appears on.
          let statTeamId = teamId;
          if (sess.key === "FA25" && display === "Siebert") {
            statTeamId = teamIdBySheet.get("Nate Ray")!;
          }

          const playerId = await getOrCreatePlayer(display);

          const existing = await prisma.gameStat.findUnique({
            where: { gameId_playerId: { gameId: game.id, playerId } },
          });
          if (existing) continue;

          await prisma.gameStat.create({
            data: {
              gameId:         game.id,
              teamId:         statTeamId,
              playerId,
              fgMade:          row.fgm,
              fgAttempted:     row.fga,
              threesMade:      row.t3fgm,
              threesAttempted: row.t3fga,
              ftMade:          row.ftm,
              ftAttempted:     row.fta,
              points:          row.pts,
              rebounds:        row.reb,
              assists:         row.ast,
              blocks:          row.blk,
              steals:          row.stl,
              turnovers:       row.tov,
            },
          });
        }
      }
    }

    // ── 5. Standings (regular season only, from schedule scores) ─────────
    const finalGames = await prisma.game.findMany({
      where: { sessionId: session.id, status: "FINAL", isPlayoff: false },
      include: { homeTeam: true, awayTeam: true },
    });

    type Accum = { wins: number; losses: number; divisionWins: number; divisionLosses: number; pointDifferential: number };
    const standings = new Map<string, Accum>();
    const init = (id: string) => { if (!standings.has(id)) standings.set(id, { wins:0,losses:0,divisionWins:0,divisionLosses:0,pointDifferential:0 }); };

    for (const g of finalGames) {
      init(g.homeTeamId); init(g.awayTeamId);
      const home = standings.get(g.homeTeamId)!;
      const away = standings.get(g.awayTeamId)!;
      const sameDivision = g.homeTeam.division === g.awayTeam.division;
      const diff = g.homeScore - g.awayScore;
      home.pointDifferential += diff;
      away.pointDifferential -= diff;
      if (g.homeScore > g.awayScore) {
        home.wins++; away.losses++;
        if (sameDivision) { home.divisionWins++; away.divisionLosses++; }
      } else if (g.awayScore > g.homeScore) {
        away.wins++; home.losses++;
        if (sameDivision) { away.divisionWins++; home.divisionLosses++; }
      }
    }
    for (const [teamId, s] of standings) {
      await prisma.team.update({ where: { id: teamId }, data: s });
    }

    // ── 6. Session Stats ──────────────────────────────────────────────────
    const allGameStats = await prisma.gameStat.findMany({
      where: { game: { sessionId: session.id } },
    });

    const statsByPlayer = new Map<string, typeof allGameStats>();
    for (const gs of allGameStats) {
      if (!statsByPlayer.has(gs.playerId)) statsByPlayer.set(gs.playerId, []);
      statsByPlayer.get(gs.playerId)!.push(gs);
    }

    for (const [playerId, stats] of statsByPlayer) {
      await prisma.sessionStat.create({
        data: {
          sessionId: session.id,
          playerId,
          gamesPlayed:     stats.length,
          fgMade:          stats.reduce((s,g) => s+g.fgMade,          0),
          fgAttempted:     stats.reduce((s,g) => s+g.fgAttempted,     0),
          threesMade:      stats.reduce((s,g) => s+g.threesMade,      0),
          threesAttempted: stats.reduce((s,g) => s+g.threesAttempted, 0),
          ftMade:          stats.reduce((s,g) => s+g.ftMade,          0),
          ftAttempted:     stats.reduce((s,g) => s+g.ftAttempted,     0),
          points:          stats.reduce((s,g) => s+g.points,          0),
          rebounds:        stats.reduce((s,g) => s+g.rebounds,        0),
          assists:         stats.reduce((s,g) => s+g.assists,         0),
          blocks:          stats.reduce((s,g) => s+g.blocks,          0),
          steals:          stats.reduce((s,g) => s+g.steals,          0),
          turnovers:       stats.reduce((s,g) => s+g.turnovers,       0),
        },
      });
    }

    const regGames = schedGames.filter(g => !g.isPlayoff).length;
    const poGames  = schedGames.filter(g => g.isPlayoff).length;
    console.log(`  ✅ ${sess.name} — ${regGames} reg + ${poGames} playoff games, ${allGameStats.length} stat rows`);
  }

  // ── 7. Career Stats ───────────────────────────────────────────────────
  console.log("\n📊 Computing career stats...");
  for (const player of await prisma.player.findMany()) {
    const ss = await prisma.sessionStat.findMany({ where: { playerId: player.id } });
    if (ss.length === 0) continue;
    await prisma.careerStat.create({
      data: {
        playerId:        player.id,
        sessionsPlayed:  ss.length,
        gamesPlayed:     ss.reduce((s,x) => s+x.gamesPlayed,     0),
        fgMade:          ss.reduce((s,x) => s+x.fgMade,          0),
        fgAttempted:     ss.reduce((s,x) => s+x.fgAttempted,     0),
        threesMade:      ss.reduce((s,x) => s+x.threesMade,      0),
        threesAttempted: ss.reduce((s,x) => s+x.threesAttempted, 0),
        ftMade:          ss.reduce((s,x) => s+x.ftMade,          0),
        ftAttempted:     ss.reduce((s,x) => s+x.ftAttempted,     0),
        points:          ss.reduce((s,x) => s+x.points,          0),
        rebounds:        ss.reduce((s,x) => s+x.rebounds,        0),
        assists:         ss.reduce((s,x) => s+x.assists,         0),
        blocks:          ss.reduce((s,x) => s+x.blocks,          0),
        steals:          ss.reduce((s,x) => s+x.steals,          0),
        turnovers:       ss.reduce((s,x) => s+x.turnovers,       0),
      },
    });
  }

  console.log("  ✅ Career stats complete");

  // ── 8. Sub List (SP26 only) ─────────────────────────────────────────────
  console.log("\n📋 Seeding sub list...");
  const sp26Session = await prisma.session.findFirst({ where: { period: "SPRING", year: 2026 } });
  if (sp26Session) {
    const subWb = XLSX.readFile(path.join(DATA_DIR, "MBA_Spring_2026_Workbook.xlsx"));
    const subSheet = subWb.Sheets["2026 Sublist"];
    if (subSheet) {
      const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(subSheet, { header: 1 });
      let subCount = 0;

      function parseSub(name: string | null | undefined, round: number | null | undefined, pos: string | null | undefined, contact: string | null | undefined, notes: string | null | undefined) {
        if (!name || typeof name !== "string") return;
        const trimmed = name.trim();
        if (!trimmed || /^(name|injury)/i.test(trimmed)) return;
        const draftRound = typeof round === "number" ? round : null;
        const position = (typeof pos === "string" && pos.trim()) ? pos.trim() : null;
        const contactInfo = (typeof contact === "string" && contact.trim()) ? contact.trim() : null;
        const noteStr = (typeof notes === "string" && notes.trim()) ? notes.trim() : null;

        return {
          sessionId: sp26Session.id,
          name: trimmed,
          draftRound,
          position,
          contactInfo,
          notes: noteStr,
        };
      }

      for (const row of rows) {
        // Left side: cols 0-3 (name, round, position, contact), notes in col 4
        const leftSub = parseSub(
          row[0] as string, row[1] as number, row[2] as string, row[3] as string, row[4] as string,
        );
        if (leftSub) {
          await prisma.subPlayer.create({ data: leftSub });
          subCount++;
        }

        // Right side: cols 5-8 (name, round, position, contact), notes in col 9
        const rightSub = parseSub(
          row[5] as string, row[6] as number, row[7] as string, row[8] as string, row[9] as string,
        );
        if (rightSub) {
          await prisma.subPlayer.create({ data: rightSub });
          subCount++;
        }
      }

      console.log(`  ✅ ${subCount} subs seeded for SP26`);
    }
  }

  console.log("\n🏆 Seed complete!\n");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });