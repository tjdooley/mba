'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export type SubPlayerInput = {
  sessionId: string
  name: string
  position: string
  contactInfo: string
  draftRound: number | null
  notes: string
}

export async function createSubPlayer(input: SubPlayerInput): Promise<{ success: boolean; error?: string }> {
  try {
    if (!input.name.trim()) {
      return { success: false, error: 'Name is required.' }
    }

    await prisma.subPlayer.create({
      data: {
        sessionId: input.sessionId,
        name: input.name.trim(),
        position: input.position.trim() || null,
        contactInfo: input.contactInfo.trim() || null,
        draftRound: input.draftRound,
        notes: input.notes.trim() || null,
      },
    })

    revalidatePath('/admin/sub-list')
    return { success: true }
  } catch (err) {
    console.error('createSubPlayer error:', err)
    return { success: false, error: 'Failed to add sub. Name may already exist for this session.' }
  }
}

export async function updateSubPlayer(
  id: string,
  input: SubPlayerInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!input.name.trim()) {
      return { success: false, error: 'Name is required.' }
    }

    await prisma.subPlayer.update({
      where: { id },
      data: {
        name: input.name.trim(),
        position: input.position.trim() || null,
        contactInfo: input.contactInfo.trim() || null,
        draftRound: input.draftRound,
        notes: input.notes.trim() || null,
      },
    })

    revalidatePath('/admin/sub-list')
    return { success: true }
  } catch (err) {
    console.error('updateSubPlayer error:', err)
    return { success: false, error: 'Failed to update sub.' }
  }
}

export async function toggleSubAvailability(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const sub = await prisma.subPlayer.findUnique({ where: { id }, select: { isAvailable: true } })
    if (!sub) return { success: false, error: 'Sub not found.' }

    await prisma.subPlayer.update({
      where: { id },
      data: { isAvailable: !sub.isAvailable },
    })

    revalidatePath('/admin/sub-list')
    return { success: true }
  } catch (err) {
    console.error('toggleSubAvailability error:', err)
    return { success: false, error: 'Failed to toggle availability.' }
  }
}

export async function deleteSubPlayer(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.subPlayer.delete({ where: { id } })
    revalidatePath('/admin/sub-list')
    return { success: true }
  } catch (err) {
    console.error('deleteSubPlayer error:', err)
    return { success: false, error: 'Failed to delete sub.' }
  }
}
