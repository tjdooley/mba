import { prisma } from '@/lib/prisma'
import { GameStatus } from '@/generated/prisma/client'
import Link from 'next/link'
import { ScheduleTabs } from '@/components/ScheduleTabs'

// ─── DATA ────────────────────────────────────────────────────────────────

async function getScheduleData() {
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
    },
  })

  return { session, games }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────

export function formatDate(d: Date) {
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

export function weekLabel(game: { week: number | null; isPlayoff: boolean; playoffRound: number | null }) {
  if (game.isPlayoff) {
    const rounds: Record<number, string> = { 1: 'Wild Card', 2: 'Semifinals', 3: 'Championship' }
    return rounds[game.playoffRound ?? 1] ?? 'Playoffs'
  }
  return game.week ? `Week ${game.week}` : '—'
}

// ─── PAGE ────────────────────────────────────────────────────────────────

export default async function SchedulePage() {
  const data = await getScheduleData()

  if (!data) {
    return <main style={{ padding: 60, textAlign: 'center', color: 'var(--muted)' }}>No active session.</main>
  }

  const { session, games } = data

  const regularSeason = games.filter((g) => !g.isPlayoff)
  const playoffs      = games.filter((g) => g.isPlayoff)
  const upcoming      = regularSeason.filter((g) => g.status === GameStatus.SCHEDULED)
  const results       = regularSeason.filter((g) => g.status === GameStatus.FINAL).reverse()

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
            {'Schedule & '}
            <span style={{
              background: 'linear-gradient(135deg, #1db954, #2a8f8f)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Results
            </span>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8, letterSpacing: '0.4px' }}>
            {session.name} · {regularSeason.filter((g) => g.status === GameStatus.FINAL).length} games played · {upcoming.length} remaining
          </p>
        </div>
      </div>

      {/* Tabs — client component for toggle */}
      <ScheduleTabs
        upcoming={upcoming.map(serializeGame)}
        results={results.map(serializeGame)}
        playoffs={playoffs.map(serializeGame)}
      />
    </main>
  )
}

// Prisma returns Date objects which can't be passed to Client Components directly
function serializeGame(g: NonNullable<Awaited<ReturnType<typeof getScheduleData>>>['games'][number]) {
  return {
    id:            g.id,
    status:        g.status,
    isPlayoff:     g.isPlayoff,
    playoffRound:  g.playoffRound,
    week:          g.week,
    court:         g.court,
    scheduledAt:   g.scheduledAt.toISOString(),
    homeScore:     g.homeScore,
    awayScore:     g.awayScore,
    homeTeam:      g.homeTeam.captain.displayName,
    awayTeam:      g.awayTeam.captain.displayName,
    homeTeamId:    g.homeTeamId,
    awayTeamId:    g.awayTeamId,
  }
}