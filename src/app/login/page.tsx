import LoginForm from '@/components/terminal/LoginForm'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; callbackUrl?: string }
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--bg)' }}
    >
      <LoginForm
        error={searchParams.error}
        callbackUrl={searchParams.callbackUrl}
      />
    </div>
  )
}
