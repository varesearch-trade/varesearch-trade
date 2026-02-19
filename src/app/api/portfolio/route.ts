import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { portfolios, trades, strategyTemplates } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getMockPrice } from '@/lib/simulation'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [portfolio] = await db
    .select()
    .from(portfolios)
    .where(eq(portfolios.userId, session.user.id))
    .limit(1)

  if (!portfolio) return NextResponse.json({ error: 'No portfolio found' }, { status: 404 })

  // Fetch open trades with live P&L
  const openTrades = await db
    .select()
    .from(trades)
    .where(eq(trades.portfolioId, portfolio.id))
    .orderBy(desc(trades.openedAt))

  // Enrich with current prices
  const enriched = openTrades.map(t => {
    const currentPrice = getMockPrice(t.symbol)
    const entryPrice = parseFloat(t.entryPrice)
    const qty = parseFloat(t.quantity)

    let livePnl = 0
    let livePnlPct = 0

    if (t.status === 'open') {
      const diff = t.side === 'long'
        ? currentPrice - entryPrice
        : entryPrice - currentPrice
      livePnl = diff * qty
      livePnlPct = (diff / entryPrice) * 100
    } else {
      livePnl = parseFloat(t.pnl ?? '0')
      livePnlPct = parseFloat(t.pnlPct ?? '0')
    }

    return {
      ...t,
      currentPrice,
      livePnl: parseFloat(livePnl.toFixed(2)),
      livePnlPct: parseFloat(livePnlPct.toFixed(4)),
    }
  })

  // Calculate unrealized P&L from open positions
  const unrealizedPnl = enriched
    .filter(t => t.status === 'open')
    .reduce((sum, t) => sum + t.livePnl, 0)

  return NextResponse.json({
    portfolio: {
      ...portfolio,
      unrealizedPnl: parseFloat(unrealizedPnl.toFixed(2)),
      totalEquity: parseFloat((parseFloat(portfolio.currentBalance) + unrealizedPnl).toFixed(2)),
    },
    trades: enriched,
  })
}
