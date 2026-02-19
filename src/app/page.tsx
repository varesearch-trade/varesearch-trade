import { auth } from '@/auth'
import Header from '@/components/terminal/Header'
import TerminalDashboard from '@/components/terminal/TerminalDashboard'

export default async function HomePage() {
  const session = await auth()

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Header session={session} />
      <TerminalDashboard session={session} />
    </div>
  )
}
