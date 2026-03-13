'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/',             label: 'Standings'    },
  { href: '/games',        label: 'Schedule'     },
  { href: '/teams',        label: 'Teams'        },
  { href: '/players',      label: 'Players'      },
  { href: '/leaderboards', label: 'Leaderboards' },
  { href: '/seasons',      label: 'Seasons'      },
]

export function NavBar({ activeSessionName }: { activeSessionName?: string }) {
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
      <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
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
      <div style={{ display: 'flex', gap: 2, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {links.map(({ href, label }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link key={href} href={href} style={{
              color: active ? 'var(--text)' : 'var(--muted)',
              fontSize: 13,
              fontWeight: 500,
              padding: '6px 11px',
              borderRadius: 6,
              background: active ? 'var(--surface)' : 'transparent',
              textDecoration: 'none',
              transition: 'all 0.15s',
              letterSpacing: '0.3px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
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
        flexShrink: 0,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--green)',
          display: 'inline-block',
          animation: 'pulse 2s infinite',
        }} />
        {activeSessionName ?? 'MBA'}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
        @media (max-width: 780px) {
          nav > div:nth-child(2) { gap: 0; }
          nav > div:nth-child(2) a { padding: 6px 8px; font-size: 12px; }
        }
        @media (max-width: 580px) {
          nav > div:last-child { display: none; }
        }
      `}</style>
    </nav>
  )
}