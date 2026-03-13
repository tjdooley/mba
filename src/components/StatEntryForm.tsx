'use client'

import { useState, useTransition } from 'react'
import { saveStats, type SaveStatsInput, type StatRow } from '@/app/admin/games/[id]/stats/actions'

export type PlayerInfo = {
  playerId: string
  displayName: string
  existing?: {
    fgMade: number; fgAttempted: number
    threesMade: number; threesAttempted: number
    ftMade: number; ftAttempted: number
    rebounds: number; assists: number
    blocks: number; steals: number; turnovers: number
  }
}

export type TeamInfo = {
  teamId: string
  captainName: string
  players: PlayerInfo[]
}

type Props = {
  gameId: string
  homeTeam: TeamInfo
  awayTeam: TeamInfo
  initialHomeScore: number
  initialAwayScore: number
  gameStatus: string
}

type PlayerStats = {
  fgMade: number; fgAttempted: number
  threesMade: number; threesAttempted: number
  ftMade: number; ftAttempted: number
  rebounds: number; assists: number
  blocks: number; steals: number; turnovers: number
}

const EMPTY_STATS: PlayerStats = {
  fgMade: 0, fgAttempted: 0, threesMade: 0, threesAttempted: 0,
  ftMade: 0, ftAttempted: 0, rebounds: 0, assists: 0,
  blocks: 0, steals: 0, turnovers: 0,
}

const STAT_COLS: { key: keyof PlayerStats; label: string; width: number }[] = [
  { key: 'fgMade',          label: 'FGM', width: 48 },
  { key: 'fgAttempted',     label: 'FGA', width: 48 },
  { key: 'threesMade',      label: '3PM', width: 48 },
  { key: 'threesAttempted', label: '3PA', width: 48 },
  { key: 'ftMade',          label: 'FTM', width: 48 },
  { key: 'ftAttempted',     label: 'FTA', width: 48 },
  { key: 'rebounds',        label: 'REB', width: 48 },
  { key: 'assists',         label: 'AST', width: 48 },
  { key: 'blocks',          label: 'BLK', width: 48 },
  { key: 'steals',          label: 'STL', width: 48 },
  { key: 'turnovers',       label: 'TO',  width: 48 },
]

function calcPoints(s: PlayerStats) {
  return (s.fgMade - s.threesMade) * 2 + s.threesMade * 3 + s.ftMade
}

export function StatEntryForm({ gameId, homeTeam, awayTeam, initialHomeScore, initialAwayScore, gameStatus }: Props) {
  const allPlayers = [...homeTeam.players, ...awayTeam.players]
  const initialStats: Record<string, PlayerStats> = {}
  for (const p of allPlayers) {
    initialStats[p.playerId] = p.existing ? { ...p.existing } : { ...EMPTY_STATS }
  }

  const [stats, setStats] = useState<Record<string, PlayerStats>>(initialStats)
  const [homeScore, setHomeScore] = useState(initialHomeScore)
  const [awayScore, setAwayScore] = useState(initialAwayScore)
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null)

  function updateStat(playerId: string, key: keyof PlayerStats, value: number) {
    setStats((prev) => ({
      ...prev,
      [playerId]: { ...prev[playerId], [key]: Math.max(0, value) },
    }))
  }

  function teamTotalPoints(team: TeamInfo) {
    return team.players.reduce((sum, p) => sum + calcPoints(stats[p.playerId] || EMPTY_STATS), 0)
  }

  function handleSave() {
    const statRows: StatRow[] = []
    for (const p of homeTeam.players) {
      statRows.push({ playerId: p.playerId, teamId: homeTeam.teamId, ...stats[p.playerId] })
    }
    for (const p of awayTeam.players) {
      statRows.push({ playerId: p.playerId, teamId: awayTeam.teamId, ...stats[p.playerId] })
    }

    const input: SaveStatsInput = { gameId, homeScore, awayScore, stats: statRows }

    startTransition(async () => {
      const res = await saveStats(input)
      setResult(res)
    })
  }

  return (
    <div>
      {/* Score header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24,
        marginBottom: 32, flexWrap: 'wrap',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
            {homeTeam.captainName} (Home)
          </div>
          <input
            type="number" min={0} value={homeScore}
            onChange={(e) => setHomeScore(Math.max(0, parseInt(e.target.value) || 0))}
            style={{
              width: 80, textAlign: 'center',
              background: 'var(--mid)', border: '1px solid var(--border)', borderRadius: 8,
              padding: '10px 0', fontSize: 28, fontFamily: 'var(--font-mono)', fontWeight: 700,
              color: 'var(--text)', outline: 'none',
            }}
          />
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
            Stat Total: {teamTotalPoints(homeTeam)}
          </div>
        </div>

        <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--muted)', letterSpacing: 2 }}>
          VS
        </span>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
            {awayTeam.captainName} (Away)
          </div>
          <input
            type="number" min={0} value={awayScore}
            onChange={(e) => setAwayScore(Math.max(0, parseInt(e.target.value) || 0))}
            style={{
              width: 80, textAlign: 'center',
              background: 'var(--mid)', border: '1px solid var(--border)', borderRadius: 8,
              padding: '10px 0', fontSize: 28, fontFamily: 'var(--font-mono)', fontWeight: 700,
              color: 'var(--text)', outline: 'none',
            }}
          />
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
            Stat Total: {teamTotalPoints(awayTeam)}
          </div>
        </div>
      </div>

      {/* Team stat tables */}
      <TeamStatTable
        team={homeTeam}
        stats={stats}
        onUpdate={updateStat}
        label="Home"
      />
      <div style={{ height: 24 }} />
      <TeamStatTable
        team={awayTeam}
        stats={stats}
        onUpdate={updateStat}
        label="Away"
      />

      {/* Save button */}
      <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <button
          onClick={handleSave}
          disabled={isPending}
          style={{
            padding: '12px 32px',
            background: isPending ? 'rgba(29,185,84,0.5)' : 'linear-gradient(135deg, #1db954, #128f3e)',
            border: 'none', borderRadius: 8,
            fontSize: 14, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
            color: '#fff', cursor: isPending ? 'not-allowed' : 'pointer',
          }}
        >
          {isPending ? 'Saving…' : gameStatus === 'FINAL' ? 'Update Stats' : 'Save & Finalize'}
        </button>

        {result && (
          <span style={{
            fontSize: 13, fontWeight: 600,
            color: result.success ? 'var(--green)' : 'var(--red)',
          }}>
            {result.success ? 'Stats saved successfully!' : result.error}
          </span>
        )}
      </div>

      <style>{`
        .stat-input { transition: border-color 0.15s; }
        .stat-input:focus { border-color: var(--green) !important; }
        .stat-row:hover { background: rgba(255,255,255,0.02); }
      `}</style>
    </div>
  )
}

