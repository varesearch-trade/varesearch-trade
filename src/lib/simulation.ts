/**
 * VA Research — Simulation Engine
 * Handles paper trading math, P&L calculations, and backtest simulation
 */

// ─── Price fetching (mocked with realistic values) ────────────────────────────
const MOCK_PRICES: Record<string, number> = {
  XAUUSD: 2638.50,
  XAGUSD: 30.42,
  BTCUSD: 97400.00,
  ETHUSD: 3320.00,
  SPX: 5860.00,
  EURUSD: 1.0820,
  GBPUSD: 1.2680,
  USDJPY: 149.80,
}

const PRICE_VOLATILITY: Record<string, number> = {
  XAUUSD: 0.003,
  XAGUSD: 0.008,
  BTCUSD: 0.025,
  ETHUSD: 0.030,
  SPX: 0.004,
  EURUSD: 0.002,
  GBPUSD: 0.003,
  USDJPY: 0.002,
}

// Contract/lot sizes for P&L calculation
const CONTRACT_SIZES: Record<string, number> = {
  XAUUSD: 100,    // 100 troy oz per standard lot
  XAGUSD: 5000,   // 5000 oz
  BTCUSD: 1,
  ETHUSD: 1,
  SPX: 1,
  EURUSD: 100000,
  GBPUSD: 100000,
  USDJPY: 100000,
}

export function getMockPrice(symbol: string): number {
  const base = MOCK_PRICES[symbol] ?? 1000
  const vol = PRICE_VOLATILITY[symbol] ?? 0.005
  // Add realistic random walk noise
  const noise = (Math.random() - 0.5) * 2 * vol * base
  return parseFloat((base + noise).toFixed(2))
}

export function getContractSize(symbol: string): number {
  return CONTRACT_SIZES[symbol] ?? 1
}

// ─── P&L Calculation ─────────────────────────────────────────────────────────
export function calculatePnL(params: {
  side: 'long' | 'short'
  entryPrice: number
  currentPrice: number
  quantity: number
  symbol: string
}): { pnl: number; pnlPct: number } {
  const { side, entryPrice, currentPrice, quantity, symbol } = params
  const contractSize = getContractSize(symbol)

  let priceDiff = currentPrice - entryPrice
  if (side === 'short') priceDiff = -priceDiff

  const pnl = priceDiff * quantity * contractSize
  const pnlPct = (priceDiff / entryPrice) * 100

  return {
    pnl: parseFloat(pnl.toFixed(2)),
    pnlPct: parseFloat(pnlPct.toFixed(4)),
  }
}

// ─── Risk Calculations ────────────────────────────────────────────────────────
export function calculateRiskReward(params: {
  side: 'long' | 'short'
  entryPrice: number
  stopLoss?: number
  takeProfit?: number
}): { riskPct: number | null; rewardPct: number | null; rrRatio: number | null } {
  const { side, entryPrice, stopLoss, takeProfit } = params

  let riskPct: number | null = null
  let rewardPct: number | null = null

  if (stopLoss) {
    const slDiff = Math.abs(entryPrice - stopLoss)
    riskPct = (slDiff / entryPrice) * 100
  }
  if (takeProfit) {
    const tpDiff = Math.abs(takeProfit - entryPrice)
    rewardPct = (tpDiff / entryPrice) * 100
  }

  const rrRatio = riskPct && rewardPct ? rewardPct / riskPct : null

  return { riskPct, rewardPct, rrRatio }
}

export function calculatePositionSize(params: {
  accountBalance: number
  riskPercent: number
  entryPrice: number
  stopLoss: number
  symbol: string
}): number {
  const { accountBalance, riskPercent, entryPrice, stopLoss, symbol } = params
  const riskAmount = accountBalance * (riskPercent / 100)
  const priceDiff = Math.abs(entryPrice - stopLoss)
  const contractSize = getContractSize(symbol)
  const quantity = riskAmount / (priceDiff * contractSize)
  return parseFloat(Math.max(0.01, quantity).toFixed(4))
}

// ─── Backtest Engine ──────────────────────────────────────────────────────────
export type BacktestParams = {
  symbol: string
  startingCapital: number
  fromDate: Date
  toDate: Date
  strategy: {
    entryCondition: 'sma_cross' | 'rsi_oversold' | 'breakout' | 'mean_revert'
    stopLossPct: number
    takeProfitPct: number
    positionSizePct: number
  }
}

