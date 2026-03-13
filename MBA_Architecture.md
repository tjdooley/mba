# MBA Basketball League — Architecture & Build Plan

> Stack: Next.js 16 (App Router) · Neon (Postgres) · Vercel · Resend · Prisma 7 · TypeScript · Tailwind CSS 4

---

## 1. League Structure

- **2 sessions per year** — Fall and Spring, each fully independent
- **48 players, 8 teams of 6** — fixed rosters for the duration of each session
- **Teams identified by their captain**, who is always a rostered player on the team
- **2 divisions per session** — FREEHOUSE and DELANEYS (assignments may change each session at draft time)
- **10 regular season games + 3 playoff rounds** per session (6 teams qualify for playoffs)
- **Career stats** tracked and displayed across all sessions
- **Session champions** recorded and players recognized on the site

---

## 2. Core Feature Set

| Feature | Description | Priority |
|---|---|---|
| Player profiles | Stats, history | P0 |
| Session standings | Win/loss, division W/L, point differential, auto-updated | P0 |
| Box scores | Per-game stat summaries | P0 |
| Admin dashboard | Manage players, games, rosters | P0 |
| Auth (admin only) | Admin-only login — no player login needed | P0 |
| Schedule | Upcoming & past games | P1 |
| Player stats leaderboards | Points, rebounds, assists, etc. | P1 |
| Career stats | Aggregated totals/averages across all sessions | P1 |
| Champion recognition | Session champion banner + winning roster display | P1 |
| Stat upload / screenshot import | Admin uploads box score CSV or image; AI parses stats | P1 |
| Live game tracker | In-game stat entry via tracker UI | P2 |
| Sub list | Session sub pool — admin editable, viewable by admins + captains | P2 |
| Email notifications | Game results, schedule changes via Resend | P3 |
| GroupMe announcements | Weekly game schedule posted to league GroupMe via bot API | P2 |

---

## 3. Current Status

### ✅ Done
- Next.js 16 app scaffolded and deployed to Vercel
- Prisma 7 schema pushed to Neon (Postgres)
- Database seeded with all 7 seasons of historical data:
  - Spring 2023, Fall 2023, Spring 2024, Fall 2024, Spring 2025, Fall 2025, Spring 2026
  - All players, rosters, games (40 reg + playoffs per season), game stats, standings, session stats, career stats
  - SP23 playoff scores filled in (3 games); FA23–SP26 playoff structure seeded, scores to be entered via admin
- `prisma generate` wired into build step (`"build": "prisma generate && next build"`)
- `src/lib/prisma.ts` — Prisma singleton (Prisma 7 + PrismaPg adapter)
- `src/app/layout.tsx` — Root layout with Bebas Neue, DM Sans, DM Mono via `next/font/google`
- `src/app/globals.css` — CSS custom properties for full design token system
- `src/components/NavBar.tsx` — Sticky nav with active route highlighting (`'use client'`)
- `src/app/(public)/page.tsx` — Standings homepage with session picker (`?session=` param)
- `src/app/(public)/games/page.tsx` — Schedule + results with session picker + Upcoming/Results/Playoffs tabs
- `src/components/ScheduleTabs.tsx` — Client component tab switcher for schedule page
- `src/components/SessionPicker.tsx` — Shared session picker component (horizontal pill row, links via `?session=<id>`)
- `src/app/(public)/games/[id]/page.tsx` — Box score page, full stat table with team totals (incl. subs)
- `src/app/(public)/players/page.tsx` — Player directory split into Active Players (current session roster) and Alumni sections
- `src/app/(public)/players/[id]/page.tsx` — Player profile: current session stats, career totals, season history
- `src/app/(public)/leaderboards/page.tsx` — Stat leaderboards with session picker, filtered to rostered players only (excludes subs)
- `src/app/(public)/teams/[id]/page.tsx` — Team detail page: roster, player session stats, game results, upcoming schedule
- Player data cleanup complete — all 7 seasons normalized, no duplicate players, sub stats tracked correctly
- `src/middleware.ts` — Auth guard for `/admin/*` routes, cookie-based auth against `ADMIN_PASSWORD` env var
- `src/app/admin/login/` — Admin login page with `useActionState`, server action sets httpOnly cookie (7-day TTL)
- `src/app/admin/layout.tsx` — Admin shell layout with nav (Dashboard, Games, Players, Teams) + logout
- `src/app/admin/dashboard/page.tsx` — Overview: stat cards, missing stats alert, quick actions, recent games table
- `src/app/admin/games/page.tsx` — Game list grouped by status (Needs Stats / Completed / Scheduled) with links to stats + score edit
- `src/app/admin/games/[id]/stats/page.tsx` — Manual stat entry form: spreadsheet grid per team, auto-calculated PTS, saves + recomputes SessionStat/CareerStat/standings
- `src/app/admin/games/[id]/edit/page.tsx` — Score-only editing: update home/away score + game status without entering player stats
- `src/app/admin/games/new-playoff/page.tsx` — Create playoff games for any season: season selector, round picker, team dropdowns, optional score entry

