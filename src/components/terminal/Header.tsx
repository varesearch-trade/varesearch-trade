'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import type { Session } from 'next-auth'

interface HeaderProps {
  session: Session | null
}

export default function Header({ session }: HeaderProps) {
  const pathname = usePathname()

  return (
    <header className="max-w-7xl mx-auto px-4 md:px-10 mt-6 md:mt-12">
      <div className="flex flex-col md:flex-row justify-between items-center border-b pb-8 gap-6"
        style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        
        <div className="text-center md:text-left">
          <Link href="/">
            <div
              className="text-2xl md:text-3xl font-black tracking-tighter uppercase cursor-default select-none"
              style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '-0.05em' }}
            >
              VA<span className="text-zinc-800">.</span>{' '}
              <span className="text-white">RESEARCH</span>
            </div>
          </Link>
          <p className="text-zinc-500 text-[11px] md:text-[12px] font-medium mt-2 max-w-md leading-relaxed tracking-wide italic">
            Strategic analysis and technical research focused on high-probability setups
            in the global equity and commodity markets.
          </p>
        </div>

        <div className="flex items-center gap-6 md:gap-8 flex-wrap justify-center">
          <nav className="flex flex-wrap gap-6 md:gap-8 text-[10px] uppercase tracking-[0.3em] font-bold text-zinc-500"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            <Link href="/" className={`hover:text-white transition-colors ${pathname === '/' ? 'text-white' : ''}`}>Terminal</Link>
            <Link href="/intelligence" className={`hover:text-white transition-colors ${pathname === '/intelligence' ? 'text-white' : ''}`}>Intelligence</Link>
            {session && (
              <Link href="/portfolio" className={`hover:text-white transition-colors ${pathname === '/portfolio' ? 'text-white' : ''}`}>Portfolio</Link>
            )}
            {session && (
              <Link href="/backtest" className={`hover:text-white transition-colors ${pathname === '/backtest' ? 'text-white' : ''}`}>Backtest</Link>
            )}
            {session?.user?.role === 'admin' && (
              <Link
                href="/admin"
                className="transition-colors"
                style={{ color: pathname.startsWith('/admin') ? 'var(--gold)' : undefined }}
              >
                Admin
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-3">
            {session ? (
              <div className="flex items-center gap-3">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-[9px] mono font-bold" style={{ color: 'var(--gold)' }}>
                    {session.user.role.toUpperCase()}
                  </span>
                  <span className="text-[9px] text-zinc-600 font-mono">
                    {session.user.email}
                  </span>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="text-[9px] mono font-bold uppercase tracking-widest text-zinc-600 border px-3 py-1.5 hover:text-red-400 hover:border-red-500/30 transition-colors"
                  style={{
                    borderColor: 'rgba(255,255,255,0.08)',
                    fontFamily: "'JetBrains Mono', monospace",
                    borderRadius: 4,
                  }}
                >
                  Sign_Out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-[9px] mono font-bold uppercase tracking-widest text-zinc-400 border px-3 py-1.5 transition-colors"
                style={{
                  borderColor: 'rgba(255,255,255,0.08)',
                  fontFamily: "'JetBrains Mono', monospace",
                  borderRadius: 4,
                }}
              >
                Access_Terminal
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
