'use client'

import { useState, useTransition } from 'react'
import { scheduleWeek, type GameSlot } from '@/app/admin/games/new/actions'

type SessionData = {
  id: string
  name: string
  isActive: boolean
  teams: { id: string; captainName: string; division: string }[]
}

const selectStyle = {
  width: '100%',
  background: 'var(--mid)', border: '1px solid var(--border)', borderRadius: 8,
  padding: '9px 12px', fontSize: 13, color: 'var(--text)', outline: 'none',
  appearance: 'none' as const, cursor: 'pointer', boxSizing: 'border-box' as const,
}

const labelStyle = {
  display: 'block' as const,
  fontSize: 11, fontWeight: 600, letterSpacing: '1px',
  textTransform: 'uppercase' as const, color: 'var(--muted)', marginBottom: 6,
}

const EMPTY_SLOT: GameSlot = { homeTeamId: '', awayTeamId: '', court: '' }

export function ScheduleWeekForm({ sessions }: { sessions: SessionData[] }) {
  const activeSession = sessions.find((s) => s.isActive)
  const [sessionId, setSessionId] = useState(activeSession?.id ?? sessions[0]?.id ?? '')
  const [week, setWeek] = useState(1)
  const [date, setDate] = useState('')
  const [games, setGames] = useState<GameSlot[]>([
    { ...EMPTY_SLOT, court: 'Court 1' },
    { ...EMPTY_SLOT, court: 'Court 2' },
    { ...EMPTY_SLOT, court: 'Court 3' },
    { ...EMPTY_SLOT, court: 'Court 4' },
  ])
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null)

  const currentSession = sessions.find((s) => s.id === sessionId)
  const teams = currentSession?.teams ?? []

  // Track which teams are already selected
  const usedTeamIds = new Set(
    games.flatMap((g) => [g.homeTeamId, g.awayTeamId]).filter(Boolean),
  )

  function updateGame(index: number, field: keyof GameSlot, value: string) {
    setGames((prev) => prev.map((g, i) => (i === index ? { ...g, [field]: value } : g)))
    setResult(null)
  }

  function handleSessionChange(id: string) {
    setSessionId(id)
    setGames([
      { ...EMPTY_SLOT, court: 'Court 1' },
      { ...EMPTY_SLOT, court: 'Court 2' },
      { ...EMPTY_SLOT, court: 'Court 3' },
      { ...EMPTY_SLOT, court: 'Court 4' },
    ])
    setResult(null)
  }

  function handleSave() {
    if (!date) {
      setResult({ success: false, error: 'Date is required.' })
      return
    }

    startTransition(async () => {
      const res = await scheduleWeek({ sessionId, week, date, games })
      setResult(res)
      if (res.success) {
        // Reset games for next week
        setWeek((w) => w + 1)
        setGames([
          { ...EMPTY_SLOT, court: 'Court 1' },
          { ...EMPTY_SLOT, court: 'Court 2' },
          { ...EMPTY_SLOT, court: 'Court 3' },
          { ...EMPTY_SLOT, court: 'Court 4' },
        ])
      }
    })
  }

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: 24,
      display: 'flex', flexDirection: 'column', gap: 20,
    }}>
      {/* Session + Week + Date */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Session</label>
          <select value={sessionId} onChange={(e) => handleSessionChange(e.target.value)} style={selectStyle}>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>{s.name}{s.isActive ? ' (Current)' : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Week</label>
          <input
            type="number" min={1} max={20} value={week}
            onChange={(e) => setWeek(parseInt(e.target.value) || 1)}
            style={{
              ...selectStyle,
              fontFamily: 'var(--font-mono)', textAlign: 'center' as const,
              appearance: 'auto' as const,
            }}
          />
        </div>
        <div>
          <label style={labelStyle}>Date</label>
          <input
            type="date" value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ ...selectStyle, colorScheme: 'dark' }}
          />
        </div>
      </div>

      {/* Game slots */}
      <div>
        <label style={labelStyle}>Matchups</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {games.map((game, i) => (
            <div key={i} style={{
              display: 'grid',
              gridTemplateColumns: '80px 1fr 30px 1fr',
              gap: 8,
              alignItems: 'center',
              padding: '10px 12px',
              background: 'var(--mid)',
              borderRadius: 8,
              border: '1px solid var(--border)',
            }}>
              <input
                value={game.court}
                onChange={(e) => updateGame(i, 'court', e.target.value)}
                placeholder={`Court ${i + 1}`}
                style={{
                  background: 'transparent', border: 'none',
                  fontSize: 11, fontWeight: 600, color: 'var(--muted)',
                  letterSpacing: '0.5px', outline: 'none', padding: 0,
                }}
              />
              <select
                value={game.homeTeamId}
                onChange={(e) => updateGame(i, 'homeTeamId', e.target.value)}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '7px 8px', fontSize: 13,
                  color: 'var(--text)', outline: 'none', appearance: 'none', cursor: 'pointer',
                }}
              >
                <option value="">Home…</option>
                {teams.map((t) => (
                  <option
                    key={t.id} value={t.id}
                    disabled={usedTeamIds.has(t.id) && t.id !== game.homeTeamId && t.id !== game.awayTeamId}
                  >
                    {t.captainName}
                  </option>
                ))}
              </select>
              <span style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
                vs
              </span>
              <select
                value={game.awayTeamId}
                onChange={(e) => updateGame(i, 'awayTeamId', e.target.value)}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '7px 8px', fontSize: 13,
                  color: 'var(--text)', outline: 'none', appearance: 'none', cursor: 'pointer',
                }}
              >
                <option value="">Away…</option>
                {teams.map((t) => (
                  <option
                    key={t.id} value={t.id}
                    disabled={usedTeamIds.has(t.id) && t.id !== game.homeTeamId && t.id !== game.awayTeamId}
                  >
                    {t.captainName}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

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
          {isPending ? 'Scheduling…' : 'Schedule Week'}
        </button>

        {result && (
          <span style={{ fontSize: 13, fontWeight: 600, color: result.success ? 'var(--green)' : 'var(--red)' }}>
            {result.success ? `Week ${week - 1} scheduled!` : result.error}
          </span>
        )}
      </div>
    </div>
  )
}
