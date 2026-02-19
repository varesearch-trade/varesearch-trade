'use client'

import { useEffect, useRef } from 'react'

interface TradingViewChartProps {
  symbol: string
  interval?: string
}

export default function TradingViewChart({ symbol, interval = '15' }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.innerHTML = ''

    const iframe = document.createElement('iframe')
    iframe.src = `https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(symbol)}&interval=${interval}&theme=dark&style=1&locale=en&toolbar_bg=000000&hide_top_toolbar=0&save_image=0&studies=[]`
    iframe.width = '100%'
    iframe.height = '100%'
    iframe.frameBorder = '0'
    iframe.setAttribute('scrolling', 'no')
    iframe.setAttribute('allowtransparency', 'true')
    container.appendChild(iframe)
  }, [symbol, interval])

  return <div ref={containerRef} className="w-full h-full" />
}
