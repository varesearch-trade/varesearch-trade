import { auth } from '@/auth'
import { db } from '@/db'
import { posts, users } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'
import AdminDashboard from '@/components/admin/AdminDashboard'

export default async function AdminPage() {
  const session = await auth()

  const allPosts = await db
    .select({
      id: posts.id,
      title: posts.title,
      content: posts.content,
      category: posts.category,
      published: posts.published,
      createdAt: posts.createdAt,
      author: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(posts)
    .leftJoin(users, eq(posts.authorId, users.id))
    .orderBy(desc(posts.createdAt))
    .limit(50)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <AdminDashboard session={session!} initialPosts={allPosts} />
    </div>
  )
}
