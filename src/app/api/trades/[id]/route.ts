import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { trades, portfolios } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getMockPrice, calculatePnL } from '@/lib/simulation'
import { z } from 'zod'

const closeSchema = z.object({
  exitPrice: z.number().positive().optional(), // if not provided, use market price
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { exitPrice: manualExit } = closeSchema.parse(body)

    // Fetch trade
    const [trade] = await db
      .select()
      .from(trades)
      .where(and(eq(trades.id, params.id), eq(trades.userId, session.user.id)))
      .limit(1)

    if (!trade) return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    if (trade.status !== 'open') return NextResponse.json({ error: 'Trade already closed' }, { status: 400 })

    const exitPrice = manualExit ?? getMockPrice(trade.symbol)
    const entryPrice = parseFloat(trade.entryPrice)
    const quantity = parseFloat(trade.quantity)

    const { pnl, pnlPct } = calculatePnL({
      side: trade.side,
      entryPrice,
      currentPrice: exitPrice,
      quantity,
      symbol: trade.symbol,
    })

    // Update trade
    await db.update(trades).set({
      status: 'closed',
      exitPrice: exitPrice.toString(),
      pnl: pnl.toString(),
      pnlPct: pnlPct.toString(),
      closedAt: new Date(),
    }).where(eq(trades.id, params.id))

    // Update portfolio balance + stats
    const [portfolio] = await db.select().from(portfolios).where(eq(portfolios.id, trade.portfolioId)).limit(1)
    if (portfolio) {
      const newBalance = parseFloat(portfolio.currentBalance) + pnl
      const newTotalPnl = parseFloat(portfolio.totalPnl) + pnl
      const newTotalPnlPct = (newTotalPnl / parseFloat(portfolio.startingBalance)) * 100
      const isWin = pnl > 0

      await db.update(portfolios).set({
        currentBalance: newBalance.toFixed(2),
        totalPnl: newTotalPnl.toFixed(2),
        totalPnlPct: newTotalPnlPct.toFixed(4),
        winningTrades: isWin ? portfolio.winningTrades + 1 : portfolio.winningTrades,
        losingTrades: isWin ? portfolio.losingTrades : portfolio.losingTrades + 1,
        updatedAt: new Date(),
      }).where(eq(portfolios.id, portfolio.id))
    }

    return NextResponse.json({ pnl, pnlPct, exitPrice })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to close trade' }, { status: 500 })
  }
}
