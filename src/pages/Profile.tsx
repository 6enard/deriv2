import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { useTheme } from '../context/ThemeContext'
import { User, Wallet, LogOut, Sun, Moon, TrendingUp, Lock, ArrowLeft, Loader as Loader2, ExternalLink, MessageCircle, Send, Phone, Mail } from 'lucide-react'
import DepositGuide from '../components/DepositGuide'

export default function Profile() {
  const { account, accounts, accountType, switchAccountType, logout, rememberMe, setRememberMe, isAdmin } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [switching, setSwitching] = useState(false)

  const handleLogout = () => { logout(); navigate('/') }

  const handleToggleAccountType = async () => {
    setSwitching(true)
    try { await switchAccountType(accountType === 'demo' ? 'real' : 'demo') }
    catch { /* error in context */ }
    finally { setSwitching(false) }
  }

  const hasRealAccount = accounts.some((a) => a.account_type === 'real')
  if (!account) return null

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <h1 className="text-2xl font-bold mb-1">Profile</h1>
      <p className="text-sm text-text-secondary mb-6">Manage your account and settings.</p>

      {/* Account card */}
      <div className="rounded-2xl bg-bg-secondary border border-border-default p-5 mb-4">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-red to-brand-red-dim flex items-center justify-center text-white text-xl font-bold shrink-0">
            {account.account_id.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold truncate">{account.account_id}</h2>
            <p className="text-sm text-text-secondary">{account.account_type === 'demo' ? 'Demo account' : 'Real account'} · {account.currency}</p>
          </div>
          {isAdmin && <span className="ml-auto text-xs font-bold px-3 py-1 rounded-full bg-brand-amber/15 text-brand-amber">Admin</span>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-bg-tertiary border border-border-light p-4">
            <div className="flex items-center gap-2 mb-2 text-text-muted"><Wallet className="w-3.5 h-3.5" /><span className="text-xs">Balance</span></div>
            <div className="text-lg font-bold tabular">{account.balance.toFixed(2)} {account.currency}</div>
          </div>
          <div className="rounded-xl bg-bg-tertiary border border-border-light p-4">
            <div className="flex items-center gap-2 mb-2 text-text-muted"><User className="w-3.5 h-3.5" /><span className="text-xs">Account type</span></div>
            <div className="text-lg font-bold capitalize">{account.account_type}</div>
          </div>
        </div>
      </div>

      {/* Account switching */}
      <div className="rounded-2xl bg-bg-secondary border border-border-default p-5 mb-4">
        <h3 className="font-semibold mb-1 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-brand-green" /> Account Type</h3>
        <p className="text-sm text-text-secondary mb-4">Switch between your demo and real accounts.</p>
        {hasRealAccount ? (
          <div className="flex items-center rounded-full bg-bg-tertiary border border-border-light p-0.5 w-fit">
            <button onClick={handleToggleAccountType} disabled={switching} className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${accountType === 'demo' ? 'bg-brand-red text-white' : 'text-text-secondary hover:text-text-primary'}`}>
              {switching ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Demo
            </button>
            <button onClick={handleToggleAccountType} disabled={switching} className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${accountType === 'real' ? 'bg-brand-red text-white' : 'text-text-secondary hover:text-text-primary'}`}>
              Real
            </button>
          </div>
        ) : (
          <div className="rounded-xl bg-brand-amber/5 border border-brand-amber/20 px-4 py-3">
            <p className="text-sm text-text-secondary">You don't have a real account yet. To trade with real funds, create a real account on Deriv first.</p>
            <a href="https://app.deriv.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-3 text-sm font-semibold text-brand-red hover:text-brand-red-dim transition-colors">
              Open Deriv to create a real account <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>

      {/* Remember me */}
      <div className="rounded-2xl bg-bg-secondary border border-border-default p-5 mb-4">
        <h3 className="font-semibold mb-1 flex items-center gap-2"><Lock className="w-4 h-4 text-brand-blue" /> Remember Me</h3>
        <p className="text-sm text-text-secondary mb-4">When enabled, your login persists across browser restarts. When disabled, you'll need to sign in again each time you open the site.</p>
        <button onClick={() => { const n = !rememberMe; setRememberMe(n); showToast('info', n ? 'Remember me enabled — you\'ll stay logged in.' : 'Remember me disabled — you\'ll need to log in each time.') }} className="w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-6 rounded-full transition-colors relative ${rememberMe ? 'bg-brand-green' : 'bg-bg-hover'}`}>
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${rememberMe ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm font-semibold">{rememberMe ? 'Enabled' : 'Disabled'}</span>
          </div>
          <span className="text-xs text-text-muted">{rememberMe ? 'Your session persists' : 'Session cleared on close'}</span>
        </button>
      </div>

      {/* Appearance */}
      <div className="rounded-2xl bg-bg-secondary border border-border-default p-5 mb-4">
        <h3 className="font-semibold mb-1 flex items-center gap-2">{theme === 'dark' ? <Moon className="w-4 h-4 text-brand-blue" /> : <Sun className="w-4 h-4 text-brand-amber" />} Appearance</h3>
        <p className="text-sm text-text-secondary mb-4">Switch between dark and light themes.</p>
        <div className="flex items-center rounded-full bg-bg-tertiary border border-border-light p-0.5 w-fit">
          <button onClick={toggleTheme} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${theme === 'dark' ? 'bg-brand-red text-white' : 'text-text-secondary'}`}>Dark</button>
          <button onClick={toggleTheme} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${theme === 'light' ? 'bg-brand-red text-white' : 'text-text-secondary'}`}>Light</button>
        </div>
      </div>

      {/* Deposit guide */}
      <DepositGuide />

      {/* Support contacts */}
      <div className="rounded-2xl bg-bg-secondary border border-border-default p-5 mb-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><MessageCircle className="w-4 h-4 text-brand-green" /> Need Help?</h3>
        <p className="text-sm text-text-secondary mb-4">Reach out to us through any of these channels.</p>
        <div className="grid grid-cols-2 gap-3">
          <a href="https://chat.whatsapp.com/JO4DEAgjFW15ky7h01pZ41?mode=gi_t" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-border-light bg-bg-tertiary/50 hover:border-brand-green/40 transition-colors">
            <MessageCircle className="w-5 h-5 text-[#25D366]" /><div><p className="text-xs font-semibold">WhatsApp</p><p className="text-[10px] text-text-muted">Join community</p></div>
          </a>
          <a href="https://t.me/deritraderslounge" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-border-light bg-bg-tertiary/50 hover:border-brand-blue/40 transition-colors">
            <Send className="w-5 h-5 text-[#0088cc]" /><div><p className="text-xs font-semibold">Telegram</p><p className="text-[10px] text-text-muted">@deritraderslounge</p></div>
          </a>
          <a href="tel:+254180557929" className="flex items-center gap-3 p-3 rounded-xl border border-border-light bg-bg-tertiary/50 hover:border-brand-green/40 transition-colors">
            <Phone className="w-5 h-5 text-brand-green" /><div><p className="text-xs font-semibold">Call / Text</p><p className="text-[10px] text-text-muted">+254 18 0557929</p></div>
          </a>
          <a href="mailto:odongofx@gmail.com" className="flex items-center gap-3 p-3 rounded-xl border border-border-light bg-bg-tertiary/50 hover:border-brand-blue/40 transition-colors">
            <Mail className="w-5 h-5 text-brand-blue" /><div><p className="text-xs font-semibold">Email</p><p className="text-[10px] text-text-muted">odongofx@gmail.com</p></div>
          </a>
        </div>
      </div>

      {/* Log out */}
      <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-brand-red/10 border border-brand-red/25 text-brand-red font-bold text-sm hover:bg-brand-red/15 transition-colors">
        <LogOut className="w-4 h-4" /> Log out
      </button>
    </div>
  )
}