### 🔲 Not Yet Built
- Admin: player management (new, edit)
- Admin: team roster editor + set champion
- Admin: schedule regular season game
- Champion recognition banner (P1)
- CSV stat upload (P1)
- Screenshot/AI stat import (P1) — Claude Vision API, ~$0.01–0.05 per image
- Live game tracker (P2)
- Sub list page (P2)
- Email notifications (P3)

### 🔧 Known Issues / Pending Cleanup
- Player profile season history links to `/` as placeholder (needs session pages)
- NavBar session badge hardcodes "Spring 2026" instead of pulling dynamically
- Middleware `?from=` redirect-back not wired up in login action (always goes to `/admin/dashboard`)
- `Player.isActive` field is never set in seed (all players default to `true`) — active/alumni split uses `TeamRoster` membership instead

---

## 4. Database Schema (Prisma 7 / Postgres)

> Schema file: `prisma/schema.prisma`
> Generated client output: `src/generated/prisma`
> Connection URL: managed in `prisma.config.ts` via `process.env.DATABASE_URL`

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

model Player {
  id          String   @id @default(cuid())
  firstName   String
  lastName    String
  displayName String   // shown in box scores, standings, stat tables (e.g. "Armga", "Chase Kieler", "Sam BZ")
  email       String?  // optional — for email notifications (future)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())

  teamRosters  TeamRoster[]
  gameStats    GameStat[]
  sessionStats SessionStat[]
  careerStats  CareerStat?
  captainOf    Team[]
}

model Session {
  id             String        @id @default(cuid())
  name           String        // e.g. "Spring 2026", "Fall 2025"
  period         SessionPeriod // FALL | SPRING
  year           Int
  startDate      DateTime
  endDate        DateTime?
  isActive       Boolean       @default(true)
  championTeamId String?       // set when session is finalized
  champion       Team?         @relation("SessionChampion", fields: [championTeamId], references: [id])

  teams        Team[]
  games        Game[]
  sessionStats SessionStat[]
  subPlayers   SubPlayer[]
}

enum SessionPeriod {
  FALL
  SPRING
}

model Team {
  id        String   @id @default(cuid())
  sessionId String
  session   Session  @relation(fields: [sessionId], references: [id])
  captainId String
  captain   Player   @relation(fields: [captainId], references: [id])
  division  Division // FREEHOUSE | DELANEYS

  // Standings — updated after each game is finalized
  wins              Int @default(0)
  losses            Int @default(0)
  divisionWins      Int @default(0)
  divisionLosses    Int @default(0)
  pointDifferential Int @default(0)

  roster     TeamRoster[]
  homeGames  Game[]     @relation("HomeTeam")
  awayGames  Game[]     @relation("AwayTeam")
  championOf Session[]  @relation("SessionChampion")
  gameStats  GameStat[]

  @@unique([sessionId, captainId])
}

enum Division {
  FREEHOUSE  // Spring 2026: Cooper, TJ, Zack, Derek
  DELANEYS   // Spring 2026: Alex, Olson, Akim, Timmy
  // Note: division assignments may change each session at draft time
}

model TeamRoster {
  id       String  @id @default(cuid())
  teamId   String
  team     Team    @relation(fields: [teamId], references: [id])
  playerId String
  player   Player  @relation(fields: [playerId], references: [id])
  isSub    Boolean @default(false) // true if player subbed in from sub list

  @@unique([teamId, playerId])
}

