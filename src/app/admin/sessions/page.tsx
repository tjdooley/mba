import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { SessionActions } from '@/components/SessionActions'

async function getSessionsData() {
  return prisma.session.findMany({
    orderBy: { startDate: 'desc' },
    include: {
      champion: { include: { captain: { select: { displayName: true } } } },
      _count: { select: { teams: true, games: true } },
    },
  })
}

export default async function AdminSessionsPage() {
  const sessions = await getSessionsData()

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '36px 24px 60px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 28, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(28px, 5vw, 48px)',
            letterSpacing: 3, lineHeight: 1, color: 'var(--text)',
          }}>
            Sessions
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>
            {sessions.length} seasons
          </p>
        </div>
        <Link href="/admin/sessions/new" style={{
          padding: '10px 20px',
          background: 'linear-gradient(135deg, #1db954, #128f3e)',
          border: 'none', borderRadius: 8,
          fontSize: 13, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
          color: '#fff', textDecoration: 'none',
        }}>
          + New Session
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sessions.map((s) => (
          <div key={s.id} style={{
            background: 'var(--surface)',
            border: `1px solid ${s.isActive ? 'rgba(29,185,84,0.25)' : 'var(--border)'}`,
            borderRadius: 10,
            padding: '18px 20px',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 24, letterSpacing: 2, color: 'var(--text)', lineHeight: 1,
                  }}>
                    {s.name}
                  </span>
                  {s.isActive && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 9, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
                      color: 'var(--green)',
                      background: 'rgba(29,185,84,0.12)', border: '1px solid rgba(29,185,84,0.25)',
                      borderRadius: 4, padding: '2px 6px',
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
                      Active
                    </span>
                  )}
                  {s.champion && (
                    <span style={{ fontSize: 16 }}>🏆 {s.champion.captain.displayName}</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                  {s._count.teams} teams · {s._count.games} games ·{' '}
                  {new Date(s.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  {s.endDate && <> — {new Date(s.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</>}
                </div>
              </div>

              <SessionActions
                sessionId={s.id}
                isActive={s.isActive}
                hasEndDate={!!s.endDate}
              />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