function TeamStatTable({
  team, stats, onUpdate, label,
}: {
  team: TeamInfo
  stats: Record<string, PlayerStats>
  onUpdate: (pid: string, key: keyof PlayerStats, val: number) => void
  label: string
}) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '1.5px',
          textTransform: 'uppercase', color: 'var(--green)',
        }}>
          {team.captainName}
        </span>
        <span style={{ fontSize: 10, color: 'var(--muted)' }}>({label})</span>
      </div>

      {/* Scrollable stat grid */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
          <thead>
            <tr>
              <th style={{
                padding: '7px 12px', textAlign: 'left', position: 'sticky', left: 0,
                background: 'var(--surface)', fontSize: 10, fontWeight: 600,
                letterSpacing: '1px', color: 'var(--muted)', borderBottom: '1px solid var(--border)',
                minWidth: 120,
              }}>
                PLAYER
              </th>
              {STAT_COLS.map((c) => (
                <th key={c.key} style={{
                  padding: '7px 4px', textAlign: 'center', fontSize: 10, fontWeight: 600,
                  letterSpacing: '0.5px', color: 'var(--muted)', borderBottom: '1px solid var(--border)',
                  width: c.width,
                }}>
                  {c.label}
                </th>
              ))}
              <th style={{
                padding: '7px 12px', textAlign: 'center', fontSize: 10, fontWeight: 600,
                letterSpacing: '0.5px', color: 'var(--green)', borderBottom: '1px solid var(--border)',
                width: 52,
              }}>
                PTS
              </th>
            </tr>
          </thead>
          <tbody>
            {team.players.map((p, i) => {
              const ps = stats[p.playerId] || EMPTY_STATS
              const pts = calcPoints(ps)
              const notLast = i < team.players.length - 1
              return (
                <tr key={p.playerId} className="stat-row">
                  <td style={{
                    padding: '8px 12px', fontSize: 13, fontWeight: 600, color: 'var(--text)',
                    position: 'sticky', left: 0, background: 'var(--surface)',
                    borderBottom: notLast ? '1px solid rgba(42,53,72,0.4)' : 'none',
                    whiteSpace: 'nowrap',
                  }}>
                    {p.displayName}
                  </td>
                  {STAT_COLS.map((c) => (
                    <td key={c.key} style={{
                      padding: '4px 2px', textAlign: 'center',
                      borderBottom: notLast ? '1px solid rgba(42,53,72,0.4)' : 'none',
                    }}>
                      <input
                        type="number"
                        min={0}
                        value={ps[c.key] || ''}
                        onChange={(e) => onUpdate(p.playerId, c.key, parseInt(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        className="stat-input"
                        style={{
                          width: 42, textAlign: 'center',
                          background: 'var(--mid)', border: '1px solid var(--border)', borderRadius: 4,
                          padding: '6px 2px', fontSize: 13, fontFamily: 'var(--font-mono)',
                          color: 'var(--text)', outline: 'none',
                        }}
                      />
                    </td>
                  ))}
                  <td style={{
                    padding: '8px 12px', textAlign: 'center',
                    fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700,
                    color: pts > 0 ? 'var(--green)' : 'var(--muted)',
                    borderBottom: notLast ? '1px solid rgba(42,53,72,0.4)' : 'none',
                  }}>
                    {pts}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
