import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { TrendingUp, Wallet, LogOut, LayoutDashboard, Factory as HistoryIcon, Sun, Moon, ChevronDown, Boxes as BotBuilderIcon, Radar as ScannerIcon } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

export default function Layout({ children }: { children: ReactNode }) {
  const { isAuthenticated, account, accountType, switchAccountType, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [switching, setSwitching] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement | null>(null)

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/trade', label: 'Trade', icon: TrendingUp },
    { to: '/scanner', label: 'AI Scanner', icon: ScannerIcon },
    { to: '/portfolio', label: 'Portfolio', icon: Wallet },
    { to: '/history', label: 'History', icon: HistoryIcon },
    { to: '/bot-builder', label: 'Bot Builder', icon: BotBuilderIcon },
  ]

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const handleToggleAccountType = async () => {
    setSwitching(true)
    try {
      await switchAccountType(accountType === 'demo' ? 'real' : 'demo')
    } catch {
      // error already set in context
    } finally {
      setSwitching(false)
    }
  }

  const hasRealAccount = useAuth().accounts.some((a) => a.account_type === 'real')

  useEffect(() => {
    if (!accountMenuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [accountMenuOpen])

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      <header className="sticky top-0 z-50 bg-bg-secondary/80 backdrop-blur-xl border-b border-border-default">
        {/* Main nav bar */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[64px]">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-2.5 shrink-0">
                <div className="relative">
                  <div className="absolute inset-0 rounded-xl bg-brand-red/20 blur-md" />
                  <img
                    src={theme === 'dark' ? '/black.jpeg' : '/white.jpeg'}
                    alt="DeriTraders"
                    className="relative w-9 h-9 rounded-xl object-cover ring-1 ring-border-light"
                  />
                </div>
                <span className="text-lg font-bold tracking-tight">DeriTraders</span>
              </Link>

              {/* Center nav */}
              {isAuthenticated && (
                <nav className="hidden lg:flex items-center gap-0.5 mx-auto">
                  {navItems.map((item) => {
                    const Icon = item.icon
                    const active = location.pathname === item.to
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          active
                            ? 'text-text-primary bg-bg-tertiary'
                            : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/50'
                        }`}
                      >
                        <Icon className={`w-4 h-4 transition-transform ${active ? 'scale-110' : ''}`} />
                        {item.label}
                        {active && (
                          <span className="absolute -bottom-px left-3 right-3 h-0.5 rounded-full bg-brand-red" />
                        )}
                      </Link>
                    )
                  })}
                </nav>
              )}

              {/* Right actions */}
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
                </button>

                {isAuthenticated && account ? (
                  <div className="flex items-center gap-3">
                    {hasRealAccount && (
                      <div className="hidden sm:flex items-center rounded-full bg-bg-tertiary border border-border-light p-0.5">
                        <button
                          onClick={handleToggleAccountType}
                          disabled={switching}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                            accountType === 'demo' ? 'bg-brand-red text-white' : 'text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          Demo
                        </button>
                        <button
                          onClick={handleToggleAccountType}
                          disabled={switching}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                            accountType === 'real' ? 'bg-brand-red text-white' : 'text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          Real
                        </button>
                      </div>
                    )}

                    {/* Account dropdown */}
                    <div className="relative" ref={accountMenuRef}>
                      <button
                        onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                        className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full border border-border-light bg-bg-tertiary hover:border-brand-red transition-colors"
                      >
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-red to-brand-red-dim flex items-center justify-center text-white text-xs font-bold">
                          {account.account_id.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col items-start leading-tight">
                          <span className="text-xs font-semibold tabular">
                            {account.balance.toFixed(2)} {account.currency}
                          </span>
                          <span className="text-[10px] text-text-muted hidden sm:block">
                            {account.account_id}
                          </span>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {accountMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-bg-secondary border border-border-light shadow-xl py-2 slide-in">
                          <div className="px-4 py-3 border-b border-border-default">
                            <p className="text-xs text-text-muted mb-1">Logged in as</p>
                            <p className="text-sm font-semibold">{account.account_id}</p>
                            <p className="text-xs text-text-secondary mt-1">
                              {account.account_type === 'demo' ? 'Demo account' : 'Real account'} · {account.currency}
                            </p>
                          </div>
                          <div className="px-4 py-3 border-b border-border-default">
                            <p className="text-xs text-text-muted mb-2">Balance</p>
                            <p className="text-lg font-bold tabular">{account.balance.toFixed(2)} {account.currency}</p>
                          </div>
                          <button
                            onClick={() => { handleLogout(); setAccountMenuOpen(false) }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-text-secondary hover:text-brand-red hover:bg-brand-red/5 transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                            Disconnect
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

              </div>
            </div>
          </div>
      </header>

      {isAuthenticated && account && (
        <div className="border-b border-border-default bg-bg-secondary/50">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
            <p className="text-xs text-text-muted">
              Welcome back, <span className="font-semibold text-text-secondary">{account.account_id}</span> — ready to trade
            </p>
          </div>
        </div>
      )}

      <main className="flex-1 pb-20 lg:pb-0">{children}</main>

      <footer className="hidden lg:block border-t border-border-default bg-bg-secondary/50 py-4">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 text-center text-[11px] text-text-muted leading-relaxed">
          Trading derivatives and synthetic instruments may carry a high level of risk to your capital. DeriTraders is an independent third-party platform powered by the Deriv API and is not affiliated with, endorsed by, or sponsored by Deriv.
        </div>
      </footer>

      {/* Mobile bottom navigation */}
      {isAuthenticated && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg-secondary/90 backdrop-blur-xl border-t border-border-default">
          <div className="flex items-center justify-around h-16 px-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = location.pathname === item.to
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-xl transition-colors ${
                    active
                      ? 'text-brand-red'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? 'scale-110' : ''} transition-transform`} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}
