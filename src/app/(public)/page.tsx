import { prisma } from '@/lib/prisma'
import { Division } from '@/generated/prisma/client'
import Link from 'next/link'

// ─── DATA FETCHING ────────────────────────────────────────────────────────

async function getStandingsData() {
  const session = await prisma.session.findFirst({
    where: { isActive: true },
    orderBy: { startDate: 'desc' },
  })

  if (!session) return null

  const teams = await prisma.team.findMany({
    where: { sessionId: session.id },
    include: {
      captain: { select: { id: true, displayName: true } },
    },
  })

  return { session, teams }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────

function sortTeams(teams: NonNullable<Awaited<ReturnType<typeof getStandingsData>>>['teams']) {
  return [...teams].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    return b.pointDifferential - a.pointDifferential
  })
}

function PointDiff({ n }: { n: number }) {
  const color = n > 0 ? 'var(--green)' : n < 0 ? 'var(--red)' : 'var(--muted)'
  const label = n > 0 ? `+${n}` : `${n}`
  return (
    <span style={{ color, fontFamily: 'var(--font-mono)', fontSize: 13 }}>
      {label}
    </span>
  )
}

// ─── STANDINGS TABLE ─────────────────────────────────────────────────────

type Team = NonNullable<Awaited<ReturnType<typeof getStandingsData>>>['teams'][number]

function StandingsTable({ teams, division }: { teams: Team[]; division: Division }) {
  const divTeams = sortTeams(teams.filter((t) => t.division === division))
  const isFreehouse = division === Division.FREEHOUSE
  const divLabel = isFreehouse ? 'FreeHouse' : "Delaney's"
  const accent = isFreehouse ? 'var(--green)' : 'var(--teal)'

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        overflow: 'hidden',
        marginBottom: 16,
      }}
    >
      {/* Division header */}
      <div
        style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: accent,
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        <span style={{ color: accent }}>{divLabel} Division</span>
      </div>

      {/* Column headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '28px 1fr 44px 44px 64px 64px',
          padding: '7px 16px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {['#', 'TEAM', 'W', 'L', 'DIV', 'DIFF'].map((h, i) => (
          <span
            key={h}
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '1px',
              color: 'var(--muted)',
              textAlign: i >= 2 ? 'right' : 'left',
            }}
          >
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {divTeams.map((t, i) => {
        const isLeader = i === 0
        const isPlayoffLine = i === 3 // below the fold — out of automatic spots
        const notLast = i < divTeams.length - 1

        return (
          <div
            key={t.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '28px 1fr 44px 44px 64px 64px',
              padding: '11px 16px',
              background: isLeader ? 'rgba(29,185,84,0.04)' : 'transparent',
              borderBottom: notLast ? '1px solid rgba(42,53,72,0.5)' : 'none',
              borderTop: isPlayoffLine ? '1px dashed rgba(245,166,35,0.25)' : undefined,
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: isLeader ? 'var(--amber)' : 'var(--muted)',
                fontWeight: isLeader ? 700 : 400,
              }}
            >
              {i + 1}
            </span>

            <Link
              href={`/teams/${t.id}`}
              style={{
                fontWeight: 600,
                fontSize: 14,
                color: isLeader ? 'var(--green)' : 'var(--text)',
                textDecoration: 'none',
              }}
            >
              {t.captain.displayName}
            </Link>

            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--green)',
                textAlign: 'right',
              }}
            >
              {t.wins}
            </span>

            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
                color: 'var(--red)',
                textAlign: 'right',
              }}
            >
              {t.losses}
            </span>

            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--muted)',
                textAlign: 'right',
              }}
            >
              {t.divisionWins}–{t.divisionLosses}
            </span>

            <span style={{ textAlign: 'right' }}>
              <PointDiff n={t.pointDifferential} />
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── PAGE ─────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const data = await getStandingsData()

  if (!data) {
    return (
      <main style={{ padding: 60, textAlign: 'center', color: 'var(--muted)' }}>
        No active session found.
      </main>
    )
  }

  const { session, teams } = data
  const leader = sortTeams(teams)[0]

  return (
    <main>
      {/* Hero */}
      <div
        style={{
          background: 'linear-gradient(180deg, #0f1620 0%, var(--dark) 100%)',
          borderBottom: '1px solid var(--border)',
          padding: '36px 24px 32px',
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(36px, 6vw, 60px)',
                letterSpacing: 3,
                lineHeight: 1,
                color: 'var(--text)',
              }}
            >
              Session{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #1db954, #2a8f8f)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Standings
              </span>
            </h1>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8, letterSpacing: '0.4px' }}>
              {session.name} · 10 regular season games · 6 teams qualify for playoffs
            </p>
          </div>

          {leader && (
            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  marginBottom: 4,
                }}
              >
                Overall Leader
              </div>
              <Link href={`/teams/${leader.id}`} style={{ textDecoration: 'none' }}>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 34,
                    color: 'var(--green)',
                    letterSpacing: 2,
                    lineHeight: 1,
                  }}
                >
                  {leader.captain.displayName}
                </div>
              </Link>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                {leader.wins}–{leader.losses} ·{' '}
                {leader.division === Division.FREEHOUSE ? 'FreeHouse' : "Delaney's"}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Standings */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px 60px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 20,
              letterSpacing: 2,
              color: 'var(--text)',
            }}
          >
            Division Standings
          </span>
          <span style={{ flex: 1, height: 1, background: 'var(--border)', display: 'block' }} />
        </div>

        <StandingsTable teams={teams} division={Division.FREEHOUSE} />
        <StandingsTable teams={teams} division={Division.DELANEYS} />

        <div
          style={{
            marginTop: 8,
            padding: '10px 14px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--muted)',
            lineHeight: 1.7,
          }}
        >
          <strong style={{ color: 'var(--amber)' }}>Playoff Picture</strong>
          {'  '}Top 3 from each division qualify · Wild Card · Semifinals · Championship
        </div>
      </div>
    </main>
  )
}