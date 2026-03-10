import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'

// ─── DATA ────────────────────────────────────────────────────────────────

async function getBoxScore(id: string) {
  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      session:  { select: { id: true, name: true } },
      homeTeam: { include: { captain: { select: { displayName: true } } } },
      awayTeam: { include: { captain: { select: { displayName: true } } } },
      gameStats: {
        include: { player: { select: { id: true, displayName: true } } },
        orderBy: { points: 'desc' },
      },
    },
  })

  if (!game) return null

  // Split stats by team via TeamRoster lookup
  const homeRoster = await prisma.teamRoster.findMany({
    where: { teamId: game.homeTeamId },
    select: { playerId: true },
  })
  const awayRoster = await prisma.teamRoster.findMany({
    where: { teamId: game.awayTeamId },
    select: { playerId: true },
  })

  const homePlayerIds = new Set(homeRoster.map((r) => r.playerId))
  const awayPlayerIds = new Set(awayRoster.map((r) => r.playerId))

  const homeStats = game.gameStats.filter((s) => homePlayerIds.has(s.playerId))
  const awayStats = game.gameStats.filter((s) => awayPlayerIds.has(s.playerId))

  return { game, homeStats, awayStats }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────

type StatRow = NonNullable<Awaited<ReturnType<typeof getBoxScore>>>['homeStats'][number]

function pct(made: number, att: number) {
  if (att === 0) return '—'
  return `${Math.round((made / att) * 100)}%`
}

function totals(stats: StatRow[]) {
  return stats.reduce(
    (acc, s) => ({
      fgMade:          acc.fgMade          + s.fgMade,
      fgAttempted:     acc.fgAttempted     + s.fgAttempted,
      threesMade:      acc.threesMade      + s.threesMade,
      threesAttempted: acc.threesAttempted + s.threesAttempted,
      ftMade:          acc.ftMade          + s.ftMade,
      ftAttempted:     acc.ftAttempted     + s.ftAttempted,
      points:          acc.points          + s.points,
      rebounds:        acc.rebounds        + s.rebounds,
      assists:         acc.assists         + s.assists,
      blocks:          acc.blocks          + s.blocks,
      steals:          acc.steals          + s.steals,
      turnovers:       acc.turnovers       + s.turnovers,
    }),
    { fgMade: 0, fgAttempted: 0, threesMade: 0, threesAttempted: 0,
      ftMade: 0, ftAttempted: 0, points: 0, rebounds: 0, assists: 0,
      blocks: 0, steals: 0, turnovers: 0 }
  )
}

function weekLabel(game: { week: number | null; isPlayoff: boolean; playoffRound: number | null }) {
  if (game.isPlayoff) {
    const rounds: Record<number, string> = { 1: 'Wild Card', 2: 'Semifinals', 3: 'Championship' }
    return rounds[game.playoffRound ?? 1] ?? 'Playoffs'
  }
  return game.week ? `Week ${game.week}` : '—'
}

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

// ─── STAT TABLE ──────────────────────────────────────────────────────────

const COLS = [
  { key: 'player',          label: 'PLAYER',  align: 'left'  },
  { key: 'fg',              label: 'FG',      align: 'right' },
  { key: 'three',           label: '3PT',     align: 'right' },
  { key: 'ft',              label: 'FT',      align: 'right' },
  { key: 'points',          label: 'PTS',     align: 'right' },
  { key: 'rebounds',        label: 'REB',     align: 'right' },
  { key: 'assists',         label: 'AST',     align: 'right' },
  { key: 'blocks',          label: 'BLK',     align: 'right' },
  { key: 'steals',          label: 'STL',     align: 'right' },
  { key: 'turnovers',       label: 'TO',      align: 'right' },
]

