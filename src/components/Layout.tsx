import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { TrendingUp, ChartLine as LineChart, Wallet, Settings, LogOut, Menu, X, LayoutDashboard, Factory as HistoryIcon, Sun, Moon } from 'lucide-react'
import { useState, type ReactNode } from 'react'

export default function Layout({ children }: { children: ReactNode }) {
  const { isAuthenticated, account, accountType, switchAccountType, isAdmin, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [switching, setSwitching] = useState(false)

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

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      <header className="border-b border-border-default bg-bg-secondary sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-green to-brand-green-dim flex items-center justify-center">
                <LineChart className="w-5 h-5 text-bg-primary" strokeWidth={2.5} />
              </div>
              <span className="text-lg font-bold tracking-tight">DerivMarkets</span>
            </Link>

            {isAuthenticated && (
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const active = location.pathname === item.to
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? 'bg-bg-tertiary text-text-primary'
                          : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  )
                })}
                {isAdmin && (
                  <Link
                    to="/admin"
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname === '/admin'
                        ? 'bg-bg-tertiary text-text-primary'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    Admin
                  </Link>
                )}
              </nav>
            )}

            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              {isAuthenticated && account ? (
                <>
                  {/* Account Type Toggle */}
                  <div className="flex items-center gap-2">
                    {hasRealAccount && (
                      <div className="flex items-center rounded-lg bg-bg-tertiary border border-border-light p-0.5">
                        <button
                          onClick={handleToggleAccountType}
                          disabled={switching}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                            accountType === 'demo' ? 'bg-brand-blue text-white' : 'text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          Demo
                        </button>
                        <button
                          onClick={handleToggleAccountType}
                          disabled={switching}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                            accountType === 'real' ? 'bg-brand-green text-bg-primary' : 'text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          Real
                        </button>
                      </div>
                    )}
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-semibold tabular">
                        {account.balance.toFixed(2)} {account.currency}
                      </span>
                      <span className="text-xs text-text-muted">
                        {account.account_id} {account.account_type === 'demo' ? '(Demo)' : '(Real)'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-brand-red transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Disconnect
                  </button>
                </>
              ) : (
                <Link
                  to="/admin"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Admin
                </Link>
              )}
            </div>

            <button
              onClick={toggleTheme}
              className="md:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              className="md:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && isAuthenticated && (
          <div className="md:hidden border-t border-border-default bg-bg-secondary px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = location.pathname === item.to
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium ${
                    active ? 'bg-bg-tertiary text-text-primary' : 'text-text-secondary'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              )
            })}
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary"
              >
                <Settings className="w-4 h-4" />
                Admin
              </Link>
            )}
            {hasRealAccount && (
              <div className="flex items-center gap-2 px-3 py-2">
                <span className="text-xs text-text-muted">Account:</span>
                <button
                  onClick={handleToggleAccountType}
                  disabled={switching}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold ${accountType === 'demo' ? 'bg-brand-blue text-white' : 'bg-brand-green text-bg-primary'}`}
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
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border-default bg-bg-secondary py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-text-muted">
          Trading involves risk. DerivMarkets is a third-party platform powered by the Deriv API.
          Your 3% markup is applied to every trade.
        </div>
      </footer>
    </div>
  )
}
