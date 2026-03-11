import { prisma } from '@/lib/prisma'
import { Division } from '@/generated/prisma/client'
import Link from 'next/link'

// ─── DATA ────────────────────────────────────────────────────────────────

async function getSeasonsData() {
  const sessions = await prisma.session.findMany({
    orderBy: { startDate: 'desc' },
    include: {
      champion: {
        include: { captain: { select: { id: true, displayName: true } } },
      },
      teams: {
        include: {
          captain: { select: { id: true, displayName: true } },
          roster: {
            where: { isSub: false },
            select: { player: { select: { displayName: true } } },
          },
        },
        orderBy: [{ wins: 'desc' }, { pointDifferential: 'desc' }],
      },
    },
  })

  return sessions
}

// ─── PAGE ─────────────────────────────────────────────────────────────────

export default async function SeasonsPage() {
  const sessions = await getSeasonsData()
  const activeSeason = sessions.find((s) => s.isActive)
  const pastSeasons  = sessions.filter((s) => !s.isActive)

  return (
    <main>
      <style>{`
        .team-row:hover { background: rgba(255,255,255,0.025) !important; }
        .season-card { transition: border-color 0.15s; }
      `}</style>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(180deg, #0f1620 0%, var(--dark) 100%)',
        borderBottom: '1px solid var(--border)',
        padding: '36px 24px 32px',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(36px, 6vw, 60px)',
            letterSpacing: 3, lineHeight: 1, color: 'var(--text)',
          }}>
            Season{' '}
            <span style={{
              background: 'linear-gradient(135deg, #1db954, #2a8f8f)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Archive
            </span>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8, letterSpacing: '0.4px' }}>
            {sessions.length} seasons · MBA Madison, WI
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px 60px' }}>

        {/* Current season */}
        {activeSeason && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(29,185,84,0.12)', border: '1px solid rgba(29,185,84,0.25)',
                borderRadius: 20, padding: '3px 10px',
                fontSize: 11, fontWeight: 600, color: 'var(--green)', letterSpacing: 1, textTransform: 'uppercase',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                Current Season
              </span>
              <span style={{ flex: 1, height: 1, background: 'var(--border)', display: 'block' }} />
            </div>
            <SeasonCard session={activeSeason} isCurrent />
          </>
        )}

        {/* Past seasons */}
        {pastSeasons.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, marginTop: activeSeason ? 36 : 0 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 2, color: 'var(--text)' }}>
                Past Seasons
              </span>
              <span style={{ flex: 1, height: 1, background: 'var(--border)', display: 'block' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {pastSeasons.map((s) => (
                <SeasonCard key={s.id} session={s} isCurrent={false} />
              ))}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
      `}</style>
    </main>
  )
}

// ─── SEASON CARD ─────────────────────────────────────────────────────────

type SessionWithTeams = Awaited<ReturnType<typeof getSeasonsData>>[number]

function SeasonCard({ session, isCurrent }: { session: SessionWithTeams; isCurrent: boolean }) {
  const freehouseTeams = session.teams.filter((t) => t.division === Division.FREEHOUSE)
  const delaneysTeams  = session.teams.filter((t) => t.division === Division.DELANEYS)
  const totalGames     = session.teams.reduce((sum, t) => sum + t.wins + t.losses, 0) / 2

  return (
    <div className="season-card" style={{
      background: 'var(--surface)',
      border: `1px solid ${isCurrent ? 'rgba(29,185,84,0.25)' : 'var(--border)'}`,
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {/* Card header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
        background: isCurrent ? 'rgba(29,185,84,0.04)' : 'rgba(255,255,255,0.01)',
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            letterSpacing: 2,
            color: 'var(--text)',
            lineHeight: 1,
          }}>
            {session.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            {session.teams.length} teams · {Math.round(totalGames)} games played
            {session.startDate && (
              <> · {new Date(session.startDate).getFullYear()}</>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Champion badge */}
          {session.champion && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(245,166,35,0.1)',
              border: '1px solid rgba(245,166,35,0.3)',
              borderRadius: 8, padding: '8px 14px',
            }}>
              <span style={{ fontSize: 18 }}>🏆</span>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 2 }}>
                  Champion
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text)', letterSpacing: 1 }}>
                  {session.champion.captain.displayName}
                </div>
              </div>
            </div>
          )}

          {isCurrent && (
            <Link href="/teams" style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'rgba(29,185,84,0.1)', border: '1px solid rgba(29,185,84,0.25)',
              borderRadius: 8, padding: '8px 14px',
              fontSize: 12, fontWeight: 600, color: 'var(--green)', textDecoration: 'none',
            }}>
              View Teams →
            </Link>
          )}
        </div>
      </div>

      {/* Standings grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
        <DivisionStandings label="FreeHouse" teams={freehouseTeams} />
        <DivisionStandings label="Delaney's" teams={delaneysTeams} borderLeft />
      </div>
    </div>
  )
}

// ─── DIVISION MINI STANDINGS ─────────────────────────────────────────────

function DivisionStandings({ label, teams, borderLeft }: { label: string; teams: SessionWithTeams['teams']; borderLeft?: boolean }) {
  return (
    <div style={{ borderLeft: borderLeft ? '1px solid var(--border)' : 'none' }}>
      <div style={{
        padding: '8px 14px',
        fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
        color: 'var(--muted)', borderBottom: '1px solid var(--border)',
        background: 'rgba(255,255,255,0.01)',
      }}>
        {label}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Team', 'W', 'L', 'Diff'].map((h, i) => (
              <th key={h} style={{
                padding: '5px 10px',
                fontSize: 9, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase',
                color: 'var(--muted)', textAlign: i === 0 ? 'left' : 'right',
                borderBottom: '1px solid var(--border)',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teams.map((t, i) => {
            const diff = t.pointDifferential
            const diffStr = diff > 0 ? `+${diff}` : `${diff}`
            const notLast = i < teams.length - 1
            return (
              <tr key={t.id} className="team-row" style={{ transition: 'background 0.1s' }}>
                <td style={{
                  padding: '8px 10px', fontSize: 13, fontWeight: i === 0 ? 700 : 500,
                  color: i === 0 ? 'var(--green)' : 'var(--text)',
                  borderBottom: notLast ? '1px solid rgba(42,53,72,0.4)' : 'none',
                }}>
                  <Link href={`/teams/${t.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {t.captain.displayName}
                  </Link>
                </td>
                <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 12, textAlign: 'right', color: 'var(--text)', borderBottom: notLast ? '1px solid rgba(42,53,72,0.4)' : 'none' }}>
                  {t.wins}
                </td>
                <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 12, textAlign: 'right', color: 'var(--muted)', borderBottom: notLast ? '1px solid rgba(42,53,72,0.4)' : 'none' }}>
                  {t.losses}
                </td>
                <td style={{
                  padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 12, textAlign: 'right',
                  color: diff > 0 ? 'var(--green)' : diff < 0 ? 'var(--red)' : 'var(--muted)',
                  borderBottom: notLast ? '1px solid rgba(42,53,72,0.4)' : 'none',
                }}>
                  {diffStr}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}