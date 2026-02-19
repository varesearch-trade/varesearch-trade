import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { backtests, strategyTemplates } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import Header from '@/components/terminal/Header'
import BacktestDashboard from '@/components/simulation/BacktestDashboard'

export default async function BacktestPage() {
  const session = await auth()
  if (!session) redirect('/login?callbackUrl=/backtest')

  const history = await db
    .select()
    .from(backtests)
    .where(eq(backtests.userId, session.user.id))
    .orderBy(desc(backtests.createdAt))
    .limit(20)

  const templates = await db
    .select()
    .from(strategyTemplates)
    .where(eq(strategyTemplates.isPublic, true))

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Header session={session} />
      <BacktestDashboard session={session} initialHistory={history} templates={templates} />
    </div>
  )
}
