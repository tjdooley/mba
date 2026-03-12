import { prisma } from '@/lib/prisma'
import { Division, GameStatus } from '@/generated/prisma/client'
import { notFound } from 'next/navigation'
import Link from 'next/link'

// ─── DATA ────────────────────────────────────────────────────────────────

async function getTeamData(id: string) {
  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      session: { select: { id: true, name: true, period: true, year: true } },
      captain: { select: { id: true, displayName: true } },
      roster: {
        include: {
          player: { select: { id: true, displayName: true } },
        },
        orderBy: { player: { lastName: 'asc' } },
      },
    },
  })

  if (!team) return null

  // Fetch all games for this team (home or away)
  const games = await prisma.game.findMany({
    where: {
      sessionId: team.sessionId,
      OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
    },
    orderBy: { scheduledAt: 'asc' },
    include: {
      homeTeam: { include: { captain: { select: { displayName: true } } } },
      awayTeam: { include: { captain: { select: { displayName: true } } } },
    },
  })

  // Session stats for rostered players
  const playerIds = team.roster.map((r) => r.playerId)
  const sessionStats = await prisma.sessionStat.findMany({
    where: {
      sessionId: team.sessionId,
      playerId: { in: playerIds },
    },
    include: {
      player: { select: { id: true, displayName: true } },
    },
    orderBy: { points: 'desc' },
  })

  return { team, games, sessionStats }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────

function avg(val: number, gp: number, decimals = 1) {
  if (gp === 0) return '—'
  return (val / gp).toFixed(decimals)
}

