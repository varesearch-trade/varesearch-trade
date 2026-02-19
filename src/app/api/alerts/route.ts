import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { priceAlerts } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const createAlertSchema = z.object({
  symbol: z.string(),
  tvSymbol: z.string(),
  condition: z.enum(['above', 'below']),
  targetPrice: z.number().positive(),
  note: z.string().optional(),
  autoTrade: z.boolean().default(false),
  autoSide: z.enum(['long', 'short']).optional(),
  autoQuantity: z.number().positive().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const alerts = await db
    .select()
    .from(priceAlerts)
    .where(eq(priceAlerts.userId, session.user.id))

  return NextResponse.json({ alerts })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const validated = createAlertSchema.parse(body)

    const [alert] = await db.insert(priceAlerts).values({
      userId: session.user.id,
      ...validated,
      targetPrice: validated.targetPrice.toString(),
      autoQuantity: validated.autoQuantity?.toString(),
    }).returning()

    return NextResponse.json({ alert }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await db.delete(priceAlerts).where(
    and(eq(priceAlerts.id, id), eq(priceAlerts.userId, session.user.id))
  )
  return NextResponse.json({ success: true })
}
