import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PlayerForm } from '@/components/PlayerForm'

export default async function EditPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      careerStats: true,
    },
  })

  if (!player) notFound()

  const cs = player.careerStats

  return (
    <main style={{ maxWidth: 500, margin: '0 auto', padding: '36px 24px 60px' }}>
      <div style={{ marginBottom: 8 }}>
        <Link href="/admin/players" style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none' }}>
          ← Back to Players
        </Link>
      </div>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(24px, 4vw, 40px)',
          letterSpacing: 3, lineHeight: 1, color: 'var(--text)',
        }}>
          Edit Player
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>
          {player.firstName} {player.lastName}
        </p>
      </div>

      {/* Career stats summary */}
      {cs && cs.gamesPlayed > 0 && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '14px 18px',
          marginBottom: 20,
          display: 'flex',
          gap: 20,
          flexWrap: 'wrap',
        }}>
          {[
            { label: 'GP', value: cs.gamesPlayed },
            { label: 'PPG', value: (cs.points / cs.gamesPlayed).toFixed(1) },
            { label: 'RPG', value: (cs.rebounds / cs.gamesPlayed).toFixed(1) },
            { label: 'APG', value: (cs.assists / cs.gamesPlayed).toFixed(1) },
            { label: 'Seasons', value: cs.sessionsPlayed },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 500, color: 'var(--text)' }}>
                {value}
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      )}

      <PlayerForm
        mode="edit"
        playerId={player.id}
        initial={{
          firstName: player.firstName,
          lastName: player.lastName,
          displayName: player.displayName,
          email: player.email ?? '',
          isActive: player.isActive,
        }}
      />
    </main>
  )
}
