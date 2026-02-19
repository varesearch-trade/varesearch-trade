'use client'

import { useState } from 'react'
import type { Session } from 'next-auth'
import Link from 'next/link'
import { signOut } from 'next-auth/react'

type UserRow = {
  id: string; email: string; name: string | null; role: string
  isActive: boolean; createdAt: Date
  portfolio: {
    userId: string; currentBalance: string; startingBalance: string
    totalPnl: string; totalPnlPct: string; totalTrades: number; winningTrades: number
  } | null
}

const GOLD = '#D4AF37'
const mono = "'JetBrains Mono', monospace"

function pnlColor(v: string | number) {
  const n = typeof v === 'string' ? parseFloat(v) : v
  return n > 0 ? '#22c55e' : n < 0 ? '#ef4444' : 'rgba(255,255,255,0.4)'
}

function fmtBalance(v: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(v))
}

export default function UserManagement({ session, initialUsers }: { session: Session; initialUsers: UserRow[] }) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Create form
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<'viewer' | 'admin'>('viewer')
  const [newBalance, setNewBalance] = useState('100000')

  // Edit form
  const [editName, setEditName] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editBalance, setEditBalance] = useState('')

  const showMsg = (type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3500)
  }

  async function createUser() {
    if (!newEmail || !newPassword || !newName) return showMsg('err', 'Fill all fields')
    setLoading(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail, name: newName, password: newPassword,
          role: newRole, startingBalance: parseFloat(newBalance),
        }),
      })
      const data = await res.json()
      if (!res.ok) return showMsg('err', data.error || 'Failed to create user')
      // Reload
      const refreshed = await fetch('/api/users').then(r => r.json())
      setUsers(refreshed.users ?? users)
      setShowCreate(false)
      setNewEmail(''); setNewName(''); setNewPassword('')
      showMsg('ok', `User ${data.user.email} created successfully`)
    } finally { setLoading(false) }
  }

  async function toggleActive(user: UserRow) {
    await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !user.isActive }),
    })
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: !u.isActive } : u))
    showMsg('ok', `${user.email} ${user.isActive ? 'deactivated' : 'activated'}`)
  }

  async function deleteUser(user: UserRow) {
    if (!confirm(`Delete ${user.email}? This cannot be undone.`)) return
    const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
    if (!res.ok) return showMsg('err', 'Cannot delete this user')
    setUsers(prev => prev.filter(u => u.id !== user.id))
    showMsg('ok', 'User deleted')
  }

  async function saveEdit() {
    if (!selectedUser) return
    setLoading(true)
    try {
      const body: Record<string, unknown> = {}
      if (editName) body.name = editName
      if (editPassword) body.password = editPassword
      if (editBalance) body.resetBalance = parseFloat(editBalance)

      await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, name: editName || u.name } : u))
      setSelectedUser(null)
      setEditName(''); setEditPassword(''); setEditBalance('')
      showMsg('ok', 'User updated')
    } finally { setLoading(false) }
  }

  const totalUsers = users.length
  const activeUsers = users.filter(u => u.isActive).length
  const adminCount = users.filter(u => u.role === 'admin').length
  const totalCapital = users.reduce((s, u) => s + (u.portfolio ? parseFloat(u.portfolio.currentBalance) : 0), 0)

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem 6rem' }}>
      {/* Toast */}
      {msg && (
        <div style={{
          position: 'fixed', top: 50, right: 20, zIndex: 99999,
          background: msg.type === 'ok' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
          border: `1px solid ${msg.type === 'ok' ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
          color: msg.type === 'ok' ? '#22c55e' : '#ef4444',
          padding: '12px 20px', borderRadius: 8,
          fontFamily: mono, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          animation: 'terminalIn 0.3s ease-out',
        }}>
          {msg.type === 'ok' ? '✓' : '✗'} {msg.text}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
            <Link href="/admin" style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>← Admin</Link>
            <span style={{ color: 'rgba(255,255,255,0.1)' }}>/</span>
            <span style={{ fontFamily: mono, fontSize: 9, color: GOLD }}>User Management</span>
          </div>
          <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', textTransform: 'uppercase' }}>
            Client Accounts
          </h1>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          style={{ fontFamily: mono, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', padding: '12px 24px', borderRadius: 8, border: 'none', background: GOLD, color: '#000', cursor: 'pointer' }}>
          + Create User
        </button>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 28 }}>
        {[
          { label: 'Total Users', value: totalUsers.toString() },
          { label: 'Active', value: activeUsers.toString(), color: '#22c55e' },
          { label: 'Admins', value: adminCount.toString(), color: GOLD },
          { label: 'Total Sim Capital', value: fmtBalance(totalCapital.toString()) },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#080808', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 5 }}>{label}</div>
            <div style={{ fontFamily: mono, fontSize: 22, fontWeight: 700, color: color ?? '#fff' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Create user form */}
      {showCreate && (
        <div style={{ background: '#060606', border: `1px solid ${GOLD}30`, borderRadius: 14, padding: 24, marginBottom: 24, animation: 'terminalIn 0.25s ease-out' }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: GOLD, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 18 }}>▸ Create New Account</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            {[
              { label: 'Full Name', value: newName, setter: setNewName, placeholder: 'John Doe', type: 'text' },
              { label: 'Email Address', value: newEmail, setter: setNewEmail, placeholder: 'user@email.com', type: 'email' },
              { label: 'Password', value: newPassword, setter: setNewPassword, placeholder: 'Min 6 chars', type: 'password' },
              { label: 'Starting Balance ($)', value: newBalance, setter: setNewBalance, placeholder: '100000', type: 'number' },
            ].map(({ label, value, setter, placeholder, type }) => (
              <div key={label}>
                <label style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>{label}</label>
                <input value={value} onChange={e => setter(e.target.value)} placeholder={placeholder} type={type}
                  style={{ width: '100%', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '9px 12px', fontFamily: mono, fontSize: 12, color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div>
              <label style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Role</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['viewer', 'admin'] as const).map(r => (
                  <button key={r} onClick={() => setNewRole(r)}
                    style={{ flex: 1, fontFamily: mono, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', padding: '9px 0', borderRadius: 6, cursor: 'pointer', border: newRole === r ? `1px solid ${r === 'admin' ? GOLD : 'rgba(255,255,255,0.4)'}` : '1px solid rgba(255,255,255,0.08)', background: newRole === r ? (r === 'admin' ? `${GOLD}15` : 'rgba(255,255,255,0.08)') : 'transparent', color: newRole === r ? (r === 'admin' ? GOLD : '#fff') : 'rgba(255,255,255,0.3)' }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button onClick={createUser} disabled={loading}
              style={{ fontFamily: mono, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', padding: '11px 28px', borderRadius: 8, border: 'none', background: loading ? 'rgba(255,255,255,0.1)' : '#fff', color: '#000', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Creating...' : 'Create Account →'}
            </button>
            <button onClick={() => setShowCreate(false)}
              style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', padding: '11px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* User table */}
      <div style={{ background: '#060606', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.3em' }}>
          {users.length} registered users
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['User', 'Role', 'Status', 'Balance', 'P&L', 'Trades', 'Win Rate', 'Actions'].map(h => (
                  <th key={h} style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', padding: '10px 16px', textAlign: 'left', fontWeight: 700, letterSpacing: '0.2em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                const p = user.portfolio
                const wr = p && p.totalTrades > 0 ? (p.winningTrades / p.totalTrades * 100).toFixed(1) : '--'
                const isCurrentUser = user.id === session.user.id
                return (
                  <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', opacity: user.isActive ? 1 : 0.45 }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: '#fff' }}>{user.name ?? '–'}</div>
                      <div style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{user.email} {isCurrentUser && <span style={{ color: GOLD }}>(you)</span>}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontFamily: mono, fontSize: 8, fontWeight: 900, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 4, background: user.role === 'admin' ? `${GOLD}20` : 'rgba(255,255,255,0.05)', color: user.role === 'admin' ? GOLD : 'rgba(255,255,255,0.5)' }}>{user.role}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontFamily: mono, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 4, background: user.isActive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: user.isActive ? '#22c55e' : '#ef4444' }}>{user.isActive ? 'Active' : 'Suspended'}</span>
                    </td>
                    <td style={{ padding: '14px 16px', fontFamily: mono, fontSize: 11, fontWeight: 700, color: '#fff' }}>
                      {p ? fmtBalance(p.currentBalance) : <span style={{ color: 'rgba(255,255,255,0.2)' }}>–</span>}
                    </td>
                    <td style={{ padding: '14px 16px', fontFamily: mono, fontSize: 11, fontWeight: 700, color: p ? pnlColor(p.totalPnl) : 'rgba(255,255,255,0.2)' }}>
                      {p ? `${parseFloat(p.totalPnl) >= 0 ? '+' : ''}${fmtBalance(p.totalPnl)}` : '–'}
                    </td>
                    <td style={{ padding: '14px 16px', fontFamily: mono, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                      {p?.totalTrades ?? '–'}
                    </td>
                    <td style={{ padding: '14px 16px', fontFamily: mono, fontSize: 11, color: wr !== '--' && parseFloat(wr) >= 50 ? '#22c55e' : 'rgba(255,255,255,0.5)' }}>
                      {wr !== '--' ? `${wr}%` : '–'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => { setSelectedUser(user); setEditName(user.name ?? ''); setEditBalance(p?.startingBalance ?? '100000') }}
                          style={{ fontFamily: mono, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', padding: '5px 10px', borderRadius: 5, cursor: 'pointer', border: `1px solid ${GOLD}30`, background: `${GOLD}08`, color: GOLD }}>
                          Edit
                        </button>
                        {!isCurrentUser && (
                          <>
                            <button onClick={() => toggleActive(user)}
                              style={{ fontFamily: mono, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', padding: '5px 10px', borderRadius: 5, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.4)' }}>
                              {user.isActive ? 'Suspend' : 'Activate'}
                            </button>
                            <button onClick={() => deleteUser(user)}
                              style={{ fontFamily: mono, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', padding: '5px 10px', borderRadius: 5, cursor: 'pointer', border: '1px solid rgba(239,68,68,0.2)', background: 'transparent', color: '#ef4444' }}>
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit modal */}
      {selectedUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 50000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480, animation: 'terminalIn 0.25s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <div style={{ fontFamily: mono, fontSize: 9, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 4 }}>Edit Account</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: '#fff' }}>{selectedUser.email}</div>
              </div>
              <button onClick={() => setSelectedUser(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Display Name', value: editName, setter: setEditName, placeholder: selectedUser.name ?? '', type: 'text' },
                { label: 'New Password (leave blank to keep)', value: editPassword, setter: setEditPassword, placeholder: '••••••••', type: 'password' },
                { label: 'Reset Sim Balance ($)', value: editBalance, setter: setEditBalance, placeholder: '100000', type: 'number' },
              ].map(({ label, value, setter, placeholder, type }) => (
                <div key={label}>
                  <label style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>{label}</label>
                  <input value={value} onChange={e => setter(e.target.value)} placeholder={placeholder} type={type}
                    style={{ width: '100%', background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '10px 14px', fontFamily: mono, fontSize: 12, color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button onClick={saveEdit} disabled={loading}
                  style={{ flex: 1, fontFamily: mono, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', padding: '12px 0', borderRadius: 8, border: 'none', background: GOLD, color: '#000', cursor: 'pointer' }}>
                  {loading ? 'Saving...' : 'Save Changes →'}
                </button>
                <button onClick={() => setSelectedUser(null)}
                  style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', padding: '12px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
