'use server'

import { prisma } from '@/lib/prisma'
import { GameStatus } from '@/generated/prisma/client'
import { revalidatePath } from 'next/cache'

export async function saveGameScore(input: {
  gameId: string
  homeScore: number
  awayScore: number
  status: 'SCHEDULED' | 'FINAL'
}): Promise<{ success: boolean; error?: string }> {
  try {
    const game = await prisma.game.findUnique({
      where: { id: input.gameId },
      select: { sessionId: true, isPlayoff: true },
    })
    if (!game) return { success: false, error: 'Game not found.' }

    await prisma.game.update({
      where: { id: input.gameId },
      data: {
        homeScore: input.homeScore,
        awayScore: input.awayScore,
        status: input.status as GameStatus,
      },
    })

    // Recompute standings for all teams in this session (only regular season games)
    const sessionId = game.sessionId
    const teams = await prisma.team.findMany({
      where: { sessionId },
      select: { id: true, division: true },
    })

    const finalGames = await prisma.game.findMany({
      where: { sessionId, status: GameStatus.FINAL, isPlayoff: false },
      select: { homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true },
    })

    const teamDivision = new Map(teams.map((t) => [t.id, t.division]))

    for (const team of teams) {
      let wins = 0, losses = 0, divWins = 0, divLosses = 0, ptDiff = 0

      for (const g of finalGames) {
        if (g.homeTeamId === team.id) {
          ptDiff += g.homeScore - g.awayScore
          if (g.homeScore > g.awayScore) {
            wins++
            if (teamDivision.get(g.awayTeamId) === team.division) divWins++
          } else {
            losses++
            if (teamDivision.get(g.awayTeamId) === team.division) divLosses++
          }
        } else if (g.awayTeamId === team.id) {
          ptDiff += g.awayScore - g.homeScore
          if (g.awayScore > g.homeScore) {
            wins++
            if (teamDivision.get(g.homeTeamId) === team.division) divWins++
          } else {
            losses++
            if (teamDivision.get(g.homeTeamId) === team.division) divLosses++
          }
        }
      }

      await prisma.team.update({
        where: { id: team.id },
        data: {
          wins, losses,
          divisionWins: divWins,
          divisionLosses: divLosses,
          pointDifferential: ptDiff,
        },
      })
    }

    revalidatePath('/', 'layout')

    return { success: true }
  } catch (err) {
    console.error('saveGameScore error:', err)
    return { success: false, error: 'Failed to save score.' }
  }
}
