'use server'

import { prisma } from '@/lib/prisma'
import { SessionPeriod } from '@/generated/prisma/client'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type CreateSessionInput = {
  name: string
  period: 'FALL' | 'SPRING'
  year: number
  startDate: string // ISO string
}

export async function createSession(input: CreateSessionInput): Promise<{ success: boolean; error?: string }> {
  try {
    if (!input.name.trim()) {
      return { success: false, error: 'Session name is required.' }
    }

    await prisma.session.create({
      data: {
        name: input.name.trim(),
        period: input.period as SessionPeriod,
        year: input.year,
        startDate: new Date(input.startDate),
        isActive: false,
      },
    })

    revalidatePath('/', 'layout')
    redirect('/admin/sessions')
  } catch (err) {
    if (err instanceof Error && err.message === 'NEXT_REDIRECT') throw err
    console.error('createSession error:', err)
    return { success: false, error: 'Failed to create session.' }
  }
}

export async function activateSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Deactivate all sessions, then activate the selected one
    await prisma.$transaction([
      prisma.session.updateMany({ data: { isActive: false } }),
      prisma.session.update({ where: { id: sessionId }, data: { isActive: true } }),
    ])

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err) {
    console.error('activateSession error:', err)
    return { success: false, error: 'Failed to activate session.' }
  }
}

export async function closeSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        isActive: false,
        endDate: new Date(),
      },
    })

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err) {
    console.error('closeSession error:', err)
    return { success: false, error: 'Failed to close session.' }
  }
}