model Game {
  id           String     @id @default(cuid())
  sessionId    String
  session      Session    @relation(fields: [sessionId], references: [id])
  homeTeamId   String
  homeTeam     Team       @relation("HomeTeam", fields: [homeTeamId], references: [id])
  awayTeamId   String
  awayTeam     Team       @relation("AwayTeam", fields: [awayTeamId], references: [id])
  scheduledAt  DateTime
  court        String?    // e.g. "Court 1 (Left Side) - 6:30"
  week         Int?       // regular season week number; null for playoffs
  isPlayoff    Boolean    @default(false)
  playoffRound Int?       // 1 = Wild Card, 2 = Semi-Finals, 3 = Championship
  status       GameStatus @default(SCHEDULED)
  homeScore    Int        @default(0)
  awayScore    Int        @default(0)

  gameStats GameStat[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}

enum GameStatus {
  SCHEDULED
  LIVE
  FINAL
}

model GameStat {
  id       String @id @default(cuid())
  gameId   String
  game     Game   @relation(fields: [gameId], references: [id])
  teamId   String                          // which team this player was on for this game (supports subs)
  team     Team   @relation(fields: [teamId], references: [id])
  playerId String
  player   Player @relation(fields: [playerId], references: [id])

  fgMade          Int @default(0)
  fgAttempted     Int @default(0)
  threesMade      Int @default(0)
  threesAttempted Int @default(0)
  ftMade          Int @default(0)
  ftAttempted     Int @default(0)
  points          Int @default(0)
  rebounds        Int @default(0)
  assists         Int @default(0)
  blocks          Int @default(0)
  steals          Int @default(0)
  turnovers       Int @default(0)
  fouls           Int? // nullable — not tracked in all historical games

  @@unique([gameId, playerId])
}

model SessionStat {
  id        String  @id @default(cuid())
  sessionId String
  session   Session @relation(fields: [sessionId], references: [id])
  playerId  String
  player    Player  @relation(fields: [playerId], references: [id])

  gamesPlayed     Int @default(0)
  fgMade          Int @default(0)
  fgAttempted     Int @default(0)
  threesMade      Int @default(0)
  threesAttempted Int @default(0)
  ftMade          Int @default(0)
  ftAttempted     Int @default(0)
  points          Int @default(0)
  rebounds        Int @default(0)
  assists         Int @default(0)
  blocks          Int @default(0)
  steals          Int @default(0)
  turnovers       Int @default(0)
  fouls           Int? // nullable — not tracked in all historical sessions

  @@unique([sessionId, playerId])
}

model SubPlayer {
  id          String  @id @default(cuid())
  sessionId   String
  session     Session @relation(fields: [sessionId], references: [id])
  name        String
  position    String? // e.g. "G", "F", "C", "G/F"
  contactInfo String? // phone number
  notes       String? // e.g. "Cooper recommendation"
  isAvailable Boolean @default(true)

  @@unique([sessionId, name])
}

model CareerStat {
  id       String @id @default(cuid())
  playerId String @unique
  player   Player @relation(fields: [playerId], references: [id])

  sessionsPlayed  Int @default(0)
  gamesPlayed     Int @default(0)
  fgMade          Int @default(0)
  fgAttempted     Int @default(0)
  threesMade      Int @default(0)
  threesAttempted Int @default(0)
  ftMade          Int @default(0)
  ftAttempted     Int @default(0)
  points          Int @default(0)
  rebounds        Int @default(0)
  assists         Int @default(0)
  blocks          Int @default(0)
  steals          Int @default(0)
  turnovers       Int @default(0)
  fouls           Int? // nullable — not tracked in all historical sessions
}
```

---

## 5. Next.js App Router Structure

```
app/
├── layout.tsx                        # Root layout + nav
├── (public)/
│   ├── page.tsx                      # Home — session standings (supports ?session= param)
│   ├── players/
│   │   ├── page.tsx                  # Player directory (Active Players + Alumni)
│   │   └── [id]/page.tsx            # Player profile — session stats + career totals
│   ├── games/
│   │   ├── page.tsx                  # Schedule / results list (supports ?session= param)
│   │   └── [id]/page.tsx            # Box score
│   ├── leaderboards/page.tsx         # Stat leaders (supports ?session= param, rostered only)
│   ├── teams/page.tsx                # Teams list
│   │   └── [id]/page.tsx            # Team detail
│   └── seasons/page.tsx              # Season archive
│
├── admin/                            # ⚠️ NOT a route group — actual /admin/* URL path
│   ├── layout.tsx                    # Admin shell nav + logout (auth via middleware.ts)
│   ├── LogoutButton.tsx              # Client component for logout form
│   ├── login/
│   │   ├── page.tsx                  # Login page (useActionState)
│   │   └── actions.ts               # Login/logout server actions
│   ├── dashboard/page.tsx            # Overview — stat cards, missing stats alert, recent games
│   ├── games/
│   │   ├── page.tsx                  # Game list (grouped: Needs Stats / Completed / Scheduled)
│   │   ├── new-playoff/
│   │   │   ├── page.tsx             # Create playoff game (any season)
│   │   │   └── actions.ts
│   │   └── [id]/
│   │       ├── edit/
│   │       │   ├── page.tsx         # Score-only editing
│   │       │   └── actions.ts
│   │       └── stats/
│   │           ├── page.tsx         # Manual stat entry form
│   │           └── actions.ts       # Save stats + recompute aggregates
│   ├── games/new/page.tsx            # 🔲 Schedule a regular season game
│   ├── players/                      # 🔲 Player management
│   │   ├── new/page.tsx
│   │   └── [id]/edit/page.tsx
│   ├── teams/                        # 🔲 Team roster editor + set champion
│   │   └── [id]/edit/page.tsx
│   └── sub-list/page.tsx             # 🔲 P2 — Manage session sub list
│
├── middleware.ts                      # Auth guard — cookie check for /admin/* (except /admin/login)
│
components/
├── NavBar.tsx                        # Sticky nav with active route highlighting
├── ScheduleTabs.tsx                  # Client tab switcher for schedule page
├── SessionPicker.tsx                 # Shared session picker (horizontal pill row)
├── StatEntryForm.tsx                 # Client stat entry grid (per-team tables)
├── GameEditForm.tsx                  # Client score-only edit form
└── PlayoffGameForm.tsx               # Client playoff game creation form
```

---

## 6. Prisma Client Usage

Prisma 7 requires a driver adapter. Import from the generated client path:

```ts
import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })
```

For Next.js, create a singleton at `lib/prisma.ts` to avoid exhausting connections in development:

```ts
// lib/prisma.ts
import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

