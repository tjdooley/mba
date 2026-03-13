import { prisma } from '@/lib/prisma'
import Link from 'next/link'

async function getPlayersData() {
  const session = await prisma.session.findFirst({
    where: { isActive: true },
    orderBy: { startDate: 'desc' },
  })

  const players = await prisma.player.findMany({
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    include: {
      careerStats: { select: { gamesPlayed: true, points: true } },
      teamRosters: {
        where: session ? { team: { sessionId: session.id } } : { teamId: '' },
        include: { team: { include: { captain: { select: { displayName: true } } } } },
        take: 1,
      },
    },
  })

  return { players, session }
}

export default async function AdminPlayersPage() {
  const { players, session } = await getPlayersData()

  const rostered = players.filter((p) => p.teamRosters && p.teamRosters.length > 0)
  const notRostered = players.filter((p) => !p.teamRosters || p.teamRosters.length === 0)

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '36px 24px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(28px, 5vw, 48px)',
            letterSpacing: 3, lineHeight: 1, color: 'var(--text)',
          }}>
            Players
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>
            {players.length} total · {rostered.length} active in {session?.name ?? 'current session'}
          </p>
        </div>
        <Link href="/admin/players/new" style={{
          padding: '10px 20px',
          background: 'linear-gradient(135deg, #1db954, #128f3e)',
          border: 'none', borderRadius: 8,
          fontSize: 13, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
          color: '#fff', textDecoration: 'none',
        }}>
          + New Player
        </Link>
      </div>

      {/* Active players */}
      <PlayerSection
        label="Active"
        color="var(--green)"
        players={rostered}
        showTeam
      />

      {/* Other players */}
      {notRostered.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <PlayerSection
            label="Not Rostered"
            color="var(--muted)"
            players={notRostered}
            showTeam={false}
          />
        </div>
      )}

      <style>{`.admin-row:hover { background: rgba(255,255,255,0.025); }`}</style>
    </main>
  )
}

type PlayerRow = Awaited<ReturnType<typeof getPlayersData>>['players'][number]

function PlayerSection({ label, color, players, showTeam }: {
  label: string; color: string; players: PlayerRow[]; showTeam: boolean
}) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />
          {label}
        </span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{players.length}</span>
        <span style={{ flex: 1, height: 1, background: 'var(--border)', display: 'block' }} />
      </div>

      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: showTeam ? '1fr 120px 140px 60px 60px' : '1fr 120px 60px 60px',
          padding: '7px 16px',
          borderBottom: '1px solid var(--border)',
        }}>
          {(showTeam
            ? ['NAME', 'DISPLAY', 'TEAM', 'GP', '']
            : ['NAME', 'DISPLAY', 'GP', '']
          ).map((h, i) => (
            <span key={`${h}-${i}`} style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '1px',
              color: 'var(--muted)',
              textAlign: i >= (showTeam ? 3 : 2) ? 'right' : 'left',
            }}>
              {h}
            </span>
          ))}
        </div>

        {players.map((p, i) => {
          const team = p.teamRosters?.[0]?.team.captain.displayName ?? '—'
          const gp = p.careerStats?.gamesPlayed ?? 0
          const notLast = i < players.length - 1

          return (
            <div
              key={p.id}
              className="admin-row"
              style={{
                display: 'grid',
                gridTemplateColumns: showTeam ? '1fr 120px 140px 60px 60px' : '1fr 120px 60px 60px',
                padding: '11px 16px',
                borderBottom: notLast ? '1px solid rgba(42,53,72,0.4)' : 'none',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                {p.firstName} {p.lastName}
              </span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                {p.displayName}
              </span>
              {showTeam && (
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{team}</span>
              )}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)', textAlign: 'right' }}>
                {gp}
              </span>
              <Link href={`/admin/players/${p.id}/edit`} style={{
                fontSize: 11, fontWeight: 600, color: 'var(--teal)', textDecoration: 'none', textAlign: 'right',
              }}>
                Edit
              </Link>
            </div>
          )
        })}
      </div>
    </>
  )
}
