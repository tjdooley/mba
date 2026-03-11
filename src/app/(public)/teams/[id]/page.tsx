import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { GameStatus } from '@/generated/prisma/client'

// ─── DATA ────────────────────────────────────────────────────────────────

async function getTeamData(id: string) {
  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      session: { select: { id: true, name: true, period: true, year: true, isActive: true } },
      captain: { select: { id: true, displayName: true } },
      roster: {
        include: {
          player: {
            include: {
              sessionStats: {
                where: { sessionId: { not: undefined } },
                include: { session: { select: { id: true } } },
              },
            },
          },
        },
        orderBy: { isSub: 'asc' },
      },
      homeGames: {
        include: {
          awayTeam: { include: { captain: { select: { displayName: true } } } },
          gameStats: {
            include: { player: { select: { displayName: true } } },
          },
        },
        orderBy: { scheduledAt: 'asc' },
      },
      awayGames: {
        include: {
          homeTeam: { include: { captain: { select: { displayName: true } } } },
          gameStats: {
            include: { player: { select: { displayName: true } } },
          },
        },
        orderBy: { scheduledAt: 'asc' },
      },
    },
  })

  if (!team) return null

  // Pull session stats for this session for each roster player
  const sessionStats = await prisma.sessionStat.findMany({
    where: {
      sessionId: team.sessionId,
      playerId: { in: team.roster.map((r) => r.playerId) },
    },
    include: { player: { select: { displayName: true } } },
  })

  return { team, sessionStats }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────

function pct(made: number, att: number) {
  if (att === 0) return '—'
  return `${Math.round((made / att) * 100)}%`
}

function avg(val: number, gp: number) {
  if (gp === 0) return '—'
  return (val / gp).toFixed(1)
}