---

## 7. Stat Entry Flow

Admins can enter stats three ways — all hit the same endpoint:

1. **Manual entry form** — Admin selects a game, fills in each player's stat line
2. **Screenshot / image import** — Admin uploads a photo of the scoresheet; server sends to Claude vision API, which parses it into structured stat rows. Admin reviews and confirms.
3. **CSV upload** — Admin exports from the existing spreadsheet workflow and uploads. Server validates and bulk-inserts.

```
Admin uploads image/CSV   →   POST /api/games/[id]/stats/import
                                   │
                          Parse & validate
                                   │
                          Admin reviews preview
                                   │
                          POST /api/games/[id]/stats  (confirm)
                                   │
                          Recompute standings + session/career aggregates
```

---

## 8. Standings Computation

Standings are updated inside a Prisma transaction whenever a game is finalized (`status: FINAL`). Fields maintained on the `Team` model:

- `wins` / `losses`
- `divisionWins` / `divisionLosses`
- `pointDifferential`

`SessionStat` and `CareerStat` aggregates are also recomputed at finalization by summing all `GameStat` rows for the relevant player/session.

**Playoff creation:** Admin creates playoff games manually after regular season ends via the "Create Playoff Game" flow. The `isPlayoff` and `playoffRound` fields on `Game` handle this.

**Champion:** Admin sets `Session.championTeamId` after the championship game is finalized. The champion team's roster is displayed on the session page and each player's profile.

---

## 9. Auth Strategy

- Admin-only login — no player-facing auth needed
- Next.js middleware (`middleware.ts`) guards all `/admin/*` routes
- Player `email` field is optional — only needed for future email notifications

**P2 — Sub list captain access:** Read-only access for captains via a simple passcode or magic link. No schema changes needed.

---

## 10. Design System

### Logo
- **Full lockup** (badge + MBA wordmark): top nav / site header
- **Badge only**: favicon and mobile app icon
- Asset: `original.png` in the repo root

### Color Palette

| Token | Hex | Usage |
|---|---|---|
| `--dark` | `#0a0e14` | Page background |
| `--mid` | `#111722` | Nav, panels |
| `--surface` | `#1a2230` | Cards, table rows |
| `--border` | `#2a3548` | Dividers, outlines |
| `--green` | `#1db954` | Primary accent, wins, leaders |
| `--teal` | `#2a8f8f` | Secondary accent |
| `--red` | `#e84040` | Losses, negative diff |
| `--amber` | `#f5a623` | Warnings, playoffs |
| `--muted` | `#6b7c93` | Secondary text, labels |
| `--text` | `#e8edf5` | Primary text |

Primary gradient: `linear-gradient(135deg, #1db954, #128f3e)`

