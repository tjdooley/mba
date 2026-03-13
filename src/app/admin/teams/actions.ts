'use server'

import { prisma } from '@/lib/prisma'
import { Division } from '@/generated/prisma/client'
import { revalidatePath } from 'next/cache'

export async function createTeam(input: {
  sessionId: string
  captainId: string
  division: 'FREEHOUSE' | 'DELANEYS'
}): Promise<{ success: boolean; error?: string; teamId?: string }> {
  try {
    // Check captain isn't already a captain in this session
    const existing = await prisma.team.findUnique({
      where: { sessionId_captainId: { sessionId: input.sessionId, captainId: input.captainId } },
    })
    if (existing) {
      return { success: false, error: 'This player is already a captain in this session.' }
    }

    const team = await prisma.team.create({
      data: {
        sessionId: input.sessionId,
        captainId: input.captainId,
        division: input.division as Division,
      },
    })

    // Auto-add captain to roster
    await prisma.teamRoster.create({
      data: { teamId: team.id, playerId: input.captainId },
    })

    revalidatePath('/', 'layout')
    return { success: true, teamId: team.id }
  } catch (err) {
    console.error('createTeam error:', err)
    return { success: false, error: 'Failed to create team.' }
  }
}
