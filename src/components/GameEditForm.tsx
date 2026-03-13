'use client'

import { useState, useTransition } from 'react'
import { saveGameScore, deleteGame } from '@/app/admin/games/[id]/edit/actions'

type Props = {
  gameId: string
  homeCaptain: string
  awayCaptain: string
  initialHomeScore: number
  initialAwayScore: number
  initialStatus: string
}

export function GameEditForm({ gameId, homeCaptain, awayCaptain, initialHomeScore, initialAwayScore, initialStatus }: Props) {
  const [homeScore, setHomeScore] = useState(initialHomeScore)
  const [awayScore, setAwayScore] = useState(initialAwayScore)
  const [status, setStatus] = useState<'SCHEDULED' | 'FINAL'>(initialStatus === 'FINAL' ? 'FINAL' : 'SCHEDULED')
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null)

  function handleSave() {
    startTransition(async () => {
      const res = await saveGameScore({ gameId, homeScore, awayScore, status })
      setResult(res)
    })
  }

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 24,
    }}>
      {/* Score inputs */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 24, marginBottom: 24,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '1px',
            textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8,
          }}>
            {homeCaptain}
          </div>
          <input
            type="number" min={0} value={homeScore}
            onChange={(e) => setHomeScore(Math.max(0, parseInt(e.target.value) || 0))}
            style={{
              width: 90, textAlign: 'center',
              background: 'var(--mid)', border: '1px solid var(--border)', borderRadius: 8,
              padding: '12px 0', fontSize: 32, fontFamily: 'var(--font-mono)', fontWeight: 700,
              color: 'var(--text)', outline: 'none',
            }}
          />
        </div>

        <span style={{
          fontFamily: 'var(--font-display)', fontSize: 20,
          color: 'var(--muted)', letterSpacing: 2, paddingTop: 24,
        }}>
          —
        </span>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '1px',
            textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8,
          }}>
            {awayCaptain}
          </div>
          <input
            type="number" min={0} value={awayScore}
            onChange={(e) => setAwayScore(Math.max(0, parseInt(e.target.value) || 0))}
            style={{
              width: 90, textAlign: 'center',
              background: 'var(--mid)', border: '1px solid var(--border)', borderRadius: 8,
              padding: '12px 0', fontSize: 32, fontFamily: 'var(--font-mono)', fontWeight: 700,
              color: 'var(--text)', outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Status toggle */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '1px',
          textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8,
        }}>
          Game Status
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['SCHEDULED', 'FINAL'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              style={{
                padding: '8px 20px',
                borderRadius: 6,
                fontSize: 12, fontWeight: 600, letterSpacing: '0.5px',
                cursor: 'pointer',
                border: `1px solid ${status === s
                  ? (s === 'FINAL' ? 'rgba(29,185,84,0.4)' : 'rgba(107,124,147,0.4)')
                  : 'var(--border)'}`,
                background: status === s
                  ? (s === 'FINAL' ? 'rgba(29,185,84,0.12)' : 'rgba(107,124,147,0.12)')
                  : 'transparent',
                color: status === s
                  ? (s === 'FINAL' ? 'var(--green)' : 'var(--text)')
                  : 'var(--muted)',
              }}
            >
              {s === 'SCHEDULED' ? 'Scheduled' : 'Final'}
            </button>
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
          {isPending ? 'Saving…' : 'Save Score'}
        </button>

        {result && (
          <span style={{
            fontSize: 13, fontWeight: 600,
            color: result.success ? 'var(--green)' : 'var(--red)',
          }}>
            {result.success ? 'Score saved!' : result.error}
          </span>
        )}
      </div>

      {/* Delete */}
      <div style={{
        marginTop: 24, paddingTop: 20,
        borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--red)' }}>Delete Game</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            Permanently remove this game and any associated stats.
          </div>
        </div>
        <button
          onClick={() => {
            if (confirm('Delete this game? This cannot be undone.')) {
              startTransition(async () => {
                await deleteGame(gameId)
              })
            }
          }}
          disabled={isPending}
          style={{
            padding: '7px 16px', borderRadius: 6,
            fontSize: 12, fontWeight: 600,
            cursor: isPending ? 'not-allowed' : 'pointer',
            border: '1px solid rgba(232,64,64,0.4)',
            background: 'rgba(232,64,64,0.1)',
            color: 'var(--red)',
          }}
        >
          Delete
        </button>
      </div>
    </div>
  )
}
