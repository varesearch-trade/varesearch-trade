'use client'

import { useState } from 'react'
import type { Session } from 'next-auth'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import MarkdownRenderer from '@/components/ui/MarkdownRenderer'

type Post = {
  id: string
  title: string
  content: string
  category: string
  published: boolean
  createdAt: Date
  author: { id: string; name: string | null; email: string } | null
}

type Category = 'XAUUSD' | 'XAGUSD' | 'BTCUSD' | 'ETHUSD' | 'SPX' | 'MACRO' | 'OTHER'

const CATEGORIES: Category[] = ['XAUUSD', 'XAGUSD', 'BTCUSD', 'ETHUSD', 'SPX', 'MACRO', 'OTHER']

const CATEGORY_COLORS: Record<string, string> = {
  XAUUSD: '#D4AF37',
  XAGUSD: '#C0C0C0',
  BTCUSD: '#F7931A',
  ETHUSD: '#627EEA',
  SPX: '#00D4A1',
  MACRO: '#8B5CF6',
  OTHER: '#6B7280',
}

interface AdminDashboardProps {
  session: Session
  initialPosts: Post[]
}

type Tab = 'posts' | 'compose' | 'settings' | 'users'

export default function AdminDashboard({ session, initialPosts }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('compose')
  const [posts, setPosts] = useState<Post[]>(initialPosts)

  // Compose form
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<Category>('XAUUSD')
  const [published, setPublished] = useState(true)
  const [publishLoading, setPublishLoading] = useState(false)
  const [publishSuccess, setPublishSuccess] = useState(false)
  const [preview, setPreview] = useState(false)

  // Settings / ticker
  const [tickerInput, setTickerInput] = useState(
    'OANDA:XAUUSD, BINANCE:BTCUSDT, FOREXCOM:SPX, FX_IDC:XAGUSD'
  )
  const [tickerSaving, setTickerSaving] = useState(false)
  const [tickerSaved, setTickerSaved] = useState(false)

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handlePublish() {
    if (!title.trim() || !content.trim()) return
    setPublishLoading(true)

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, category, published }),
      })

      if (!res.ok) throw new Error('Failed')

      const { post } = await res.json()
      setPosts([{ ...post, author: { id: session.user.id, name: session.user.name ?? null, email: session.user.email } }, ...posts])
      setTitle('')
      setContent('')
      setPublishSuccess(true)
      setTimeout(() => setPublishSuccess(false), 3000)
      setActiveTab('posts')
    } catch (err) {
      console.error(err)
    } finally {
      setPublishLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this post?')) return
    setDeletingId(id)

    try {
      await fetch(`/api/posts/${id}`, { method: 'DELETE' })
      setPosts(posts.filter((p) => p.id !== id))
    } catch (err) {
      console.error(err)
    } finally {
      setDeletingId(null)
    }
  }

  async function handleSaveTicker() {
    setTickerSaving(true)
    const symbols = tickerInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    try {
      await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickerSymbols: symbols }),
      })
      setTickerSaved(true)
      setTimeout(() => setTickerSaved(false), 2500)
    } catch (err) {
      console.error(err)
    } finally {
      setTickerSaving(false)
    }
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'compose', label: 'Compose' },
    { id: 'posts', label: `Posts (${posts.length})` },
    { id: 'settings', label: 'Settings' },
    { id: 'users', label: 'Users / Accounts' },
  ]

  return (
    <div className="min-h-screen px-4 md:px-10 max-w-7xl mx-auto py-8 page-enter">
      {/* Admin Header */}
      <div
        className="flex justify-between items-center mb-10 pb-6"
        style={{ borderBottom: '1px solid rgba(212,175,55,0.15)' }}
      >
        <div>
          <div
            className="text-[9px] font-bold uppercase tracking-[0.8em] mb-2"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--gold)' }}
          >
            ◈ Management Terminal
          </div>
          <h1
            className="font-black text-white uppercase text-2xl"
            style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '-0.04em' }}
          >
            VA Research / Admin
          </h1>
          <p
            className="text-[10px] mt-1"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.25)' }}
          >
            Logged in as: {session.user.email}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-[9px] font-bold uppercase px-3 py-2 transition-colors"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '4px',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            ← Terminal
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-[9px] font-bold uppercase px-3 py-2 transition-colors"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '4px',
              color: '#ef4444',
            }}
          >
            End_Session
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-10">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all duration-200"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              background: activeTab === tab.id ? 'rgba(212,175,55,0.1)' : 'transparent',
              border: activeTab === tab.id
                ? '1px solid rgba(212,175,55,0.4)'
                : '1px solid rgba(255,255,255,0.06)',
              color: activeTab === tab.id ? 'var(--gold)' : 'rgba(255,255,255,0.35)',
              borderRadius: '6px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── COMPOSE TAB ── */}
      {activeTab === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <div
            className="p-8 rounded-xl"
            style={{
              background: 'rgba(10,10,10,0.8)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <h2
              className="text-[9px] font-bold uppercase tracking-widest mb-8"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.3)' }}
            >
              ▸ Publish Technical Thesis
            </h2>

            {/* Title */}
            <div className="mb-6">
              <label
                className="block text-[9px] font-bold uppercase tracking-widest mb-2"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.25)' }}
              >
                STRATEGY_TITLE
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. XAUUSD — Macro Accumulation Zone"
                className="w-full bg-transparent py-3 text-white outline-none text-sm font-bold uppercase transition-colors"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                }}
                onFocus={(e) => (e.target.style.borderBottomColor = 'var(--gold)')}
                onBlur={(e) => (e.target.style.borderBottomColor = 'rgba(255,255,255,0.1)')}
              />
            </div>

            {/* Category */}
            <div className="mb-6">
              <label
                className="block text-[9px] font-bold uppercase tracking-widest mb-3"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.25)' }}
              >
                CATEGORY
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className="text-[9px] font-bold uppercase px-3 py-1.5 transition-all duration-150"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      border: category === cat
                        ? `1px solid ${CATEGORY_COLORS[cat]}`
                        : '1px solid rgba(255,255,255,0.08)',
                      background: category === cat ? `${CATEGORY_COLORS[cat]}15` : 'transparent',
                      color: category === cat ? CATEGORY_COLORS[cat] : 'rgba(255,255,255,0.25)',
                      borderRadius: '4px',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label
                  className="text-[9px] font-bold uppercase tracking-widest"
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.25)' }}
                >
                  TECHNICAL_THESIS (Markdown)
                </label>
                <button
                  onClick={() => setPreview(!preview)}
                  className="text-[9px] font-bold uppercase"
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: preview ? 'var(--gold)' : 'rgba(255,255,255,0.2)' }}
                >
                  {preview ? '✎ Edit' : '◉ Preview'}
                </button>
              </div>
              {preview ? (
                <div
                  className="min-h-[200px] p-4 rounded-lg"
                  style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  {content ? (
                    <MarkdownRenderer content={content} />
                  ) : (
                    <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace" }}>
                      Nothing to preview yet...
                    </span>
                  )}
                </div>
              ) : (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={`## Thesis\n\nGold is forming a **key demand zone** at...\n\n### Key Levels\n- **Support**: $2,580\n- **Target**: $2,680`}
                  className="w-full bg-transparent py-3 text-white outline-none text-sm resize-none leading-relaxed transition-colors"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '12px',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    minHeight: '200px',
                  }}
                  onFocus={(e) => (e.target.style.borderBottomColor = 'var(--gold)')}
                  onBlur={(e) => (e.target.style.borderBottomColor = 'rgba(255,255,255,0.1)')}
                />
              )}
            </div>

            {/* Published toggle */}
            <div className="flex items-center gap-3 mb-8">
              <button
                type="button"
                onClick={() => setPublished(!published)}
                className="relative w-10 h-5 rounded-full transition-all duration-200"
                style={{
                  background: published ? 'var(--gold)' : 'rgba(255,255,255,0.1)',
                }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-black transition-all duration-200"
                  style={{ left: published ? '1.25rem' : '0.125rem' }}
                />
              </button>
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: published ? 'var(--gold)' : 'rgba(255,255,255,0.3)' }}
              >
                {published ? 'Published' : 'Draft'}
              </span>
            </div>

            {/* Submit */}
            <button
              onClick={handlePublish}
              disabled={publishLoading || !title.trim() || !content.trim()}
              className="w-full py-4 font-black uppercase text-[10px] tracking-[0.4em] transition-all duration-300"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                background: publishSuccess
                  ? '#22c55e'
                  : publishLoading || !title.trim() || !content.trim()
                  ? 'rgba(255,255,255,0.1)'
                  : '#fff',
                color: publishSuccess ? '#fff' : '#000',
                borderRadius: '6px',
                cursor: publishLoading || !title.trim() || !content.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {publishSuccess
                ? '✓ BROADCAST_SUCCESSFUL'
                : publishLoading
                ? 'TRANSMITTING...'
                : 'BROADCAST STUDY →'}
            </button>
          </div>

          {/* Live preview panel */}
          <div>
            <div
              className="text-[9px] font-bold uppercase tracking-widest mb-4"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.2)' }}
            >
              ◉ Live Preview
            </div>
            <div
              className="p-8 rounded-xl"
              style={{
                background: '#050505',
                border: '1px solid rgba(255,255,255,0.04)',
                minHeight: '400px',
              }}
            >
              {title && (
                <div className="mb-6">
                  <span
                    className="text-[8px] font-black uppercase px-2 py-0.5 rounded inline-block mb-3"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      background: `${CATEGORY_COLORS[category]}15`,
                      color: CATEGORY_COLORS[category],
                      border: `1px solid ${CATEGORY_COLORS[category]}30`,
                    }}
                  >
                    {category}
                  </span>
                  <h3
                    className="font-black text-white uppercase text-xl leading-tight"
                    style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '-0.03em' }}
                  >
                    {title}
                  </h3>
                </div>
              )}
              {content ? (
                <MarkdownRenderer content={content} />
              ) : (
                <p
                  className="text-[11px] italic"
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.1)' }}
                >
                  Start typing your thesis...
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── POSTS TAB ── */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div
              className="py-20 text-center text-[11px] uppercase tracking-widest"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.2)' }}
            >
              No posts yet. Start with Compose.
            </div>
          ) : (
            posts.map((post) => {
              const catColor = CATEGORY_COLORS[post.category] || 'var(--gold)'
              return (
                <div
                  key={post.id}
                  className="flex items-start justify-between gap-6 p-5 rounded-xl"
                  style={{
                    background: 'rgba(10,10,10,0.8)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderLeft: `3px solid ${catColor}`,
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <span
                        className="text-[8px] font-black uppercase px-2 py-0.5 rounded"
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          background: `${catColor}15`,
                          color: catColor,
                        }}
                      >
                        {post.category}
                      </span>
                      {!post.published && (
                        <span
                          className="text-[8px] font-bold uppercase px-2 py-0.5 rounded"
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            background: 'rgba(239,68,68,0.1)',
                            color: '#ef4444',
                          }}
                        >
                          DRAFT
                        </span>
                      )}
                      <span
                        className="text-[9px]"
                        style={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.2)' }}
                      >
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3
                      className="font-bold text-white uppercase text-sm leading-tight truncate"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {post.title}
                    </h3>
                    <p
                      className="text-[10px] mt-1 truncate"
                      style={{ color: 'rgba(255,255,255,0.2)', fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {post.content.slice(0, 80)}...
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(post.id)}
                    disabled={deletingId === post.id}
                    className="text-[9px] font-bold uppercase px-3 py-1.5 shrink-0 transition-colors"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      border: '1px solid rgba(239,68,68,0.2)',
                      borderRadius: '4px',
                      color: deletingId === post.id ? 'rgba(239,68,68,0.4)' : '#ef4444',
                    }}
                  >
                    {deletingId === post.id ? '...' : 'Delete'}
                  </button>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── SETTINGS TAB ── */}
      {activeTab === 'settings' && (
        <div className="max-w-lg">
          <div
            className="p-8 rounded-xl"
            style={{
              background: 'rgba(10,10,10,0.8)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <h2
              className="text-[9px] font-bold uppercase tracking-widest mb-2"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.3)' }}
            >
              ▸ Configure Global Ticker Tape
            </h2>
            <p
              className="text-[10px] mb-6"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.2)' }}
            >
              Comma-separated TradingView symbols. Saved to your account profile.
            </p>

            <textarea
              value={tickerInput}
              onChange={(e) => setTickerInput(e.target.value)}
              className="w-full bg-black text-white outline-none text-[11px] p-4 rounded-lg uppercase resize-none"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                border: '1px solid rgba(255,255,255,0.1)',
                minHeight: '100px',
              }}
              placeholder="OANDA:XAUUSD, BINANCE:BTCUSDT, FOREXCOM:SPX"
            />

            <button
              onClick={handleSaveTicker}
              disabled={tickerSaving}
              className="w-full mt-4 py-4 font-black uppercase text-[10px] tracking-[0.4em] transition-all duration-300"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                background: tickerSaved ? '#22c55e' : 'var(--gold)',
                color: '#000',
                borderRadius: '6px',
              }}
            >
              {tickerSaved ? '✓ SYNCED' : tickerSaving ? 'SYNCING...' : 'SYNC INFRASTRUCTURE →'}
            </button>
          </div>
        </div>
      )}

      {/* ── USERS TAB ── */}
      {activeTab === 'users' && (
        <div className="text-center py-16">
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 40, color: 'rgba(212,175,55,0.3)', marginBottom: 16 }}>◈</div>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 20 }}>
            Manage client accounts with simulation portfolios
          </p>
          <Link
            href="/admin/users"
            style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 900,
              textTransform: 'uppercase', letterSpacing: '0.3em',
              padding: '14px 32px', borderRadius: 8, display: 'inline-block',
              background: 'var(--gold)', color: '#000', textDecoration: 'none',
            }}
          >
            → Open User Management
          </Link>
        </div>
      )}
    </div>
  )
}