function fmt(d: Date) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── PAGE ─────────────────────────────────────────────────────────────────

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getTeamData(id)
  if (!data) notFound()

  const { team, sessionStats } = data
  const diff = team.pointDifferential
  const diffStr = diff > 0 ? `+${diff}` : `${diff}`
  const diffColor = diff > 0 ? 'var(--green)' : diff < 0 ? 'var(--red)' : 'var(--muted)'

  // Merge and sort all games
  const allGames = [
    ...team.homeGames.map((g) => ({
      ...g,
      isHome: true,
      opponent: g.awayTeam.captain.displayName,
      teamScore: g.homeScore,
      oppScore: g.awayScore,
    })),
    ...team.awayGames.map((g) => ({
      ...g,
      isHome: false,
      opponent: g.homeTeam.captain.displayName,
      teamScore: g.awayScore,
      oppScore: g.homeScore,
    })),
  ].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())

  const finalGames   = allGames.filter((g) => g.status === GameStatus.FINAL)
  const upcomingGames = allGames.filter((g) => g.status !== GameStatus.FINAL)

  const rostered = team.roster.filter((r) => !r.isSub)
  const subs     = team.roster.filter((r) => r.isSub)

  const divisionLabel = team.division === 'FREEHOUSE' ? 'FreeHouse Division' : "Delaney's Division"

  return (
    <main>
      <style>{`
        .player-row:hover { background: rgba(255,255,255,0.025) !important; }
        .game-row:hover { background: rgba(255,255,255,0.025) !important; }
      `}</style>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(180deg, #0f1620 0%, var(--dark) 100%)',
        borderBottom: '1px solid var(--border)',
        padding: '36px 24px 32px',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 16, fontSize: 12, color: 'var(--muted)' }}>
            <Link href="/teams" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Teams</Link>
            <span>/</span>
            <span style={{ color: 'var(--text)' }}>{team.captain.displayName}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div>
              {/* Season badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: team.session.isActive ? 'rgba(29,185,84,0.12)' : 'rgba(107,124,147,0.1)',
                border: `1px solid ${team.session.isActive ? 'rgba(29,185,84,0.25)' : 'var(--border)'}`,
                borderRadius: 20, padding: '3px 10px', marginBottom: 10,
              }}>
                {team.session.isActive && (
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
                )}
                <span style={{ fontSize: 11, fontWeight: 600, color: team.session.isActive ? 'var(--green)' : 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase' }}>
                  {team.session.name}
                </span>
              </div>

              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(40px, 6vw, 68px)',
                letterSpacing: 3,
                lineHeight: 1,
                color: 'var(--text)',
              }}>
                {team.captain.displayName}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, letterSpacing: '0.4px' }}>
                {divisionLabel} · Captain:{' '}
                <Link href={`/players/${team.captain.id}`} style={{ color: 'var(--green)', textDecoration: 'none' }}>
                  {team.captain.displayName}
                </Link>
              </p>
            </div>

            {/* Record box */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '16px 24px',
              display: 'flex',
              gap: 28,
              alignItems: 'center',
            }}>
              <RecordStat label="Record" value={`${team.wins}–${team.losses}`} color="var(--text)" />
              <RecordStat label="Div" value={`${team.divisionWins}–${team.divisionLosses}`} color="var(--muted)" />
              <RecordStat label="Diff" value={diffStr} color={diffColor} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px 60px' }}>

        {/* ── Roster Stats Table ── */}
        <SectionTitle>Roster</SectionTitle>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 32 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 540 }}>
              <thead>
                <tr>
                  {['Player', 'GP', 'PPG', 'RPG', 'APG', 'FG%', '3P%'].map((h, i) => (
                    <th key={h} style={{
                      padding: '8px 12px', fontSize: 10, fontWeight: 600, letterSpacing: '1px',
                      textTransform: 'uppercase', color: 'var(--muted)',
                      textAlign: i === 0 ? 'left' : 'right',
                      borderBottom: '1px solid var(--border)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rostered.map((r, i) => {
                  const ss = sessionStats.find((s) => s.playerId === r.playerId)
                  const gp = ss?.gamesPlayed ?? 0
                  const notLast = i < rostered.length - 1
                  return (
                    <tr key={r.player.id} className="player-row" style={{ transition: 'background 0.12s' }}>
                      <td style={{ padding: '10px 12px', borderBottom: notLast ? '1px solid rgba(42,53,72,0.4)' : 'none' }}>
                        <Link href={`/players/${r.player.id}`} style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
                          {r.player.displayName}
                        </Link>
                      </td>
                      {[
                        gp,
                        avg(ss?.points ?? 0, gp),
                        avg(ss?.rebounds ?? 0, gp),
                        avg(ss?.assists ?? 0, gp),
                        pct(ss?.fgMade ?? 0, ss?.fgAttempted ?? 0),
                        pct(ss?.threesMade ?? 0, ss?.threesAttempted ?? 0),
                      ].map((v, j) => (
                        <td key={j} style={{
                          padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 13,
                          textAlign: 'right', color: j === 1 ? 'var(--green)' : 'var(--text)',
                          fontWeight: j === 1 ? 700 : 400,
                          borderBottom: notLast ? '1px solid rgba(42,53,72,0.4)' : 'none',
                        }}>
                          {v}
                        </td>
                      ))}
                    </tr>
                  )
                })}
                {subs.length > 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '6px 12px', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--muted)', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--border)' }}>
                      Subs
                    </td>
                  </tr>
                )}
                {subs.map((r, i) => {
                  const ss = sessionStats.find((s) => s.playerId === r.playerId)
                  const gp = ss?.gamesPlayed ?? 0
                  const notLast = i < subs.length - 1
                  return (
                    <tr key={r.player.id} className="player-row" style={{ transition: 'background 0.12s', opacity: 0.75 }}>
                      <td style={{ padding: '9px 12px', borderBottom: notLast ? '1px solid rgba(42,53,72,0.4)' : 'none' }}>
                        <Link href={`/players/${r.player.id}`} style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: 13 }}>
                          {r.player.displayName}
                        </Link>
                        <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--muted)', opacity: 0.6 }}>sub</span>
                      </td>
                      {[
                        gp,
                        avg(ss?.points ?? 0, gp),
                        avg(ss?.rebounds ?? 0, gp),
                        avg(ss?.assists ?? 0, gp),
                        pct(ss?.fgMade ?? 0, ss?.fgAttempted ?? 0),
                        pct(ss?.threesMade ?? 0, ss?.threesAttempted ?? 0),
                      ].map((v, j) => (
                        <td key={j} style={{
                          padding: '9px 12px', fontFamily: 'var(--font-mono)', fontSize: 12,
                          textAlign: 'right', color: 'var(--muted)',
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

        {/* ── Game Log ── */}
        {finalGames.length > 0 && (
          <>
            <SectionTitle>Results</SectionTitle>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 32 }}>
              {finalGames.map((g, i) => {
                const won = g.teamScore > g.oppScore
                const notLast = i < finalGames.length - 1
                return (
                  <div key={g.id} className="game-row" style={{
                    display: 'flex', alignItems: 'center', padding: '12px 16px',
                    borderBottom: notLast ? '1px solid rgba(42,53,72,0.4)' : 'none',
                    gap: 12, transition: 'background 0.12s',
                  }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '1px',
                      color: won ? 'var(--green)' : 'var(--red)',
                      background: won ? 'rgba(29,185,84,0.1)' : 'rgba(232,64,64,0.1)',
                      border: `1px solid ${won ? 'rgba(29,185,84,0.2)' : 'rgba(232,64,64,0.2)'}`,
                      borderRadius: 4, padding: '2px 6px', minWidth: 22, textAlign: 'center',
                    }}>
                      {won ? 'W' : 'L'}
                    </span>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                      {g.isHome ? 'vs' : '@'} {g.opponent}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600,
                      color: won ? 'var(--green)' : 'var(--text)',
                    }}>
                      {g.teamScore}–{g.oppScore}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 56, textAlign: 'right' }}>
                      {g.isPlayoff ? '🏆 PO' : `Wk ${g.week}`}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 70, textAlign: 'right' }}>
                      {fmt(g.scheduledAt)}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ── Upcoming ── */}
        {upcomingGames.length > 0 && (
          <>
            <SectionTitle>Upcoming</SectionTitle>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 32 }}>
              {upcomingGames.map((g, i) => {
                const notLast = i < upcomingGames.length - 1
                return (
                  <div key={g.id} style={{
                    display: 'flex', alignItems: 'center', padding: '12px 16px',
                    borderBottom: notLast ? '1px solid rgba(42,53,72,0.4)' : 'none',
                    gap: 12,
                  }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '1px',
                      color: 'var(--muted)', background: 'rgba(107,124,147,0.1)',
                      border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px',
                    }}>
                      TBD
                    </span>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>
                      {g.isHome ? 'vs' : '@'} {g.opponent}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 56, textAlign: 'right' }}>
                      Wk {g.week}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 70, textAlign: 'right' }}>
                      {fmt(g.scheduledAt)}
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

// ─── SHARED COMPONENTS ───────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 2, color: 'var(--text)' }}>
        {children}
      </span>
      <span style={{ flex: 1, height: 1, background: 'var(--border)', display: 'block' }} />
    </div>
  )
}

function RecordStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, color, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  )
}