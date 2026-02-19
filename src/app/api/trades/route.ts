import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { trades, portfolios } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getMockPrice, calculatePnL } from '@/lib/simulation'
import { z } from 'zod'

const openTradeSchema = z.object({
  symbol: z.string(),
  tvSymbol: z.string(),
  side: z.enum(['long', 'short']),
  orderType: z.enum(['market', 'limit', 'stop']).default('market'),
  quantity: z.number().positive(),
  entryPrice: z.number().positive().optional(),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
  limitPrice: z.number().positive().optional(),
  strategyTemplateId: z.string().uuid().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const validated = openTradeSchema.parse(body)

    // Get user portfolio
    const [portfolio] = await db
      .select()
      .from(portfolios)
      .where(eq(portfolios.userId, session.user.id))
      .limit(1)

    if (!portfolio) return NextResponse.json({ error: 'No portfolio' }, { status: 404 })

    // Get execution price
    const executionPrice = validated.orderType === 'market'
      ? getMockPrice(validated.symbol)
      : (validated.limitPrice ?? getMockPrice(validated.symbol))

    // Calculate required margin (simplified: quantity * price * 10% margin)
    const requiredMargin = validated.quantity * executionPrice * 0.1
    const balance = parseFloat(portfolio.currentBalance)

    if (requiredMargin > balance) {
      return NextResponse.json({ error: 'Insufficient balance for this position size' }, { status: 400 })
    }

    // If limit order, hold as pending (status open but with limit flag)
    const status = validated.orderType === 'market' ? 'open' : 'open'

    const [trade] = await db.insert(trades).values({
      portfolioId: portfolio.id,
      userId: session.user.id,
      symbol: validated.symbol,
      tvSymbol: validated.tvSymbol,
      side: validated.side,
      orderType: validated.orderType,
      status,
      quantity: validated.quantity.toString(),
      entryPrice: executionPrice.toString(),
      stopLoss: validated.stopLoss?.toString(),
      takeProfit: validated.takeProfit?.toString(),
      limitPrice: validated.limitPrice?.toString(),
      strategyTemplateId: validated.strategyTemplateId,
      notes: validated.notes,
      tags: validated.tags ?? [],
      fees: '0',
    }).returning()

    // Update portfolio trade count
    await db.update(portfolios).set({
      totalTrades: portfolio.totalTrades + 1,
      updatedAt: new Date(),
    }).where(eq(portfolios.id, portfolio.id))

    return NextResponse.json({ trade }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
    console.error(err)
    return NextResponse.json({ error: 'Failed to open trade' }, { status: 500 })
  }
}
