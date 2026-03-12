import { prisma } from '@/lib/prisma'
import Link from 'next/link'

// ─── DATA ────────────────────────────────────────────────────────────────

async function getPlayersData() {
  const session = await prisma.session.findFirst({
    where: { isActive: true },
    orderBy: { startDate: 'desc' },
  })

  const players = await prisma.player.findMany({
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    include: {
      careerStats: true,
      teamRosters: {
        where: session ? { team: { sessionId: session.id } } : undefined,
        include: {
          team: { include: { captain: { select: { displayName: true } } } },
        },
        take: 1,
      },
    },
  })

  return { players, session }
}

// ─── PLAYER TABLE ────────────────────────────────────────────────────────

type Player = Awaited<ReturnType<typeof getPlayersData>>['players'][number]

function PlayerTable({ players, showTeam }: { players: Player[]; showTeam: boolean }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: showTeam ? '1fr 140px 60px 60px 60px' : '1fr 60px 60px 60px',
        padding: '7px 16px',
        borderBottom: '1px solid var(--border)',
      }}>
        {(showTeam ? ['PLAYER', 'TEAM', 'GP', 'PPG', 'RPG'] : ['PLAYER', 'GP', 'PPG', 'RPG']).map((h, i) => (
          <span key={h} style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '1px',
            color: 'var(--muted)',
            textAlign: i >= (showTeam ? 2 : 1) ? 'right' : 'left',
          }}>
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {players.map((p, i) => {
        const cs = p.careerStats
        const ppg = cs && cs.gamesPlayed > 0
          ? (cs.points / cs.gamesPlayed).toFixed(1)
          : '—'
        const rpg = cs && cs.gamesPlayed > 0
          ? (cs.rebounds / cs.gamesPlayed).toFixed(1)
          : '—'
        const currentTeam = p.teamRosters[0]?.team.captain.displayName ?? '—'
        const notLast = i < players.length - 1

        return (
          <Link
            key={p.id}
            href={`/players/${p.id}`}
            style={{
              display: 'grid',
              gridTemplateColumns: showTeam ? '1fr 140px 60px 60px 60px' : '1fr 60px 60px 60px',
              padding: '11px 16px',
              textDecoration: 'none',
              borderBottom: notLast ? '1px solid rgba(42,53,72,0.4)' : 'none',
              alignItems: 'center',
              transition: 'background 0.12s',
            }}
            className="player-row"
          >
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
              {p.firstName} {p.lastName}
            </span>
            {showTeam && (
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                {currentTeam}
              </span>
            )}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--muted)', textAlign: 'right' }}>
              {cs?.gamesPlayed ?? 0}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text)', textAlign: 'right' }}>
              {ppg}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text)', textAlign: 'right' }}>
              {rpg}
            </span>
          </Link>
        )
      })}
    </div>
  )
}

// ─── PAGE ────────────────────────────────────────────────────────────────

export default async function PlayersPage() {
  const { players, session } = await getPlayersData()

  const activePlayers   = players.filter((p) => p.teamRosters.length > 0)
  const inactivePlayers = players.filter((p) => p.teamRosters.length === 0)

  return (
    <main>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(180deg, #0f1620 0%, var(--dark) 100%)',
        borderBottom: '1px solid var(--border)',
        padding: '36px 24px 32px',
      }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(36px, 6vw, 60px)',
            letterSpacing: 3,
            lineHeight: 1,
            color: 'var(--text)',
          }}>
            Player{' '}
            <span style={{
              background: 'linear-gradient(135deg, #1db954, #2a8f8f)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Directory
            </span>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8, letterSpacing: '0.4px' }}>
            {activePlayers.length} active · {inactivePlayers.length} alumni · {session?.name ?? 'All time'}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px 60px' }}>

        {/* Active players */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 2, color: 'var(--text)' }}>
            Active Players
          </span>
          <span style={{ flex: 1, height: 1, background: 'var(--border)', display: 'block' }} />
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{activePlayers.length}</span>
        </div>
        <PlayerTable players={activePlayers} showTeam />

        {/* Alumni */}
        {inactivePlayers.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 40, marginBottom: 16 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 2, color: 'var(--muted)' }}>
                Alumni
              </span>
              <span style={{ flex: 1, height: 1, background: 'var(--border)', display: 'block' }} />
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{inactivePlayers.length}</span>
            </div>
            <div style={{ opacity: 0.7 }}>
              <PlayerTable players={inactivePlayers} showTeam={false} />
            </div>
          </>
        )}
      </div>

      <style>{`.player-row:hover { background: rgba(255,255,255,0.025) !important; }`}</style>
    </main>
  )
}
