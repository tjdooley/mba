'use client'

import { useActionState } from 'react'
import { loginAction } from './actions'

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, null)

  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--dark)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 48,
            letterSpacing: 4,
            background: 'linear-gradient(135deg, #1db954, #128f3e)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: 1,
            display: 'block',
          }}>
            MBA
          </span>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, letterSpacing: '1px', textTransform: 'uppercase' }}>
            Admin Access
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 28,
        }}>
          <form action={formAction}>
            <label style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              marginBottom: 8,
            }}>
              Password
            </label>
            <input
              type="password"
              name="password"
              autoFocus
              autoComplete="current-password"
              required
              style={{
                width: '100%',
                background: 'var(--mid)',
                border: `1px solid ${state?.error ? 'var(--red)' : 'var(--border)'}`,
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 14,
                color: 'var(--text)',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '2px',
              }}
            />

            {state?.error && (
              <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 8 }}>
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              style={{
                width: '100%',
                marginTop: 16,
                padding: '11px 0',
                background: pending ? 'rgba(29,185,84,0.5)' : 'linear-gradient(135deg, #1db954, #128f3e)',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: '#fff',
                cursor: pending ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.15s',
              }}
            >
              {pending ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
