import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { posts } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const updatePostSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1).optional(),
  category: z.enum(['XAUUSD', 'XAGUSD', 'BTCUSD', 'ETHUSD', 'SPX', 'MACRO', 'OTHER']).optional(),
  published: z.boolean().optional(),
})

// In Next.js 15, params is a Promise that must be awaited
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Define params as a Promise
) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params // Explicitly await the params
    await db.delete(posts).where(eq(posts.id, id))
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Define params as a Promise
) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params // Explicitly await the params
    const body = await req.json()
    const validated = updatePostSchema.parse(body)
    
    const [updated] = await db
      .update(posts)
      .set({ ...validated, updatedAt: new Date() })
      .where(eq(posts.id, id))
      .returning()

    return NextResponse.json({ post: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
