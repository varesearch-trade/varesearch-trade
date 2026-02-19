'use client'

import { useState } from 'react'
import type { Session } from 'next-auth'

type Backtest = {
  id: string; name: string; symbol: string; timeframe: string
  fromDate: Date; toDate: Date; startingCapital: string; status: string
  totalTrades: number | null; winRate: string | null; totalReturn: string | null
  maxDrawdown: string | null; sharpeRatio: string | null; profitFactor: string | null
  avgWin: string | null; avgLoss: string | null
  equityCurve: Array<{ date: string; equity: number; drawdown: number }> | null
  tradeLog: Array<{ date: string; side: string; entry: number; exit: number; pnl: number; pnlPct: number }> | null
  createdAt: Date; completedAt: Date | null
}

type Template = { id: string; name: string; category: string; defaultStopLossPct: string | null; defaultTakeProfitPct: string | null }

const SYMBOLS = [
  { symbol: 'XAUUSD', tvSymbol: 'OANDA:XAUUSD' },
  { symbol: 'BTCUSD', tvSymbol: 'BINANCE:BTCUSDT' },
  { symbol: 'ETHUSD', tvSymbol: 'BINANCE:ETHUSDT' },
  { symbol: 'XAGUSD', tvSymbol: 'FX_IDC:XAGUSD' },
  { symbol: 'SPX', tvSymbol: 'FOREXCOM:SPX' },
]

const STRATEGIES = [
  { value: 'sma_cross', label: 'SMA Crossover (10/30)', description: 'Enter on fast SMA crossing slow SMA' },
  { value: 'rsi_oversold', label: 'RSI Extremes (14)', description: 'Long when RSI < 30, short when RSI > 70' },
  { value: 'breakout', label: '20-Bar Breakout', description: 'Enter on price breaking 20-bar high/low' },
  { value: 'mean_revert', label: 'Mean Reversion', description: 'Enter when price deviates >2% from SMA30' },
]

const TIMEFRAMES = ['1h', '4h', '1D', '1W']

const GOLD = '#D4AF37'
const mono = "'JetBrains Mono', monospace"

function pnlColor(v: number) { return v > 0 ? '#22c55e' : v < 0 ? '#ef4444' : 'rgba(255,255,255,0.4)' }
function fmtPct(v: number | string | null) {
  if (v === null) return '--'
  const n = typeof v === 'string' ? parseFloat(v) : v
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}

// Simple SVG equity curve
function EquityCurveChart({ data, height = 120 }: { data: Array<{ date: string; equity: number; drawdown: number }>; height?: number }) {
  if (!data || data.length < 2) return null
  const min = Math.min(...data.map(d => d.equity))
  const max = Math.max(...data.map(d => d.equity))
  const range = max - min || 1
  const w = 100, h = height

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((d.equity - min) / range) * h
    return `${x},${y}`
  }).join(' ')

  const isProfit = data[data.length - 1].equity >= data[0].equity
  const color = isProfit ? '#22c55e' : '#ef4444'

  return (
    <svg viewBox={`0 0 100 ${h}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
      <defs>
        <linearGradient id="eq-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${h} ${points} ${w},${h}`}
        fill="url(#eq-grad)"
      />
      <polyline points={points} fill="none" stroke={color} strokeWidth="0.8" />
    </svg>
  )
}

