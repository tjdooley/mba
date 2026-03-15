import { prisma } from '@/lib/prisma'
import { SessionPicker } from '@/components/SessionPicker'
import { SubListManager } from '@/components/SubListManager'

async function getData(sessionId?: string) {
  const sessions = await prisma.session.findMany({
    orderBy: { startDate: 'desc' },
    select: { id: true, name: true, isActive: true },
  })

  const session = sessionId
    ? sessions.find((s) => s.id === sessionId) ?? sessions[0]
    : sessions.find((s) => s.isActive) ?? sessions[0]

  if (!session) return { sessions: [], session: null, subs: [] }

  const subs = await prisma.subPlayer.findMany({
    where: { sessionId: session.id },
    orderBy: [{ draftRound: 'asc' }, { name: 'asc' }],
  })

  return { sessions, session, subs }
}

export default async function SubListPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>
}) {
  const { session: sessionParam } = await searchParams
  const { sessions, session, subs } = await getData(sessionParam)

  if (!session) {
    return (
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>No sessions found.</p>
      </main>
    )
  }

  const activeSubs = subs.filter((s) => s.isAvailable)
  const inactiveSubs = subs.filter((s) => !s.isAvailable)

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '36px 24px 60px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(28px, 5vw, 48px)',
          letterSpacing: 3, lineHeight: 1, color: 'var(--text)',
        }}>
          Sub List
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>
          Manage available substitutes for each session. Subs can fill in for players drafted in their round or earlier.
        </p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <SessionPicker
          sessions={sessions.map((s) => ({ id: s.id, name: s.name, isActive: s.isActive }))}
          currentId={session.id}
          basePath="/admin/sub-list"
        />
      </div>

      <SubListManager
        sessionId={session.id}
        activeSubs={activeSubs.map((s) => ({
          id: s.id, name: s.name, position: s.position, contactInfo: s.contactInfo,
          draftRound: s.draftRound, notes: s.notes, isAvailable: s.isAvailable,
        }))}
        inactiveSubs={inactiveSubs.map((s) => ({
          id: s.id, name: s.name, position: s.position, contactInfo: s.contactInfo,
          draftRound: s.draftRound, notes: s.notes, isAvailable: s.isAvailable,
        }))}
      />
    </main>
  )
}
