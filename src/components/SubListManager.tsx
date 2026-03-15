'use client'

import { useState, useTransition } from 'react'
import {
  createSubPlayer,
  updateSubPlayer,
  toggleSubAvailability,
  deleteSubPlayer,
} from '@/app/admin/sub-list/actions'

type SubPlayer = {
  id: string
  name: string
  position: string | null
  contactInfo: string | null
  draftRound: number | null
  notes: string | null
  isAvailable: boolean
}

type Props = {
  sessionId: string
  activeSubs: SubPlayer[]
  inactiveSubs: SubPlayer[]
}

type FormData = {
  name: string
  position: string
  contactInfo: string
  draftRound: string
  notes: string
}

const EMPTY_FORM: FormData = { name: '', position: '', contactInfo: '', draftRound: '', notes: '' }

export function SubListManager({ sessionId, activeSubs, inactiveSubs }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [editingSub, setEditingSub] = useState<SubPlayer | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleEdit(sub: SubPlayer) {
    setEditingSub(sub)
    setShowModal(true)
  }

  function handleToggle(id: string) {
    startTransition(async () => {
      await toggleSubAvailability(id)
    })
  }

  function handleDelete(id: string, name: string) {
    if (confirm(`Delete ${name} from the sub list?`)) {
      startTransition(async () => {
        await deleteSubPlayer(id)
      })
    }
  }

  return (
    <div>
      {/* Add button */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => { setEditingSub(null); setShowModal(true) }}
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #1db954, #128f3e)',
            border: 'none', borderRadius: 8,
            fontSize: 13, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
            color: '#fff', cursor: 'pointer',
          }}
        >
          + Add Sub
        </button>
      </div>

      {/* Active subs */}
      <SectionTitle count={activeSubs.length}>Available Subs</SectionTitle>
      {activeSubs.length > 0 ? (
        <SubTable
          subs={activeSubs}
          onEdit={handleEdit}
          onToggle={handleToggle}
          onDelete={handleDelete}
          isPending={isPending}
        />
      ) : (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
          padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13,
        }}>
          No available subs for this session.
        </div>
      )}

      {/* Inactive subs */}
      {inactiveSubs.length > 0 && (
        <div style={{ marginTop: 36 }}>
          <SectionTitle count={inactiveSubs.length}>Inactive Subs</SectionTitle>
          <div style={{ opacity: 0.7 }}>
            <SubTable
              subs={inactiveSubs}
              onEdit={handleEdit}
              onToggle={handleToggle}
              onDelete={handleDelete}
              isPending={isPending}
            />
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <SubModal
          sessionId={sessionId}
          sub={editingSub}
          onClose={() => { setShowModal(false); setEditingSub(null) }}
        />
      )}
    </div>
  )
}

// ─── SECTION TITLE ──────────────────────────────────────────────────────────

function SectionTitle({ children, count }: { children: React.ReactNode; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 2, color: 'var(--text)' }}>
        {children}
      </span>
      <span style={{
        fontSize: 11, fontWeight: 700, color: 'var(--muted)',
        background: 'var(--mid)', borderRadius: 10, padding: '2px 8px',
      }}>
        {count}
      </span>
      <span style={{ flex: 1, height: 1, background: 'var(--border)', display: 'block' }} />
    </div>
  )
}

// ─── SUB TABLE ──────────────────────────────────────────────────────────────

