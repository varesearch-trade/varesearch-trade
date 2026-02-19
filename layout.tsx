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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
      </head>
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
