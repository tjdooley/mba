'use server'

import { prisma } from '@/lib/prisma'
import { GameStatus } from '@/generated/prisma/client'
import { revalidatePath } from 'next/cache'

export type CreatePlayoffInput = {
  sessionId: string
  homeTeamId: string
  awayTeamId: string
  playoffRound: number // 1 = Wild Card, 2 = Semifinals, 3 = Championship
  homeScore: number
  awayScore: number
  isFinal: boolean
}

export async function createPlayoffGame(input: CreatePlayoffInput): Promise<{ success: boolean; error?: string }> {
  try {
    if (input.homeTeamId === input.awayTeamId) {
      return { success: false, error: 'Home and away teams must be different.' }
    }

    // Verify both teams belong to the session
    const teams = await prisma.team.findMany({
      where: { id: { in: [input.homeTeamId, input.awayTeamId] }, sessionId: input.sessionId },
    })
    if (teams.length !== 2) {
      return { success: false, error: 'Teams not found in this session.' }
    }

    // Use session start date as a fallback scheduled date for past seasons
    const session = await prisma.session.findUnique({
      where: { id: input.sessionId },
      select: { startDate: true },
    })

    await prisma.game.create({
      data: {
        sessionId: input.sessionId,
        homeTeamId: input.homeTeamId,
        awayTeamId: input.awayTeamId,
        isPlayoff: true,
        playoffRound: input.playoffRound,
        homeScore: input.isFinal ? input.homeScore : 0,
        awayScore: input.isFinal ? input.awayScore : 0,
        status: input.isFinal ? GameStatus.FINAL : GameStatus.SCHEDULED,
        scheduledAt: session?.startDate ?? new Date(),
      },
    })

    revalidatePath('/', 'layout')

    return { success: true }
  } catch (err) {
    console.error('createPlayoffGame error:', err)
    return { success: false, error: 'Failed to create playoff game.' }
  }
}
