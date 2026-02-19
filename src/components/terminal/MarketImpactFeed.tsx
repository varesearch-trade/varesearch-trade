'use client'

import { useEffect, useState } from 'react'

interface EconomicEvent {
  id: string
  time: string
  event: string
  actual: string | null
  forecast: string
  previous: string
  impact: 'high' | 'mid' | 'low'
  currency: string
}

interface MarketImpactFeedProps {
  symbol: string
}

const IMPACT_COLORS = {
  high: { border: '#ef4444', text: 'text-red-500', bg: 'bg-red-500/10' },
  mid: { border: '#f97316', text: 'text-orange-500', bg: 'bg-orange-500/10' },
  low: { border: '#eab308', text: 'text-yellow-500', bg: 'bg-yellow-500/10' },
}

export default function MarketImpactFeed({ symbol }: MarketImpactFeedProps) {
  const [events, setEvents] = useState<EconomicEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/economic-events?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((d) => {
        setEvents(d.events ?? [])
        setLastUpdated(new Date(d.lastUpdated).toLocaleTimeString())
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [symbol])

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse h-20 rounded-lg"
            style={{ background: '#111', borderLeft: '3px solid #222' }}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {lastUpdated && (
        <div
          className="text-[9px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.2)' }}
        >
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: '#22c55e', boxShadow: '0 0 4px #22c55e', animation: 'pulseGold 1.5s infinite' }}
          />
          LIVE FEED · {lastUpdated}
        </div>
      )}

      {events.map((item) => {
        const colors = IMPACT_COLORS[item.impact]
        return (
          <div
            key={item.id}
            className="rounded-lg p-4"
            style={{
              background: '#050505',
              borderLeft: `3px solid ${colors.border}`,
              borderTop: '1px solid rgba(255,255,255,0.04)',
              borderRight: '1px solid rgba(255,255,255,0.04)',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            <div className="flex justify-between items-center mb-2">
              <span
                className="text-[10px] font-bold"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.3)' }}
              >
                {item.time}
              </span>
              <span
                className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${colors.text}`}
                style={{ background: `rgba(0,0,0,0.4)`, fontFamily: "'JetBrains Mono', monospace" }}
              >
                {item.impact} IMPACT
              </span>
            </div>

            <div
              className="text-[11px] font-bold text-white mb-3 uppercase leading-tight"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {item.event}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'ACTUAL', value: item.actual ?? '--' },
                { label: 'FCST', value: item.forecast },
                { label: 'PREV', value: item.previous },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <div
                    className="text-[8px] font-bold mb-0.5"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.2)' }}
                  >
                    {label}
                  </div>
                  <div
                    className={`text-[11px] font-bold ${label === 'ACTUAL' && item.actual ? colors.text : 'text-white'}`}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
