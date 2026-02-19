import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { posts, users } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'

const createPostSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  category: z.enum(['XAUUSD', 'XAGUSD', 'BTCUSD', 'ETHUSD', 'SPX', 'MACRO', 'OTHER']),
  published: z.boolean().optional().default(true),
})

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const limit = parseInt(searchParams.get('limit') || '20')

  try {
    let query = db
      .select({
        id: posts.id,
        title: posts.title,
        content: posts.content,
        category: posts.category,
        published: posts.published,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        author: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .orderBy(desc(posts.createdAt))
      .limit(limit)

    const results = await query
    const filtered = category
      ? results.filter((p) => p.category === category)
      : results

    return NextResponse.json({ posts: filtered })
  } catch (error) {
    console.error('GET /api/posts error:', error)
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()

  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const validated = createPostSchema.parse(body)

    const [post] = await db
      .insert(posts)
      .values({
        ...validated,
        authorId: session.user.id,
      })
      .returning()

    return NextResponse.json({ post }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('POST /api/posts error:', error)
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
  }
}
