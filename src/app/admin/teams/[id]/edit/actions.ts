'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function addPlayerToRoster(
  teamId: string,
  playerId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if already on a team in this session
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { sessionId: true },
    })
    if (!team) return { success: false, error: 'Team not found.' }

    const existing = await prisma.teamRoster.findFirst({
      where: { playerId, team: { sessionId: team.sessionId } },
    })
    if (existing) {
      return { success: false, error: 'Player is already on a team this session.' }
    }

    await prisma.teamRoster.create({
      data: { teamId, playerId },
    })

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err) {
    console.error('addPlayerToRoster error:', err)
    return { success: false, error: 'Failed to add player.' }
  }
}

export async function removePlayerFromRoster(
  teamId: string,
  playerId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Don't allow removing the captain
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { captainId: true },
    })
    if (!team) return { success: false, error: 'Team not found.' }
    if (team.captainId === playerId) {
      return { success: false, error: 'Cannot remove the team captain.' }
    }

    await prisma.teamRoster.deleteMany({
      where: { teamId, playerId },
    })

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err) {
    console.error('removePlayerFromRoster error:', err)
    return { success: false, error: 'Failed to remove player.' }
  }
}

export async function setChampion(
  sessionId: string,
  teamId: string | null,
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.session.update({
      where: { id: sessionId },
      data: { championTeamId: teamId },
    })

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err) {
    console.error('setChampion error:', err)
    return { success: false, error: 'Failed to set champion.' }
  }
}
