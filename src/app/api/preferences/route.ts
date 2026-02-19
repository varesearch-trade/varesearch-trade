import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { userPreferences } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const prefsSchema = z.object({
  tickerSymbols: z.array(z.string()).min(1).max(20),
})

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [prefs] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, session.user.id))
    .limit(1)

  return NextResponse.json({
    tickerSymbols: prefs?.tickerSymbols ?? [
      'OANDA:XAUUSD',
      'BINANCE:BTCUSDT',
      'FOREXCOM:SPX',
      'FX_IDC:XAGUSD',
    ],
  })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { tickerSymbols } = prefsSchema.parse(body)

    await db
      .insert(userPreferences)
      .values({ userId: session.user.id, tickerSymbols, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: { tickerSymbols, updatedAt: new Date() },
      })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
  }
}
