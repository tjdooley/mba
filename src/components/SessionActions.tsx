'use client'

import { useTransition, useState } from 'react'
import { activateSession, closeSession } from '@/app/admin/sessions/actions'

type Props = {
  sessionId: string
  isActive: boolean
  hasEndDate: boolean
}

export function SessionActions({ sessionId, isActive, hasEndDate }: Props) {
  const [isPending, startTransition] = useTransition()
  const [currentIsActive, setCurrentIsActive] = useState(isActive)
  const [currentHasEndDate, setCurrentHasEndDate] = useState(hasEndDate)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)

  function handleActivate() {
    startTransition(async () => {
      const res = await activateSession(sessionId)
      if (res.success) {
        setCurrentIsActive(true)
        setMessage({ text: 'Activated! Reload to see updated statuses.', ok: true })
      } else {
        setMessage({ text: res.error!, ok: false })
      }
    })
  }

  function handleClose() {
    if (!confirm('Close this season? This will deactivate it and set the end date to today.')) return
    startTransition(async () => {
      const res = await closeSession(sessionId)
      if (res.success) {
        setCurrentIsActive(false)
        setCurrentHasEndDate(true)
        setMessage({ text: 'Season closed.', ok: true })
      } else {
        setMessage({ text: res.error!, ok: false })
      }
    })
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {message && (
        <span style={{ fontSize: 11, color: message.ok ? 'var(--green)' : 'var(--red)' }}>
          {message.text}
        </span>
      )}

      {!currentIsActive && (
        <button
          onClick={handleActivate}
          disabled={isPending}
          style={{
            padding: '6px 14px', borderRadius: 6,
            fontSize: 11, fontWeight: 600,
            cursor: isPending ? 'not-allowed' : 'pointer',
            border: '1px solid rgba(29,185,84,0.4)',
            background: 'rgba(29,185,84,0.1)',
            color: 'var(--green)',
          }}
        >
          Set Active
        </button>
      )}

      {currentIsActive && !currentHasEndDate && (
        <button
          onClick={handleClose}
          disabled={isPending}
          style={{
            padding: '6px 14px', borderRadius: 6,
            fontSize: 11, fontWeight: 600,
            cursor: isPending ? 'not-allowed' : 'pointer',
            border: '1px solid rgba(232,64,64,0.4)',
            background: 'rgba(232,64,64,0.1)',
            color: 'var(--red)',
          }}
        >
          Close Season
        </button>
      )}
    </div>
  )
}
