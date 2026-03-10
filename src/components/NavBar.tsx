'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/',             label: 'Standings'    },
  { href: '/games',        label: 'Schedule'     },
  { href: '/players',      label: 'Players'      },
  { href: '/leaderboards', label: 'Leaderboards' },
]

export function NavBar() {
  const pathname = usePathname()

  return (
    <nav style={{
      background: 'var(--mid)',
      borderBottom: '1px solid var(--border)',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 56,
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <Link href="/" style={{ textDecoration: 'none' }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28,
          letterSpacing: 2,
          background: 'linear-gradient(135deg, #1db954, #128f3e)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          lineHeight: 1,
        }}>
          MBA
        </span>
      </Link>

      {/* Nav links */}
      <div style={{ display: 'flex', gap: 4 }}>
        {links.map(({ href, label }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href} style={{
              color: active ? 'var(--text)' : 'var(--muted)',
              fontSize: 13,
              fontWeight: 500,
              padding: '6px 12px',
              borderRadius: 6,
              background: active ? 'var(--surface)' : 'transparent',
              textDecoration: 'none',
              transition: 'all 0.15s',
              letterSpacing: '0.3px',
            }}>
              {label}
            </Link>
          )
        })}
      </div>

      {/* Session badge */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'rgba(29,185,84,0.12)',
        border: '1px solid rgba(29,185,84,0.25)',
        color: 'var(--green)',
        fontSize: 11,
        fontWeight: 600,
        padding: '4px 10px',
        borderRadius: 20,
        letterSpacing: 1,
        textTransform: 'uppercase',
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--green)',
          display: 'inline-block',
          animation: 'pulse 2s infinite',
        }} />
        Spring 2026
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
        @media (max-width: 640px) {
          nav > div:nth-child(2) { display: none; }
        }
      `}</style>
    </nav>
  )
}
