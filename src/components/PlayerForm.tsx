'use client'

import { useState, useTransition } from 'react'
import { createPlayer, updatePlayer, type PlayerInput } from '@/app/admin/players/actions'

type Props = {
  mode: 'create' | 'edit'
  playerId?: string
  initial?: PlayerInput
}

const labelStyle = {
  display: 'block' as const,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '1px',
  textTransform: 'uppercase' as const,
  color: 'var(--muted)',
  marginBottom: 6,
}

const inputStyle = {
  width: '100%',
  background: 'var(--mid)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '10px 14px',
  fontSize: 14,
  color: 'var(--text)',
  outline: 'none',
  boxSizing: 'border-box' as const,
}

export function PlayerForm({ mode, playerId, initial }: Props) {
  const [firstName, setFirstName] = useState(initial?.firstName ?? '')
  const [lastName, setLastName] = useState(initial?.lastName ?? '')
  const [displayName, setDisplayName] = useState(initial?.displayName ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null)

  // Auto-generate display name from first name when creating
  function handleFirstNameChange(val: string) {
    setFirstName(val)
    if (mode === 'create' && !displayName) {
      setDisplayName(val)
    }
  }

  function handleSave() {
    const input: PlayerInput = { firstName, lastName, displayName, email, isActive }

    startTransition(async () => {
      const res = mode === 'create'
        ? await createPlayer(input)
        : await updatePlayer(playerId!, input)
      setResult(res)
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
      gap: 18,
    }}>
      {/* Name fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>First Name *</label>
          <input
            value={firstName}
            onChange={(e) => handleFirstNameChange(e.target.value)}
            placeholder="TJ"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Last Name</label>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Dooley"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Display name */}
      <div>
        <label style={labelStyle}>Display Name *</label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="TJ"
          style={inputStyle}
        />
        <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
          Shown in box scores, standings, and stat tables.
        </p>
      </div>

      {/* Email */}
      <div>
        <label style={labelStyle}>Email (optional)</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tj@example.com"
          style={inputStyle}
        />
      </div>

      {/* Active toggle */}
      <div>
        <label style={labelStyle}>Status</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {([true, false] as const).map((val) => (
            <button
              key={String(val)}
              onClick={() => setIsActive(val)}
              style={{
                padding: '8px 20px',
                borderRadius: 6,
                fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
                border: `1px solid ${isActive === val
                  ? (val ? 'rgba(29,185,84,0.4)' : 'rgba(232,64,64,0.4)')
                  : 'var(--border)'}`,
                background: isActive === val
                  ? (val ? 'rgba(29,185,84,0.12)' : 'rgba(232,64,64,0.12)')
                  : 'transparent',
                color: isActive === val
                  ? (val ? 'var(--green)' : 'var(--red)')
                  : 'var(--muted)',
              }}
            >
              {val ? 'Active' : 'Inactive'}
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
          {isPending ? 'Saving…' : mode === 'create' ? 'Create Player' : 'Save Changes'}
        </button>

        {result && (
          <span style={{
            fontSize: 13, fontWeight: 600,
            color: result.success ? 'var(--green)' : 'var(--red)',
          }}>
            {result.success ? 'Saved!' : result.error}
          </span>
        )}
      </div>

      <style>{`
        input:focus { border-color: var(--green) !important; }
      `}</style>
    </div>
  )
}
