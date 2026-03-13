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

// ─── TSV PARSING ────────────────────────────────────────────────────────────

// Column mapping from the Google Sheet layout:
// 0: Name, 1: FGM, 2: FGA, 3: (skip), 4: 3PM, 5: 3PA, 6: (skip),
// 7: FTM, 8: FTA, 9-10: (skip), 11: REB, 12: AST, 13: BLK, 14: STL, 15: TOV
const COL_MAP: { col: number; key: keyof PlayerStats }[] = [
  { col: 1, key: 'fgMade' },
  { col: 2, key: 'fgAttempted' },
  { col: 4, key: 'threesMade' },
  { col: 5, key: 'threesAttempted' },
  { col: 7, key: 'ftMade' },
  { col: 8, key: 'ftAttempted' },
  { col: 11, key: 'rebounds' },
  { col: 12, key: 'assists' },
  { col: 13, key: 'blocks' },
  { col: 14, key: 'steals' },
  { col: 15, key: 'turnovers' },
]

type ParsedRow = { name: string; stats: PlayerStats }

function parseTSV(text: string): ParsedRow[] {
  const lines = text.trim().split('\n').filter((l) => l.trim())
  const rows: ParsedRow[] = []

  for (const line of lines) {
    const cells = line.split('\t').map((c) => c.trim())
    // Find the name — first non-empty cell that isn't purely numeric
    const nameIdx = cells.findIndex((c) => c && isNaN(Number(c)))
    if (nameIdx === -1) continue

    const name = cells[nameIdx]
    // Skip header-like rows or game labels
    if (/^(game|player|name|fgm|fg\s)/i.test(name)) continue

    const statCells = cells.slice(nameIdx + 1)
    const stats: PlayerStats = { ...EMPTY_STATS }

    // Map columns relative to the name column
    for (const { col, key } of COL_MAP) {
      const idx = col - 1 // col is 1-indexed relative to name at 0
      const val = parseInt(statCells[idx] ?? '')
      if (!isNaN(val)) stats[key] = Math.max(0, val)
    }

    rows.push({ name, stats })
  }

  return rows
}

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z]/g, '')
}

