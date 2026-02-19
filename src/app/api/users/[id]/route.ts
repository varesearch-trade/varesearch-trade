import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { users, portfolios } from '@/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
  resetBalance: z.number().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const validated = updateSchema.parse(body)

    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (validated.name !== undefined) updates.name = validated.name
    if (validated.isActive !== undefined) updates.isActive = validated.isActive
    if (validated.password) updates.passwordHash = await bcrypt.hash(validated.password, 12)

    await db.update(users).set(updates).where(eq(users.id, params.id))

    // Reset portfolio balance if requested
    if (validated.resetBalance) {
      await db.update(portfolios).set({
        startingBalance: validated.resetBalance.toString(),
        currentBalance: validated.resetBalance.toString(),
        totalPnl: '0',
        totalPnlPct: '0',
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        updatedAt: new Date(),
      }).where(eq(portfolios.userId, params.id))
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Prevent self-deletion
  if (params.id === session.user.id) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
  }

  await db.delete(users).where(eq(users.id, params.id))
  return NextResponse.json({ success: true })
}
