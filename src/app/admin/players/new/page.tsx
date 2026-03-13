import Link from 'next/link'
import { PlayerForm } from '@/components/PlayerForm'

export default function NewPlayerPage() {
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
          New Player
        </h1>
      </div>

      <PlayerForm mode="create" />
    </main>
  )
}
