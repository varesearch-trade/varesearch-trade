'use client'

import { useState } from 'react'
import MarkdownRenderer from '@/components/ui/MarkdownRenderer'

type Post = {
  id: string
  title: string
  content: string
  category: string
  published: boolean
  createdAt: Date
  author: {
    id: string
    name: string | null
    email: string
  } | null
}

const CATEGORIES = ['ALL', 'XAUUSD', 'XAGUSD', 'BTCUSD', 'ETHUSD', 'SPX', 'MACRO', 'OTHER']

const CATEGORY_COLORS: Record<string, string> = {
  XAUUSD: '#D4AF37',
  XAGUSD: '#C0C0C0',
  BTCUSD: '#F7931A',
  ETHUSD: '#627EEA',
  SPX: '#00D4A1',
  MACRO: '#8B5CF6',
  OTHER: '#6B7280',
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

interface IntelligenceFeedProps {
  initialPosts: Post[]
}

export default function IntelligenceFeed({ initialPosts }: IntelligenceFeedProps) {
  const [activeCategory, setActiveCategory] = useState('ALL')
  const [expandedId, setExpandedId] = useState<string | null>(initialPosts[0]?.id ?? null)

  const filtered =
    activeCategory === 'ALL'
      ? initialPosts
      : initialPosts.filter((p) => p.category === activeCategory)

  if (initialPosts.length === 0) {
    return (
      <div
        className="py-20 text-center text-[11px] uppercase tracking-widest"
        style={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.2)' }}
      >
        <div className="mb-4" style={{ fontSize: '2rem', opacity: 0.2 }}>◈</div>
        AWAITING_SECURE_TRANSMISSION...
        <br />
        <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: '9px' }}>
          No research published yet.
        </span>
      </div>
    )
  }

  return (
    <div>
      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-10">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className="text-[9px] font-bold uppercase px-3 py-1.5 transition-all duration-200"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              border: activeCategory === cat
                ? `1px solid ${CATEGORY_COLORS[cat] || 'var(--gold)'}`
                : '1px solid rgba(255,255,255,0.08)',
              background: activeCategory === cat
                ? `${CATEGORY_COLORS[cat] || 'var(--gold)'}15`
                : 'transparent',
              color: activeCategory === cat
                ? (CATEGORY_COLORS[cat] || 'var(--gold)')
                : 'rgba(255,255,255,0.3)',
              borderRadius: '4px',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Post list */}
      <div className="space-y-0">
        {filtered.length === 0 ? (
          <div
            className="py-12 text-center text-[10px] uppercase tracking-widest"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.2)' }}
          >
            No studies in this category.
          </div>
        ) : (
          filtered.map((post, idx) => {
            const catColor = CATEGORY_COLORS[post.category] || 'var(--gold)'
            const isExpanded = expandedId === post.id
            return (
              <article
                key={post.id}
                className="transition-all duration-300"
                style={{
                  borderLeft: `2px solid ${isExpanded ? catColor : 'rgba(255,255,255,0.08)'}`,
                  paddingLeft: '1.5rem',
                  paddingTop: '1.5rem',
                  paddingBottom: '1.5rem',
                  borderBottom: idx < filtered.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                  marginBottom: 0,
                }}
              >
                {/* Header row */}
                <div
                  className="flex items-start justify-between gap-4 mb-3 cursor-pointer group"
                  onClick={() => setExpandedId(isExpanded ? null : post.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span
                        className="text-[8px] font-black uppercase px-2 py-0.5 rounded"
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          background: `${catColor}15`,
                          color: catColor,
                          border: `1px solid ${catColor}30`,
                        }}
                      >
                        {post.category}
                      </span>
                      <span
                        className="text-[9px]"
                        style={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.2)' }}
                      >
                        {formatDate(post.createdAt)}
                      </span>
                      {post.author?.name && (
                        <span
                          className="text-[9px]"
                          style={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.15)' }}
                        >
                          by {post.author.name}
                        </span>
                      )}
                    </div>
                    <h3
                      className="font-black text-white uppercase leading-tight group-hover:text-gold transition-colors"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                        letterSpacing: '-0.03em',
                      }}
                    >
                      {post.title}
                    </h3>
                  </div>
                  <div
                    className="text-[14px] transition-transform duration-300 mt-1 shrink-0"
                    style={{
                      color: 'rgba(255,255,255,0.2)',
                      transform: isExpanded ? 'rotate(180deg)' : 'none',
                    }}
                  >
                    ▾
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="mt-4 animate-[terminalIn_0.25s_ease-out]">
                    <MarkdownRenderer content={post.content} />
                  </div>
                )}
              </article>
            )
          })
        )}
      </div>
    </div>
  )
}
