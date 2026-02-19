import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { portfolios, trades, strategyTemplates } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import Header from '@/components/terminal/Header'
import PortfolioDashboard from '@/components/portfolio/PortfolioDashboard'

export default async function PortfolioPage() {
  const session = await auth()
  if (!session) redirect('/login?callbackUrl=/portfolio')

  const [portfolio] = await db
    .select()
    .from(portfolios)
    .where(eq(portfolios.userId, session.user.id))
    .limit(1)

  if (!portfolio) redirect('/?error=no-portfolio')

  const allTrades = await db
    .select()
    .from(trades)
    .where(eq(trades.portfolioId, portfolio.id))
    .orderBy(desc(trades.openedAt))
    .limit(100)

  const templates = await db
    .select()
    .from(strategyTemplates)
    .where(eq(strategyTemplates.isPublic, true))

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Header session={session} />
      <PortfolioDashboard
        session={session}
        portfolio={portfolio}
        initialTrades={allTrades}
        templates={templates}
      />
    </div>
  )
}
