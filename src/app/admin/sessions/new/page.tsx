'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createSession, type CreateSessionInput } from '../actions'

const labelStyle = {
  display: 'block' as const,
  fontSize: 11, fontWeight: 600, letterSpacing: '1px',
  textTransform: 'uppercase' as const, color: 'var(--muted)', marginBottom: 6,
}

const inputStyle = {
  width: '100%',
  background: 'var(--mid)', border: '1px solid var(--border)', borderRadius: 8,
  padding: '10px 14px', fontSize: 14, color: 'var(--text)', outline: 'none',
  boxSizing: 'border-box' as const,
}

export default function NewSessionPage() {
  const currentYear = new Date().getFullYear()
  const [period, setPeriod] = useState<'FALL' | 'SPRING'>('FALL')
  const [year, setYear] = useState(currentYear)
  const [name, setName] = useState(`Fall ${currentYear}`)
  const [startDate, setStartDate] = useState('')
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null)

  function handlePeriodChange(p: 'FALL' | 'SPRING') {
    setPeriod(p)
    setName(`${p === 'FALL' ? 'Fall' : 'Spring'} ${year}`)
  }

  function handleYearChange(y: number) {
    setYear(y)
    setName(`${period === 'FALL' ? 'Fall' : 'Spring'} ${y}`)
  }

  function handleSave() {
    if (!startDate) {
      setResult({ success: false, error: 'Start date is required.' })
      return
    }

    const input: CreateSessionInput = { name, period, year, startDate }
    startTransition(async () => {
      const res = await createSession(input)
      if (res) setResult(res)
    })
  }

  return (
    <main style={{ maxWidth: 500, margin: '0 auto', padding: '36px 24px 60px' }}>
      <div style={{ marginBottom: 8 }}>
        <Link href="/admin/sessions" style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none' }}>
          ← Back to Sessions
        </Link>
      </div>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(24px, 4vw, 40px)',
          letterSpacing: 3, lineHeight: 1, color: 'var(--text)',
        }}>
          New Session
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>
          Create a new season. After creating, add teams and build rosters from the Teams page.
        </p>
      </div>

      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 24,
        display: 'flex', flexDirection: 'column', gap: 18,
      }}>
        {/* Period */}
        <div>
          <label style={labelStyle}>Period</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['SPRING', 'FALL'] as const).map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodChange(p)}
                style={{
                  flex: 1, padding: '9px 12px', borderRadius: 6,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${period === p ? 'rgba(29,185,84,0.4)' : 'var(--border)'}`,
                  background: period === p ? 'rgba(29,185,84,0.12)' : 'transparent',
                  color: period === p ? 'var(--green)' : 'var(--muted)',
                }}
              >
                {p === 'SPRING' ? 'Spring' : 'Fall'}
              </button>
            ))}
          </div>
        </div>

        {/* Year */}
        <div>
          <label style={labelStyle}>Year</label>
          <input
            type="number"
            value={year}
            onChange={(e) => handleYearChange(parseInt(e.target.value) || currentYear)}
            style={inputStyle}
          />
        </div>

        {/* Name */}
        <div>
          <label style={labelStyle}>Session Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Fall 2026"
            style={inputStyle}
          />
        </div>

        {/* Start date */}
        <div>
          <label style={labelStyle}>Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ ...inputStyle, colorScheme: 'dark' }}
          />
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
            {isPending ? 'Creating…' : 'Create Session'}
          </button>

          {result && (
            <span style={{ fontSize: 13, fontWeight: 600, color: result.success ? 'var(--green)' : 'var(--red)' }}>
              {result.success ? 'Created!' : result.error}
            </span>
          )}
        </div>
      </div>

      <style>{`input:focus { border-color: var(--green) !important; }`}</style>
    </main>
  )
}
