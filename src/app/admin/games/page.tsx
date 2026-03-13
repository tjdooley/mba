import { prisma } from '@/lib/prisma'
import { GameStatus } from '@/generated/prisma/client'
import Link from 'next/link'

async function getGamesData() {
  const session = await prisma.session.findFirst({
    where: { isActive: true },
    orderBy: { startDate: 'desc' },
  })
  if (!session) return null

  const games = await prisma.game.findMany({
    where: { sessionId: session.id },
    orderBy: { scheduledAt: 'asc' },
    include: {
      homeTeam: { include: { captain: { select: { displayName: true } } } },
      awayTeam: { include: { captain: { select: { displayName: true } } } },
      _count: { select: { gameStats: true } },
    },
  })

  return { session, games }
}

export default async function AdminGamesPage() {
  const data = await getGamesData()

  if (!data) {
    return <main style={{ padding: 60, textAlign: 'center', color: 'var(--muted)' }}>No active session.</main>
  }

  const { session, games } = data

  const needsStats = games.filter((g) => g.status === GameStatus.FINAL && g._count.gameStats === 0)
  const hasStats   = games.filter((g) => g.status === GameStatus.FINAL && g._count.gameStats > 0)
  const scheduled  = games.filter((g) => g.status === GameStatus.SCHEDULED)

  const sections = [
    { label: 'Needs Stats',  games: needsStats, color: 'var(--amber)' },
    { label: 'Completed',    games: hasStats,    color: 'var(--green)' },
    { label: 'Scheduled',    games: scheduled,   color: 'var(--muted)' },
  ].filter((s) => s.games.length > 0)

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '36px 24px 60px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(28px, 5vw, 48px)',
          letterSpacing: 3, lineHeight: 1, color: 'var(--text)',
        }}>
          Games
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>
          {session.name} · {games.length} total games
        </p>
      </div>

      {sections.map(({ label, games: sectionGames, color }) => (
        <div key={label} style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />
              {label}
            </span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{sectionGames.length}</span>
            <span style={{ flex: 1, height: 1, background: 'var(--border)', display: 'block' }} />
          </div>

          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '70px 1fr 1fr 80px 70px 60px',
              padding: '7px 16px',
              borderBottom: '1px solid var(--border)',
            }}>
              {['WEEK', 'HOME', 'AWAY', 'SCORE', 'STATS', ''].map((h, i) => (
                <span key={`${h}-${i}`} style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: '1px',
                  color: 'var(--muted)',
                  textAlign: i >= 3 ? 'right' : 'left',
                }}>
                  {h}
                </span>
              ))}
            </div>

            {sectionGames.map((g, i) => {
              const weekStr = g.isPlayoff
                ? ({ 1: 'WC', 2: 'Semi', 3: 'Final' }[g.playoffRound ?? 1] ?? 'PO')
                : g.week ? `Wk ${g.week}` : '—'
              const hasGameStats = g._count.gameStats > 0
              const notLast = i < sectionGames.length - 1

              return (
                <div
                  key={g.id}
                  className="admin-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '70px 1fr 1fr 80px 70px 60px',
                    padding: '11px 16px',
                    borderBottom: notLast ? '1px solid rgba(42,53,72,0.4)' : 'none',
                    alignItems: 'center',
                  }}
                >
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: g.isPlayoff ? 'var(--amber)' : 'var(--muted)',
                    letterSpacing: '0.5px',
                  }}>
                    {weekStr}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    {g.homeTeam.captain.displayName}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                    {g.awayTeam.captain.displayName}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 13, textAlign: 'right',
                    color: g.status === GameStatus.FINAL ? 'var(--text)' : 'var(--muted)',
                  }}>
                    {g.status === GameStatus.FINAL ? `${g.homeScore}–${g.awayScore}` : '—'}
                  </span>
                  <Link href={`/admin/games/${g.id}/stats`} style={{
                    fontSize: 11, fontWeight: 600, textAlign: 'right', textDecoration: 'none',
                    color: hasGameStats ? 'var(--green)' : g.status === GameStatus.FINAL ? 'var(--amber)' : 'var(--muted)',
                  }}>
                    {hasGameStats ? '✓ Stats' : g.status === GameStatus.FINAL ? 'Enter' : '—'}
                  </Link>
                  <Link href={`/admin/games/${g.id}/edit`} style={{
                    fontSize: 11, fontWeight: 600, textAlign: 'right', textDecoration: 'none',
                    color: 'var(--teal)',
                  }}>
                    Score
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <style>{`.admin-row:hover { background: rgba(255,255,255,0.025); }`}</style>
    </main>
  )
}