### Typography

| Role | Font | Weight |
|---|---|---|
| Display / headers | Bebas Neue | 400 |
| Body / UI | DM Sans | 300–700 |
| Monospace (scores, stats) | DM Mono | 400–500 |

All three available on Google Fonts.

### General UI Notes
- Dark-first design — light mode not needed
- Mobile-first layout, comfortable on phone
- Stats tables use monospace figures for alignment
- Green accent on leading team / top stat performer

---

## 11. Key Config Files

```
prisma/schema.prisma          # Schema — no url field (Prisma 7)
prisma.config.ts              # DB connection URL + seed command
tsconfig.seed.json            # Separate tsconfig for seed script (CommonJS)
tsconfig.json                 # Excludes prisma/seed.ts from Next.js build
package.json                  # build: "prisma generate && next build"
```

### prisma.config.ts
```ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
```

---

## 12. Seed

The seed script (`prisma/seed.ts`) populates all 7 historical seasons from two file types per season in `prisma/data/` (gitignored):
- **Stat files** (`Spring_2023_MBA_Stats.xlsx` etc.) — one sheet per team captain, one row per player per game
- **Workbook files** (`2_MBA_Spring_2023_Workbook.xlsx` etc.) — contains the schedule sheet with matchups, courts, and scores

Run with:
```bash
npx prisma db seed
```

> **Note:** Re-running the seed regenerates all CUID primary keys. Any bookmarked or cached URLs with old IDs (e.g. `/players/old-cuid`, `/games/old-cuid`) will 404. Navigate from the directory/schedule pages to get fresh links.

### Teams by Season

| Season | FreeHouse | Delaney's |
|---|---|---|
| Spring 2023 | Sean F, Lewis (sheet: Nate), Ziemer, Connor | Sam P (sheet: SamP), Wedel, Justin, Danny |
| Fall 2023 | Towns, Gallman, Don T (sheet: Don), Roy | BJ, Ricky, Winsor, Pat Howe (sheet: Pat) |
| Spring 2024 | Sean F, Lewis, Hertz, Danny | Ziemer, Tyler Olson (sheet: Olson), Mitch (sheet: Tordoff), Wedel |
| Fall 2024 | Trev (sheet: Neale), Sir, Akim, TJ | Towns, Younggren, Karls, Cooper |
| Spring 2025 | Plotkin, Dave F, Cori, Tall Matt | Don T (sheet: Donny), Ricky, Roy, Gallman |
| Fall 2025 | Mike Brand (sheet: Brand), Hertz, Macon, Ziemer | Lewis, Sean F, Jake B, Nate Ray |
| Spring 2026 | Cooper, Derek, TJ, Zack | Tyler Olson, Alex Hade (sheet: Alex), Tim (sheet: Timmy), Akim |

### Seed Results (per season)
- 40 regular season games (4 courts × 10 weeks)
- Playoff games seeded from schedule sheet (scores filled in where available)
- ~470–475 stat rows per completed season; ~277 for SP26 (in-progress)

### Seed Design Notes
- **ALIASES map** (`Record<string, string | null>`) — raw name variants → canonical displayName. `null` value = silently skip (used for `(sub)` annotations and other artifacts)
- **SHEET_OVERRIDES map** — per-session, per-sheet name overrides applied before global ALIASES. Handles ambiguous names like "Marty" (Petersen vs Johnson in FA24) and "Staege" (Ryan vs Jared in FA25)
- **SCHED_ALIASES map** — raw captain name in schedule sheet → canonical displayName (handles "Sam"→"Sam P", "Team Neale"→"Trev", etc.)
- **ALL_CAPTAINS set** — used to filter schedule parsing artifacts (self-matches, unrecognised names)
- **PLAYER_NAMES map** — canonical displayName → `{ firstName, lastName }` for DB storage
- **`canonical()`** is applied to all roster and stat sheet names before player lookup or creation — prevents ghost duplicate players
- **Points** calculated from shooting stats (`(FGM - 3FGM) * 2 + 3FGM * 3 + FTM`) — never read from Excel formula cell
- **Team assignment for game stats** — `GameStat` links to `gameId` + `playerId`; the player's team for a given game is determined via `TeamRoster` lookup (no `teamId` on `GameStat`)
- **Schedule parser** reads each workbook's schedule sheet, auto-detects court columns, parses matchup rows and score rows, deduplicates via sorted-pair key
- **Stat block → game matching** done by index order within each team's sorted regular-season game list
- **Standings** computed from schedule scores (authoritative), not summed stat points
- **SP23 special**: stat sheet names are `SeanF` and `SamP` (no space) — all other seasons use spaces
- **FA24 special**: schedule uses "Team X" prefix for all team names (e.g. "Team Neale", "Team Younngren")
- **FA25 special**: Chris Siebert = long-term sub for injured Shane Kieler — stats assigned to Nate Ray's teamId, not added to TeamRoster
- **SP26 special**: Rocky So got hurt mid-season, Mike Fancsali subbed — all stats on TJ's sheet credited to Rocky So

