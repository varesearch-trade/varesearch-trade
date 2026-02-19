import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { backtests } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { runBacktest } from '@/lib/simulation'
import { z } from 'zod'

const backtestSchema = z.object({
  name: z.string().min(1),
  symbol: z.string(),
  tvSymbol: z.string(),
  timeframe: z.string(),
  fromDate: z.string(),
  toDate: z.string(),
  startingCapital: z.number().min(1000).default(100000),
  strategyTemplateId: z.string().uuid().optional(),
  strategy: z.object({
    entryCondition: z.enum(['sma_cross', 'rsi_oversold', 'breakout', 'mean_revert']),
    stopLossPct: z.number().min(0.1).max(50).default(2),
    takeProfitPct: z.number().min(0.1).max(100).default(4),
    positionSizePct: z.number().min(1).max(100).default(10),
  }),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userBacktests = await db
    .select()
    .from(backtests)
    .where(eq(backtests.userId, session.user.id))

  return NextResponse.json({ backtests: userBacktests })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const validated = backtestSchema.parse(body)

    // Create pending backtest record
    const [bt] = await db.insert(backtests).values({
      userId: session.user.id,
      name: validated.name,
      symbol: validated.symbol,
      tvSymbol: validated.tvSymbol,
      timeframe: validated.timeframe,
      fromDate: new Date(validated.fromDate),
      toDate: new Date(validated.toDate),
      startingCapital: validated.startingCapital.toString(),
      strategyTemplateId: validated.strategyTemplateId,
      status: 'running',
    }).returning()

    // Run simulation synchronously (in production use a queue/worker)
    const result = runBacktest({
      symbol: validated.symbol,
      startingCapital: validated.startingCapital,
      fromDate: new Date(validated.fromDate),
      toDate: new Date(validated.toDate),
      strategy: validated.strategy,
    })

    // Update with results
    await db.update(backtests).set({
      status: 'completed',
      totalTrades: result.totalTrades,
      winRate: result.winRate.toString(),
      totalReturn: result.totalReturn.toString(),
      maxDrawdown: result.maxDrawdown.toString(),
      sharpeRatio: result.sharpeRatio.toString(),
      profitFactor: result.profitFactor.toString(),
      avgWin: result.avgWin.toString(),
      avgLoss: result.avgLoss.toString(),
      equityCurve: result.equityCurve,
      tradeLog: result.tradeLog,
      completedAt: new Date(),
    }).where(eq(backtests.id, bt.id))

    return NextResponse.json({ backtest: { ...bt, ...result, status: 'completed' } }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
    console.error(err)
    return NextResponse.json({ error: 'Backtest failed' }, { status: 500 })
  }
}