export type BacktestResult = {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  totalReturn: number
  totalReturnPct: number
  maxDrawdown: number
  sharpeRatio: number
  profitFactor: number
  avgWin: number
  avgLoss: number
  equityCurve: { date: string; equity: number; drawdown: number }[]
  tradeLog: {
    date: string
    side: 'long' | 'short'
    entry: number
    exit: number
    pnl: number
    pnlPct: number
  }[]
}

function generateOHLCData(symbol: string, from: Date, to: Date, barCount: number = 200) {
  const basePrice = MOCK_PRICES[symbol] ?? 1000
  const vol = PRICE_VOLATILITY[symbol] ?? 0.01
  const bars = []
  let price = basePrice * 0.85 // start slightly below current
  const interval = (to.getTime() - from.getTime()) / barCount

  for (let i = 0; i < barCount; i++) {
    const date = new Date(from.getTime() + i * interval)
    const change = (Math.random() - 0.48) * vol * price
    const open = price
    const close = price + change
    const high = Math.max(open, close) * (1 + Math.random() * vol * 0.5)
    const low = Math.min(open, close) * (1 - Math.random() * vol * 0.5)
    bars.push({ date, open, high, low, close })
    price = close
  }
  return bars
}

function calcSMA(prices: number[], period: number): number[] {
  const result: number[] = []
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) { result.push(NaN); continue }
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
    result.push(sum / period)
  }
  return result
}

function calcRSI(prices: number[], period: number = 14): number[] {
  const result: number[] = new Array(period).fill(NaN)
  let gains = 0, losses = 0

  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1]
    if (change > 0) gains += change
    else losses += Math.abs(change)
  }

  let avgGain = gains / period
  let avgLoss = losses / period

  for (let i = period; i < prices.length; i++) {
    if (i > period) {
      const change = prices[i] - prices[i - 1]
      avgGain = (avgGain * (period - 1) + Math.max(0, change)) / period
      avgLoss = (avgLoss * (period - 1) + Math.max(0, -change)) / period
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    result.push(100 - 100 / (1 + rs))
  }
  return result
}

