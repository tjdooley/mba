import Link from 'next/link'
import { LogoutButton } from './LogoutButton'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
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
        {/* Logo + admin badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <Link href="/admin/dashboard" style={{ textDecoration: 'none' }}>
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
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: 'var(--amber)',
            background: 'rgba(245,166,35,0.1)',
            border: '1px solid rgba(245,166,35,0.25)',
            borderRadius: 4,
            padding: '2px 6px',
          }}>
            Admin
          </span>
        </div>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: 2, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {[
            { href: '/admin/dashboard', label: 'Dashboard' },
            { href: '/admin/games',     label: 'Games'     },
            { href: '/admin/players',   label: 'Players'   },
            { href: '/admin/teams',     label: 'Teams'     },
          ].map(({ href, label }) => (
            <Link key={href} href={href} style={{
              color: 'var(--muted)',
              fontSize: 13,
              fontWeight: 500,
              padding: '6px 11px',
              borderRadius: 6,
              textDecoration: 'none',
              letterSpacing: '0.3px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>
              {label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <Link href="/" style={{
            fontSize: 12,
            color: 'var(--muted)',
            textDecoration: 'none',
            letterSpacing: '0.3px',
          }}>
            ← Public Site
          </Link>
          <LogoutButton />
        </div>
      </nav>
      {children}
    </>
  )
}
