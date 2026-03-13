'use client'

import { useState, useTransition } from 'react'
import { createPlayoffGame, type CreatePlayoffInput } from '@/app/admin/games/new-playoff/actions'

type SessionData = {
  id: string
  name: string
  isActive: boolean
  teams: { id: string; captainName: string; division: string }[]
}

const ROUNDS = [
  { value: 1, label: 'Wild Card' },
  { value: 2, label: 'Semifinals' },
  { value: 3, label: 'Championship' },
]

const selectStyle = {
  width: '100%',
  background: 'var(--mid)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '10px 14px',
  fontSize: 14,
  color: 'var(--text)',
  outline: 'none',
  appearance: 'none' as const,
  cursor: 'pointer',
}

const labelStyle = {
  display: 'block' as const,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '1px',
  textTransform: 'uppercase' as const,
  color: 'var(--muted)',
  marginBottom: 8,
}

export function PlayoffGameForm({ sessions }: { sessions: SessionData[] }) {
  const activeSession = sessions.find((s) => s.isActive)
  const [sessionId, setSessionId] = useState(activeSession?.id ?? sessions[0]?.id ?? '')
  const [homeTeamId, setHomeTeamId] = useState('')
  const [awayTeamId, setAwayTeamId] = useState('')
  const [playoffRound, setPlayoffRound] = useState(1)
  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [isFinal, setIsFinal] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null)

  const currentSession = sessions.find((s) => s.id === sessionId)
  const teams = currentSession?.teams ?? []

  function handleSessionChange(newId: string) {
    setSessionId(newId)
    setHomeTeamId('')
    setAwayTeamId('')
    setResult(null)
  }

  function handleSave() {
    if (!homeTeamId || !awayTeamId) {
      setResult({ success: false, error: 'Select both teams.' })
      return
    }

    const input: CreatePlayoffInput = {
      sessionId, homeTeamId, awayTeamId, playoffRound,
      homeScore, awayScore, isFinal,
    }

    startTransition(async () => {
      const res = await createPlayoffGame(input)
      setResult(res)
      if (res.success) {
        // Reset for next entry
        setHomeTeamId('')
        setAwayTeamId('')
        setHomeScore(0)
        setAwayScore(0)
      }
    })
  }

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
    }}>
      {/* Session */}
      <div>
        <label style={labelStyle}>Season</label>
        <select value={sessionId} onChange={(e) => handleSessionChange(e.target.value)} style={selectStyle}>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}{s.isActive ? ' (Current)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Round */}
      <div>
        <label style={labelStyle}>Round</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {ROUNDS.map((r) => (
            <button
              key={r.value}
              onClick={() => setPlayoffRound(r.value)}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: 6,
                fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
                border: `1px solid ${playoffRound === r.value ? 'rgba(245,166,35,0.4)' : 'var(--border)'}`,
                background: playoffRound === r.value ? 'rgba(245,166,35,0.1)' : 'transparent',
                color: playoffRound === r.value ? 'var(--amber)' : 'var(--muted)',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Teams */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Home Team</label>
          <select value={homeTeamId} onChange={(e) => setHomeTeamId(e.target.value)} style={selectStyle}>
            <option value="">Select…</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id} disabled={t.id === awayTeamId}>
                {t.captainName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Away Team</label>
          <select value={awayTeamId} onChange={(e) => setAwayTeamId(e.target.value)} style={selectStyle}>
            <option value="">Select…</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id} disabled={t.id === homeTeamId}>
                {t.captainName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Final toggle */}
      <div>
        <label style={labelStyle}>Has this game been played?</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {([true, false] as const).map((val) => (
            <button
              key={String(val)}
              onClick={() => setIsFinal(val)}
              style={{
                padding: '8px 20px',
                borderRadius: 6,
                fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
                border: `1px solid ${isFinal === val
                  ? (val ? 'rgba(29,185,84,0.4)' : 'rgba(107,124,147,0.4)')
                  : 'var(--border)'}`,
                background: isFinal === val
                  ? (val ? 'rgba(29,185,84,0.12)' : 'rgba(107,124,147,0.12)')
                  : 'transparent',
                color: isFinal === val
                  ? (val ? 'var(--green)' : 'var(--text)')
                  : 'var(--muted)',
              }}
            >
              {val ? 'Yes — enter score' : 'Not yet'}
            </button>
          ))}
        </div>
      </div>

      {/* Score */}
      {isFinal && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, letterSpacing: '0.5px' }}>
              {teams.find((t) => t.id === homeTeamId)?.captainName || 'Home'}
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
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--muted)', paddingTop: 20 }}>—</span>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, letterSpacing: '0.5px' }}>
              {teams.find((t) => t.id === awayTeamId)?.captainName || 'Away'}
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
          </div>
        </div>
      )}

      {/* Save */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <button
          onClick={handleSave}
          disabled={isPending}
          style={{
            padding: '11px 28px',
            background: isPending ? 'rgba(29,185,84,0.5)' : 'linear-gradient(135deg, #1db954, #128f3e)',
            border: 'none', borderRadius: 8,
            fontSize: 13, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
            color: '#fff', cursor: isPending ? 'not-allowed' : 'pointer',
          }}
        >
          {isPending ? 'Creating…' : 'Create Game'}
        </button>

        {result && (
          <span style={{
            fontSize: 13, fontWeight: 600,
            color: result.success ? 'var(--green)' : 'var(--red)',
          }}>
            {result.success ? 'Playoff game created!' : result.error}
          </span>
        )}
      </div>
    </div>
  )
}