function SubTable({
  subs, onEdit, onToggle, onDelete, isPending,
}: {
  subs: SubPlayer[]
  onEdit: (sub: SubPlayer) => void
  onToggle: (id: string) => void
  onDelete: (id: string, name: string) => void
  isPending: boolean
}) {
  // Group by draft round
  const grouped = new Map<number, SubPlayer[]>()
  const noRound: SubPlayer[] = []
  for (const sub of subs) {
    if (sub.draftRound != null) {
      const list = grouped.get(sub.draftRound) || []
      list.push(sub)
      grouped.set(sub.draftRound, list)
    } else {
      noRound.push(sub)
    }
  }
  const rounds = [...grouped.keys()].sort((a, b) => a - b)

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 10, overflow: 'hidden',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
          <thead>
            <tr>
              {['Name', 'Phone', 'Pos', 'Round', 'Notes', ''].map((h, i) => (
                <th key={h || i} style={{
                  padding: '8px 14px', fontSize: 10, fontWeight: 600,
                  letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)',
                  textAlign: 'left', borderBottom: '1px solid var(--border)',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rounds.map((round) => (
              grouped.get(round)!.map((sub, i) => (
                <SubRow
                  key={sub.id}
                  sub={sub}
                  showRoundLabel={i === 0}
                  roundCount={grouped.get(round)!.length}
                  onEdit={onEdit}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  isPending={isPending}
                />
              ))
            ))}
            {noRound.map((sub) => (
              <SubRow
                key={sub.id}
                sub={sub}
                showRoundLabel={false}
                roundCount={0}
                onEdit={onEdit}
                onToggle={onToggle}
                onDelete={onDelete}
                isPending={isPending}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SubRow({
  sub, showRoundLabel, roundCount, onEdit, onToggle, onDelete, isPending,
}: {
  sub: SubPlayer
  showRoundLabel: boolean
  roundCount: number
  onEdit: (sub: SubPlayer) => void
  onToggle: (id: string) => void
  onDelete: (id: string, name: string) => void
  isPending: boolean
}) {
  return (
    <tr className="admin-row" style={{ borderBottom: '1px solid rgba(42,53,72,0.4)' }}>
      <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
        {sub.name}
      </td>
      <td style={{ padding: '10px 14px', fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>
        {sub.contactInfo || '—'}
      </td>
      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--muted)' }}>
        {sub.position || '—'}
      </td>
      <td style={{ padding: '10px 14px' }}>
        {sub.draftRound != null ? (
          <span style={{
            fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
            background: 'rgba(29,185,84,0.12)', color: 'var(--green)',
            border: '1px solid rgba(29,185,84,0.25)', borderRadius: 4,
            padding: '2px 8px',
          }}>
            Rd {sub.draftRound}
          </span>
        ) : '—'}
      </td>
      <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--muted)', maxWidth: 200 }}>
        {sub.notes || ''}
      </td>
      <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
        <button
          onClick={() => onEdit(sub)}
          disabled={isPending}
          style={{
            background: 'none', border: 'none', fontSize: 11, fontWeight: 600,
            color: 'var(--teal)', cursor: 'pointer', padding: '2px 6px',
          }}
        >
          Edit
        </button>
        <button
          onClick={() => onToggle(sub.id)}
          disabled={isPending}
          style={{
            background: 'none', border: 'none', fontSize: 11, fontWeight: 600,
            color: sub.isAvailable ? 'var(--amber)' : 'var(--green)',
            cursor: 'pointer', padding: '2px 6px',
          }}
        >
          {sub.isAvailable ? 'Deactivate' : 'Activate'}
        </button>
        <button
          onClick={() => onDelete(sub.id, sub.name)}
          disabled={isPending}
          style={{
            background: 'none', border: 'none', fontSize: 11, fontWeight: 600,
            color: 'var(--red)', cursor: 'pointer', padding: '2px 6px',
          }}
        >
          Delete
        </button>
      </td>
    </tr>
  )
}

// ─── MODAL ──────────────────────────────────────────────────────────────────

function SubModal({
  sessionId, sub, onClose,
}: {
  sessionId: string
  sub: SubPlayer | null
  onClose: () => void
}) {
  const [form, setForm] = useState<FormData>(
    sub
      ? {
          name: sub.name,
          position: sub.position || '',
          contactInfo: sub.contactInfo || '',
          draftRound: sub.draftRound != null ? String(sub.draftRound) : '',
          notes: sub.notes || '',
        }
      : { ...EMPTY_FORM },
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function update(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setError('')

    const input = {
      sessionId,
      name: form.name,
      position: form.position,
      contactInfo: form.contactInfo,
      draftRound: form.draftRound ? parseInt(form.draftRound) : null,
      notes: form.notes,
    }

    const res = sub
      ? await updateSubPlayer(sub.id, input)
      : await createSubPlayer(input)

    setSaving(false)
    if (res.success) {
      onClose()
    } else {
      setError(res.error ?? 'Failed to save.')
    }
  }

  const inputStyle = {
    width: '100%', boxSizing: 'border-box' as const,
    background: 'var(--mid)', border: '1px solid var(--border)', borderRadius: 8,
    padding: '9px 12px', fontSize: 13, color: 'var(--text)', outline: 'none',
  }

  const labelStyle = {
    display: 'block' as const, fontSize: 11, fontWeight: 600,
    letterSpacing: '1px', textTransform: 'uppercase' as const,
    color: 'var(--muted)', marginBottom: 6,
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 28, width: '100%', maxWidth: 440,
        }}
      >
        <h3 style={{
          fontFamily: 'var(--font-display)', fontSize: 22,
          letterSpacing: 2, color: 'var(--text)', marginBottom: 20,
        }}>
          {sub ? 'Edit Sub' : 'Add Sub'}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Name *</label>
            <input value={form.name} onChange={(e) => update('name', e.target.value)} autoFocus style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: 12 }}>
            <div>
              <label style={labelStyle}>Phone</label>
              <input value={form.contactInfo} onChange={(e) => update('contactInfo', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Position</label>
              <input value={form.position} onChange={(e) => update('position', e.target.value)} placeholder="G/F" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Round</label>
              <input
                type="number" min={1} max={10}
                value={form.draftRound}
                onChange={(e) => update('draftRound', e.target.value)}
                style={{ ...inputStyle, textAlign: 'center', fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Notes</label>
            <input value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Optional" style={inputStyle} />
          </div>

          {error && <div style={{ fontSize: 12, color: 'var(--red)' }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '10px 24px',
                background: saving ? 'rgba(29,185,84,0.5)' : 'linear-gradient(135deg, #1db954, #128f3e)',
                border: 'none', borderRadius: 8,
                fontSize: 13, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
                color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving…' : sub ? 'Update' : 'Add Sub'}
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px', background: 'none',
                border: '1px solid var(--border)', borderRadius: 8,
                fontSize: 13, fontWeight: 600, color: 'var(--muted)', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
