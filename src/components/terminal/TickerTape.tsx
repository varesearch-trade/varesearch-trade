'use client'

import { useEffect, useRef, useState } from 'react'

const DEFAULT_SYMBOLS = [
  'OANDA:XAUUSD',
  'BINANCE:BTCUSDT',
  'FOREXCOM:SPX',
  'FX_IDC:XAGUSD',
]

interface TickerTapeProps {
  userId?: string
  initialSymbols?: string[]
}

export default function TickerTape({ userId, initialSymbols }: TickerTapeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [symbols, setSymbols] = useState<string[]>(initialSymbols ?? DEFAULT_SYMBOLS)

  useEffect(() => {
    if (!userId) return
    fetch('/api/preferences')
      .then((r) => r.json())
      .then((d) => {
        if (d.tickerSymbols?.length) setSymbols(d.tickerSymbols)
      })
      .catch(() => {})
  }, [userId])

  useEffect(() => {
    const wrapper = containerRef.current
    if (!wrapper) return
    wrapper.innerHTML = ''

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      symbols: symbols.map((s) => ({
        proName: s,
        title: s.split(':').pop(),
      })),
      colorTheme: 'dark',
      isTransparent: true,
      displayMode: 'compact',
      locale: 'en',
    })
    wrapper.appendChild(script)
  }, [symbols])

  return (
    <div
      className="fixed top-0 left-0 w-full z-[99999]"
      style={{ height: 'var(--ticker-h)', background: '#000', borderBottom: '1px solid rgba(255,255,255,0.1)' }}
    >
      <div ref={containerRef} className="tradingview-widget-container w-full h-full" />
    </div>
  )
}
