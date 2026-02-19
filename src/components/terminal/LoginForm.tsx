'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface LoginFormProps {
  error?: string
  callbackUrl?: string
}

export default function LoginForm({ error, callbackUrl }: LoginFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(
    error === 'CredentialsSignin' ? 'Invalid credentials. Access denied.' : null
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setAuthError(null)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setAuthError('Authentication failed. Verify credentials.')
      setLoading(false)
    } else {
      router.push(callbackUrl || '/')
      router.refresh()
    }
  }

  return (
    <div className="w-full max-w-sm">
      {/* Header */}
      <div className="text-center mb-12">
        <Link href="/">
          <div
            className="text-2xl font-black uppercase mb-4 cursor-pointer"
            style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '-0.05em' }}
          >
            VA<span style={{ color: 'rgba(255,255,255,0.1)' }}>.</span> RESEARCH
          </div>
        </Link>
        <p
          className="text-[10px] uppercase tracking-[0.8em] italic"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.25)' }}
        >
          Identity Verification Required
        </p>
      </div>

      {/* Terminal frame */}
      <div
        className="relative p-8 rounded-lg"
        style={{
          background: 'rgba(8,8,8,0.9)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Scan line decoration */}
        <div
          className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none"
          style={{ opacity: 0.015 }}
          aria-hidden
        >
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} style={{ height: '1px', background: 'white', marginBottom: '5px' }} />
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative">
          {/* Email */}
          <div>
            <label
              className="block text-[9px] font-bold uppercase tracking-widest mb-2"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.25)' }}
            >
              USER_ID
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="operator@domain.com"
              className="w-full bg-transparent py-3 text-white outline-none text-sm tracking-wide transition-colors"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                borderBottom: '1px solid rgba(255,255,255,0.15)',
              }}
              onFocus={(e) =>
                (e.target.style.borderBottomColor = 'var(--gold)')
              }
              onBlur={(e) =>
                (e.target.style.borderBottomColor = 'rgba(255,255,255,0.15)')
              }
            />
          </div>

          {/* Password */}
          <div>
            <label
              className="block text-[9px] font-bold uppercase tracking-widest mb-2"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.25)' }}
            >
              AUTH_KEY
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••••••"
              className="w-full bg-transparent py-3 text-white outline-none text-2xl tracking-[0.5em] transition-colors"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                borderBottom: '1px solid rgba(255,255,255,0.15)',
              }}
              onFocus={(e) =>
                (e.target.style.borderBottomColor = 'var(--gold)')
              }
              onBlur={(e) =>
                (e.target.style.borderBottomColor = 'rgba(255,255,255,0.15)')
              }
            />
          </div>

          {/* Error */}
          {authError && (
            <div
              className="text-[10px] font-bold uppercase tracking-wider py-2 px-3 rounded"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: '#ef4444',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
              }}
            >
              ✗ {authError}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 font-black uppercase text-[10px] tracking-[0.4em] transition-all duration-300"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              background: loading ? 'rgba(212,175,55,0.3)' : 'var(--gold)',
              color: '#000',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? (
              <span style={{ animation: 'pulseGold 0.8s infinite' }}>
                AUTHENTICATING...
              </span>
            ) : (
              'INITIATE_SESSION →'
            )}
          </button>
        </form>
      </div>

      <p
        className="text-center mt-6 text-[9px]"
        style={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.15)' }}
      >
        <Link href="/" className="hover:text-white transition-colors">
          ← RETURN_TO_TERMINAL
        </Link>
      </p>
    </div>
  )
}
