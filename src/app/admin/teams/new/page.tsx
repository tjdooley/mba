import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { CreateTeamForm } from '@/components/CreateTeamForm'

async function getData() {
  const [sessions, players] = await Promise.all([
    prisma.session.findMany({
      orderBy: { startDate: 'desc' },
      select: { id: true, name: true, isActive: true },
    }),
    prisma.player.findMany({
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: { id: true, displayName: true, firstName: true, lastName: true },
    }),
  ])

  return { sessions, players }
}

export default async function NewTeamPage() {
  const { sessions, players } = await getData()

  return (
    <main style={{ maxWidth: 500, margin: '0 auto', padding: '36px 24px 60px' }}>
      <div style={{ marginBottom: 8 }}>
        <Link href="/admin/teams" style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none' }}>
          ← Back to Teams
        </Link>
      </div>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(24px, 4vw, 40px)',
          letterSpacing: 3, lineHeight: 1, color: 'var(--text)',
        }}>
          New Team
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>
          Captain is automatically added to the roster. Add more players after creation.
        </p>
      </div>

      <CreateTeamForm sessions={sessions} players={players} />
    </main>
  )
}
