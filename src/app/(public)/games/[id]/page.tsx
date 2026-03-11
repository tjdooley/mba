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

  // Split stats by teamId — works correctly for subs too
  const homeStats = game.gameStats.filter((s) => s.teamId === game.homeTeamId)
  const awayStats = game.gameStats.filter((s) => s.teamId === game.awayTeamId)

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
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── STAT TABLE ──────────────────────────────────────────────────────────

function StatTable({ stats, teamName, accentColor }: {
  stats: StatRow[]
  teamName: string
  accentColor: string
}) {
  const tot = totals(stats)

  const thStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, letterSpacing: '1px',
    color: 'var(--muted)', padding: '7px 8px', textAlign: 'right',
    borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
  }
  const cellStyle = (align: 'left' | 'right' = 'right'): React.CSSProperties => ({
    fontFamily: 'var(--font-mono)', fontSize: 13,
    color: 'var(--text)', padding: '10px 8px',
    textAlign: align, borderBottom: '1px solid rgba(42,53,72,0.4)',
  })

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: accentColor, display: 'inline-block', flexShrink: 0,
        }} />
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: 18,
          letterSpacing: 2, color: 'var(--text)',
        }}>
          {teamName}
        </span>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.3)' }}>
              <th style={{ ...thStyle, textAlign: 'left', paddingLeft: 16 }}>PLAYER</th>
              <th style={thStyle}>FG</th>
              <th style={thStyle}>3PT</th>
              <th style={thStyle}>FT</th>
              <th style={{ ...thStyle, color: 'var(--green)' }}>PTS</th>
              <th style={thStyle}>REB</th>
              <th style={thStyle}>AST</th>
              <th style={thStyle}>BLK</th>
              <th style={thStyle}>STL</th>
              <th style={{ ...thStyle, paddingRight: 16 }}>TO</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.id} className="stat-row">
                <td style={{ ...cellStyle('left'), paddingLeft: 16, fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                  <Link href={`/players/${s.player.id}`} style={{ color: 'var(--text)', textDecoration: 'none' }}>
                    {s.player.displayName}
                  </Link>
                </td>
                <td style={cellStyle()}>{s.fgMade}/{s.fgAttempted}</td>
                <td style={cellStyle()}>{s.threesMade}/{s.threesAttempted}</td>
                <td style={cellStyle()}>{s.ftMade}/{s.ftAttempted}</td>
                <td style={{ ...cellStyle(), color: 'var(--green)', fontWeight: 600 }}>{s.points}</td>
                <td style={cellStyle()}>{s.rebounds}</td>
                <td style={cellStyle()}>{s.assists}</td>
                <td style={cellStyle()}>{s.blocks}</td>
                <td style={cellStyle()}>{s.steals}</td>
                <td style={{ ...cellStyle(), paddingRight: 16, color: s.turnovers >= 4 ? 'var(--red)' : 'var(--text)' }}>{s.turnovers}</td>
              </tr>
            ))}

            {/* Totals row */}
            <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
              <td style={{ ...cellStyle('left'), fontFamily: 'var(--font-body)', fontWeight: 700, color: 'var(--muted)', fontSize: 11, letterSpacing: '1px', textTransform: 'uppercase', borderBottom: 'none', paddingLeft: 16 }}>
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
              <td style={{ ...cellStyle('right'), fontWeight: 700, borderBottom: 'none', paddingRight: 16 }}>{tot.turnovers}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── PAGE ────────────────────────────────────────────────────────────────

export default async function BoxScorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getBoxScore(id)
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
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20 }}>
              <Link href="/games" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Schedule</Link>
              <span style={{ margin: '0 6px' }}>›</span>
              <span>{game.homeTeam.captain.displayName} vs {game.awayTeam.captain.displayName}</span>
            </div>

            {/* Score display */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center', minWidth: 120 }}>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 'clamp(20px, 4vw, 32px)',
                  letterSpacing: 2, color: homeWon ? 'var(--text)' : 'var(--muted)',
                }}>
                  {game.homeTeam.captain.displayName}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 'clamp(48px, 8vw, 72px)',
                  fontWeight: 500, lineHeight: 1, color: homeWon ? 'var(--green)' : 'var(--text)',
                }}>
                  {game.homeScore}
                </div>
              </div>

              <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 2 }}>VS</div>
                {isFinal && (
                  <div style={{
                    marginTop: 4, fontSize: 10, fontWeight: 700, letterSpacing: '1.5px',
                    textTransform: 'uppercase', color: 'var(--green)',
                  }}>
                    Final
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'center', minWidth: 120 }}>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 'clamp(20px, 4vw, 32px)',
                  letterSpacing: 2, color: !homeWon ? 'var(--text)' : 'var(--muted)',
                }}>
                  {game.awayTeam.captain.displayName}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 'clamp(48px, 8vw, 72px)',
                  fontWeight: 500, lineHeight: 1, color: !homeWon ? 'var(--green)' : 'var(--text)',
                }}>
                  {game.awayScore}
                </div>
              </div>
            </div>

            {/* Meta */}
            <div style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)' }}>
              {game.session.name} · {weekLabel(game)}
              {game.court && <span> · {game.court}</span>}
              <span> · {formatDate(game.scheduledAt)}</span>
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