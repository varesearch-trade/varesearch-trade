import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { users, portfolios } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import Header from '@/components/terminal/Header'
import UserManagement from '@/components/admin/UserManagement'

export default async function AdminUsersPage() {
  const session = await auth()
  if (!session || session.user.role !== 'admin') redirect('/')

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

  const allPortfolios = await db
    .select({
      userId: portfolios.userId,
      currentBalance: portfolios.currentBalance,
      startingBalance: portfolios.startingBalance,
      totalPnl: portfolios.totalPnl,
      totalPnlPct: portfolios.totalPnlPct,
      totalTrades: portfolios.totalTrades,
      winningTrades: portfolios.winningTrades,
    })
    .from(portfolios)

  const usersWithPortfolio = allUsers.map(u => ({
    ...u,
    portfolio: allPortfolios.find(p => p.userId === u.id) ?? null,
  }))

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Header session={session} />
      <UserManagement session={session} initialUsers={usersWithPortfolio} />
    </div>
  )
}