export function runBacktest(params: BacktestParams): BacktestResult {
  const { symbol, startingCapital, fromDate, toDate, strategy } = params
  const bars = generateOHLCData(symbol, fromDate, toDate, 250)
  const closes = bars.map(b => b.close)

  const smaFast = calcSMA(closes, 10)
  const smaSlow = calcSMA(closes, 30)
  const rsi = calcRSI(closes, 14)

  let capital = startingCapital
  let peakCapital = startingCapital
  let maxDrawdown = 0

  const tradeLog: BacktestResult['tradeLog'] = []
  const equityCurve: BacktestResult['equityCurve'] = []
  let wins = 0, losses = 0
  let grossProfit = 0, grossLoss = 0
  let inTrade = false
  let tradeEntry = 0
  let tradeSide: 'long' | 'short' = 'long'
  let tradeDate = ''

  for (let i = 35; i < bars.length; i++) {
    const bar = bars[i]
    const price = bar.close
    const dateStr = bar.date.toISOString().split('T')[0]

    // Exit logic
    if (inTrade) {
      const slPrice = tradeSide === 'long'
        ? tradeEntry * (1 - strategy.stopLossPct / 100)
        : tradeEntry * (1 + strategy.stopLossPct / 100)
      const tpPrice = tradeSide === 'long'
        ? tradeEntry * (1 + strategy.takeProfitPct / 100)
        : tradeEntry * (1 - strategy.takeProfitPct / 100)

      const hitSL = tradeSide === 'long' ? price <= slPrice : price >= slPrice
      const hitTP = tradeSide === 'long' ? price >= tpPrice : price <= tpPrice

      if (hitSL || hitTP || i === bars.length - 1) {
        const exit = hitTP ? tpPrice : hitSL ? slPrice : price
        const pnlPct = tradeSide === 'long'
          ? (exit - tradeEntry) / tradeEntry * 100
          : (tradeEntry - exit) / tradeEntry * 100
        const positionValue = capital * (strategy.positionSizePct / 100)
        const pnl = positionValue * (pnlPct / 100)
        capital += pnl

        tradeLog.push({ date: tradeDate, side: tradeSide, entry: tradeEntry, exit, pnl: parseFloat(pnl.toFixed(2)), pnlPct: parseFloat(pnlPct.toFixed(2)) })
        if (pnl > 0) { wins++; grossProfit += pnl } else { losses++; grossLoss += Math.abs(pnl) }
        inTrade = false
      }
    }

    // Entry logic
    if (!inTrade && i >= 30) {
      let signal: 'long' | 'short' | null = null

      if (strategy.entryCondition === 'sma_cross') {
        if (!isNaN(smaFast[i]) && !isNaN(smaSlow[i])) {
          if (smaFast[i] > smaSlow[i] && smaFast[i - 1] <= smaSlow[i - 1]) signal = 'long'
          else if (smaFast[i] < smaSlow[i] && smaFast[i - 1] >= smaSlow[i - 1]) signal = 'short'
        }
      } else if (strategy.entryCondition === 'rsi_oversold') {
        if (!isNaN(rsi[i])) {
          if (rsi[i] < 30) signal = 'long'
          else if (rsi[i] > 70) signal = 'short'
        }
      } else if (strategy.entryCondition === 'breakout') {
        const recentHigh = Math.max(...closes.slice(i - 20, i))
        const recentLow = Math.min(...closes.slice(i - 20, i))
        if (price > recentHigh * 1.001) signal = 'long'
        else if (price < recentLow * 0.999) signal = 'short'
      } else if (strategy.entryCondition === 'mean_revert') {
        if (!isNaN(smaSlow[i])) {
          const deviation = (price - smaSlow[i]) / smaSlow[i] * 100
          if (deviation < -2) signal = 'long'
          else if (deviation > 2) signal = 'short'
        }
      }

      if (signal) {
        inTrade = true
        tradeEntry = price
        tradeSide = signal
        tradeDate = dateStr
      }
    }

    // Equity curve
    peakCapital = Math.max(peakCapital, capital)
    const dd = (peakCapital - capital) / peakCapital * 100
    maxDrawdown = Math.max(maxDrawdown, dd)
    equityCurve.push({ date: dateStr, equity: parseFloat(capital.toFixed(2)), drawdown: parseFloat(dd.toFixed(2)) })
  }

  const totalTrades = wins + losses
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0
  const totalReturnPct = ((capital - startingCapital) / startingCapital) * 100
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0
  const avgWin = wins > 0 ? grossProfit / wins : 0
  const avgLoss = losses > 0 ? grossLoss / losses : 0

  // Simplified Sharpe (annualized, assume daily bars)
  const returns = equityCurve.map((p, i) => i > 0 ? (p.equity - equityCurve[i-1].equity) / equityCurve[i-1].equity : 0)
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length
  const stdDev = Math.sqrt(returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length)
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0

  return {
    totalTrades,
    winningTrades: wins,
    losingTrades: losses,
    winRate: parseFloat(winRate.toFixed(2)),
    totalReturn: parseFloat((capital - startingCapital).toFixed(2)),
    totalReturnPct: parseFloat(totalReturnPct.toFixed(4)),
    maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
    sharpeRatio: parseFloat(sharpeRatio.toFixed(4)),
    profitFactor: parseFloat(profitFactor.toFixed(4)),
    avgWin: parseFloat(avgWin.toFixed(2)),
    avgLoss: parseFloat(avgLoss.toFixed(2)),
    equityCurve,
    tradeLog,
  }
}

// ─── Portfolio stats recalculation ───────────────────────────────────────────
export function recalcPortfolioStats(
  currentBalance: number,
  startingBalance: number,
  totalTrades: number,
  winningTrades: number,
  losingTrades: number
) {
  const totalPnl = currentBalance - startingBalance
  const totalPnlPct = (totalPnl / startingBalance) * 100
  return {
    totalPnl: parseFloat(totalPnl.toFixed(2)),
    totalPnlPct: parseFloat(totalPnlPct.toFixed(4)),
    totalTrades,
    winningTrades,
    losingTrades,
  }
}

// ─── Format helpers ───────────────────────────────────────────────────────────
export function formatCurrency(val: number | string): string {
  const n = typeof val === 'string' ? parseFloat(val) : val
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
}

export function formatPct(val: number | string): string {
  const n = typeof val === 'string' ? parseFloat(val) : val
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}

export function pnlColor(val: number | string): string {
  const n = typeof val === 'string' ? parseFloat(val) : val
  if (n > 0) return '#22c55e'
  if (n < 0) return '#ef4444'
  return 'rgba(255,255,255,0.4)'
}