function StatTable({
  stats,
  teamName,
  accentColor,
}: {
  stats: StatRow[]
  teamName: string
  accentColor: string
}) {
  const tot = totals(stats)

  const cellStyle = (align: string, bold = false, color?: string): React.CSSProperties => ({
    padding: '9px 10px',
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    textAlign: align as 'left' | 'right',
    color: color ?? (bold ? 'var(--text)' : 'var(--text)'),
    fontWeight: bold ? 700 : 400,
    borderBottom: '1px solid rgba(42,53,72,0.4)',
    whiteSpace: 'nowrap',
  })

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
      marginBottom: 20,
    }}>
      {/* Team header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '1.5px',
        textTransform: 'uppercase',
      }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: accentColor, display: 'inline-block' }} />
        <span style={{ color: accentColor }}>{teamName}</span>
      </div>

      {/* Scrollable table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 580 }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
              {COLS.map((c) => (
                <th key={c.key} style={{
                  padding: '7px 10px',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  textAlign: c.align as 'left' | 'right',
                  borderBottom: '1px solid var(--border)',
                  whiteSpace: 'nowrap',
                }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.id} style={{ transition: 'background 0.1s' }} className="stat-row">
                <td style={{ ...cellStyle('left'), fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                  <Link href={`/players/${s.playerId}`} style={{ color: 'var(--text)', textDecoration: 'none' }}>
                    {s.player.displayName}
                  </Link>
                </td>
                <td style={cellStyle('right')}>{s.fgMade}/{s.fgAttempted}</td>
                <td style={cellStyle('right')}>{s.threesMade}/{s.threesAttempted}</td>
                <td style={cellStyle('right')}>{s.ftMade}/{s.ftAttempted}</td>
                <td style={{ ...cellStyle('right'), color: 'var(--green)', fontWeight: 700 }}>{s.points}</td>
                <td style={cellStyle('right')}>{s.rebounds}</td>
                <td style={cellStyle('right')}>{s.assists}</td>
                <td style={cellStyle('right')}>{s.blocks}</td>
                <td style={cellStyle('right')}>{s.steals}</td>
                <td style={{ ...cellStyle('right'), color: s.turnovers >= 4 ? 'var(--red)' : 'var(--text)' }}>{s.turnovers}</td>
              </tr>
            ))}

            {/* Totals row */}
            <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
              <td style={{ ...cellStyle('left'), fontFamily: 'var(--font-body)', fontWeight: 700, color: 'var(--muted)', fontSize: 11, letterSpacing: '1px', textTransform: 'uppercase', borderBottom: 'none' }}>
                Team
              </td>
              <td style={{ ...cellStyle('right'), fontWeight: 700, borderBottom: 'none' }}>{tot.fgMade}/{tot.fgAttempted}</td>
              <td style={{ ...cellStyle('right'), fontWeight: 700, borderBottom: 'none' }}>{tot.threesMade}/{tot.threesAttempted}</td>
              <td style={{ ...cellStyle('right'), fontWeight: 700, borderBottom: 'none' }}>{tot.ftMade}/{tot.ftAttempted}</td>
              <td style={{ ...cellStyle('right'), color: 'var(--green)', fontWeight: 700, borderBottom: 'none' }}>{tot.points}</td>
              <td style={{ ...cellStyle('right'), fontWeight: 700, borderBottom: 'none' }}>{tot.rebounds}</td>
              <td style={{ ...cellStyle('right'), fontWeight: 700, borderBottom: 'none' }}>{tot.assists}</td>
              <td style={{ ...cellStyle('right'), fontWeight: 700, borderBottom: 'none' }}>{tot.blocks}</td>
              <td style={{ ...cellStyle('right'), fontWeight: 700, borderBottom: 'none' }}>{tot.steals}</td>
              <td style={{ ...cellStyle('right'), fontWeight: 700, borderBottom: 'none' }}>{tot.turnovers}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── PAGE ────────────────────────────────────────────────────────────────