---

## 13. Known Gotchas

- **Next.js 15 async params** — Dynamic route pages must await `params` before accessing route segments:
  ```ts
  export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
  }
  ```
- **Prisma nullable return types** — Helper functions that index into `getXData()` return types must use `NonNullable<Awaited<ReturnType<typeof getXData>>>` to avoid TS2339 errors
- **`lib/` and `components/`** live at `src/lib/` and `src/components/` (not repo root) because `app/` is under `src/`
- **Client Components that receive Prisma data** must receive serialized plain objects — convert `Date` fields to `.toISOString()` strings before passing as props
- **Excel formula cells** — The PTS column in stat sheets uses Excel formulas. The `xlsx` library reads these as formula strings, not computed values. Always calculate points from raw shooting stat columns instead.
- **xlsx column offset** — The `xlsx` JS library strips leading empty columns from the `!ref` range. The schedule sheets have an empty column A, so all column indices are shifted left by 1 vs. what openpyxl (1-based) shows. In the schedule parser: `row[0]` = date, `row[1]` = week label, court home/away columns auto-detected from `rows[1]`.
- **xlsx date cells** — Date cells come through as JS `Date` objects when `cellDates: true` is passed to `XLSX.readFile`. Check `cell.t === "d"` to distinguish from numeric cells. Fallback: numeric serials in range 40000–60000 are Excel dates (convert with `(serial - 25569) * 86400 * 1000`).
- **SP23 stat sheet names** — `SeanF` and `SamP` have no space (all other sessions use "Sean F", "Sam P" with a space). The `sheet` field in the SP23 session definition must match exactly.
- **FA24 schedule names** — All team names in the FA24 schedule sheet are prefixed with "Team " (e.g. "Team Neale", "Team Younngren" — note the misspelling of Younggren). Handled via SCHED_ALIASES.

---

## 14. Infrastructure

| Service | Role | Free Limit |
|---|---|---|
| Neon | Postgres database | 0.5 GB storage |
| Vercel | Hosting + deploys | 100 GB bandwidth |
| Resend | Email notifications (P3) | 3,000 emails/mo |
| GroupMe Bot API | Weekly schedule announcements to league group chat | Free (no limit) |

---

## 15. Immediate Next Steps

1. ~~Create `lib/prisma.ts` singleton~~ ✅
2. ~~Build public standings homepage~~ ✅
3. ~~Build schedule + results page~~ ✅
4. ~~Build box score page~~ ✅
5. ~~Build player directory page~~ ✅
6. ~~Build player profile page~~ ✅
7. ~~Build leaderboards page~~ ✅
8. ~~Clean up player data (names, duplicates)~~ ✅
9. ~~Seed all 7 seasons with games, stats, standings~~ ✅
10. ~~Set up admin auth + middleware (`middleware.ts` guarding `/admin/*`)~~ ✅
11. ~~Build admin dashboard~~ ✅
12. ~~Build admin game list + stat entry (manual form)~~ ✅
13. ~~Build admin score-only editing~~ ✅
14. ~~Build admin playoff game creation (any season)~~ ✅
15. ~~Add session picker to standings, schedule, leaderboards~~ ✅
16. ~~Fix players page — active/alumni split by TeamRoster membership~~ ✅
17. ~~Fix leaderboards — filter to rostered players only~~ ✅
18. Build admin player management (create new, edit existing)
19. Build admin team roster editor + set champion
20. Enter playoff scores for FA23, SP24, FA24, SP25, FA25 via admin
21. Champion recognition banner (P1)
22. CSV stat upload (P1)
23. Screenshot/AI stat import via Claude Vision (P1)
24. Sub list page (P2)
25. GroupMe weekly game announcements (P2) — Bot API, post upcoming week's schedule to league group chat (`GROUPME_BOT_ID` env var)
26. Email notifications via Resend (P3)
