'use server'

import { prisma } from '@/lib/prisma'
import { GameStatus } from '@/generated/prisma/client'
import { revalidatePath } from 'next/cache'

export type StatRow = {
  playerId: string
  teamId: string
  fgMade: number
  fgAttempted: number
  threesMade: number
  threesAttempted: number
  ftMade: number
  ftAttempted: number
  rebounds: number
  assists: number
  blocks: number
  steals: number
  turnovers: number
}

export type SaveStatsInput = {
  gameId: string
  homeScore: number
  awayScore: number
  stats: StatRow[]
}

export async function saveStats(input: SaveStatsInput): Promise<{ success: boolean; error?: string }> {
  try {
    const game = await prisma.game.findUnique({
      where: { id: input.gameId },
      select: { sessionId: true, homeTeamId: true, awayTeamId: true },
    })
    if (!game) return { success: false, error: 'Game not found.' }

    const sessionId = game.sessionId

    // Compute points for each stat row
    const statsWithPoints = input.stats.map((s) => ({
      ...s,
      points: (s.fgMade - s.threesMade) * 2 + s.threesMade * 3 + s.ftMade,
    }))

    // 1. Delete existing GameStats, update game score + status, insert new GameStats
    await prisma.$transaction(async (tx) => {
      await tx.gameStat.deleteMany({ where: { gameId: input.gameId } })

      await tx.game.update({
        where: { id: input.gameId },
        data: {
          homeScore: input.homeScore,
          awayScore: input.awayScore,
          status: GameStatus.FINAL,
        },
      })

      for (const s of statsWithPoints) {
        await tx.gameStat.create({
          data: {
            gameId: input.gameId,
            playerId: s.playerId,
            teamId: s.teamId,
            fgMade: s.fgMade,
            fgAttempted: s.fgAttempted,
            threesMade: s.threesMade,
            threesAttempted: s.threesAttempted,
            ftMade: s.ftMade,
            ftAttempted: s.ftAttempted,
            points: s.points,
            rebounds: s.rebounds,
            assists: s.assists,
            blocks: s.blocks,
            steals: s.steals,
            turnovers: s.turnovers,
          },
        })
      }
    })

    // 2. Recompute SessionStats for all players in this game
    const playerIds = [...new Set(statsWithPoints.map((s) => s.playerId))]

    for (const playerId of playerIds) {
      const gameStats = await prisma.gameStat.findMany({
        where: { playerId, game: { sessionId } },
      })

      const gamesPlayed = new Set(gameStats.map((gs) => gs.gameId)).size
      const sum = {
        fgMade: 0, fgAttempted: 0, threesMade: 0, threesAttempted: 0,
        ftMade: 0, ftAttempted: 0, points: 0, rebounds: 0,
        assists: 0, blocks: 0, steals: 0, turnovers: 0,
      }
      for (const gs of gameStats) {
        sum.fgMade += gs.fgMade
        sum.fgAttempted += gs.fgAttempted
        sum.threesMade += gs.threesMade
        sum.threesAttempted += gs.threesAttempted
        sum.ftMade += gs.ftMade
        sum.ftAttempted += gs.ftAttempted
        sum.points += gs.points
        sum.rebounds += gs.rebounds
        sum.assists += gs.assists
        sum.blocks += gs.blocks
        sum.steals += gs.steals
        sum.turnovers += gs.turnovers
      }

      await prisma.sessionStat.upsert({
        where: { sessionId_playerId: { sessionId, playerId } },
        create: { sessionId, playerId, gamesPlayed, ...sum },
        update: { gamesPlayed, ...sum },
      })
    }

    // 3. Recompute CareerStats for all players in this game
    for (const playerId of playerIds) {
      const sessionStats = await prisma.sessionStat.findMany({
        where: { playerId },
      })

      const career = {
        sessionsPlayed: sessionStats.length,
        gamesPlayed: 0, fgMade: 0, fgAttempted: 0, threesMade: 0, threesAttempted: 0,
        ftMade: 0, ftAttempted: 0, points: 0, rebounds: 0,
        assists: 0, blocks: 0, steals: 0, turnovers: 0,
      }
      for (const ss of sessionStats) {
        career.gamesPlayed += ss.gamesPlayed
        career.fgMade += ss.fgMade
        career.fgAttempted += ss.fgAttempted
        career.threesMade += ss.threesMade
        career.threesAttempted += ss.threesAttempted
        career.ftMade += ss.ftMade
        career.ftAttempted += ss.ftAttempted
        career.points += ss.points
        career.rebounds += ss.rebounds
        career.assists += ss.assists
        career.blocks += ss.blocks
        career.steals += ss.steals
        career.turnovers += ss.turnovers
      }

      await prisma.careerStat.upsert({
        where: { playerId },
        create: { playerId, ...career },
        update: career,
      })
    }

    // 4. Recompute standings for all teams in this session
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
    console.error('saveStats error:', err)
    return { success: false, error: 'Failed to save stats.' }
  }
}
