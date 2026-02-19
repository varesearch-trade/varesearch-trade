import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { users, portfolios, userPreferences } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(100),
  role: z.enum(['admin', 'viewer']).default('viewer'),
  startingBalance: z.number().min(1000).max(10000000).default(100000),
})

// GET all users (admin only)
export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const allUsers = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))

  return NextResponse.json({ users: allUsers })
}

// POST create user (admin only)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { email, password, name, role, startingBalance } = createUserSchema.parse(body)

    const hash = await bcrypt.hash(password, 12)

    const [user] = await db.insert(users).values({
      email,
      passwordHash: hash,
      name,
      role,
      isActive: true,
      createdBy: session.user.id,
    }).returning()

    // Auto-create portfolio for the user
    await db.insert(portfolios).values({
      userId: user.id,
      name: `${name}'s Paper Account`,
      startingBalance: startingBalance.toString(),
      currentBalance: startingBalance.toString(),
    })

    // Auto-create preferences
    await db.insert(userPreferences).values({
      userId: user.id,
    })

    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
    if ((err as { code?: string }).code === '23505') return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
    console.error(err)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
