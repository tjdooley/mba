import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ScheduleWeekForm } from '@/components/ScheduleWeekForm'

async function getData() {
  const sessions = await prisma.session.findMany({
    orderBy: { startDate: 'desc' },
    select: {
      id: true,
      name: true,
      isActive: true,
      teams: {
        select: {
          id: true,
          division: true,
          captain: { select: { displayName: true } },
        },
        orderBy: { captain: { lastName: 'asc' } },
      },
    },
  })

  return sessions.map((s) => ({
    id: s.id,
    name: s.name,
    isActive: s.isActive,
    teams: s.teams.map((t) => ({
      id: t.id,
      captainName: t.captain.displayName,
      division: t.division,
    })),
  }))
}

export default async function ScheduleGamesPage() {
  const sessions = await getData()

  return (
    <main style={{ maxWidth: 700, margin: '0 auto', padding: '36px 24px 60px' }}>
      <div style={{ marginBottom: 8 }}>
        <Link href="/admin/games" style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none' }}>
          ← Back to Games
        </Link>
      </div>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(24px, 4vw, 40px)',
          letterSpacing: 3, lineHeight: 1, color: 'var(--text)',
        }}>
          Schedule Week
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>
          Add all games for a week at once. Up to 4 games per week.
        </p>
      </div>

      <ScheduleWeekForm sessions={sessions} />
    </main>
  )
}
