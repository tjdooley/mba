import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'

// ─── DATA ────────────────────────────────────────────────────────────────

async function getPlayerData(id: string) {
  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      careerStats: true,
      sessionStats: {
        include: { session: { select: { id: true, name: true, year: true, period: true } } },
        orderBy: { session: { startDate: 'desc' } },
      },
      teamRosters: {
        include: {
          team: {
            include: {
              session: { select: { id: true, name: true } },
              captain: { select: { displayName: true } },
            },
          },
        },
        orderBy: { team: { session: { startDate: 'desc' } } },
      },
    },
  })

  if (!player) return null
  return player
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

// ─── STAT CARD ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '14px 16px',
      textAlign: 'center',
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 28,
        fontWeight: 500,
        color: 'var(--green)',
        lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 6 }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{sub}</div>
      )}
    </div>
  )
}

// ─── PAGE ────────────────────────────────────────────────────────────────

export default async function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const player = await getPlayerData(id)
  if (!player) notFound()

  const cs = player.careerStats
  const currentRoster = player.teamRosters[0]
  const currentTeam   = currentRoster?.team

  // Find current session stats (most recent session)
  const currentSessionStat = player.sessionStats[0]
  const gp = currentSessionStat?.gamesPlayed ?? 0

  return (
    <main>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(180deg, #0f1620 0%, var(--dark) 100%)',
        borderBottom: '1px solid var(--border)',
        padding: '36px 24px 32px',
      }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          {/* Breadcrumb */}
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
            <Link href="/players" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Players</Link>
            <span style={{ margin: '0 6px' }}>›</span>
            <span>{player.displayName}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(36px, 6vw, 60px)',
                letterSpacing: 3,
                lineHeight: 1,
                color: 'var(--text)',
              }}>
                {player.displayName}
              </h1>
              {currentTeam && (
                <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>
                  {currentTeam.session.name} · Team{' '}
                  <span style={{ color: 'var(--green)', fontWeight: 600 }}>
                    {currentTeam.captain.displayName}
                  </span>
                  {currentRoster.isSub && (
                    <span style={{
                      marginLeft: 8,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                      background: 'rgba(245,166,35,0.12)',
                      color: 'var(--amber)',
                      border: '1px solid rgba(245,166,35,0.25)',
                      borderRadius: 4,
                      padding: '2px 6px',
                    }}>
                      Sub
                    </span>
                  )}
                </p>
              )}
            </div>

            {cs && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>
                  Career
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text)', letterSpacing: 2, lineHeight: 1 }}>
                  {cs.gamesPlayed} GP
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  {cs.sessionsPlayed} sessions
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px 60px' }}>

        {/* ── Current Session Stats ── */}
        {currentSessionStat && (
          <>
            <SectionTitle>{currentSessionStat.session.name} Stats</SectionTitle>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
              gap: 10,
              marginBottom: 28,
            }}>
              <StatCard label="PPG"  value={avg(currentSessionStat.points,    gp)} />
              <StatCard label="RPG"  value={avg(currentSessionStat.rebounds,  gp)} />
              <StatCard label="APG"  value={avg(currentSessionStat.assists,   gp)} />
              <StatCard label="BPG"  value={avg(currentSessionStat.blocks,    gp)} />
              <StatCard label="SPG"  value={avg(currentSessionStat.steals,    gp)} />
              <StatCard label="TOV"  value={avg(currentSessionStat.turnovers, gp)} />
              <StatCard label="FG%"  value={pct(currentSessionStat.fgMade,    currentSessionStat.fgAttempted)} />
              <StatCard label="3P%"  value={pct(currentSessionStat.threesMade, currentSessionStat.threesAttempted)} />
              <StatCard label="FT%"  value={pct(currentSessionStat.ftMade,    currentSessionStat.ftAttempted)} />
              <StatCard label="GP"   value={String(gp)} />
            </div>
          </>
        )}

        {/* ── Career Totals ── */}
        {cs && (
          <>
            <SectionTitle>Career Totals</SectionTitle>
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              overflow: 'hidden',
              marginBottom: 28,
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 540 }}>
                  <thead>
                    <tr>
                      {['GP', 'Sessions', 'PTS', 'REB', 'AST', 'BLK', 'STL', 'TO', 'FG%', '3P%', 'FT%'].map((h, i) => (
                        <th key={h} style={{
                          padding: '8px 12px',
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: '1px',
                          textTransform: 'uppercase',
                          color: 'var(--muted)',
                          textAlign: 'right',
                          borderBottom: '1px solid var(--border)',
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {[
                        cs.gamesPlayed,
                        cs.sessionsPlayed,
                        cs.points,
                        cs.rebounds,
                        cs.assists,
                        cs.blocks,
                        cs.steals,
                        cs.turnovers,
                        pct(cs.fgMade, cs.fgAttempted),
                        pct(cs.threesMade, cs.threesAttempted),
                        pct(cs.ftMade, cs.ftAttempted),
                      ].map((v, i) => (
                        <td key={i} style={{
                          padding: '10px 12px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 13,
                          textAlign: 'right',
                          color: i === 2 ? 'var(--green)' : 'var(--text)',
                          fontWeight: i === 2 ? 700 : 400,
                        }}>
                          {v}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── Season-by-Season History ── */}
        {player.sessionStats.length > 0 && (
          <>
            <SectionTitle>Season History</SectionTitle>
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              overflow: 'hidden',
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                  <thead>
                    <tr>
                      {['Season', 'Team', 'GP', 'PPG', 'RPG', 'APG', 'FG%', '3P%', 'FT%'].map((h, i) => (
                        <th key={h} style={{
                          padding: '8px 12px',
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: '1px',
                          textTransform: 'uppercase',
                          color: 'var(--muted)',
                          textAlign: i <= 1 ? 'left' : 'right',
                          borderBottom: '1px solid var(--border)',
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {player.sessionStats.map((ss, i) => {
                      const sgp = ss.gamesPlayed
                      // Find team for this session
                      const roster = player.teamRosters.find(
                        (r) => r.team.session.id === ss.session.id
                      )
                      const teamName = roster?.team.captain.displayName ?? '—'
                      const notLast  = i < player.sessionStats.length - 1

                      return (
                        <tr key={ss.id} className="history-row">
                          <td style={{
                            padding: '10px 12px',
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--text)',
                            borderBottom: notLast ? '1px solid rgba(42,53,72,0.4)' : 'none',
                          }}>
                            <Link
                              href={`/`}
                              style={{ color: 'var(--text)', textDecoration: 'none' }}
                            >
                              {ss.session.name}
                            </Link>
                          </td>
                          <td style={{
                            padding: '10px 12px',
                            fontSize: 13,
                            color: 'var(--muted)',
                            borderBottom: notLast ? '1px solid rgba(42,53,72,0.4)' : 'none',
                          }}>
                            {teamName}
                          </td>
                          {[
                            sgp,
                            avg(ss.points,    sgp),
                            avg(ss.rebounds,  sgp),
                            avg(ss.assists,   sgp),
                            pct(ss.fgMade,    ss.fgAttempted),
                            pct(ss.threesMade, ss.threesAttempted),
                            pct(ss.ftMade,    ss.ftAttempted),
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
            </div>
          </>
        )}
      </div>

      <style>{`.history-row:hover { background: rgba(255,255,255,0.02); }`}</style>
    </main>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 2, color: 'var(--text)' }}>
        {children}
      </span>
      <span style={{ flex: 1, height: 1, background: 'var(--border)', display: 'block' }} />
    </div>
  )
}