'use client'

import { useState, useTransition } from 'react'
import {
  addPlayerToRoster,
  removePlayerFromRoster,
  setChampion,
} from '@/app/admin/teams/[id]/edit/actions'

type RosterPlayer = {
  playerId: string
  displayName: string
  isCaptain: boolean
}

type AvailablePlayer = {
  id: string
  displayName: string
  firstName: string
  lastName: string
}

type Props = {
  teamId: string
  sessionId: string
  captainName: string
  division: string
  roster: RosterPlayer[]
  availablePlayers: AvailablePlayer[]
  isChampion: boolean
}

export function TeamRosterEditor({
  teamId, sessionId, captainName, division, roster: initialRoster,
  availablePlayers: initialAvailable, isChampion: initialIsChampion,
}: Props) {
  const [roster, setRoster] = useState(initialRoster)
  const [available, setAvailable] = useState(initialAvailable)
  const [isChampion, setIsChampion] = useState(initialIsChampion)
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)

  function handleAdd() {
    if (!selectedPlayerId) return
    const player = available.find((p) => p.id === selectedPlayerId)
    if (!player) return

    startTransition(async () => {
      const res = await addPlayerToRoster(teamId, selectedPlayerId)
      if (res.success) {
        setRoster((prev) => [...prev, { playerId: player.id, displayName: player.displayName, isCaptain: false }])
        setAvailable((prev) => prev.filter((p) => p.id !== selectedPlayerId))
        setSelectedPlayerId('')
        setMessage({ text: `${player.displayName} added`, ok: true })
      } else {
        setMessage({ text: res.error!, ok: false })
      }
    })
  }

  function handleRemove(playerId: string, displayName: string) {
    startTransition(async () => {
      const res = await removePlayerFromRoster(teamId, playerId)
      if (res.success) {
        const removed = roster.find((r) => r.playerId === playerId)
        setRoster((prev) => prev.filter((r) => r.playerId !== playerId))
        if (removed) {
          const avail = available.find(p => p.id === playerId)
          if (!avail) {
            setAvailable((prev) => [...prev, { id: playerId, displayName, firstName: '', lastName: '' }].sort((a, b) => a.displayName.localeCompare(b.displayName)))
          }
        }
        setMessage({ text: `${displayName} removed`, ok: true })
      } else {
        setMessage({ text: res.error!, ok: false })
      }
    })
  }

  function handleChampionToggle() {
    const newVal = !isChampion
    startTransition(async () => {
      const res = await setChampion(sessionId, newVal ? teamId : null)
      if (res.success) {
        setIsChampion(newVal)
        setMessage({ text: newVal ? 'Set as champion!' : 'Champion removed', ok: true })
      } else {
        setMessage({ text: res.error!, ok: false })
      }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Champion toggle */}
      <div style={{
        background: isChampion ? 'rgba(245,166,35,0.08)' : 'var(--surface)',
        border: `1px solid ${isChampion ? 'rgba(245,166,35,0.3)' : 'var(--border)'}`,
        borderRadius: 10,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: isChampion ? 'var(--amber)' : 'var(--text)' }}>
            {isChampion ? '🏆 Session Champion' : 'Not the session champion'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            {captainName} · {division === 'FREEHOUSE' ? 'FreeHouse' : "Delaney's"}
          </div>
        </div>
        <button
          onClick={handleChampionToggle}
          disabled={isPending}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            fontSize: 12, fontWeight: 600,
            cursor: isPending ? 'not-allowed' : 'pointer',
            border: `1px solid ${isChampion ? 'rgba(232,64,64,0.4)' : 'rgba(245,166,35,0.4)'}`,
            background: isChampion ? 'rgba(232,64,64,0.1)' : 'rgba(245,166,35,0.1)',
            color: isChampion ? 'var(--red)' : 'var(--amber)',
          }}
        >
          {isChampion ? 'Remove Champion' : 'Set as Champion'}
        </button>
      </div>

      {/* Roster */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '10px 14px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '1.5px',
            textTransform: 'uppercase', color: 'var(--green)',
          }}>
            Roster
          </span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            {roster.length} players
          </span>
        </div>

        {roster.map((r, i) => {
          const notLast = i < roster.length - 1
          return (
            <div
              key={r.playerId}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '11px 14px',
                borderBottom: notLast ? '1px solid rgba(42,53,72,0.4)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  {r.displayName}
                </span>
                {r.isCaptain && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '1px',
                    textTransform: 'uppercase', color: 'var(--amber)',
                    background: 'rgba(245,166,35,0.1)',
                    border: '1px solid rgba(245,166,35,0.25)',
                    borderRadius: 4, padding: '1px 5px',
                  }}>
                    Captain
                  </span>
                )}
              </div>
              {!r.isCaptain && (
                <button
                  onClick={() => handleRemove(r.playerId, r.displayName)}
                  disabled={isPending}
                  style={{
                    fontSize: 11, fontWeight: 600, color: 'var(--red)',
                    background: 'transparent', border: 'none',
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    padding: '4px 8px',
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Add player */}
      {available.length > 0 && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '16px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <select
            value={selectedPlayerId}
            onChange={(e) => setSelectedPlayerId(e.target.value)}
            style={{
              flex: 1,
              background: 'var(--mid)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '9px 12px',
              fontSize: 13,
              color: 'var(--text)',
              outline: 'none',
              appearance: 'none',
            }}
          >
            <option value="">Add a player…</option>
            {available.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName} ({p.firstName} {p.lastName})
              </option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={isPending || !selectedPlayerId}
            style={{
              padding: '9px 18px',
              background: !selectedPlayerId ? 'rgba(29,185,84,0.3)' : 'linear-gradient(135deg, #1db954, #128f3e)',
              border: 'none', borderRadius: 8,
              fontSize: 12, fontWeight: 700, letterSpacing: '0.5px',
              color: '#fff',
              cursor: !selectedPlayerId || isPending ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Add
          </button>
        </div>
      )}

      {/* Status message */}
      {message && (
        <div style={{
          fontSize: 13, fontWeight: 600,
          color: message.ok ? 'var(--green)' : 'var(--red)',
        }}>
          {message.text}
        </div>
      )}
    </div>
  )
}