function pct(made: number, att: number) {
  if (att === 0) return '—'
  return `${Math.round((made / att) * 100)}%`
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
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

// ─── PAGE ────────────────────────────────────────────────────────────────

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getTeamData(id)
  if (!data) notFound()

  const { team, games, sessionStats } = data
  const isFreehouse = team.division === Division.FREEHOUSE
  const divLabel = isFreehouse ? 'FreeHouse' : "Delaney's"
  const divAccent = isFreehouse ? 'var(--green)' : 'var(--teal)'

  const completedGames = games.filter((g) => g.status === GameStatus.FINAL)
  const upcomingGames = games.filter((g) => g.status === GameStatus.SCHEDULED)

  return (
    <main>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(180deg, #0f1620 0%, var(--dark) 100%)',
        borderBottom: '1px solid var(--border)',
        padding: '36px 24px 32px',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {/* Breadcrumb */}
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
            <Link href="/" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Standings</Link>
            <span style={{ margin: '0 6px' }}>›</span>
            <span>Team {team.captain.displayName}</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 20,
            flexWrap: 'wrap',
          }}>
            <div>
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(36px, 6vw, 60px)',
                letterSpacing: 3,
                lineHeight: 1,
                color: 'var(--text)',
              }}>
                Team{' '}
                <span style={{
                  background: 'linear-gradient(135deg, #1db954, #2a8f8f)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  {team.captain.displayName}
                </span>
              </h1>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8, letterSpacing: '0.4px' }}>
                {team.session.name} · {divLabel} Division
              </p>
            </div>

            {/* Record badge */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '12px 20px',
              textAlign: 'center',
            }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 32,
                fontWeight: 500,
                lineHeight: 1,
                letterSpacing: 2,
              }}>
                <span style={{ color: 'var(--green)' }}>{team.wins}</span>
                <span style={{ color: 'var(--border)', margin: '0 4px' }}>–</span>
                <span style={{ color: 'var(--red)' }}>{team.losses}</span>
              </div>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                marginTop: 6,
              }}>
                Div: {team.divisionWins}–{team.divisionLosses} · Diff:{' '}
                <span style={{ color: team.pointDifferential >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {team.pointDifferential > 0 ? '+' : ''}{team.pointDifferential}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px 60px' }}>

        {/* ── ROSTER ──────────────────────────────────────────────── */}
        <SectionHeader label="Roster" />

        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          overflow: 'hidden',
          marginBottom: 28,
        }}>
          {team.roster.map((r, i) => {
            const isCaptain = r.playerId === team.captainId
            const notLast = i < team.roster.length - 1
            return (
              <Link
                key={r.id}
                href={`/players/${r.playerId}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 16px',
                  borderBottom: notLast ? '1px solid rgba(42,53,72,0.5)' : 'none',
                  textDecoration: 'none',
                  transition: 'background 0.15s',
                }}
              >
                <span style={{
                  fontWeight: 600,
                  fontSize: 14,
                  color: isCaptain ? 'var(--green)' : 'var(--text)',
                }}>
                  {r.player.displayName}
                </span>
                {isCaptain && (
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    color: 'var(--green)',
                    background: 'rgba(29,185,84,0.12)',
                    border: '1px solid rgba(29,185,84,0.25)',
                    padding: '2px 6px',
                    borderRadius: 10,
                  }}>
                    Captain
                  </span>
                )}
                {r.isSub && (
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    color: 'var(--amber)',
                    background: 'rgba(245,166,35,0.12)',
                    border: '1px solid rgba(245,166,35,0.25)',
                    padding: '2px 6px',
                    borderRadius: 10,
                  }}>
                    Sub
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        {/* ── PLAYER STATS ────────────────────────────────────────── */}
        {sessionStats.length > 0 && (
          <>
            <SectionHeader label="Player Stats" />

            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              overflow: 'hidden',
              marginBottom: 28,
              overflowX: 'auto',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                <thead>
                  <tr>
                    {['PLAYER', 'GP', 'PPG', 'RPG', 'APG', 'FG%', '3P%', 'FT%'].map((h, i) => (
                      <th key={h} style={{
                        padding: '10px 12px',
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: '1px',
                        color: 'var(--muted)',
                        textAlign: i === 0 ? 'left' : 'right',
                        borderBottom: '1px solid var(--border)',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessionStats.map((s, i) => {
                    const gp = s.gamesPlayed
                    const notLast = i < sessionStats.length - 1
                    return (
                      <tr key={s.id}>
                        <td style={{
                          padding: '10px 12px',
                          fontSize: 13,
                          fontWeight: 600,
                          borderBottom: notLast ? '1px solid rgba(42,53,72,0.4)' : 'none',
                        }}>
                          <Link
                            href={`/players/${s.playerId}`}
                            style={{ color: 'var(--text)', textDecoration: 'none' }}
                          >
                            {s.player.displayName}
                          </Link>
                        </td>
                        {[
                          gp.toString(),
                          avg(s.points, gp),
                          avg(s.rebounds, gp),
                          avg(s.assists, gp),
                          pct(s.fgMade, s.fgAttempted),
                          pct(s.threesMade, s.threesAttempted),
                          pct(s.ftMade, s.ftAttempted),
                        ].map((v, j) => (
                          <td key={j} style={{
                            padding: '10px 12px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: 13,
                            textAlign: 'right',
                            color: j === 1 ? 'var(--green)' : 'var(--text)',
                            fontWeight: j === 1 ? 700 : 400,
                            borderBottom: notLast ? '1px solid rgba(42,53,72,0.4)' : 'none',
                          }}>
                            {v}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── RESULTS ─────────────────────────────────────────────── */}
        {completedGames.length > 0 && (
          <>
            <SectionHeader label="Results" />

            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              overflow: 'hidden',
              marginBottom: 28,
            }}>
              {completedGames.map((g, i) => {
                const isHome = g.homeTeamId === team.id
                const teamScore = isHome ? g.homeScore : g.awayScore
                const oppScore = isHome ? g.awayScore : g.homeScore
                const oppName = isHome
                  ? g.awayTeam.captain.displayName
                  : g.homeTeam.captain.displayName
                const won = teamScore > oppScore
                const notLast = i < completedGames.length - 1

                return (
                  <Link
                    key={g.id}
                    href={`/games/${g.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderBottom: notLast ? '1px solid rgba(42,53,72,0.5)' : 'none',
                      textDecoration: 'none',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        color: 'var(--muted)',
                        minWidth: 52,
                      }}>
                        {weekLabel(g)}
                      </span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.5px',
                        color: won ? 'var(--green)' : 'var(--red)',
                        minWidth: 14,
                      }}>
                        {won ? 'W' : 'L'}
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                        {isHome ? 'vs' : '@'}{' '}
                        <span style={{ color: 'var(--text)', fontWeight: 500 }}>{oppName}</span>
                      </span>
                    </div>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                      fontWeight: 600,
                      color: won ? 'var(--green)' : 'var(--text)',
                    }}>
                      {teamScore}–{oppScore}
                    </span>
                  </Link>
                )
              })}
            </div>
          </>
        )}

        {/* ── UPCOMING ────────────────────────────────────────────── */}
        {upcomingGames.length > 0 && (
          <>
            <SectionHeader label="Upcoming" />

            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              overflow: 'hidden',
              marginBottom: 28,
            }}>
              {upcomingGames.map((g, i) => {
                const isHome = g.homeTeamId === team.id
                const oppName = isHome
                  ? g.awayTeam.captain.displayName
                  : g.homeTeam.captain.displayName
                const notLast = i < upcomingGames.length - 1

                return (
                  <div
                    key={g.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderBottom: notLast ? '1px solid rgba(42,53,72,0.5)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        color: 'var(--muted)',
                        minWidth: 52,
                      }}>
                        {weekLabel(g)}
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                        {isHome ? 'vs' : '@'}{' '}
                        <span style={{ color: 'var(--text)', fontWeight: 500 }}>{oppName}</span>
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {formatDate(g.scheduledAt)}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </main>
  )
}

// ─── SECTION HEADER ──────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    }}>
      <span style={{
        fontFamily: 'var(--font-display)',
        fontSize: 20,
        letterSpacing: 2,
        color: 'var(--text)',
      }}>
        {label}
      </span>
      <span style={{ flex: 1, height: 1, background: 'var(--border)', display: 'block' }} />
    </div>
  )
}