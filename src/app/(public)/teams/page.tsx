import { prisma } from '@/lib/prisma'
import { Division } from '@/generated/prisma/client'
import Link from 'next/link'

// ─── DATA ────────────────────────────────────────────────────────────────

async function getTeamsData() {
  const session = await prisma.session.findFirst({
    where: { isActive: true },
    orderBy: { startDate: 'desc' },
  })

  if (!session) return null

  const teams = await prisma.team.findMany({
    where: { sessionId: session.id },
    include: {
      captain: { select: { id: true, displayName: true } },
      roster: {
        where: { isSub: false },
        include: { player: { select: { id: true, displayName: true } } },
      },
    },
    orderBy: [{ wins: 'desc' }, { pointDifferential: 'desc' }],
  })

  return { session, teams }
}

// ─── PAGE ─────────────────────────────────────────────────────────────────

export default async function TeamsPage() {
  const data = await getTeamsData()

  if (!data) {
    return (
      <main style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--muted)' }}>
        No active session found.
      </main>
    )
  }

  const { session, teams } = data
  const freehouse = teams.filter((t) => t.division === Division.FREEHOUSE)
  const delaneys  = teams.filter((t) => t.division === Division.DELANEYS)

  return (
    <main>
      <style>{`.team-card:hover { border-color: var(--green) !important; background: rgba(29,185,84,0.04) !important; }`}</style>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(180deg, #0f1620 0%, var(--dark) 100%)',
        borderBottom: '1px solid var(--border)',
        padding: '36px 24px 32px',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(36px, 6vw, 60px)',
              letterSpacing: 3,
              lineHeight: 1,
              color: 'var(--text)',
            }}>
              Team{' '}
              <span style={{
                background: 'linear-gradient(135deg, #1db954, #2a8f8f)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Directory
              </span>
            </h1>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8, letterSpacing: '0.4px' }}>
              {teams.length} teams · {session.name}
            </p>
          </div>
          <Link href="/seasons" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(107,124,147,0.1)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '8px 14px',
            fontSize: 12, fontWeight: 600, color: 'var(--muted)', textDecoration: 'none',
            letterSpacing: '0.3px',
          }}>
            📅 Past Seasons
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px 60px' }}>
        <DivisionSection label="FreeHouse Division" teams={freehouse} rank_offset={0} />
        <DivisionSection label="Delaney's Division" teams={delaneys} rank_offset={0} />
      </div>
    </main>
  )
}

// ─── DIVISION SECTION ─────────────────────────────────────────────────────

type TeamItem = NonNullable<Awaited<ReturnType<typeof getTeamsData>>>['teams'][number]

function DivisionSection({ label, teams, rank_offset }: { label: string; teams: TeamItem[]; rank_offset: number }) {
  const isFreehouse = label.includes('FreeHouse')
  const accent = isFreehouse ? 'var(--green)' : 'var(--teal)'

  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span style={{
          display: 'inline-block',
          width: 3, height: 20, borderRadius: 2,
          background: accent,
          flexShrink: 0,
        }} />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 2, color: 'var(--text)' }}>
          {label}
        </span>
        <span style={{ flex: 1, height: 1, background: 'var(--border)', display: 'block' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {teams.map((team, i) => (
          <TeamCard key={team.id} team={team} rank={i + 1} accent={accent} />
        ))}
      </div>
    </div>
  )
}

// ─── TEAM CARD ────────────────────────────────────────────────────────────

function TeamCard({ team, rank, accent }: { team: TeamItem; rank: number; accent: string }) {
  const record = `${team.wins}–${team.losses}`
  const divRecord = `${team.divisionWins}–${team.divisionLosses}`
  const diff = team.pointDifferential
  const diffStr = diff > 0 ? `+${diff}` : `${diff}`
  const diffColor = diff > 0 ? 'var(--green)' : diff < 0 ? 'var(--red)' : 'var(--muted)'

  return (
    <Link href={`/teams/${team.id}`} style={{ textDecoration: 'none' }}>
      <div className="team-card" style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '18px 20px',
        transition: 'border-color 0.15s, background 0.15s',
        cursor: 'pointer',
        height: '100%',
        boxSizing: 'border-box',
      }}>
        {/* Rank + Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
            color: rank === 1 ? accent : 'var(--muted)',
            background: rank === 1 ? 'rgba(29,185,84,0.12)' : 'rgba(107,124,147,0.08)',
            border: `1px solid ${rank === 1 ? 'rgba(29,185,84,0.3)' : 'var(--border)'}`,
            borderRadius: 20, padding: '2px 8px',
          }}>
            #{rank}
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: 1, color: 'var(--text)' }}>
            {team.captain.displayName}
          </span>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
          <StatPill label="Record" value={record} color="var(--text)" />
          <StatPill label="Div" value={divRecord} color="var(--muted)" />
          <StatPill label="Diff" value={diffStr} color={diffColor} />
        </div>

        {/* Players */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {team.roster.slice(0, 7).map((r) => (
            <span key={r.player.id} style={{
              fontSize: 11, color: 'var(--muted)',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(42,53,72,0.6)',
              borderRadius: 4, padding: '2px 7px',
            }}>
              {r.player.displayName}
            </span>
          ))}
          {team.roster.length > 7 && (
            <span style={{ fontSize: 11, color: 'var(--muted)', padding: '2px 4px' }}>
              +{team.roster.length - 7} more
            </span>
          )}
        </div>

        <div style={{ marginTop: 14, fontSize: 11, color: accent, fontWeight: 600, letterSpacing: '0.4px' }}>
          View Team →
        </div>
      </div>
    </Link>
  )
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color }}>
        {value}
      </div>
    </div>
  )
}