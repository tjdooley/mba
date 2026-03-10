'use client'

import { useState } from 'react'
import Link from 'next/link'

type SerializedGame = {
  id:           string
  status:       string
  isPlayoff:    boolean
  playoffRound: number | null
  week:         number | null
  court:        string | null
  scheduledAt:  string
  homeScore:    number
  awayScore:    number
  homeTeam:     string
  awayTeam:     string
  homeTeamId:   string
  awayTeamId:   string
}

type Props = {
  upcoming:  SerializedGame[]
  results:   SerializedGame[]
  playoffs:  SerializedGame[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function weekLabel(g: SerializedGame) {
  if (g.isPlayoff) {
    const rounds: Record<number, string> = { 1: 'Wild Card', 2: 'Semifinals', 3: 'Championship' }
    return rounds[g.playoffRound ?? 1] ?? 'Playoffs'
  }
  return g.week ? `Week ${g.week}` : '—'
}

function groupByWeek(games: SerializedGame[]) {
  const map = new Map<string, { label: string; date: string; games: SerializedGame[] }>()
  for (const g of games) {
    const key = weekLabel(g)
    if (!map.has(key)) map.set(key, { label: key, date: g.scheduledAt, games: [] })
    map.get(key)!.games.push(g)
  }
  return Array.from(map.values())
}

function GameRow({ g, showResult }: { g: SerializedGame; showResult: boolean }) {
  const homeWon = g.homeScore > g.awayScore

  return (
    <Link
      href={`/games/${g.id}`}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '11px 16px',
        textDecoration: 'none',
        borderBottom: '1px solid rgba(42,53,72,0.4)',
        transition: 'background 0.12s',
        gap: 12,
      }}
      className="game-row"
    >
      {/* Home team */}
      <span style={{
        fontWeight: 600,
        fontSize: 14,
        color: showResult ? (homeWon ? 'var(--green)' : 'var(--muted)') : 'var(--text)',
      }}>
        {g.homeTeam}
      </span>

      {/* Score or VS */}
      {showResult ? (
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 18,
          letterSpacing: 2,
          minWidth: 80,
          textAlign: 'center',
          color: 'var(--text)',
        }}>
          <span style={{ color: homeWon ? 'var(--green)' : 'var(--muted)' }}>{g.homeScore}</span>
          <span style={{ color: 'var(--border)', margin: '0 4px', fontSize: 13 }}>–</span>
          <span style={{ color: !homeWon ? 'var(--green)' : 'var(--muted)' }}>{g.awayScore}</span>
        </span>
      ) : (
        <div style={{ textAlign: 'center', minWidth: 80 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1 }}>VS</div>
          {g.court && (
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{g.court}</div>
          )}
        </div>
      )}

      {/* Away team */}
      <span style={{
        fontWeight: 600,
        fontSize: 14,
        color: showResult ? (!homeWon ? 'var(--green)' : 'var(--muted)') : 'var(--text)',
        textAlign: 'right',
      }}>
        {g.awayTeam}
      </span>
    </Link>
  )
}

function WeekGroup({ group, showResult }: {
  group: { label: string; date: string; games: SerializedGame[] }
  showResult: boolean
}) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
      marginBottom: 12,
    }}>
      {/* Week header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '9px 16px',
        borderBottom: '1px solid var(--border)',
      }}>
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: 'var(--amber)',
        }}>
          {group.label}
        </span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          {formatDate(group.date)}
        </span>
      </div>

      {/* Games */}
      {group.games.map((g, i) => (
        <div key={g.id} style={{ borderBottom: i < group.games.length - 1 ? undefined : 'none' }}>
          <GameRow g={g} showResult={showResult} />
        </div>
      ))}
    </div>
  )
}

function PlayoffBracket({ games }: { games: SerializedGame[] }) {
  const rounds = [
    { label: 'Wild Card',     round: 1 },
    { label: 'Semifinals',    round: 2 },
    { label: 'Championship',  round: 3 },
  ]

  return (
    <div>
      {rounds.map(({ label, round }) => {
        const roundGames = games.filter((g) => g.playoffRound === round)
        if (roundGames.length === 0) return (
          <div key={round} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            overflow: 'hidden',
            marginBottom: 12,
          }}>
            <div style={{
              padding: '9px 16px',
              borderBottom: '1px solid var(--border)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: 'var(--amber)',
            }}>
              {label}
            </div>
            <div style={{ padding: '14px 16px', fontSize: 13, color: 'var(--muted)' }}>
              Not yet scheduled
            </div>
          </div>
        )
        return (
          <div key={round} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            overflow: 'hidden',
            marginBottom: 12,
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '9px 16px',
              borderBottom: '1px solid var(--border)',
            }}>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                color: 'var(--amber)',
              }}>
                {label}
              </span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                {formatDate(roundGames[0].scheduledAt)}
              </span>
            </div>
            {roundGames.map((g, i) => (
              <div key={g.id} style={{ borderBottom: i < roundGames.length - 1 ? undefined : 'none' }}>
                <GameRow g={g} showResult={g.status === 'FINAL'} />
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

export function ScheduleTabs({ upcoming, results, playoffs }: Props) {
  const [tab, setTab] = useState<'upcoming' | 'results' | 'playoffs'>('upcoming')

  const tabs = [
    { key: 'upcoming' as const,  label: 'Upcoming',  count: upcoming.length  },
    { key: 'results'  as const,  label: 'Results',   count: results.length   },
    { key: 'playoffs' as const,  label: 'Playoffs',  count: playoffs.length  },
  ]

  const upcomingGroups = groupByWeek(upcoming)
  const resultsGroups  = groupByWeek(results)

  return (
    <>
      <style>{`
        .game-row:hover { background: rgba(255,255,255,0.025) !important; }
      `}</style>

      {/* Tab bar */}
      <div style={{
        background: 'var(--mid)',
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
      }}>
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', gap: 4 }}>
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                background: 'none',
                border: 'none',
                padding: '12px 16px',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'var(--font-body)',
                cursor: 'pointer',
                color: tab === key ? 'var(--green)' : 'var(--muted)',
                borderBottom: `2px solid ${tab === key ? 'var(--green)' : 'transparent'}`,
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {label}
              <span style={{
                background: tab === key ? 'rgba(29,185,84,0.15)' : 'rgba(107,124,147,0.15)',
                color: tab === key ? 'var(--green)' : 'var(--muted)',
                fontSize: 10,
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 10,
              }}>
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 24px 60px' }}>
        {tab === 'upcoming' && (
          upcomingGroups.length === 0
            ? <Empty message="No upcoming games scheduled." />
            : upcomingGroups.map((g) => <WeekGroup key={g.label} group={g} showResult={false} />)
        )}
        {tab === 'results' && (
          resultsGroups.length === 0
            ? <Empty message="No results yet." />
            : resultsGroups.map((g) => <WeekGroup key={g.label} group={g} showResult={true} />)
        )}
        {tab === 'playoffs' && (
          <PlayoffBracket games={playoffs} />
        )}
      </div>
    </>
  )
}

function Empty({ message }: { message: string }) {
  return (
    <div style={{
      padding: '40px 0',
      textAlign: 'center',
      color: 'var(--muted)',
      fontSize: 14,
    }}>
      {message}
    </div>
  )
}