export default async function BoxScorePage({ params }: { params: { id: string } }) {
  const data = await getBoxScore(params.id)
  if (!data) notFound()

  const { game, homeStats, awayStats } = data
  const isFinal    = game.status === 'FINAL'
  const homeWon    = game.homeScore > game.awayScore
  const hasStats   = homeStats.length > 0 || awayStats.length > 0

  return (
    <>
      <style>{`.stat-row:hover { background: rgba(255,255,255,0.02); }`}</style>
      <main>
        {/* Hero / scoreboard */}
        <div style={{
          background: 'linear-gradient(180deg, #0f1620 0%, var(--dark) 100%)',
          borderBottom: '1px solid var(--border)',
          padding: '36px 24px 32px',
        }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            {/* Breadcrumb */}
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
              <Link href="/games" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Schedule</Link>
              <span style={{ margin: '0 6px' }}>›</span>
              <span>{game.session.name} · {weekLabel(game)}</span>
            </div>

            {/* Score */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center',
              gap: 16,
            }}>
              {/* Home */}
              <div>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  marginBottom: 6,
                }}>
                  Home
                </div>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(28px, 5vw, 48px)',
                  letterSpacing: 2,
                  lineHeight: 1,
                  color: isFinal && homeWon ? 'var(--green)' : 'var(--text)',
                }}>
                  {game.homeTeam.captain.displayName}
                </div>
              </div>

              {/* Score center */}
              <div style={{ textAlign: 'center' }}>
                {isFinal ? (
                  <>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'clamp(32px, 6vw, 56px)',
                      letterSpacing: 4,
                      lineHeight: 1,
                    }}>
                      <span style={{ color: homeWon ? 'var(--green)' : 'var(--muted)' }}>{game.homeScore}</span>
                      <span style={{ color: 'var(--border)', margin: '0 8px', fontSize: '0.6em' }}>–</span>
                      <span style={{ color: !homeWon ? 'var(--green)' : 'var(--muted)' }}>{game.awayScore}</span>
                    </div>
                    <div style={{
                      marginTop: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '1.5px',
                      textTransform: 'uppercase',
                      color: 'var(--green)',
                      background: 'rgba(29,185,84,0.1)',
                      border: '1px solid rgba(29,185,84,0.2)',
                      borderRadius: 4,
                      padding: '2px 8px',
                      display: 'inline-block',
                    }}>
                      Final
                    </div>
                  </>
                ) : (
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 28,
                    letterSpacing: 3,
                    color: 'var(--muted)',
                  }}>
                    VS
                  </div>
                )}
              </div>

              {/* Away */}
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  marginBottom: 6,
                }}>
                  Away
                </div>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(28px, 5vw, 48px)',
                  letterSpacing: 2,
                  lineHeight: 1,
                  color: isFinal && !homeWon ? 'var(--green)' : 'var(--text)',
                }}>
                  {game.awayTeam.captain.displayName}
                </div>
              </div>
            </div>

            {/* Meta */}
            <div style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)' }}>
              {formatDate(game.scheduledAt)}
              {game.court && <span> · {game.court}</span>}
            </div>
          </div>
        </div>

        {/* Box score tables */}
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px 60px' }}>
          {!hasStats ? (
            <div style={{
              padding: '40px 0',
              textAlign: 'center',
              color: 'var(--muted)',
              fontSize: 14,
            }}>
              {isFinal ? 'No stats recorded for this game.' : 'Stats will appear here once the game is complete.'}
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 2, color: 'var(--text)' }}>
                  Box Score
                </span>
                <span style={{ flex: 1, height: 1, background: 'var(--border)', display: 'block' }} />
              </div>
              {homeStats.length > 0 && (
                <StatTable
                  stats={homeStats}
                  teamName={game.homeTeam.captain.displayName}
                  accentColor="var(--green)"
                />
              )}
              {awayStats.length > 0 && (
                <StatTable
                  stats={awayStats}
                  teamName={game.awayTeam.captain.displayName}
                  accentColor="var(--teal)"
                />
              )}
            </>
          )}
        </div>
      </main>
    </>
  )
}