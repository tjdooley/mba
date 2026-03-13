'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type PlayerInput = {
  firstName: string
  lastName: string
  displayName: string
  email: string
  isActive: boolean
}

export async function createPlayer(input: PlayerInput): Promise<{ success: boolean; error?: string }> {
  try {
    if (!input.firstName.trim() || !input.displayName.trim()) {
      return { success: false, error: 'First name and display name are required.' }
    }

    await prisma.player.create({
      data: {
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        displayName: input.displayName.trim(),
        email: input.email.trim() || null,
        isActive: input.isActive,
      },
    })

    revalidatePath('/', 'layout')
    redirect('/admin/players')
  } catch (err) {
    if (err instanceof Error && err.message === 'NEXT_REDIRECT') throw err
    console.error('createPlayer error:', err)
    return { success: false, error: 'Failed to create player.' }
  }
}

export async function updatePlayer(
  playerId: string,
  input: PlayerInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!input.firstName.trim() || !input.displayName.trim()) {
      return { success: false, error: 'First name and display name are required.' }
    }

    await prisma.player.update({
      where: { id: playerId },
      data: {
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        displayName: input.displayName.trim(),
        email: input.email.trim() || null,
        isActive: input.isActive,
      },
    })

    revalidatePath('/', 'layout')

    return { success: true }
  } catch (err) {
    console.error('updatePlayer error:', err)
    return { success: false, error: 'Failed to update player.' }
  }
}
