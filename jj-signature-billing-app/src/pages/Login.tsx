import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Lock, AlertCircle, ShieldCheck } from 'lucide-react'
import { authService } from '../services/authService'
import { useAuthStore } from '../store/store'
import { BRAND_EN, BRAND_TA, BRAND_LOGO } from '../lib/brand'
import { useLangStore } from '../store/langStore'

const LOGIN_ID = String(import.meta.env.VITE_CUSTOMER_ID || 'jjsignature')

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { lang } = useLangStore()
  const setAuth = useAuthStore((state) => state.setAuth)
  const l = (en: string, ta: string) => lang === 'ta' ? ta : en
  const redirectPath = new URLSearchParams(location.search).get('redirect') || '/'
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    const result = await authService.signIn(loginId, password)
    setLoading(false)
    if (!result.user) {
      setError(result.error || l('Invalid username or password', 'தவறான பயனர் பெயர் அல்லது கடவுச்சொல்'))
      return
    }
    setAuth(result.user)
    navigate(redirectPath, { replace: true })
  }

  return (
    <div className="bg-gradient-to-br from-[#eaf2e5] to-[#F9FAFB] min-h-screen flex items-center justify-center p-4">
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-sand/40 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4 inline-flex items-center justify-center rounded-2xl bg-white border border-gray-200 p-2 shadow-md">
            <img src={BRAND_LOGO} alt={`${BRAND_EN} logo`} className="h-12 w-auto max-w-[150px] rounded-xl object-contain" />
          </div>
          <h1 className="text-xl font-bold font-headline text-textMain text-center">{BRAND_EN}</h1>
          <p className="text-[12px] text-textMuted mt-0.5 text-center">{BRAND_TA}</p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-sand bg-[#F8F3E8] px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-textMain">
            <ShieldCheck size={13} /> {l('Customer Login', 'வாடிக்கையாளர் உள்நுழைவு')}
          </p>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-[12px] mb-4 flex items-center gap-2">
            <AlertCircle size={14} /> {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-bold text-textMuted uppercase tracking-wide">Username</label>
            <input type="text" autoComplete="username" placeholder={LOGIN_ID} value={loginId} onChange={(event) => setLoginId(event.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-sand focus:border-sageDark outline-none text-[13px]" required />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-bold text-textMuted uppercase tracking-wide">Password</label>
            <input type="password" autoComplete="current-password" placeholder="Enter password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-sand focus:border-sageDark outline-none text-[13px]" required />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-sageDark hover:bg-sageDeep text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            <Lock size={15} /> {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
