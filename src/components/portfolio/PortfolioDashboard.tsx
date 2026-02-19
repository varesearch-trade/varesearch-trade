'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Session } from 'next-auth'
import { formatCurrency, formatPct, pnlColor, getMockPrice, calculateRiskReward, calculatePositionSize } from '@/lib/simulation'
import TradingViewChart from '@/components/terminal/TradingViewChart'

// ─── Types ────────────────────────────────────────────────────────────────────
type Portfolio = {
  id: string; userId: string; name: string
  startingBalance: string; currentBalance: string; currency: string
  totalPnl: string; totalPnlPct: string
  totalTrades: number; winningTrades: number; losingTrades: number
  createdAt: Date; updatedAt: Date
}

type Trade = {
  id: string; symbol: string; tvSymbol: string; side: 'long' | 'short'
  orderType: string; status: string; quantity: string; entryPrice: string
  exitPrice: string | null; stopLoss: string | null; takeProfit: string | null
  pnl: string | null; pnlPct: string | null; notes: string | null
  openedAt: Date; closedAt: Date | null; strategyTemplateId: string | null
  currentPrice?: number; livePnl?: number; livePnlPct?: number
}

type Template = {
  id: string; name: string; description: string | null; category: string
  defaultQuantity: string | null; defaultStopLossPct: string | null
  defaultTakeProfitPct: string | null; rules: unknown[]
}

type Alert = {
  id: string; symbol: string; condition: 'above' | 'below'
  targetPrice: string; status: string; note: string | null
  autoTrade: boolean; createdAt: string
}

const SYMBOLS = [
  { symbol: 'XAUUSD', tvSymbol: 'OANDA:XAUUSD', label: 'XAUUSD', basePrice: 2638 },
  { symbol: 'BTCUSD', tvSymbol: 'BINANCE:BTCUSDT', label: 'BTCUSD', basePrice: 97400 },
  { symbol: 'ETHUSD', tvSymbol: 'BINANCE:ETHUSDT', label: 'ETHUSD', basePrice: 3320 },
  { symbol: 'XAGUSD', tvSymbol: 'FX_IDC:XAGUSD', label: 'XAGUSD', basePrice: 30.42 },
  { symbol: 'SPX', tvSymbol: 'FOREXCOM:SPX', label: 'SPX500', basePrice: 5860 },
]

type Tab = 'trade' | 'positions' | 'history' | 'alerts' | 'templates'

