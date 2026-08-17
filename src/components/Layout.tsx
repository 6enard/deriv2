import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { TrendingUp, Wallet, LogOut, Menu, X, LayoutDashboard, Factory as HistoryIcon, Sun, Moon, ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

export default function Layout({ children }: { children: ReactNode }) {
  const { isAuthenticated, account, accountType, switchAccountType, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement | null>(null)

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/trade', label: 'Trade', icon: TrendingUp },
    { to: '/portfolio', label: 'Portfolio', icon: Wallet },
    { to: '/history', label: 'History', icon: HistoryIcon },
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
      <header className="bg-bg-secondary sticky top-0 z-50 shadow-sm">
        {/* Main nav bar */}
        <div className="border-b border-border-default">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-[68px]">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-2.5 shrink-0">
                <img
                  src={theme === 'dark' ? '/black.jpeg' : '/white.jpeg'}
                  alt="DeriTraders"
                  className="w-9 h-9 rounded-lg object-cover"
                />
                <span className="text-lg font-bold tracking-tight">DeriTraders</span>
              </Link>

              {/* Center nav */}
              {isAuthenticated && (
                <nav className="hidden lg:flex items-center gap-1 mx-auto">
                  {navItems.map((item) => {
                    const Icon = item.icon
                    const active = location.pathname === item.to
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          active
                            ? 'text-brand-green'
                            : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {item.label}
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
                  <div className="hidden md:flex items-center gap-3">
                    {hasRealAccount && (
                      <div className="flex items-center rounded-full bg-bg-tertiary border border-border-light p-0.5">
                        <button
                          onClick={handleToggleAccountType}
                          disabled={switching}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                            accountType === 'demo' ? 'bg-brand-blue text-white' : 'text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          Demo
                        </button>
                        <button
                          onClick={handleToggleAccountType}
                          disabled={switching}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                            accountType === 'real' ? 'bg-brand-green text-bg-primary' : 'text-text-secondary hover:text-text-primary'
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
                        className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full border border-border-light bg-bg-tertiary hover:border-brand-green transition-colors"
                      >
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-green to-brand-green-dim flex items-center justify-center text-bg-primary text-xs font-bold">
                          {account.account_id.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col items-start leading-tight">
                          <span className="text-xs font-semibold tabular">
                            {account.balance.toFixed(2)} {account.currency}
                          </span>
                          <span className="text-[10px] text-text-muted">
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
                ) : (
                  <div className="hidden md:flex items-center gap-2">
                    <Link
                      to="/"
                      className="px-5 py-2 rounded-full text-sm font-semibold text-text-primary hover:bg-bg-tertiary transition-colors"
                    >
                      Log in
                    </Link>
                    <Link
                      to="/"
                      className="px-5 py-2 rounded-full text-sm font-semibold bg-brand-green text-bg-primary hover:bg-brand-green-dim transition-colors"
                    >
                      Sign up
                    </Link>
                  </div>
                )}

                <button
                  className="lg:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  aria-label="Menu"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border-default bg-bg-secondary px-4 py-3 space-y-1 slide-in">
            {isAuthenticated ? (
              <>
                {navItems.map((item) => {
                  const Icon = item.icon
                  const active = location.pathname === item.to
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium ${
                        active ? 'bg-bg-tertiary text-brand-green' : 'text-text-secondary'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  )
                })}
                {hasRealAccount && (
                  <div className="flex items-center gap-2 px-3 py-2">
                    <span className="text-xs text-text-muted">Account:</span>
                    <button
                      onClick={handleToggleAccountType}
                      disabled={switching}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${accountType === 'demo' ? 'bg-brand-blue text-white' : 'bg-brand-green text-bg-primary'}`}
                    >
                      {accountType === 'demo' ? 'Demo' : 'Real'}
                    </button>
                  </div>
                )}
                {account && (
                  <div className="px-3 py-2 text-sm">
                    <span className="font-semibold tabular">{account.balance.toFixed(2)} {account.currency}</span>
                    <span className="text-text-muted ml-2">{account.account_id} ({account.account_type})</span>
                  </div>
                )}
                <button
                  onClick={() => { handleLogout(); setMobileMenuOpen(false) }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-brand-red w-full"
                >
                  <LogOut className="w-4 h-4" />
                  Disconnect
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 px-3 py-2">
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-2.5 rounded-full text-sm font-semibold text-text-primary bg-bg-tertiary text-center"
                >
                  Log in
                </Link>
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-2.5 rounded-full text-sm font-semibold bg-brand-green text-bg-primary text-center"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border-default bg-bg-secondary py-4">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-text-muted">
          Trading involves risk. DeriTraders is a third-party platform powered by the Deriv API.
          Your 3% markup is applied to every trade.
        </div>
      </footer>
    </div>
  )
}
