import { prisma } from '@/lib/prisma'
import { GameStatus } from '@/generated/prisma/client'
import Link from 'next/link'

async function getDashboardData() {
  const session = await prisma.session.findFirst({
    where: { isActive: true },
    orderBy: { startDate: 'desc' },
    include: {
      teams: { include: { captain: { select: { displayName: true } } } },
      _count: { select: { games: true } },
    },
  })

  if (!session) return null

  const [gamesPlayed, gamesMissingStats, upcomingGames] = await Promise.all([
    prisma.game.count({
      where: { sessionId: session.id, status: GameStatus.FINAL },
    }),
    prisma.game.count({
      where: {
        sessionId: session.id,
        status: GameStatus.FINAL,
        gameStats: { none: {} },
      },
    }),
    prisma.game.count({
      where: { sessionId: session.id, status: GameStatus.SCHEDULED },
    }),
  ])

  return { session, gamesPlayed, gamesMissingStats, upcomingGames }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  if (!data) {
    return (
      <main style={{ padding: 60, textAlign: 'center', color: 'var(--muted)' }}>
        No active session found.
      </main>
    )
  }

  const { session, gamesPlayed, gamesMissingStats, upcomingGames } = data

  const statCards = [
    { label: 'Games Played',       value: gamesPlayed,        color: 'var(--green)' },
    { label: 'Missing Stats',      value: gamesMissingStats,  color: gamesMissingStats > 0 ? 'var(--amber)' : 'var(--green)' },
    { label: 'Upcoming',           value: upcomingGames,      color: 'var(--muted)' },
    { label: 'Teams',              value: session.teams.length, color: 'var(--teal)' },
  ]

  const quickActions = [
    { href: '/admin/games/new',          label: 'Schedule Game',     description: 'Add a regular season game' },
    { href: '/admin/games/new-playoff',  label: 'Create Playoff Game', description: 'Set up a playoff matchup' },
    { href: '/admin/players/new',        label: 'Add Player',        description: 'Create a new player profile' },
  ]

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '36px 24px 60px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(28px, 5vw, 48px)',
          letterSpacing: 3,
          lineHeight: 1,
          color: 'var(--text)',
        }}>
          Dashboard
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>
          {session.name} · Active Session
        </p>
      </div>

      {/* Stat cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 12,
        marginBottom: 36,
      }}>
        {statCards.map(({ label, value, color }) => (
          <div key={label} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '16px 18px',
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 36,
              fontWeight: 500,
              color,
              lineHeight: 1,
            }}>
              {value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Missing stats alert */}
      {gamesMissingStats > 0 && (
        <div style={{
          background: 'rgba(245,166,35,0.08)',
          border: '1px solid rgba(245,166,35,0.3)',
          borderRadius: 10,
          padding: '14px 18px',
          marginBottom: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber)' }}>
              {gamesMissingStats} game{gamesMissingStats > 1 ? 's' : ''} need stats entered
            </span>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              These games are marked Final but have no stat rows recorded.
            </p>
          </div>
          <Link href="/admin/games" style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--amber)',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}>
            View Games →
          </Link>
        </div>
      )}

      {/* Quick actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 2, color: 'var(--text)' }}>
          Quick Actions
        </span>
        <span style={{ flex: 1, height: 1, background: 'var(--border)', display: 'block' }} />
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 12,
        marginBottom: 36,
      }}>
        {quickActions.map(({ href, label, description }) => (
          <Link key={href} href={href} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '16px 18px',
            textDecoration: 'none',
            display: 'block',
            transition: 'border-color 0.15s',
          }}
          className="admin-card"
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--green)', marginBottom: 4 }}>
              {label}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              {description}
            </div>
          </Link>
        ))}
      </div>

      {/* Games list */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 2, color: 'var(--text)' }}>
          Games
        </span>
        <span style={{ flex: 1, height: 1, background: 'var(--border)', display: 'block' }} />
        <Link href="/admin/games" style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none' }}>
          View all →
        </Link>
      </div>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        overflow: 'hidden',
      }}>
        <RecentGames sessionId={session.id} />
      </div>

      <style>{`.admin-card:hover { border-color: rgba(29,185,84,0.35) !important; }`}</style>
    </main>
  )
}

async function RecentGames({ sessionId }: { sessionId: string }) {
  const games = await prisma.game.findMany({
    where: { sessionId, status: GameStatus.FINAL },
    orderBy: { scheduledAt: 'desc' },
    take: 5,
    include: {
      homeTeam: { include: { captain: { select: { displayName: true } } } },
      awayTeam: { include: { captain: { select: { displayName: true } } } },
      _count: { select: { gameStats: true } },
    },
  })

  if (games.length === 0) {
    return (
      <div style={{ padding: '24px 18px', textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
        No completed games yet.
      </div>
    )
  }

  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 80px 80px',
        padding: '7px 16px',
        borderBottom: '1px solid var(--border)',
      }}>
        {['HOME', 'AWAY', 'SCORE', 'STATS'].map((h, i) => (
          <span key={h} style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '1px',
            color: 'var(--muted)',
            textAlign: i >= 2 ? 'right' : 'left',
          }}>
            {h}
          </span>
        ))}
      </div>
      {games.map((g, i) => {
        const hasStats = g._count.gameStats > 0
        const notLast = i < games.length - 1
        return (
          <Link key={g.id} href={`/admin/games/${g.id}/stats`} style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 80px 80px',
            padding: '11px 16px',
            textDecoration: 'none',
            borderBottom: notLast ? '1px solid rgba(42,53,72,0.4)' : 'none',
            alignItems: 'center',
          }}
          className="admin-row"
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
              {g.homeTeam.captain.displayName}
            </span>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>
              {g.awayTeam.captain.displayName}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text)', textAlign: 'right' }}>
              {g.homeScore}–{g.awayScore}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 600, textAlign: 'right',
              color: hasStats ? 'var(--green)' : 'var(--amber)',
            }}>
              {hasStats ? '✓' : 'Missing'}
            </span>
          </Link>
        )
      })}
      <style>{`.admin-row:hover { background: rgba(255,255,255,0.025); }`}</style>
    </>
  )
}