function matchPlayer(name: string, players: PlayerInfo[]): PlayerInfo | null {
  const n = normalize(name)
  // Exact displayName match
  const exact = players.find((p) => normalize(p.displayName) === n)
  if (exact) return exact
  // Last name match
  const byLast = players.find((p) => {
    const parts = p.displayName.split(' ')
    return parts.length > 1 && normalize(parts[parts.length - 1]) === n
  })
  if (byLast) return byLast
  // Partial match — name contains or is contained by displayName
  const partial = players.find(
    (p) => normalize(p.displayName).includes(n) || n.includes(normalize(p.displayName)),
  )
  return partial ?? null
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

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

  // Paste mode state
  const [mode, setMode] = useState<'manual' | 'paste'>('manual')
  const [homePaste, setHomePaste] = useState('')
  const [awayPaste, setAwayPaste] = useState('')
  const [pasteResult, setPasteResult] = useState<{ matched: string[]; unmatched: string[] } | null>(null)

  function updateStat(playerId: string, key: keyof PlayerStats, value: number) {
    setStats((prev) => ({
      ...prev,
      [playerId]: { ...prev[playerId], [key]: Math.max(0, value) },
    }))
  }

  function teamTotalPoints(team: TeamInfo) {
    return team.players.reduce((sum, p) => sum + calcPoints(stats[p.playerId] || EMPTY_STATS), 0)
  }

  function handleParse() {
    const matched: string[] = []
    const unmatched: string[] = []
    const newStats = { ...stats }

    // Parse home team
    const homeRows = parseTSV(homePaste)
    for (const row of homeRows) {
      const player = matchPlayer(row.name, homeTeam.players)
      if (player) {
        newStats[player.playerId] = row.stats
        matched.push(`${row.name} → ${player.displayName}`)
      } else {
        unmatched.push(row.name)
      }
    }

    // Parse away team
    const awayRows = parseTSV(awayPaste)
    for (const row of awayRows) {
      const player = matchPlayer(row.name, awayTeam.players)
      if (player) {
        newStats[player.playerId] = row.stats
        matched.push(`${row.name} → ${player.displayName}`)
      } else {
        unmatched.push(row.name)
      }
    }

    setStats(newStats)
    setPasteResult({ matched, unmatched })
    setMode('manual')
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
      setPasteResult(null)
    })
  }

  return (
    <div>
      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['manual', 'paste'] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setPasteResult(null); setResult(null) }}
            style={{
              padding: '7px 18px', borderRadius: 6,
              fontSize: 12, fontWeight: 600, letterSpacing: '0.5px',
              cursor: 'pointer',
              border: `1px solid ${mode === m ? 'rgba(29,185,84,0.4)' : 'var(--border)'}`,
              background: mode === m ? 'rgba(29,185,84,0.12)' : 'transparent',
              color: mode === m ? 'var(--green)' : 'var(--muted)',
            }}
          >
            {m === 'manual' ? 'Manual Entry' : 'Paste from Sheet'}
          </button>
        ))}
      </div>

      {mode === 'paste' ? (
        /* ── PASTE MODE ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '14px 16px',
            fontSize: 12, color: 'var(--muted)', lineHeight: 1.6,
          }}>
            Copy player stat rows from your Google Sheet and paste below.
            Expected columns: Name, FGM, FGA, (skip), 3PM, 3PA, (skip), FTM, FTA, (skip), (skip), REB, AST, BLK, STL, TOV
          </div>

          <PasteArea
            label={`${homeTeam.captainName} (Home)`}
            value={homePaste}
            onChange={setHomePaste}
            playerCount={homeTeam.players.length}
          />
          <PasteArea
            label={`${awayTeam.captainName} (Away)`}
            value={awayPaste}
            onChange={setAwayPaste}
            playerCount={awayTeam.players.length}
          />

          <button
            onClick={handleParse}
            disabled={!homePaste.trim() && !awayPaste.trim()}
            style={{
              alignSelf: 'flex-start',
              padding: '11px 28px',
              background: (!homePaste.trim() && !awayPaste.trim())
                ? 'rgba(29,185,84,0.3)'
                : 'linear-gradient(135deg, #1db954, #128f3e)',
              border: 'none', borderRadius: 8,
              fontSize: 13, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
              color: '#fff',
              cursor: (!homePaste.trim() && !awayPaste.trim()) ? 'not-allowed' : 'pointer',
            }}
          >
            Parse & Fill Grid
          </button>
        </div>
      ) : (
        /* ── MANUAL MODE ── */
        <>
          {/* Paste result feedback */}
          {pasteResult && (
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '14px 16px', marginBottom: 20,
            }}>
              {pasteResult.matched.length > 0 && (
                <div style={{ marginBottom: pasteResult.unmatched.length > 0 ? 10 : 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--green)', marginBottom: 4 }}>
                    Matched ({pasteResult.matched.length})
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                    {pasteResult.matched.join(', ')}
                  </div>
                </div>
              )}
              {pasteResult.unmatched.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--red)', marginBottom: 4 }}>
                    Not Matched ({pasteResult.unmatched.length})
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--red)', lineHeight: 1.6 }}>
                    {pasteResult.unmatched.join(', ')} — enter these manually below
                  </div>
                </div>
              )}
            </div>
          )}

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
          <TeamStatTable team={homeTeam} stats={stats} onUpdate={updateStat} label="Home" />
          <div style={{ height: 24 }} />
          <TeamStatTable team={awayTeam} stats={stats} onUpdate={updateStat} label="Away" />

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
        </>
      )}

      <style>{`
        .stat-input { transition: border-color 0.15s; }
        .stat-input:focus { border-color: var(--green) !important; }
        .stat-row:hover { background: rgba(255,255,255,0.02); }
      `}</style>
    </div>
  )
}

// ─── PASTE AREA ─────────────────────────────────────────────────────────────

function PasteArea({
  label, value, onChange, playerCount,
}: {
  label: string; value: string; onChange: (v: string) => void; playerCount: number
}) {
  const lineCount = value.trim() ? value.trim().split('\n').length : 0

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 10, overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--green)' }}>
            {label}
          </span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          {lineCount} row{lineCount !== 1 ? 's' : ''} pasted · {playerCount} on roster
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste stat rows from Google Sheets here…"
        rows={Math.max(4, playerCount + 1)}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'var(--mid)', border: 'none',
          padding: '12px 14px', fontSize: 12, fontFamily: 'var(--font-mono)',
          color: 'var(--text)', outline: 'none', resize: 'vertical',
          lineHeight: 1.8,
        }}
      />
    </div>
  )
}

// ─── TEAM STAT TABLE ────────────────────────────────────────────────────────

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
