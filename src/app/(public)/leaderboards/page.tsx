import { prisma } from '@/lib/prisma'
import Link from 'next/link'

// ─── DATA ────────────────────────────────────────────────────────────────

async function getLeaderboardData() {
  const session = await prisma.session.findFirst({
    where: { isActive: true },
    orderBy: { startDate: 'desc' },
  })
  if (!session) return null

  const sessionStats = await prisma.sessionStat.findMany({
    where: { sessionId: session.id, gamesPlayed: { gt: 0 } },
    include: {
      player: { select: { id: true, displayName: true } },
    },
  })

  // Map playerId → team captain for display
  const rosters = await prisma.teamRoster.findMany({
    where: { team: { sessionId: session.id }, isSub: false },
    include: { team: { include: { captain: { select: { displayName: true } } } } },
  })
  const playerTeam: Record<string, string> = {}
  for (const r of rosters) playerTeam[r.playerId] = r.team.captain.displayName

  const rows = sessionStats.map((s) => ({
    playerId:   s.playerId,
    playerName: s.player.displayName,
    teamName:   playerTeam[s.playerId] ?? '—',
    gp:         s.gamesPlayed,
    pts:        s.points,
    reb:        s.rebounds,
    ast:        s.assists,
    blk:        s.blocks,
    stl:        s.steals,
    tov:        s.turnovers,
    fgMade:     s.fgMade,
    fgAtt:      s.fgAttempted,
    threeMade:  s.threesMade,
    threeAtt:   s.threesAttempted,
    ftMade:     s.ftMade,
    ftAtt:      s.ftAttempted,
    ptsAvg:     s.points    / s.gamesPlayed,
    rebAvg:     s.rebounds  / s.gamesPlayed,
    astAvg:     s.assists   / s.gamesPlayed,
    blkAvg:     s.blocks    / s.gamesPlayed,
    stlAvg:     s.steals    / s.gamesPlayed,
    tovAvg:     s.turnovers / s.gamesPlayed,
    fgPct:      s.fgAttempted    > 0 ? s.fgMade    / s.fgAttempted    : 0,
    threePct:   s.threesAttempted > 0 ? s.threesMade / s.threesAttempted : 0,
    ftPct:      s.ftAttempted    > 0 ? s.ftMade    / s.ftAttempted    : 0,
  }))

  return { session, rows }
}

type Row = NonNullable<Awaited<ReturnType<typeof getLeaderboardData>>>['rows'][number]

// ─── LEADERBOARD TABLE ───────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'ptsAvg',   label: 'Points',       abbr: 'PPG',  fmt: (r: Row) => r.ptsAvg.toFixed(1),   color: 'var(--green)' },
  { key: 'rebAvg',   label: 'Rebounds',      abbr: 'RPG',  fmt: (r: Row) => r.rebAvg.toFixed(1),   color: 'var(--teal)'  },
  { key: 'astAvg',   label: 'Assists',       abbr: 'APG',  fmt: (r: Row) => r.astAvg.toFixed(1),   color: 'var(--green)' },
  { key: 'blkAvg',   label: 'Blocks',        abbr: 'BPG',  fmt: (r: Row) => r.blkAvg.toFixed(1),   color: 'var(--teal)'  },
  { key: 'stlAvg',   label: 'Steals',        abbr: 'SPG',  fmt: (r: Row) => r.stlAvg.toFixed(1),   color: 'var(--green)' },
  { key: 'fgPct',    label: 'FG%',           abbr: 'FG%',  fmt: (r: Row) => `${Math.round(r.fgPct    * 100)}%`, color: 'var(--teal)', minGP: 3 },
  { key: 'threePct', label: '3-Point %',     abbr: '3P%',  fmt: (r: Row) => `${Math.round(r.threePct * 100)}%`, color: 'var(--green)', minGP: 3, minAtt: (r: Row) => r.threeAtt >= 10 },
  { key: 'ftPct',    label: 'Free Throw %',  abbr: 'FT%',  fmt: (r: Row) => `${Math.round(r.ftPct    * 100)}%`, color: 'var(--teal)', minGP: 3, minAtt: (r: Row) => r.ftAtt >= 8 },
] as const

function LeaderboardTable({
  rows,
  category,
}: {
  rows: Row[]
  category: typeof CATEGORIES[number]
}) {
  let filtered = [...rows]

  // Apply minimums for percentage categories
  if ('minAtt' in category && category.minAtt) {
    filtered = filtered.filter(category.minAtt as (r: Row) => boolean)
  }

  const sorted = filtered.sort((a, b) => (b[category.key] as number) - (a[category.key] as number)).slice(0, 10)

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: category.color,
        }}>
          {category.label}
        </span>
        <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, letterSpacing: 1 }}>
          {category.abbr}
        </span>
      </div>

      {sorted.map((r, i) => (
        <div key={r.playerId} style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '9px 14px',
          borderBottom: i < sorted.length - 1 ? '1px solid rgba(42,53,72,0.4)' : 'none',
          background: i === 0 ? 'rgba(29,185,84,0.03)' : 'transparent',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 700,
              color: i === 0 ? 'var(--amber)' : 'var(--muted)',
              minWidth: 14,
            }}>
              {i + 1}
            </span>
            <div>
              <Link href={`/players/${r.playerId}`} style={{ textDecoration: 'none' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  {r.playerName}
                </div>
              </Link>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                {r.teamName} · {r.gp} GP
              </div>
            </div>
          </div>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 20,
            fontWeight: 500,
            color: i === 0 ? category.color : i === 1 ? 'var(--teal)' : 'var(--muted)',
          }}>
            {category.fmt(r)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── PAGE ────────────────────────────────────────────────────────────────

export default async function LeaderboardsPage() {
  const data = await getLeaderboardData()

  if (!data) {
    return <main style={{ padding: 60, textAlign: 'center', color: 'var(--muted)' }}>No active session.</main>
  }

  const { session, rows } = data

  return (
    <main>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(180deg, #0f1620 0%, var(--dark) 100%)',
        borderBottom: '1px solid var(--border)',
        padding: '36px 24px 32px',
      }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(36px, 6vw, 60px)',
            letterSpacing: 3,
            lineHeight: 1,
            color: 'var(--text)',
          }}>
            Stat{' '}
            <span style={{
              background: 'linear-gradient(135deg, #1db954, #2a8f8f)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Leaderboards
            </span>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8, letterSpacing: '0.4px' }}>
            {session.name} · Per-game averages · {rows.length} players
          </p>
        </div>
      </div>

      {/* Grid */}
      <div style={{ maxWidth: 1060, margin: '0 auto', padding: '28px 24px 60px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 20,
        }}>
          {CATEGORIES.map((cat) => (
            <LeaderboardTable key={cat.key} rows={rows} category={cat} />
          ))}
        </div>
      </div>
    </main>
  )
}