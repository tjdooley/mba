import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { GameEditForm } from '@/components/GameEditForm'

function weekLabel(game: { week: number | null; isPlayoff: boolean; playoffRound: number | null }) {
  if (game.isPlayoff) {
    const rounds: Record<number, string> = { 1: 'Wild Card', 2: 'Semifinals', 3: 'Championship' }
    return rounds[game.playoffRound ?? 1] ?? 'Playoffs'
  }
  return game.week ? `Week ${game.week}` : '—'
}

export default async function GameEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      homeTeam: { include: { captain: { select: { displayName: true } } } },
      awayTeam: { include: { captain: { select: { displayName: true } } } },
    },
  })

  if (!game) notFound()

  return (
    <main style={{ maxWidth: 500, margin: '0 auto', padding: '36px 24px 60px' }}>
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
          Edit Score
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>
          {weekLabel(game)} · {game.homeTeam.captain.displayName} vs {game.awayTeam.captain.displayName}
          {game.court && <> · {game.court}</>}
        </p>
      </div>

      <GameEditForm
        gameId={game.id}
        homeCaptain={game.homeTeam.captain.displayName}
        awayCaptain={game.awayTeam.captain.displayName}
        initialHomeScore={game.homeScore}
        initialAwayScore={game.awayScore}
        initialStatus={game.status}
      />
    </main>
  )
}
