'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createTeam } from '@/app/admin/teams/actions'

type Props = {
  sessions: { id: string; name: string; isActive: boolean }[]
  players: { id: string; displayName: string; firstName: string; lastName: string }[]
}

const labelStyle = {
  display: 'block' as const,
  fontSize: 11, fontWeight: 600, letterSpacing: '1px',
  textTransform: 'uppercase' as const, color: 'var(--muted)', marginBottom: 6,
}

const selectStyle = {
  width: '100%',
  background: 'var(--mid)', border: '1px solid var(--border)', borderRadius: 8,
  padding: '10px 14px', fontSize: 14, color: 'var(--text)', outline: 'none',
  appearance: 'none' as const, cursor: 'pointer', boxSizing: 'border-box' as const,
}

export function CreateTeamForm({ sessions, players }: Props) {
  const router = useRouter()
  const activeSession = sessions.find((s) => s.isActive)
  const [sessionId, setSessionId] = useState(activeSession?.id ?? sessions[0]?.id ?? '')
  const [captainId, setCaptainId] = useState('')
  const [division, setDivision] = useState<'FREEHOUSE' | 'DELANEYS'>('FREEHOUSE')
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null)

  function handleSave() {
    if (!captainId) {
      setResult({ success: false, error: 'Select a captain.' })
      return
    }

    startTransition(async () => {
      const res = await createTeam({ sessionId, captainId, division })
      if (res.success && res.teamId) {
        router.push(`/admin/teams/${res.teamId}/edit`)
      } else {
        setResult(res)
      }
    })
  }

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: 24,
      display: 'flex', flexDirection: 'column', gap: 18,
    }}>
      {/* Session */}
      <div>
        <label style={labelStyle}>Session</label>
        <select value={sessionId} onChange={(e) => setSessionId(e.target.value)} style={selectStyle}>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>{s.name}{s.isActive ? ' (Current)' : ''}</option>
          ))}
        </select>
      </div>

      {/* Captain */}
      <div>
        <label style={labelStyle}>Captain</label>
        <select value={captainId} onChange={(e) => setCaptainId(e.target.value)} style={selectStyle}>
          <option value="">Select a captain…</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.displayName} ({p.firstName} {p.lastName})
            </option>
          ))}
        </select>
      </div>

      {/* Division */}
      <div>
        <label style={labelStyle}>Division</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {([
            { value: 'FREEHOUSE' as const, label: 'FreeHouse' },
            { value: 'DELANEYS' as const, label: "Delaney's" },
          ]).map((d) => (
            <button
              key={d.value}
              onClick={() => setDivision(d.value)}
              style={{
                flex: 1, padding: '9px 12px', borderRadius: 6,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${division === d.value
                  ? (d.value === 'FREEHOUSE' ? 'rgba(29,185,84,0.4)' : 'rgba(42,143,143,0.4)')
                  : 'var(--border)'}`,
                background: division === d.value
                  ? (d.value === 'FREEHOUSE' ? 'rgba(29,185,84,0.12)' : 'rgba(42,143,143,0.12)')
                  : 'transparent',
                color: division === d.value
                  ? (d.value === 'FREEHOUSE' ? 'var(--green)' : 'var(--teal)')
                  : 'var(--muted)',
              }}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Save */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginTop: 4 }}>
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
          {isPending ? 'Creating…' : 'Create Team'}
        </button>

        {result && !result.success && (
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)' }}>
            {result.error}
          </span>
        )}
      </div>
    </div>
  )
}
