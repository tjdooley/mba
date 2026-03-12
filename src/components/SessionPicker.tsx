import Link from 'next/link'

interface Session {
  id: string
  name: string
  isActive: boolean
}

export function SessionPicker({
  sessions,
  currentId,
  basePath,
}: {
  sessions: Session[]
  currentId: string
  basePath: string
}) {
  return (
    <>
      <div
        className="session-picker"
        style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          marginTop: 16,
        }}
      >
        {sessions.map((s) => {
          const isSelected = s.id === currentId
          return (
            <Link
              key={s.id}
              href={`${basePath}?session=${s.id}`}
              className={`session-pill${isSelected ? ' selected' : ''}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.3px',
                whiteSpace: 'nowrap',
                textDecoration: 'none',
                flexShrink: 0,
              }}
            >
              {s.isActive && (
                <span style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: 'var(--green)',
                  display: 'inline-block',
                  flexShrink: 0,
                }} />
              )}
              {s.name}
            </Link>
          )
        })}
      </div>
      <style>{`
        .session-pill {
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--muted);
          transition: all 0.15s;
        }
        .session-pill:hover {
          color: var(--text);
          border-color: rgba(255,255,255,0.15);
        }
        .session-pill.selected {
          background: rgba(29,185,84,0.12);
          border-color: rgba(29,185,84,0.35);
          color: var(--green);
        }
        .session-picker::-webkit-scrollbar { display: none; }
      `}</style>
    </>
  )
}