const GOLD = '#D4AF37'
const mono = "'JetBrains Mono', monospace"

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: '#080808', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '16px 20px' }}>
      <div style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: mono, fontSize: 20, fontWeight: 700, color: color ?? '#fff', letterSpacing: '-0.02em' }}>{value}</div>
      {sub && <div style={{ fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function PortfolioDashboard({
  session, portfolio: initPortfolio, initialTrades, templates,
}: {
  session: Session; portfolio: Portfolio; initialTrades: Trade[]; templates: Template[]
}) {
  const [portfolio, setPortfolio] = useState(initPortfolio)
  const [trades, setTrades] = useState<Trade[]>(initialTrades)
  const [activeTab, setActiveTab] = useState<Tab>('trade')
  const [selectedSymbol, setSelectedSymbol] = useState(SYMBOLS[0])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Trade form
  const [side, setSide] = useState<'long' | 'short'>('long')
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop'>('market')
  const [quantity, setQuantity] = useState('')
  const [limitPrice, setLimitPrice] = useState('')
  const [stopLoss, setStopLoss] = useState('')
  const [takeProfit, setTakeProfit] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [riskPct, setRiskPct] = useState('2')

  // Alert form
  const [alertCondition, setAlertCondition] = useState<'above' | 'below'>('above')
  const [alertPrice, setAlertPrice] = useState('')
  const [alertNote, setAlertNote] = useState('')
  const [autoTrade, setAutoTrade] = useState(false)
  const [autoSide, setAutoSide] = useState<'long' | 'short'>('long')
  const [autoQty, setAutoQty] = useState('')

  const currentPrice = selectedSymbol.basePrice
  const balance = parseFloat(portfolio.currentBalance)

  const showMsg = (type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3500)
  }

  // Load alerts
  useEffect(() => {
    fetch('/api/alerts').then(r => r.json()).then(d => setAlerts(d.alerts ?? []))
  }, [])

  // Apply strategy template
  useEffect(() => {
    if (!selectedTemplate) return
    if (selectedTemplate.defaultQuantity) setQuantity(selectedTemplate.defaultQuantity)
    if (selectedTemplate.defaultStopLossPct) {
      const sl = side === 'long'
        ? currentPrice * (1 - parseFloat(selectedTemplate.defaultStopLossPct) / 100)
        : currentPrice * (1 + parseFloat(selectedTemplate.defaultStopLossPct) / 100)
      setStopLoss(sl.toFixed(2))
    }
    if (selectedTemplate.defaultTakeProfitPct) {
      const tp = side === 'long'
        ? currentPrice * (1 + parseFloat(selectedTemplate.defaultTakeProfitPct) / 100)
        : currentPrice * (1 - parseFloat(selectedTemplate.defaultTakeProfitPct) / 100)
      setTakeProfit(tp.toFixed(2))
    }
  }, [selectedTemplate, side, currentPrice])

  // Auto position size from risk %
  function applyRiskBasedSize() {
    if (!stopLoss || !riskPct) return
    const size = calculatePositionSize({
      accountBalance: balance,
      riskPercent: parseFloat(riskPct),
      entryPrice: currentPrice,
      stopLoss: parseFloat(stopLoss),
      symbol: selectedSymbol.symbol,
    })
    setQuantity(size.toString())
  }

  const rr = calculateRiskReward({
    side,
    entryPrice: orderType === 'market' ? currentPrice : parseFloat(limitPrice || '0') || currentPrice,
    stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
    takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
  })

  async function openTrade() {
    if (!quantity || parseFloat(quantity) <= 0) return showMsg('err', 'Enter a valid quantity')
    setLoading(true)
    try {
      const res = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selectedSymbol.symbol,
          tvSymbol: selectedSymbol.tvSymbol,
          side, orderType,
          quantity: parseFloat(quantity),
          limitPrice: limitPrice ? parseFloat(limitPrice) : undefined,
          stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
          takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
          strategyTemplateId: selectedTemplate?.id,
          notes,
        }),
      })
      const data = await res.json()
      if (!res.ok) return showMsg('err', data.error || 'Failed')
      setTrades(prev => [data.trade, ...prev])
      setQuantity(''); setStopLoss(''); setTakeProfit(''); setNotes(''); setLimitPrice('')
      showMsg('ok', `${side.toUpperCase()} trade opened on ${selectedSymbol.symbol}`)
      setActiveTab('positions')
      // refresh portfolio
      fetch('/api/portfolio').then(r => r.json()).then(d => d.portfolio && setPortfolio(d.portfolio))
    } finally { setLoading(false) }
  }

  async function closeTrade(id: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/trades/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const data = await res.json()
      if (!res.ok) return showMsg('err', data.error)
      setTrades(prev => prev.map(t => t.id === id ? { ...t, status: 'closed', pnl: data.pnl.toString(), exitPrice: data.exitPrice.toString(), closedAt: new Date() } : t))
      showMsg('ok', `Trade closed. P&L: ${data.pnl >= 0 ? '+' : ''}$${data.pnl.toFixed(2)}`)
      fetch('/api/portfolio').then(r => r.json()).then(d => d.portfolio && setPortfolio(d.portfolio))
    } finally { setLoading(false) }
  }

  async function createAlert() {
    if (!alertPrice) return showMsg('err', 'Enter target price')
    const res = await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: selectedSymbol.symbol, tvSymbol: selectedSymbol.tvSymbol,
        condition: alertCondition, targetPrice: parseFloat(alertPrice),
        note: alertNote, autoTrade, autoSide,
        autoQuantity: autoQty ? parseFloat(autoQty) : undefined,
      }),
    })
    const data = await res.json()
    if (!res.ok) return showMsg('err', data.error)
    setAlerts(prev => [data.alert, ...prev])
    setAlertPrice(''); setAlertNote(''); setAutoTrade(false)
    showMsg('ok', 'Price alert created')
  }

  async function deleteAlert(id: string) {
    await fetch(`/api/alerts?id=${id}`, { method: 'DELETE' })
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  const openTrades = trades.filter(t => t.status === 'open')
  const closedTrades = trades.filter(t => t.status === 'closed')
  const winRate = portfolio.totalTrades > 0 ? (portfolio.winningTrades / portfolio.totalTrades) * 100 : 0

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'trade', label: 'New Order' },
    { id: 'positions', label: 'Positions', count: openTrades.length },
    { id: 'history', label: 'History', count: closedTrades.length },
    { id: 'alerts', label: 'Alerts', count: alerts.filter(a => a.status === 'active').length },
    { id: 'templates', label: 'Strategies', count: templates.length },
  ]

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '2rem 1.5rem 6rem' }}>
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

      {/* Page title */}
      <div style={{ marginBottom: 24 }}>
        <span style={{ fontFamily: mono, fontSize: 9, color: GOLD, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4em' }}>
          ◈ Simulation Account
        </span>
        <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: 'clamp(1.6rem, 3vw, 2.5rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', textTransform: 'uppercase', marginTop: 4 }}>
          {portfolio.name}
        </h1>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 28 }}>
        <StatCard label="Account Balance" value={formatCurrency(portfolio.currentBalance)} />
        <StatCard label="Total P&L"
          value={formatCurrency(portfolio.totalPnl)}
          sub={formatPct(parseFloat(portfolio.totalPnlPct))}
          color={pnlColor(portfolio.totalPnl)} />
        <StatCard label="Total Trades" value={portfolio.totalTrades.toString()} />
        <StatCard label="Win Rate" value={`${winRate.toFixed(1)}%`}
          sub={`${portfolio.winningTrades}W / ${portfolio.losingTrades}L`}
          color={winRate >= 50 ? '#22c55e' : '#ef4444'} />
        <StatCard label="Starting Balance" value={formatCurrency(portfolio.startingBalance)} />
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>
        {/* Left: Chart + tabs */}
        <div>
          {/* Symbol selector */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto' }}>
            {SYMBOLS.map(s => (
              <button key={s.symbol} onClick={() => setSelectedSymbol(s)}
                style={{
                  fontFamily: mono, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                  padding: '8px 18px', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap',
                  border: selectedSymbol.symbol === s.symbol ? `1px solid ${GOLD}` : '1px solid rgba(255,255,255,0.1)',
                  background: selectedSymbol.symbol === s.symbol ? `${GOLD}18` : '#080808',
                  color: selectedSymbol.symbol === s.symbol ? GOLD : 'rgba(255,255,255,0.4)',
                  transition: 'all 0.2s',
                }}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div style={{ height: 440, background: '#050505', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', marginBottom: 20, position: 'relative' }}>
            <TradingViewChart symbol={selectedSymbol.tvSymbol} interval="60" />
            {/* Click-to-trade overlay hint */}
            <div style={{ position: 'absolute', bottom: 10, right: 12, fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.2)', pointerEvents: 'none' }}>
              Set entry in order panel →
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12 }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{
                  fontFamily: mono, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em',
                  padding: '7px 14px', borderRadius: 6, cursor: 'pointer',
                  border: activeTab === tab.id ? `1px solid ${GOLD}40` : '1px solid transparent',
                  background: activeTab === tab.id ? `${GOLD}10` : 'transparent',
                  color: activeTab === tab.id ? GOLD : 'rgba(255,255,255,0.3)',
                  transition: 'all 0.15s',
                }}>
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span style={{ marginLeft: 6, background: activeTab === tab.id ? GOLD : 'rgba(255,255,255,0.1)', color: activeTab === tab.id ? '#000' : 'rgba(255,255,255,0.5)', padding: '1px 5px', borderRadius: 10, fontSize: 8 }}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ animation: 'terminalIn 0.25s ease-out' }}>

            {/* ── POSITIONS TAB ── */}
            {activeTab === 'positions' && (
              <div>
                {openTrades.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>
                    No open positions
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {openTrades.map(t => {
                      const livePnl = t.livePnl ?? 0
                      const isProfit = livePnl >= 0
                      return (
                        <div key={t.id} style={{ background: '#060606', border: `1px solid ${isProfit ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`, borderLeft: `3px solid ${isProfit ? '#22c55e' : '#ef4444'}`, borderRadius: 8, padding: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                                <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: '#fff' }}>{t.symbol}</span>
                                <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 900, padding: '2px 8px', borderRadius: 4, background: t.side === 'long' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: t.side === 'long' ? '#22c55e' : '#ef4444', textTransform: 'uppercase' }}>{t.side}</span>
                                <span style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>{t.orderType}</span>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, auto)', gap: '0 20px' }}>
                                {[
                                  ['Qty', t.quantity],
                                  ['Entry', `$${parseFloat(t.entryPrice).toLocaleString()}`],
                                  ['Current', t.currentPrice ? `$${t.currentPrice.toLocaleString()}` : '--'],
                                  ['Live P&L', `${livePnl >= 0 ? '+' : ''}$${livePnl.toFixed(2)} (${(t.livePnlPct ?? 0) >= 0 ? '+' : ''}${(t.livePnlPct ?? 0).toFixed(2)}%)`],
                                ].map(([l, v], i) => (
                                  <div key={i}>
                                    <div style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: 2 }}>{l}</div>
                                    <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: l === 'Live P&L' ? pnlColor(livePnl) : '#fff' }}>{v}</div>
                                  </div>
                                ))}
                              </div>
                              {(t.stopLoss || t.takeProfit) && (
                                <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                                  {t.stopLoss && <span style={{ fontFamily: mono, fontSize: 9, color: '#ef4444' }}>SL: ${parseFloat(t.stopLoss).toLocaleString()}</span>}
                                  {t.takeProfit && <span style={{ fontFamily: mono, fontSize: 9, color: '#22c55e' }}>TP: ${parseFloat(t.takeProfit).toLocaleString()}</span>}
                                </div>
                              )}
                            </div>
                            <button onClick={() => closeTrade(t.id)}
                              style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', padding: '8px 14px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', background: 'rgba(239,68,68,0.06)', cursor: 'pointer', letterSpacing: '0.1em' }}>
                              Close
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── HISTORY TAB ── */}
            {activeTab === 'history' && (
              <div>
                {closedTrades.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>No closed trades yet</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: mono, fontSize: 11 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        {['Symbol', 'Side', 'Qty', 'Entry', 'Exit', 'P&L', 'Date'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {closedTrades.map(t => {
                        const pnl = parseFloat(t.pnl ?? '0')
                        return (
                          <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={{ padding: '10px 10px', fontWeight: 700, color: '#fff' }}>{t.symbol}</td>
                            <td style={{ padding: '10px 10px', color: t.side === 'long' ? '#22c55e' : '#ef4444', fontWeight: 700, textTransform: 'uppercase' }}>{t.side}</td>
                            <td style={{ padding: '10px 10px', color: 'rgba(255,255,255,0.6)' }}>{t.quantity}</td>
                            <td style={{ padding: '10px 10px', color: 'rgba(255,255,255,0.6)' }}>${parseFloat(t.entryPrice).toLocaleString()}</td>
                            <td style={{ padding: '10px 10px', color: 'rgba(255,255,255,0.6)' }}>{t.exitPrice ? `$${parseFloat(t.exitPrice).toLocaleString()}` : '--'}</td>
                            <td style={{ padding: '10px 10px', fontWeight: 700, color: pnlColor(pnl) }}>{pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}</td>
                            <td style={{ padding: '10px 10px', color: 'rgba(255,255,255,0.3)', fontSize: 9 }}>{new Date(t.openedAt).toLocaleDateString()}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ── ALERTS TAB ── */}
            {activeTab === 'alerts' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {alerts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>No alerts set. Use the order panel →</div>
                ) : alerts.map(a => (
                  <div key={a.id} style={{ background: '#060606', border: '1px solid rgba(255,255,255,0.05)', borderLeft: `3px solid ${a.status === 'triggered' ? '#22c55e' : a.status === 'active' ? GOLD : 'rgba(255,255,255,0.15)'}`, borderRadius: 8, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: '#fff' }}>{a.symbol}</span>
                        <span style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
                          {a.condition} ${parseFloat(a.targetPrice).toLocaleString()}
                        </span>
                        <span style={{ fontFamily: mono, fontSize: 8, padding: '2px 7px', borderRadius: 4, background: a.status === 'triggered' ? 'rgba(34,197,94,0.1)' : 'rgba(212,175,55,0.1)', color: a.status === 'triggered' ? '#22c55e' : GOLD, textTransform: 'uppercase', fontWeight: 700 }}>{a.status}</span>
                      </div>
                      {a.autoTrade && <div style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>Auto-trade: {a.autoSide} {a.autoQuantity} lots</div>}
                      {a.note && <div style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{a.note}</div>}
                    </div>
                    {a.status === 'active' && (
                      <button onClick={() => deleteAlert(a.id)} style={{ fontFamily: mono, fontSize: 9, padding: '6px 12px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: 'rgba(255,255,255,0.3)', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── TEMPLATES TAB ── */}
            {activeTab === 'templates' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {templates.length === 0 ? (
                  <div style={{ fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>No strategy templates available</div>
                ) : templates.map(t => (
                  <div key={t.id}
                    onClick={() => { setSelectedTemplate(t); setActiveTab('trade'); }}
                    style={{ background: selectedTemplate?.id === t.id ? `${GOLD}10` : '#060606', border: selectedTemplate?.id === t.id ? `1px solid ${GOLD}40` : '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, cursor: 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ fontFamily: mono, fontSize: 9, color: GOLD, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{t.category}</div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{t.name}</div>
                    {t.description && <div style={{ fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 10, lineHeight: 1.5 }}>{t.description}</div>}
                    <div style={{ display: 'flex', gap: 12 }}>
                      {t.defaultStopLossPct && <div style={{ fontFamily: mono, fontSize: 9 }}><span style={{ color: '#ef4444' }}>SL {t.defaultStopLossPct}%</span></div>}
                      {t.defaultTakeProfitPct && <div style={{ fontFamily: mono, fontSize: 9 }}><span style={{ color: '#22c55e' }}>TP {t.defaultTakeProfitPct}%</span></div>}
                      {t.defaultQuantity && <div style={{ fontFamily: mono, fontSize: 9 }}><span style={{ color: 'rgba(255,255,255,0.4)' }}>Qty {t.defaultQuantity}</span></div>}
                    </div>
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {(t.rules as Array<{ description: string }>).slice(0, 3).map((r, i) => (
                        <div key={i} style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>▸ {r.description}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Order Panel */}
        <div style={{ position: 'sticky', top: 50 }}>
          <div style={{ background: '#060606', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 24 }}>
            {/* Order panel header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.3em' }}>Order Entry</span>
              <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: GOLD }}>{selectedSymbol.label}</span>
            </div>

            {/* Current price */}
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <div style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: 4 }}>Current Market Price</div>
              <div style={{ fontFamily: mono, fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '-0.03em' }}>${currentPrice.toLocaleString()}</div>
            </div>

            {/* Long/Short toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16 }}>
              {(['long', 'short'] as const).map(s => (
                <button key={s} onClick={() => setSide(s)}
                  style={{
                    fontFamily: mono, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em',
                    padding: 12, borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                    border: side === s ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    background: side === s ? (s === 'long' ? '#22c55e' : '#ef4444') : '#0a0a0a',
                    color: side === s ? '#fff' : 'rgba(255,255,255,0.3)',
                  }}>
                  {s === 'long' ? '▲ LONG' : '▼ SHORT'}
                </button>
              ))}
            </div>

            {/* Order type */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              {(['market', 'limit', 'stop'] as const).map(o => (
                <button key={o} onClick={() => setOrderType(o)}
                  style={{
                    flex: 1, fontFamily: mono, fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                    padding: '6px 4px', borderRadius: 6, cursor: 'pointer',
                    border: orderType === o ? `1px solid ${GOLD}50` : '1px solid rgba(255,255,255,0.08)',
                    background: orderType === o ? `${GOLD}12` : 'transparent',
                    color: orderType === o ? GOLD : 'rgba(255,255,255,0.3)',
                  }}>{o}</button>
              ))}
            </div>

            {/* Strategy template badge */}
            {selectedTemplate && (
              <div style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}30`, borderRadius: 6, padding: '8px 12px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: mono, fontSize: 9, color: GOLD, fontWeight: 700 }}>📐 {selectedTemplate.name}</span>
                <button onClick={() => setSelectedTemplate(null)} style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
              </div>
            )}

            {/* Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
              {orderType !== 'market' && (
                <Field label="Limit/Stop Price" value={limitPrice} onChange={setLimitPrice} placeholder={currentPrice.toString()} />
              )}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Quantity (Lots)</label>
                  <button onClick={applyRiskBasedSize} style={{ fontFamily: mono, fontSize: 8, color: GOLD, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                    Auto (Risk {riskPct}%)
                  </button>
                </div>
                <input value={quantity} onChange={e => setQuantity(e.target.value)} type="number" min="0.01" step="0.01"
                  placeholder="0.10"
                  style={{ width: '100%', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '10px 12px', fontFamily: mono, fontSize: 13, color: '#fff', outline: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontFamily: mono, fontSize: 8, color: '#ef4444', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Stop Loss</label>
                  <input value={stopLoss} onChange={e => setStopLoss(e.target.value)} type="number" placeholder="0.00"
                    style={{ width: '100%', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '8px 10px', fontFamily: mono, fontSize: 12, color: '#ef4444', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontFamily: mono, fontSize: 8, color: '#22c55e', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Take Profit</label>
                  <input value={takeProfit} onChange={e => setTakeProfit(e.target.value)} type="number" placeholder="0.00"
                    style={{ width: '100%', background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, padding: '8px 10px', fontFamily: mono, fontSize: 12, color: '#22c55e', outline: 'none' }} />
                </div>
              </div>

              {/* R:R display */}
              {rr.rrRatio && (
                <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6, padding: '8px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {[
                    { l: 'Risk', v: rr.riskPct ? `${rr.riskPct.toFixed(2)}%` : '--', c: '#ef4444' },
                    { l: 'Reward', v: rr.rewardPct ? `${rr.rewardPct.toFixed(2)}%` : '--', c: '#22c55e' },
                    { l: 'R:R', v: `1:${rr.rrRatio.toFixed(2)}`, c: GOLD },
                  ].map(({ l, v, c }) => (
                    <div key={l} style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.2)', marginBottom: 2, textTransform: 'uppercase' }}>{l}</div>
                      <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: c }}>{v}</div>
                    </div>
                  ))}
                </div>
              )}

              <Field label="Notes (optional)" value={notes} onChange={setNotes} placeholder="Strategy rationale..." />
            </div>

            {/* Submit */}
            <button onClick={openTrade} disabled={loading}
              style={{
                width: '100%', padding: '14px 0', fontFamily: mono, fontSize: 11, fontWeight: 900,
                textTransform: 'uppercase', letterSpacing: '0.2em', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? 'rgba(255,255,255,0.05)' : side === 'long' ? '#22c55e' : '#ef4444',
                color: loading ? 'rgba(255,255,255,0.3)' : '#fff', border: 'none',
                transition: 'all 0.2s', marginBottom: 12,
              }}>
              {loading ? 'Processing...' : `${orderType.toUpperCase()} ${side.toUpperCase()} — ${selectedSymbol.symbol}`}
            </button>

            {/* Divider */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16, marginTop: 4 }}>
              <div style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.3em' }}>⚡ Price Alert</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                {(['above', 'below'] as const).map(c => (
                  <button key={c} onClick={() => setAlertCondition(c)}
                    style={{ flex: 1, fontFamily: mono, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', padding: '7px 0', borderRadius: 6, cursor: 'pointer', border: alertCondition === c ? `1px solid ${GOLD}50` : '1px solid rgba(255,255,255,0.08)', background: alertCondition === c ? `${GOLD}12` : 'transparent', color: alertCondition === c ? GOLD : 'rgba(255,255,255,0.3)' }}>
                    {c === 'above' ? '▲' : '▼'} {c}
                  </button>
                ))}
              </div>
              <input value={alertPrice} onChange={e => setAlertPrice(e.target.value)} type="number" placeholder="Target price"
                style={{ width: '100%', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '9px 12px', fontFamily: mono, fontSize: 12, color: '#fff', outline: 'none', marginBottom: 8 }} />
              <input value={alertNote} onChange={e => setAlertNote(e.target.value)} placeholder="Note (optional)"
                style={{ width: '100%', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '9px 12px', fontFamily: mono, fontSize: 11, color: '#fff', outline: 'none', marginBottom: 10 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <button onClick={() => setAutoTrade(!autoTrade)}
                  style={{ width: 32, height: 16, borderRadius: 8, border: 'none', cursor: 'pointer', background: autoTrade ? GOLD : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'all 0.2s' }}>
                  <span style={{ position: 'absolute', width: 12, height: 12, borderRadius: '50%', background: '#000', top: 2, left: autoTrade ? 18 : 2, transition: 'all 0.2s' }} />
                </button>
                <span style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Auto-execute trade on trigger</span>
              </div>
              {autoTrade && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                  <select value={autoSide} onChange={e => setAutoSide(e.target.value as 'long' | 'short')}
                    style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '8px 10px', fontFamily: mono, fontSize: 10, color: '#fff', outline: 'none' }}>
                    <option value="long">Long</option>
                    <option value="short">Short</option>
                  </select>
                  <input value={autoQty} onChange={e => setAutoQty(e.target.value)} type="number" placeholder="Qty"
                    style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '8px 10px', fontFamily: mono, fontSize: 12, color: '#fff', outline: 'none' }} />
                </div>
              )}
              <button onClick={createAlert}
                style={{ width: '100%', padding: '10px 0', fontFamily: mono, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', borderRadius: 6, cursor: 'pointer', border: `1px solid ${GOLD}40`, background: `${GOLD}10`, color: GOLD }}>
                Set Alert →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.2em', display: 'block', marginBottom: 4 }}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '9px 12px', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#fff', outline: 'none' }} />
    </div>
  )
}
