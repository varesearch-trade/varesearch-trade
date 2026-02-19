'use client'

import { useState } from 'react'
import type { Session } from 'next-auth'
import TradingViewChart from './TradingViewChart'
import MarketImpactFeed from './MarketImpactFeed'

const MARKETS = [
  { id: 'xau', symbol: 'OANDA:XAUUSD', label: 'XAUUSD', interval: '60' },
  { id: 'btc', symbol: 'BINANCE:BTCUSDT', label: 'BTCUSD', interval: '60' },
  { id: 'eth', symbol: 'BINANCE:ETHUSDT', label: 'ETHUSD', interval: '60' },
  { id: 'xag', symbol: 'FX_IDC:XAGUSD', label: 'XAGUSD', interval: 'D' },
]

interface TerminalDashboardProps {
  session: Session | null
}

export default function TerminalDashboard({ session: _ }: TerminalDashboardProps) {
  const [activeMarket, setActiveMarket] = useState(MARKETS[0])

  return (
    <section className="px-4 md:px-10 max-w-7xl mx-auto py-8 md:py-12 page-enter">
      {/* Market selector */}
      <div className="flex overflow-x-auto no-scrollbar gap-3 mb-10 pb-2">
        {MARKETS.map((m) => (
          <button
            key={m.id}
            onClick={() => setActiveMarket(m)}
            className="whitespace-nowrap px-8 py-3 text-[10px] font-bold uppercase transition-all duration-300 rounded-xl"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              border: activeMarket.id === m.id
                ? '1px solid var(--gold)'
                : '1px solid rgba(255,255,255,0.1)',
              background: activeMarket.id === m.id
                ? 'rgba(212,175,55,0.1)'
                : 'rgba(15,15,15,0.8)',
              color: activeMarket.id === m.id ? 'var(--gold)' : 'rgba(255,255,255,0.5)',
              boxShadow: activeMarket.id === m.id
                ? '0 0 15px rgba(212,175,55,0.1)'
                : 'none',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Chart */}
        <div
          className="lg:col-span-8 w-full glass scanline overflow-hidden shadow-2xl"
          style={{ height: 'clamp(350px, 55vw, 650px)', position: 'relative' }}
        >
          <TradingViewChart symbol={activeMarket.symbol} interval={activeMarket.interval} />
        </div>

        {/* Impact feed */}
        <div className="lg:col-span-4 space-y-6">
          <div>
            <span
              className="text-[9px] font-bold block mb-2 uppercase tracking-[0.5em]"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--gold)' }}
            >
              Algorithmic Risk Scan
            </span>
            <h1
              className="font-black text-white leading-none uppercase italic"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 'clamp(2.5rem, 5vw, 3.75rem)',
                letterSpacing: '-0.05em',
              }}
            >
              Market <br />Impact.
            </h1>
          </div>

          <div
            className="space-y-3 pr-1 no-scrollbar"
            style={{ maxHeight: '450px', overflowY: 'auto' }}
          >
            <MarketImpactFeed symbol={activeMarket.symbol} />
          </div>
        </div>
      </div>
    </section>
  )
}
