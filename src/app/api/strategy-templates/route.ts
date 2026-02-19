import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { strategyTemplates, users } from '@/db/schema'
import { eq, or } from 'drizzle-orm'
import { z } from 'zod'

const ruleSchema = z.object({
  id: z.string(),
  type: z.enum(['entry', 'exit', 'filter']),
  indicator: z.string(),
  condition: z.string(),
  value: z.union([z.string(), z.number()]),
  description: z.string(),
})

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  category: z.enum(['XAUUSD', 'XAGUSD', 'BTCUSD', 'ETHUSD', 'SPX', 'MACRO', 'OTHER']),
  rules: z.array(ruleSchema).min(1),
  defaultQuantity: z.number().optional(),
  defaultStopLossPct: z.number().optional(),
  defaultTakeProfitPct: z.number().optional(),
  isPublic: z.boolean().default(true),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const templates = await db
    .select()
    .from(strategyTemplates)
    .where(eq(strategyTemplates.isPublic, true))

  return NextResponse.json({ templates })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const validated = createTemplateSchema.parse(body)

    const [template] = await db.insert(strategyTemplates).values({
      ...validated,
      defaultQuantity: validated.defaultQuantity?.toString(),
      defaultStopLossPct: validated.defaultStopLossPct?.toString(),
      defaultTakeProfitPct: validated.defaultTakeProfitPct?.toString(),
      createdBy: session.user.id,
    }).returning()

    return NextResponse.json({ template }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}
