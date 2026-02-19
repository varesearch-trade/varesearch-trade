import { auth } from '@/auth'
import Header from '@/components/terminal/Header'
import { db } from '@/db'
import { posts, users } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'
import IntelligenceFeed from '@/components/terminal/IntelligenceFeed'
import NewsTimeline from '@/components/terminal/NewsTimeline'

export const revalidate = 60 // ISR - revalidate every 60s

export default async function IntelligencePage() {
  const session = await auth()

  const allPosts = await db
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
    .where(eq(posts.published, true))
    .orderBy(desc(posts.createdAt))
    .limit(30)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Header session={session} />

      <section className="px-4 md:px-10 max-w-7xl mx-auto py-10 page-enter">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Posts feed */}
          <div className="lg:col-span-7">
            <div
              className="flex justify-between items-center mb-10 pb-6"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
            >
              <h2
                className="font-black text-3xl text-white uppercase italic"
                style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '-0.05em' }}
              >
                Research_Repository
              </h2>
              {session?.user?.role === 'admin' && (
                <a
                  href="/admin"
                  className="text-[10px] font-bold uppercase px-3 py-1.5 transition-colors"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    color: 'var(--gold)',
                    border: '1px solid rgba(212,175,55,0.3)',
                    borderRadius: '4px',
                  }}
                >
                  + Publish
                </a>
              )}
            </div>

            <IntelligenceFeed initialPosts={allPosts} />
          </div>

          {/* News wire */}
          <div className="lg:col-span-5">
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                height: '600px',
                background: '#000',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div
                className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: 'var(--gold)',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  background: '#000',
                }}
              >
                ◈ Live Market Wire
              </div>
              <div style={{ height: 'calc(100% - 41px)' }}>
                <NewsTimeline />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
