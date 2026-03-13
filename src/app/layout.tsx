import type { Metadata } from 'next'
import { Bebas_Neue, DM_Sans, DM_Mono } from 'next/font/google'
import './globals.css'
import { NavBar } from '@/components/NavBar'
import { prisma } from '@/lib/prisma'

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
})

const dmMono = DM_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-dm-mono',
})

export const metadata: Metadata = {
  title: 'MBA Basketball',
  description: 'Madison Basketball Association',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const activeSession = await prisma.session.findFirst({
    where: { isActive: true },
    select: { name: true },
  })

  return (
    <html lang="en" className={`${bebasNeue.variable} ${dmSans.variable} ${dmMono.variable}`}>
      <body>
        <NavBar activeSessionName={activeSession?.name} />
        {children}
      </body>
    </html>
  )
}