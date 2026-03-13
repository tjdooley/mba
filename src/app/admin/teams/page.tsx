import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { SessionPicker } from '@/components/SessionPicker'

async function getTeamsData(sessionId?: string) {
  const [allSessions, session] = await Promise.all([
    prisma.session.findMany({
      orderBy: { startDate: 'desc' },
      select: { id: true, name: true, isActive: true, championTeamId: true },
    }),
    sessionId
      ? prisma.session.findUnique({ where: { id: sessionId } })
      : prisma.session.findFirst({ where: { isActive: true }, orderBy: { startDate: 'desc' } }),
  ])

  if (!session) return null

  const teams = await prisma.team.findMany({
    where: { sessionId: session.id },
    include: {
      captain: { select: { displayName: true } },
      roster: {
        where: { isSub: false },
        include: { player: { select: { displayName: true } } },
      },
    },
    orderBy: [{ division: 'asc' }, { wins: 'desc' }],
  })

  return { session, teams, allSessions }
}

export default async function AdminTeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>
}) {
  const { session: sessionId } = await searchParams
  const data = await getTeamsData(sessionId)

  if (!data) {
    return <main style={{ padding: 60, textAlign: 'center', color: 'var(--muted)' }}>No active session.</main>
  }

  const { session, teams, allSessions } = data
  const championTeamId = allSessions.find((s) => s.id === session.id)?.championTeamId

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '36px 24px 60px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(28px, 5vw, 48px)',
          letterSpacing: 3, lineHeight: 1, color: 'var(--text)',
        }}>
          Teams
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>
          {session.name} · {teams.length} teams
        </p>
        <SessionPicker sessions={allSessions} currentId={session.id} basePath="/admin/teams" />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16,
      }}>
        {teams.map((t) => {
          const isChampion = t.id === championTeamId
          const rosterNames = t.roster
            .map((r) => r.player.displayName)
            .filter((n) => n !== t.captain.displayName)

          return (
            <Link
              key={t.id}
              href={`/admin/teams/${t.id}/edit`}
              className="team-card"
              style={{
                background: 'var(--surface)',
                border: `1px solid ${isChampion ? 'rgba(245,166,35,0.4)' : 'var(--border)'}`,
                borderRadius: 10,
                padding: '18px 20px',
                textDecoration: 'none',
                display: 'block',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 22, letterSpacing: 2, color: 'var(--text)', lineHeight: 1,
                  }}>
                    {t.captain.displayName}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                    {t.division === 'FREEHOUSE' ? 'FreeHouse' : "Delaney's"} · {t.wins}W–{t.losses}L
                  </div>
                </div>
                {isChampion && (
                  <span style={{ fontSize: 22 }}>🏆</span>
                )}
              </div>

              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                {rosterNames.join(', ')}
              </div>

              <div style={{
                fontSize: 11, fontWeight: 600, color: 'var(--teal)',
                marginTop: 10,
              }}>
                Edit →
              </div>
            </Link>
          )
        })}
      </div>

      <style>{`.team-card:hover { border-color: rgba(29,185,84,0.35) !important; }`}</style>
    </main>
  )
}
