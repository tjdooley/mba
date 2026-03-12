'use client'

import { logoutAction } from './login/actions'

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button type="submit" style={{
        background: 'transparent',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '5px 12px',
        fontSize: 12,
        color: 'var(--muted)',
        cursor: 'pointer',
        letterSpacing: '0.3px',
      }}>
        Sign out
      </button>
    </form>
  )
}
