import type { Metadata } from 'next'
import './globals.css'
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/auth'
import TickerTape from '@/components/terminal/TickerTape'
import DisclaimerBar from '@/components/terminal/DisclaimerBar'

export const metadata: Metadata = {
  title: 'VA Research | Institutional Strategy & Intelligence',
  description: 'Strategic analysis and technical research focused on high-probability setups in global equity and commodity markets.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  return (
    <html lang="en">
      <body className="antialiased">
        <SessionProvider session={session}>
          <TickerTape userId={session?.user?.id} />
          <main>{children}</main>
          <DisclaimerBar />
        </SessionProvider>
      </body>
    </html>
  )
}