export default function BacktestDashboard({
  session: _, initialHistory, templates,
}: {
  session: Session; initialHistory: Backtest[]; templates: Template[]
}) {
  const [history, setHistory] = useState<Backtest[]>(initialHistory)
  const [selected, setSelected] = useState<Backtest | null>(null)
  const [running, setRunning] = useState(false)
  const [view, setView] = useState<'setup' | 'results'>('setup')
  const [msg, setMsg] = useState<string | null>(null)

  // Form
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState(SYMBOLS[0].symbol)
  const [timeframe, setTimeframe] = useState('1D')
  const [fromDate, setFromDate] = useState('2023-01-01')
  const [toDate, setToDate] = useState('2024-12-31')
  const [capital, setCapital] = useState('100000')
  const [strategy, setStrategy] = useState('sma_cross')
  const [slPct, setSlPct] = useState('2')
  const [tpPct, setTpPct] = useState('4')
  const [sizePct, setSizePct] = useState('10')
  const [templateId, setTemplateId] = useState<string>('')

  async function runBacktest() {
    if (!name.trim()) return setMsg('Enter a backtest name')
    setRunning(true); setMsg(null)

    try {
      const tvSymbol = SYMBOLS.find(s => s.symbol === symbol)?.tvSymbol ?? 'OANDA:XAUUSD'
      const res = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, symbol, tvSymbol, timeframe, fromDate, toDate,
          startingCapital: parseFloat(capital),
          strategyTemplateId: templateId || undefined,
          strategy: {
            entryCondition: strategy,
            stopLossPct: parseFloat(slPct),
            takeProfitPct: parseFloat(tpPct),
            positionSizePct: parseFloat(sizePct),
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) return setMsg(data.error || 'Backtest failed')
      const bt = data.backtest
      setHistory(prev => [bt, ...prev])
      setSelected(bt)
      setView('results')
    } catch (err) {
      setMsg('Simulation failed')
    } finally {
      setRunning(false)
    }
  }

  const ResultCard = ({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) => (
    <div style={{ background: '#080808', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 16px' }}>
      <div style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: mono, fontSize: 18, fontWeight: 700, color: color ?? '#fff' }}>{value}</div>
      {sub && <div style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{sub}</div>}
    </div>
  )

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem 6rem' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <span style={{ fontFamily: mono, fontSize: 9, color: GOLD, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4em' }}>◈ Strategy Lab</span>
        <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: 'clamp(1.8rem, 3vw, 2.8rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', textTransform: 'uppercase', marginTop: 4 }}>
          Backtesting Engine
        </h1>
      </div>

      {msg && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 16px', fontFamily: mono, fontSize: 11, color: '#ef4444', marginBottom: 20 }}>✗ {msg}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Config Panel */}
        <div style={{ background: '#060606', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 24, position: 'sticky', top: 50 }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 20 }}>▸ Configuration</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Name */}
            <div>
              <label style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Test Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Gold SMA Cross 2023"
                style={{ width: '100%', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '9px 12px', fontFamily: mono, fontSize: 12, color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            {/* Symbol */}
            <div>
              <label style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Symbol</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {SYMBOLS.map(s => (
                  <button key={s.symbol} onClick={() => setSymbol(s.symbol)}
                    style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, padding: '5px 10px', borderRadius: 5, cursor: 'pointer', border: symbol === s.symbol ? `1px solid ${GOLD}` : '1px solid rgba(255,255,255,0.08)', background: symbol === s.symbol ? `${GOLD}15` : 'transparent', color: symbol === s.symbol ? GOLD : 'rgba(255,255,255,0.35)' }}>
                    {s.symbol}
                  </button>
                ))}
              </div>
            </div>

            {/* Timeframe */}
            <div>
              <label style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Timeframe</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {TIMEFRAMES.map(tf => (
                  <button key={tf} onClick={() => setTimeframe(tf)}
                    style={{ flex: 1, fontFamily: mono, fontSize: 9, fontWeight: 700, padding: '6px 0', borderRadius: 5, cursor: 'pointer', border: timeframe === tf ? `1px solid ${GOLD}` : '1px solid rgba(255,255,255,0.08)', background: timeframe === tf ? `${GOLD}15` : 'transparent', color: timeframe === tf ? GOLD : 'rgba(255,255,255,0.35)' }}>
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* Date range */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[['From', fromDate, setFromDate], ['To', toDate, setToDate]].map(([label, val, setter]) => (
                <div key={label as string}>
                  <label style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>{label as string}</label>
                  <input type="date" value={val as string} onChange={e => (setter as (v: string) => void)(e.target.value)}
                    style={{ width: '100%', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '8px 10px', fontFamily: mono, fontSize: 11, color: '#fff', outline: 'none', colorScheme: 'dark', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>

            {/* Capital */}
            <div>
              <label style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Starting Capital (USD)</label>
              <input value={capital} onChange={e => setCapital(e.target.value)} type="number"
                style={{ width: '100%', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '9px 12px', fontFamily: mono, fontSize: 12, color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            {/* Strategy */}
            <div>
              <label style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Entry Strategy</label>
              {STRATEGIES.map(s => (
                <div key={s.value} onClick={() => setStrategy(s.value)}
                  style={{ padding: '10px 12px', borderRadius: 7, cursor: 'pointer', marginBottom: 6, border: strategy === s.value ? `1px solid ${GOLD}40` : '1px solid rgba(255,255,255,0.06)', background: strategy === s.value ? `${GOLD}08` : '#0a0a0a' }}>
                  <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, color: strategy === s.value ? GOLD : '#fff', marginBottom: 2 }}>{s.label}</div>
                  <div style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>{s.description}</div>
                </div>
              ))}
            </div>

            {/* Risk params */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                ['SL%', slPct, setSlPct, '2'],
                ['TP%', tpPct, setTpPct, '4'],
                ['Size%', sizePct, setSizePct, '10'],
              ].map(([l, v, s, ph]) => (
                <div key={l as string}>
                  <label style={{ fontFamily: mono, fontSize: 7, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>{l as string}</label>
                  <input value={v as string} onChange={e => (s as (v: string) => void)(e.target.value)} type="number" placeholder={ph as string}
                    style={{ width: '100%', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 5, padding: '7px 8px', fontFamily: mono, fontSize: 11, color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>

            {/* Optional template */}
            {templates.length > 0 && (
              <div>
                <label style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Strategy Template (optional)</label>
                <select value={templateId} onChange={e => setTemplateId(e.target.value)}
                  style={{ width: '100%', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '9px 12px', fontFamily: mono, fontSize: 11, color: '#fff', outline: 'none', boxSizing: 'border-box' }}>
                  <option value="">None</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}

            <button onClick={runBacktest} disabled={running}
              style={{ width: '100%', padding: 14, fontFamily: mono, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', borderRadius: 8, cursor: running ? 'not-allowed' : 'pointer', border: 'none', background: running ? 'rgba(212,175,55,0.2)' : GOLD, color: '#000', transition: 'all 0.2s', marginTop: 4 }}>
              {running ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◈</span> Running Simulation...
                </span>
              ) : '▶ Run Backtest →'}
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[['setup', 'Setup'], ['results', 'Results']].map(([v, l]) => (
              <button key={v} onClick={() => setView(v as 'setup' | 'results')}
                style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', padding: '7px 18px', borderRadius: 6, cursor: 'pointer', border: view === v ? `1px solid ${GOLD}40` : '1px solid rgba(255,255,255,0.08)', background: view === v ? `${GOLD}10` : 'transparent', color: view === v ? GOLD : 'rgba(255,255,255,0.3)' }}>{l}</button>
            ))}
          </div>

          {view === 'results' && selected ? (
            <div style={{ animation: 'terminalIn 0.3s ease-out' }}>
              {/* Result header */}
              <div style={{ background: '#060606', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 4 }}>{selected.symbol} · {selected.timeframe} · {new Date(selected.fromDate).toLocaleDateString()} – {new Date(selected.toDate).toLocaleDateString()}</div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>{selected.name}</div>
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 9, padding: '4px 10px', borderRadius: 6, background: selected.status === 'completed' ? 'rgba(34,197,94,0.1)' : 'rgba(212,175,55,0.1)', color: selected.status === 'completed' ? '#22c55e' : GOLD, fontWeight: 700, textTransform: 'uppercase' }}>{selected.status}</div>
                </div>

                {/* Equity curve */}
                {selected.equityCurve && selected.equityCurve.length > 1 && (
                  <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', background: '#030303', padding: '8px 0' }}>
                    <EquityCurveChart data={selected.equityCurve} height={100} />
                  </div>
                )}
              </div>

              {/* Stat grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                <ResultCard label="Total Return" value={fmtPct(parseFloat(selected.totalReturn ?? '0') / parseFloat(selected.startingCapital) * 100)} color={pnlColor(parseFloat(selected.totalReturn ?? '0'))} sub={`$${parseFloat(selected.totalReturn ?? '0').toFixed(0)}`} />
                <ResultCard label="Win Rate" value={selected.winRate ? `${parseFloat(selected.winRate).toFixed(1)}%` : '--'} color={parseFloat(selected.winRate ?? '0') >= 50 ? '#22c55e' : '#ef4444'} sub={`${selected.totalTrades} trades`} />
                <ResultCard label="Max Drawdown" value={selected.maxDrawdown ? `${parseFloat(selected.maxDrawdown).toFixed(2)}%` : '--'} color="#ef4444" />
                <ResultCard label="Sharpe Ratio" value={selected.sharpeRatio ? parseFloat(selected.sharpeRatio).toFixed(2) : '--'} color={parseFloat(selected.sharpeRatio ?? '0') > 1 ? '#22c55e' : 'rgba(255,255,255,0.6)'} />
                <ResultCard label="Profit Factor" value={selected.profitFactor ? parseFloat(selected.profitFactor).toFixed(2) : '--'} color={parseFloat(selected.profitFactor ?? '0') > 1.5 ? '#22c55e' : 'rgba(255,255,255,0.6)'} />
                <ResultCard label="Avg Win" value={selected.avgWin ? `$${parseFloat(selected.avgWin).toFixed(0)}` : '--'} color="#22c55e" />
                <ResultCard label="Avg Loss" value={selected.avgLoss ? `-$${parseFloat(selected.avgLoss).toFixed(0)}` : '--'} color="#ef4444" />
                <ResultCard label="Starting Capital" value={`$${parseFloat(selected.startingCapital).toLocaleString()}`} />
              </div>

              {/* Trade log */}
              {selected.tradeLog && selected.tradeLog.length > 0 && (
                <div style={{ background: '#060606', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.3em' }}>
                    Trade Log ({selected.tradeLog.length} trades)
                  </div>
                  <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ position: 'sticky', top: 0, background: '#060606' }}>
                        <tr>
                          {['Date', 'Side', 'Entry', 'Exit', 'P&L', 'P&L%'].map(h => (
                            <th key={h} style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', padding: '8px 14px', textAlign: 'left', fontWeight: 700, letterSpacing: '0.2em' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selected.tradeLog.slice(0, 50).map((t, i) => (
                          <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={{ fontFamily: mono, fontSize: 10, padding: '8px 14px', color: 'rgba(255,255,255,0.4)' }}>{t.date}</td>
                            <td style={{ fontFamily: mono, fontSize: 10, padding: '8px 14px', color: t.side === 'long' ? '#22c55e' : '#ef4444', fontWeight: 700, textTransform: 'uppercase' }}>{t.side}</td>
                            <td style={{ fontFamily: mono, fontSize: 10, padding: '8px 14px', color: '#fff' }}>${t.entry.toFixed(2)}</td>
                            <td style={{ fontFamily: mono, fontSize: 10, padding: '8px 14px', color: '#fff' }}>${t.exit.toFixed(2)}</td>
                            <td style={{ fontFamily: mono, fontSize: 10, padding: '8px 14px', color: pnlColor(t.pnl), fontWeight: 700 }}>{t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}</td>
                            <td style={{ fontFamily: mono, fontSize: 10, padding: '8px 14px', color: pnlColor(t.pnlPct) }}>{t.pnlPct >= 0 ? '+' : ''}{t.pnlPct.toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : view === 'results' && !selected ? (
            <div style={{ textAlign: 'center', padding: '80px 0', fontFamily: mono, fontSize: 11, color: 'rgba(255,255,255,0.15)', textTransform: 'uppercase' }}>
              <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>◈</div>
              Run your first backtest to see results
            </div>
          ) : null}

          {/* History */}
          {view === 'setup' && history.length > 0 && (
            <div>
              <div style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 14 }}>Previous Backtests</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {history.map(bt => {
                  const ret = bt.totalReturn ? parseFloat(bt.totalReturn) : 0
                  return (
                    <div key={bt.id} onClick={() => { setSelected(bt); setView('results') }}
                      style={{ background: '#060606', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 18px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'border-color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = `${GOLD}30`)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}>
                      <div>
                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{bt.name}</div>
                        <div style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{bt.symbol} · {bt.timeframe} · {bt.totalTrades ?? 0} trades</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: mono, fontSize: 15, fontWeight: 700, color: pnlColor(ret) }}>{ret >= 0 ? '+' : ''}${ret.toFixed(0)}</div>
                        <div style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{bt.winRate ? parseFloat(bt.winRate).toFixed(1) : '--'}% WR</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
