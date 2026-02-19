import { NextRequest, NextResponse } from 'next/server'

// Mock economic calendar data — replace with real API (e.g. Tradingeconomics, Alpha Vantage)
// In production, fetch from: https://api.tradingeconomics.com/calendar
const MOCK_EVENTS: Record<string, EconomicEvent[]> = {
  'OANDA:XAUUSD': [
    {
      id: 'e1',
      time: '13:30 UTC',
      event: 'US CORE PCE PRICE INDEX MoM',
      actual: null,
      forecast: '0.3%',
      previous: '0.2%',
      impact: 'high',
      currency: 'USD',
    },
    {
      id: 'e2',
      time: '15:00 UTC',
      event: 'ISM MANUFACTURING PMI',
      actual: null,
      forecast: '47.5',
      previous: '47.2',
      impact: 'high',
      currency: 'USD',
    },
    {
      id: 'e3',
      time: '18:00 UTC',
      event: 'FED FOMC MINUTES RELEASE',
      actual: null,
      forecast: '--',
      previous: '--',
      impact: 'high',
      currency: 'USD',
    },
    {
      id: 'e4',
      time: 'TOMORROW',
      event: 'US NONFARM PAYROLLS',
      actual: null,
      forecast: '185K',
      previous: '199K',
      impact: 'high',
      currency: 'USD',
    },
  ],
  'BINANCE:BTCUSDT': [
    {
      id: 'e5',
      time: 'DAILY',
      event: 'SPOT BTC ETF NET FLOWS (BLOOMBERG)',
      actual: '+$240M',
      forecast: '--',
      previous: '+$185M',
      impact: 'high',
      currency: 'BTC',
    },
    {
      id: 'e6',
      time: '13:30 UTC',
      event: 'US CORE PCE (BTC PROXY RISK)',
      actual: null,
      forecast: '0.3%',
      previous: '0.2%',
      impact: 'mid',
      currency: 'USD',
    },
    {
      id: 'e7',
      time: 'WEEKLY',
      event: 'COINBASE PREMIUM INDEX',
      actual: '+0.08%',
      forecast: '--',
      previous: '-0.03%',
      impact: 'mid',
      currency: 'BTC',
    },
  ],
  'BINANCE:ETHUSDT': [
    {
      id: 'e8',
      time: 'LIVE',
      event: 'L2 TOTAL VALUE LOCKED (DEFILLAMA)',
      actual: '$42.8B',
      forecast: '--',
      previous: '$40.1B',
      impact: 'mid',
      currency: 'ETH',
    },
    {
      id: 'e9',
      time: 'DAILY',
      event: 'ETH STAKING YIELD (CONSENSUS LAYER)',
      actual: '3.8% APY',
      forecast: '--',
      previous: '3.7% APY',
      impact: 'low',
      currency: 'ETH',
    },
    {
      id: 'e10',
      time: '20:00 UTC',
      event: 'ETHEREUM NETWORK UPGRADE CALL',
      actual: null,
      forecast: '--',
      previous: '--',
      impact: 'mid',
      currency: 'ETH',
    },
  ],
  'FX_IDC:XAGUSD': [
    {
      id: 'e11',
      time: '13:30 UTC',
      event: 'US UNEMPLOYMENT CLAIMS',
      actual: null,
      forecast: '215K',
      previous: '220K',
      impact: 'high',
      currency: 'USD',
    },
    {
      id: 'e12',
      time: 'MONTHLY',
      event: 'SILVER INDUSTRIAL DEMAND (SILVER INSTITUTE)',
      actual: 'ABOVE TREND',
      forecast: '--',
      previous: 'IN-LINE',
      impact: 'high',
      currency: 'XAG',
    },
    {
      id: 'e13',
      time: '15:30 UTC',
      event: 'EIA CRUDE OIL INVENTORIES (COMMODITIES PROXY)',
      actual: null,
      forecast: '-1.8M BBL',
      previous: '+2.1M BBL',
      impact: 'mid',
      currency: 'USD',
    },
  ],
}

type EconomicEvent = {
  id: string
  time: string
  event: string
  actual: string | null
  forecast: string
  previous: string
  impact: 'high' | 'mid' | 'low'
  currency: string
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol') || 'OANDA:XAUUSD'

  // Simulate slight API latency
  await new Promise((r) => setTimeout(r, 80))

  const events = MOCK_EVENTS[symbol] ?? MOCK_EVENTS['OANDA:XAUUSD']

  return NextResponse.json({
    symbol,
    events,
    lastUpdated: new Date().toISOString(),
    source: 'mock', // change to 'live' when connected to real API
  })
}
