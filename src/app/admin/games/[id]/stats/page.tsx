import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { StatEntryForm, type TeamInfo } from '@/components/StatEntryForm'

async function getGameData(gameId: string) {
  const [game, allPlayers] = await Promise.all([
    prisma.game.findUnique({
      where: { id: gameId },
      include: {
        homeTeam: {
          include: {
            captain: { select: { id: true, displayName: true } },
            roster: {
              include: { player: { select: { id: true, displayName: true } } },
              orderBy: { player: { lastName: 'asc' } },
            },
          },
        },
        awayTeam: {
          include: {
            captain: { select: { id: true, displayName: true } },
            roster: {
              include: { player: { select: { id: true, displayName: true } } },
              orderBy: { player: { lastName: 'asc' } },
            },
          },
        },
        gameStats: true,
      },
    }),
    prisma.player.findMany({
      select: { id: true, displayName: true },
      orderBy: { lastName: 'asc' },
    }),
  ])

  return { game, allPlayers }
}

function weekLabel(game: { week: number | null; isPlayoff: boolean; playoffRound: number | null }) {
  if (game.isPlayoff) {
    const rounds: Record<number, string> = { 1: 'Wild Card', 2: 'Semifinals', 3: 'Championship' }
    return rounds[game.playoffRound ?? 1] ?? 'Playoffs'
  }
  return game.week ? `Week ${game.week}` : '—'
}

export default async function StatEntryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { game, allPlayers } = await getGameData(id)

  if (!game) notFound()

  // Build existing stats lookup: playerId → stats
  const existingStats = new Map(
    game.gameStats.map((gs) => [
      gs.playerId,
      {
        fgMade: gs.fgMade,
        fgAttempted: gs.fgAttempted,
        threesMade: gs.threesMade,
        threesAttempted: gs.threesAttempted,
        ftMade: gs.ftMade,
        ftAttempted: gs.ftAttempted,
        rebounds: gs.rebounds,
        assists: gs.assists,
        blocks: gs.blocks,
        steals: gs.steals,
        turnovers: gs.turnovers,
      },
    ]),
  )

  // Include any players who have existing stats but aren't on the current roster
  // (e.g. subs from a previous save)
  const rosterPlayerIds = new Set([
    ...game.homeTeam.roster.map((r) => r.player.id),
    ...game.awayTeam.roster.map((r) => r.player.id),
  ])

  const gameStats = game.gameStats

  function buildTeamInfo(team: NonNullable<typeof game>['homeTeam']): TeamInfo {
    const rosterPlayers = team.roster.map((r) => ({
      playerId: r.player.id,
      displayName: r.player.displayName,
      existing: existingStats.get(r.player.id),
    }))

    // Add back any subs who had stats saved previously but aren't on roster
    const existingSubs = gameStats
      .filter((gs) => gs.teamId === team.id && !rosterPlayerIds.has(gs.playerId))
      .map((gs) => {
        const player = allPlayers.find((p) => p.id === gs.playerId)
        return {
          playerId: gs.playerId,
          displayName: player?.displayName ?? 'Unknown',
          existing: existingStats.get(gs.playerId),
        }
      })

    return {
      teamId: team.id,
      captainName: team.captain.displayName,
      players: [...rosterPlayers, ...existingSubs],
    }
  }

  const homeTeam = buildTeamInfo(game.homeTeam)
  const awayTeam = buildTeamInfo(game.awayTeam)

  // Available subs: all players not already on either roster
  const availableSubs = allPlayers
    .filter((p) => !rosterPlayerIds.has(p.id))
    .map((p) => ({ playerId: p.id, displayName: p.displayName }))

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '36px 24px 60px' }}>
      {/* Header */}
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
          Enter Stats
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>
          {weekLabel(game)} · {game.homeTeam.captain.displayName} vs {game.awayTeam.captain.displayName}
          {game.court && <> · {game.court}</>}
        </p>
        {game.gameStats.length > 0 && (
          <p style={{ fontSize: 12, color: 'var(--amber)', marginTop: 4 }}>
            Stats already entered — editing will overwrite existing data.
          </p>
        )}
      </div>

      <StatEntryForm
        gameId={game.id}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        initialHomeScore={game.homeScore}
        initialAwayScore={game.awayScore}
        gameStatus={game.status}
        availableSubs={availableSubs}
      />
    </main>
  )
}
