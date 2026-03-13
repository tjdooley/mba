'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export type GameSlot = {
  homeTeamId: string
  awayTeamId: string
  court: string
}

export type ScheduleWeekInput = {
  sessionId: string
  week: number
  date: string // ISO date string
  games: GameSlot[]
}

export async function scheduleWeek(input: ScheduleWeekInput): Promise<{ success: boolean; error?: string }> {
  try {
    const validGames = input.games.filter((g) => g.homeTeamId && g.awayTeamId)

    if (validGames.length === 0) {
      return { success: false, error: 'Add at least one game.' }
    }

    // Check for duplicate teams
    const teamIds = validGames.flatMap((g) => [g.homeTeamId, g.awayTeamId])
    const uniqueIds = new Set(teamIds)
    if (uniqueIds.size !== teamIds.length) {
      return { success: false, error: 'A team cannot play multiple games in the same week.' }
    }

    // Check for same team matchups
    for (const g of validGames) {
      if (g.homeTeamId === g.awayTeamId) {
        return { success: false, error: 'A team cannot play against itself.' }
      }
    }

    const scheduledAt = new Date(input.date)

    for (const g of validGames) {
      await prisma.game.create({
        data: {
          sessionId: input.sessionId,
          homeTeamId: g.homeTeamId,
          awayTeamId: g.awayTeamId,
          scheduledAt,
          week: input.week,
          court: g.court || null,
          isPlayoff: false,
        },
      })
    }

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err) {
    console.error('scheduleWeek error:', err)
    return { success: false, error: 'Failed to schedule games.' }
  }
}
