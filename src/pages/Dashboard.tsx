import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { errorMessage } from '../lib/error'
import { supabase } from '../lib/supabase'
import type { Bot, QuickStrategy, StrategyType } from '../lib/types'
import { mapActiveSymbol } from '../lib/types'
import type { SymbolInfo } from '../lib/types'
import { isValidBotXml } from '../blockly'
import { Upload, Bot as BotIcon, Sparkles, Zap, Plus, Trash2, Play, Code as Code2, Copy, Loader as Loader2, TrendingUp, Settings as SettingsIcon, Grid3x3, Activity, Target, X, Check, ChevronDown, Wand as Wand2, Monitor, Cloud, Blocks, Zap as ZapIcon, ArrowRight } from 'lucide-react'
import { useMarketData } from '../hooks/useMarketData'
import { DashboardSkeleton } from '../components/Skeleton'

type Tab = 'my-bots' | 'free-bots' | 'editor' | 'strategy'

const STRATEGY_LABELS: Record<StrategyType, string> = {
  martingale: 'Martingale',
  grid: 'Grid',
  trend_follow: 'Trend Following',
  mean_reversion: 'Mean Reversion',
  custom: 'Custom',
}

const STRATEGY_ICONS: Record<StrategyType, typeof BotIcon> = {
  martingale: Activity,
  grid: Grid3x3,
  trend_follow: TrendingUp,
  mean_reversion: Target,
  custom: Code2,
}

export default function Dashboard() {
  const { account } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<Tab>('my-bots')
  const [myBots, setMyBots] = useState<Bot[]>([])
  const [freeBots, setFreeBots] = useState<Bot[]>([])
  const [strategies, setStrategies] = useState<QuickStrategy[]>([])
  const [loading, setLoading] = useState(true)
  const [showQuickStrategy, setShowQuickStrategy] = useState(false)
  const [pendingUploadXml, setPendingUploadXml] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const loadData = useCallback(async () => {
    if (!account) return
    setLoading(true)
    try {
      const [mineRes, freeRes, stratRes] = await Promise.all([
        supabase.from('bots').select('*').eq('deriv_account_id', account.account_id).order('created_at', { ascending: false }),
        supabase.from('bots').select('*').eq('is_free', true).order('created_at', { ascending: false }),
        supabase.from('quick_strategies').select('*').or(`deriv_account_id.eq.${account.account_id},deriv_account_id.eq.system`).order('created_at', { ascending: false }),
      ])
      if (mineRes.data) setMyBots(mineRes.data)
      if (freeRes.data) setFreeBots(freeRes.data)
      if (stratRes.data) setStrategies(stratRes.data)
    } catch {
      // tables may not exist yet
    } finally {
      setLoading(false)
    }
  }, [account])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleComputerFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (!text) return
      const sanitized = text
      if (!isValidBotXml(sanitized)) {
        showToast('error', "This doesn't look like a valid bot file.")
        return
      }
      setPendingUploadXml(sanitized)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleUploadConfirm = async (name: string) => {
    if (!account || !pendingUploadXml) return
    const { error: insertError } = await supabase.from('bots').insert({
      deriv_account_id: account.account_id,
      name: name.trim(),
      description: '',
      strategy_type: 'custom',
      config: { xml: pendingUploadXml },
      is_free: false,
      is_active: false,
    })
    setPendingUploadXml(null)
    if (insertError) {
      showToast('error', insertError.message)
      return
    }
    showToast('success', `"${name.trim()}" uploaded successfully.`)
    loadData()
  }

  const handleBotClick = (bot: Bot) => {
    const xml = (bot.config as Record<string, unknown>).xml
    if (typeof xml === 'string' && xml) {
      sessionStorage.setItem('pending_bot_xml', xml)
    }
    navigate('/bot-builder')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
        <p className="text-sm text-text-secondary">
          Manage your trading Bots, explore free strategies, build custom bots, and create quick strategies.
        </p>
      </div>

      {/* Shortcut Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <ShortcutTile icon={Monitor} label="My Computer" onClick={() => fileInputRef.current?.click()} />
        <ShortcutTile icon={Cloud} label="Google Drive" disabled onClick={() => showToast('info', 'Google Drive import requires additional setup — coming soon.')} />
        <ShortcutTile icon={Blocks} label="Bot Builder" onClick={() => navigate('/bot-builder')} />
        <ShortcutTile icon={ZapIcon} label="Quick Strategy" onClick={() => { setActiveTab('strategy'); setShowQuickStrategy(true) }} />
      </div>
      <input ref={fileInputRef} type="file" accept=".xml" onChange={handleComputerFile} className="hidden" />

      {/* Tab Bar */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
        <TabButton active={activeTab === 'my-bots'} onClick={() => setActiveTab('my-bots')} icon={BotIcon} label="My Bots" count={myBots.length} />
        <TabButton active={activeTab === 'free-bots'} onClick={() => setActiveTab('free-bots')} icon={Sparkles} label="Free Bots" count={freeBots.length} />
        <TabButton active={activeTab === 'editor'} onClick={() => setActiveTab('editor')} icon={Code2} label="Bot Editor" />
        <TabButton active={activeTab === 'strategy'} onClick={() => setActiveTab('strategy')} icon={Zap} label="Quick Strategy" count={strategies.length} />
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {activeTab === 'my-bots' && <MyBotsTab bots={myBots} onChanged={loadData} onBotClick={handleBotClick} />}
          {activeTab === 'free-bots' && <FreeBotsTab bots={freeBots} onChanged={loadData} />}
          {activeTab === 'editor' && <BotEditor onChanged={loadData} />}
          {activeTab === 'strategy' && (
            <QuickStrategyTab
              strategies={strategies}
              onChanged={loadData}
              externalShowForm={showQuickStrategy}
              onExternalClose={() => setShowQuickStrategy(false)}
            />
          )}
        </>
      )}

      {pendingUploadXml && (
        <NamePromptModal
          title="Name your uploaded bot"
          placeholder="e.g. My Scalper Bot"
          onCancel={() => setPendingUploadXml(null)}
          onConfirm={handleUploadConfirm}
        />
      )}
    </div>
  )
}

function ShortcutTile({ icon: Icon, label, onClick, disabled }: { icon: typeof Monitor; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative flex flex-col items-center gap-2.5 p-4 rounded-xl border transition-all ${
        disabled
          ? 'bg-bg-secondary border-border-default opacity-50 cursor-not-allowed'
          : 'bg-bg-secondary border-border-default hover:border-border-light hover:bg-bg-tertiary cursor-pointer'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${disabled ? 'bg-bg-tertiary text-text-muted' : 'bg-bg-tertiary text-brand-green'}`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className={`text-sm font-medium ${disabled ? 'text-text-muted' : 'text-text-primary'}`}>{label}</span>
      {disabled && (
        <span className="absolute top-1.5 right-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-bg-tertiary text-text-muted font-medium">
          Soon
        </span>
      )}
    </button>
  )
}

function NamePromptModal({ title, placeholder, onCancel, onConfirm }: { title: string; placeholder: string; onCancel: () => void; onConfirm: (name: string) => void }) {
  const [name, setName] = useState('')
  return (
    <Modal onClose={onCancel} title={title}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">Bot Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={placeholder}
            autoFocus
            className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-light text-sm focus:outline-none focus:border-brand-blue transition-colors"
          />
        </div>
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={() => { if (name.trim()) onConfirm(name) }}
            disabled={!name.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-green text-bg-primary font-semibold text-sm hover:bg-brand-green-dim transition-colors disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            Upload Bot
          </button>
          <button onClick={onCancel} className="px-4 py-2.5 rounded-xl bg-bg-tertiary text-text-secondary text-sm font-medium hover:text-text-primary transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  )
}

function TabButton({ active, onClick, icon: Icon, label, count }: { active: boolean; onClick: () => void; icon: typeof BotIcon; label: string; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
        active
          ? 'bg-bg-tertiary text-text-primary border border-border-light'
          : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/50'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
      {count !== undefined && count > 0 && (
        <span className={`ml-0.5 text-xs px-1.5 py-0.5 rounded-full ${active ? 'bg-brand-green/20 text-brand-green' : 'bg-bg-hover text-text-muted'}`}>
          {count}
        </span>
      )}
    </button>
  )
}

/* ===================== MY BOTS TAB ===================== */

function MyBotsTab({ bots, onChanged, onBotClick }: { bots: Bot[]; onChanged: () => void; onBotClick: (bot: Bot) => void }) {
  const deleteBot = async (id: string) => {
    await supabase.from('bots').delete().eq('id', id)
    onChanged()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Your Uploaded Bots</h2>
      </div>

      {bots.length === 0 ? (
        <div className="rounded-xl bg-bg-secondary border border-border-default p-12 text-center">
          <BotIcon className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary mb-1">No bots uploaded yet.</p>
          <p className="text-sm text-text-muted">Use the shortcuts above to upload a bot from your computer or build one from scratch.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bots.map((bot) => (
            <BotCard key={bot.id} bot={bot} onOpen={() => onBotClick(bot)} onDelete={() => deleteBot(bot.id)} showControls />
          ))}
        </div>
      )}
    </div>
  )
}

/* ===================== FREE BOTS TAB ===================== */

function FreeBotsTab({ bots, onChanged }: { bots: Bot[]; onChanged: () => void }) {
  const { account, ws } = useAuth()
  const navigate = useNavigate()
  const [copying, setCopying] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const copyBot = async (bot: Bot) => {
    if (!account) return
    setCopying(bot.id)
    const { error } = await supabase.from('bots').insert({
      deriv_account_id: account.account_id,
      name: `${bot.name} (Copy)`,
      description: bot.description,
      strategy_type: bot.strategy_type,
      config: bot.config,
      is_free: false,
      is_active: false,
    })
    setCopying(null)
    if (!error) {
      setCopied(bot.id)
      setTimeout(() => setCopied(null), 2000)
      onChanged()
    }
  }

  const runBot = (bot: Bot) => {
    if (!ws || !account) return
    const xml = (bot.config as Record<string, unknown>).xml
    if (typeof xml === 'string' && xml) {
      sessionStorage.setItem('pending_bot_xml', xml)
    }
    navigate('/bot-builder')
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-brand-amber" />
        <h2 className="font-semibold">Free Community Bots</h2>
      </div>
      <p className="text-sm text-text-secondary mb-5">
        Ready-to-use trading bots. Run any bot directly or copy it to your collection to customize further.
      </p>

      {bots.length === 0 ? (
        <div className="rounded-xl bg-bg-secondary border border-border-default p-12 text-center text-text-muted text-sm">
          No free bots available yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bots.map((bot) => (
            <div key={bot.id} className="rounded-xl bg-bg-secondary border border-border-default p-5 hover:border-border-light transition-colors flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-brand-amber/15 flex items-center justify-center">
                  {(() => {
                    const Icon = STRATEGY_ICONS[bot.strategy_type] || BotIcon
                    return <Icon className="w-5 h-5 text-brand-amber" />
                  })()}
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand-amber/15 text-brand-amber font-medium">
                  {STRATEGY_LABELS[bot.strategy_type]}
                </span>
              </div>
              <h3 className="font-semibold mb-1">{bot.name}</h3>
              <p className="text-sm text-text-secondary leading-relaxed mb-4 flex-1">{bot.description}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => runBot(bot)}
                  disabled={!ws || !account}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-brand-green text-bg-primary text-sm font-medium hover:bg-brand-green-dim transition-colors disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  Run
                </button>
                <button
                  onClick={() => copyBot(bot)}
                  disabled={copying === bot.id}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-bg-tertiary border border-border-light text-sm font-medium hover:bg-bg-hover transition-colors disabled:opacity-50"
                >
                  {copied === bot.id ? <Check className="w-4 h-4 text-brand-green" /> : copying === bot.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                  {copied === bot.id ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ===================== BOT EDITOR TAB ===================== */

function BotEditor({ onChanged }: { onChanged: () => void }) {
  const { account } = useAuth()
  const [myBots, setMyBots] = useState<Bot[]>([])
  const [editingBot, setEditingBot] = useState<Bot | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [strategyType, setStrategyType] = useState<StrategyType>('custom')
  const [configText, setConfigText] = useState('{}')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!account) return
    supabase.from('bots').select('*').eq('deriv_account_id', account.account_id).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setMyBots(data) })
  }, [account])

  const startEdit = (bot: Bot) => {
    setEditingBot(bot)
    setName(bot.name)
    setDescription(bot.description)
    setStrategyType(bot.strategy_type)
    setConfigText(JSON.stringify(bot.config, null, 2))
    setError(null)
  }

  const startNew = () => {
    setEditingBot({} as Bot)
    setName('')
    setDescription('')
    setStrategyType('custom')
    setConfigText('{}')
    setError(null)
  }

  const cancel = () => {
    setEditingBot(null)
    setError(null)
  }

  const save = async () => {
    if (!account) return
    if (!name.trim()) { setError('Bot name is required.'); return }
    let config: Record<string, unknown> = {}
    try { config = JSON.parse(configText) } catch { setError('Configuration must be valid JSON.'); return }

    setSaving(true)
    setError(null)
    if (editingBot?.id) {
      const { error: updateError } = await supabase.from('bots').update({
        name: name.trim(),
        description: description.trim(),
        strategy_type: strategyType,
        config,
        updated_at: new Date().toISOString(),
      }).eq('id', editingBot.id)
      setSaving(false)
      if (updateError) { setError(updateError.message); return }
    } else {
      const { error: insertError } = await supabase.from('bots').insert({
        deriv_account_id: account.account_id,
        name: name.trim(),
        description: description.trim(),
        strategy_type: strategyType,
        config,
        is_free: false,
        is_active: false,
      })
      setSaving(false)
      if (insertError) { setError(insertError.message); return }
    }
    setEditingBot(null)
    onChanged()
    // refresh local list
    supabase.from('bots').select('*').eq('deriv_account_id', account.account_id).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setMyBots(data) })
  }

  const deleteBot = async (id: string) => {
    await supabase.from('bots').delete().eq('id', id)
    onChanged()
    supabase.from('bots').select('*').eq('deriv_account_id', account!.account_id).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setMyBots(data) })
  }

  if (editingBot) {
    return (
      <div className="rounded-xl bg-bg-secondary border border-border-default p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold flex items-center gap-2">
            <Code2 className="w-5 h-5 text-brand-blue" />
            {editingBot.id ? 'Edit Bot' : 'Create New Bot'}
          </h2>
          <button onClick={cancel} className="text-text-secondary hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Bot Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-light text-sm focus:outline-none focus:border-brand-blue transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Strategy Type</label>
              <select
                value={strategyType}
                onChange={(e) => setStrategyType(e.target.value as StrategyType)}
                className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-light text-sm focus:outline-none focus:border-brand-blue transition-colors"
              >
                <option value="martingale">Martingale</option>
                <option value="grid">Grid</option>
                <option value="trend_follow">Trend Following</option>
                <option value="mean_reversion">Mean Reversion</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-light text-sm focus:outline-none focus:border-brand-blue transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Bot Configuration (JSON)</label>
            <textarea
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
              rows={10}
              className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-light text-sm font-mono focus:outline-none focus:border-brand-blue transition-colors resize-y"
            />
          </div>

          {error && (
            <div className="bg-brand-red/10 border border-brand-red/30 rounded-xl px-3 py-2 text-sm text-brand-red">{error}</div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-green text-bg-primary font-semibold text-sm hover:bg-brand-green-dim transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {editingBot.id ? 'Save Changes' : 'Create Bot'}
            </button>
            <button onClick={cancel} className="px-4 py-2.5 rounded-xl bg-bg-tertiary text-text-secondary text-sm font-medium hover:text-text-primary transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Code2 className="w-5 h-5 text-brand-blue" />
          Bot Editor
        </h2>
        <button
          onClick={startNew}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-blue text-white font-medium text-sm hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          New Bot
        </button>
      </div>
      <p className="text-sm text-text-secondary mb-5">
        Create custom trading bots from scratch or edit existing ones. Define your strategy parameters in JSON format.
      </p>

      {myBots.length === 0 ? (
        <div className="rounded-xl bg-bg-secondary border border-border-default p-12 text-center">
          <Code2 className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary mb-1">No bots to edit yet.</p>
          <p className="text-sm text-text-muted mb-4">Create a new bot or copy one from Free Bots.</p>
          <button
            onClick={startNew}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-blue text-white font-medium text-sm hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Create Your First Bot
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {myBots.map((bot) => (
            <div key={bot.id} className="rounded-xl bg-bg-secondary border border-border-default p-4 flex items-center gap-4 hover:border-border-light transition-colors">
              <div className="w-10 h-10 rounded-xl bg-bg-tertiary flex items-center justify-center shrink-0">
                {(() => { const Icon = STRATEGY_ICONS[bot.strategy_type] || BotIcon; return <Icon className="w-5 h-5 text-brand-blue" /> })()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{bot.name}</h3>
                <p className="text-xs text-text-muted truncate">{STRATEGY_LABELS[bot.strategy_type]} · {bot.description || 'No description'}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => startEdit(bot)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bg-tertiary text-sm font-medium hover:bg-bg-hover transition-colors"
                >
                  <SettingsIcon className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => deleteBot(bot.id)}
                  className="p-1.5 rounded-xl text-text-muted hover:text-brand-red hover:bg-brand-red/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ===================== QUICK STRATEGY TAB ===================== */

function QuickStrategyTab({ strategies, onChanged, externalShowForm, onExternalClose }: { strategies: QuickStrategy[]; onChanged: () => void; externalShowForm?: boolean; onExternalClose?: () => void }) {
  const { account, ws, refreshBalance } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { fetchSymbols } = useMarketData()
  const [internalShowForm, setInternalShowForm] = useState(false)
  const showForm = externalShowForm ?? internalShowForm
  const setShowForm = (v: boolean) => {
    if (externalShowForm !== undefined) { if (!v) onExternalClose?.() } else setInternalShowForm(v)
  }
  const [symbols, setSymbols] = useState<{ symbol: string; display_name: string }[]>([])  
  const [loadingSymbols, setLoadingSymbols] = useState(false)
  const [symbolSearch, setSymbolSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [running, setRunning] = useState<string | null>(null)

  // form state
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [contractType, setContractType] = useState<'CALL' | 'PUT'>('CALL')
  const [stake, setStake] = useState('1')
  const [duration, setDuration] = useState('5')
  const [durationUnit, setDurationUnit] = useState('m')
  const [martingaleSteps, setMartingaleSteps] = useState('0')
  const [martingaleMultiplier, setMartingaleMultiplier] = useState('2')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const loadSymbols = useCallback(async () => {
    if (symbols.length > 0) return
    setLoadingSymbols(true)
    try {
      const rawSymbols = await fetchSymbols()
      if (rawSymbols) {
        const mapped: SymbolInfo[] = rawSymbols.map((s: any) => mapActiveSymbol(s))
        setSymbols(mapped.map((s: SymbolInfo) => ({ symbol: s.symbol, display_name: s.display_name })))
        if (!symbol) {
          const firstVol = mapped.find((s: SymbolInfo) => s.market === 'synthetic_index')
          setSymbol(firstVol?.symbol || mapped[0]?.symbol || '')
        }
      }
    } catch { /* ignore */ }
    setLoadingSymbols(false)
  }, [fetchSymbols, symbols.length, symbol])

  useEffect(() => { loadSymbols() }, [loadSymbols])

  useEffect(() => {
    if (externalShowForm) resetForm()
  }, [externalShowForm])

  const resetForm = () => {
    setName('')
    setContractType('CALL')
    setStake('1')
    setDuration('5')
    setDurationUnit('m')
    setMartingaleSteps('0')
    setMartingaleMultiplier('2')
    setError(null)
  }

  const saveStrategy = async () => {
    if (!account) return
    if (!name.trim()) { setError('Strategy name is required.'); return }
    if (!symbol) { setError('Select a market.'); return }

    setSaving(true)
    setError(null)
    const { error: insertError } = await supabase.from('quick_strategies').insert({
      deriv_account_id: account.account_id,
      name: name.trim(),
      symbol,
      contract_type: contractType,
      stake: parseFloat(stake) || 1,
      duration: parseInt(duration) || 5,
      duration_unit: durationUnit,
      martingale_steps: parseInt(martingaleSteps) || 0,
      martingale_multiplier: parseFloat(martingaleMultiplier) || 2,
    })
    setSaving(false)
    if (insertError) { setError(insertError.message); return }
    setShowForm(false)
    resetForm()
    onChanged()
  }

  const deleteStrategy = async (id: string) => {
    await supabase.from('quick_strategies').delete().eq('id', id)
    onChanged()
  }

  const runStrategy = async (strat: QuickStrategy) => {
    if (!ws || !account) return
    setRunning(strat.id!)
    try {
      const proposalRes = await ws.send({
        proposal: 1,
        amount: strat.stake,
        basis: 'stake',
        contract_type: strat.contract_type,
        currency: account.currency,
        duration: strat.duration,
        duration_unit: strat.duration_unit,
        underlying_symbol: strat.symbol,
      })
      const proposal = proposalRes.proposal
      const buyRes = await ws.send({ buy: proposal.id, price: proposal.ask_price })
      const buyData = buyRes.buy
      showToast('success', `${strat.contract_type === 'CALL' ? 'Up' : 'Down'} trade placed for ${buyData.buy_price} ${account.currency}`)
      refreshBalance()
      navigate('/trade')
    } catch (err: unknown) {
      const message = errorMessage(err, 'Trade failed. Please try again.')
      showToast('error', message)
    } finally {
      setRunning(null)
    }
  }

  const filteredSymbols = symbols.filter((s) =>
    s.display_name.toLowerCase().includes(symbolSearch.toLowerCase()),
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Zap className="w-5 h-5 text-brand-green" />
          Quick Strategies
        </h2>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-green text-bg-primary font-medium text-sm hover:bg-brand-green-dim transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Strategy
        </button>
      </div>
      <p className="text-sm text-text-secondary mb-5">
        Create reusable one-click trading strategies with predefined markets, stakes, and durations. Run them instantly with a single click.
      </p>

      {strategies.length === 0 && !showForm ? (
        <div className="rounded-xl bg-bg-secondary border border-border-default p-12 text-center">
          <Zap className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary mb-1">No quick strategies yet.</p>
          <p className="text-sm text-text-muted mb-4">Create a strategy to trade with one click.</p>
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-green text-bg-primary font-medium text-sm hover:bg-brand-green-dim transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Strategy
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {strategies.map((strat) => (
            <div key={strat.id} className="rounded-xl bg-bg-secondary border border-border-default p-5 hover:border-border-light transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${strat.contract_type === 'CALL' ? 'bg-brand-green/15' : 'bg-brand-red/15'}`}>
                    {strat.contract_type === 'CALL' ? <TrendingUp className="w-4 h-4 text-brand-green" /> : <TrendingUp className="w-4 h-4 text-brand-red rotate-180" />}
                  </div>
                  <div>
                    <h3 className="font-medium">{strat.name}</h3>
                    <p className="text-xs text-text-muted">{strat.contract_type === 'CALL' ? 'UP' : 'DOWN'} · {strat.duration}{strat.duration_unit}</p>
                  </div>
                </div>
                {strat.deriv_account_id !== 'system' && (
                  <button
                    onClick={() => deleteStrategy(strat.id!)}
                    className="p-1.5 rounded-xl text-text-muted hover:text-brand-red hover:bg-brand-red/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-text-secondary mb-4">
                <span>Stake: <span className="text-text-primary font-medium tabular">{strat.stake} {account?.currency}</span></span>
                {strat.martingale_steps > 0 && (
                  <span>Martingale: <span className="text-text-primary font-medium">{strat.martingale_steps} steps × {strat.martingale_multiplier}</span></span>
                )}
              </div>
              <button
                onClick={() => runStrategy(strat)}
                disabled={running === strat.id}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-bg-tertiary border border-border-light text-sm font-medium hover:bg-bg-hover transition-colors disabled:opacity-50"
              >
                {running === strat.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Run Now
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal onClose={() => setShowForm(false)} title="New Quick Strategy">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Strategy Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Volatility 10 Up 5min"
                className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-light text-sm focus:outline-none focus:border-brand-blue transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Market</label>
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-light text-sm hover:border-brand-blue transition-colors"
                >
                  <span>{symbols.find((s) => s.symbol === symbol)?.display_name || 'Select market'}</span>
                  <ChevronDown className="w-4 h-4 text-text-secondary" />
                </button>
                {dropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 max-h-64 overflow-y-auto rounded-xl bg-bg-secondary border border-border-light shadow-xl z-50">
                    <div className="p-2 sticky top-0 bg-bg-secondary border-b border-border-default">
                      <input
                        type="text"
                        value={symbolSearch}
                        onChange={(e) => setSymbolSearch(e.target.value)}
                        placeholder="Search markets..."
                        className="w-full px-3 py-2 rounded-xl bg-bg-tertiary border border-border-light text-sm focus:outline-none focus:border-brand-blue"
                        autoFocus
                      />
                    </div>
                    {loadingSymbols ? (
                      <div className="p-3 text-center text-sm text-text-muted"><Loader2 className="w-4 h-4 animate-spin inline" /> Loading...</div>
                    ) : (
                      filteredSymbols.map((s) => (
                        <button
                          key={s.symbol}
                          onClick={() => { setSymbol(s.symbol); setDropdownOpen(false); setSymbolSearch('') }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-bg-tertiary transition-colors ${s.symbol === symbol ? 'text-brand-green' : ''}`}
                        >
                          {s.display_name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Direction</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setContractType('CALL')}
                    className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${contractType === 'CALL' ? 'bg-brand-green/15 border-brand-green text-brand-green' : 'bg-bg-tertiary border-border-light text-text-secondary'}`}
                  >
                    UP
                  </button>
                  <button
                    onClick={() => setContractType('PUT')}
                    className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${contractType === 'PUT' ? 'bg-brand-red/15 border-brand-red text-brand-red' : 'bg-bg-tertiary border-border-light text-text-secondary'}`}
                  >
                    DOWN
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Stake ({account?.currency || 'USD'})</label>
                <input
                  type="number"
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                  min="0.35"
                  step="0.01"
                  className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-light text-sm tabular focus:outline-none focus:border-brand-blue transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Duration</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    min="1"
                    className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-light text-sm tabular focus:outline-none focus:border-brand-blue transition-colors"
                  />
                  <select
                    value={durationUnit}
                    onChange={(e) => setDurationUnit(e.target.value)}
                    className="px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-light text-sm focus:outline-none focus:border-brand-blue transition-colors"
                  >
                    <option value="t">Ticks</option>
                    <option value="s">sec</option>
                    <option value="m">min</option>
                    <option value="h">hrs</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Martingale Steps</label>
                <input
                  type="number"
                  value={martingaleSteps}
                  onChange={(e) => setMartingaleSteps(e.target.value)}
                  min="0"
                  max="10"
                  className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-light text-sm tabular focus:outline-none focus:border-brand-blue transition-colors"
                />
              </div>
            </div>

            {parseInt(martingaleSteps) > 0 && (
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Martingale Multiplier</label>
                <input
                  type="number"
                  value={martingaleMultiplier}
                  onChange={(e) => setMartingaleMultiplier(e.target.value)}
                  min="1"
                  step="0.1"
                  className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-light text-sm tabular focus:outline-none focus:border-brand-blue transition-colors"
                />
              </div>
            )}

            {error && (
              <div className="bg-brand-red/10 border border-brand-red/30 rounded-xl px-3 py-2 text-sm text-brand-red">{error}</div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={saveStrategy}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-green text-bg-primary font-semibold text-sm hover:bg-brand-green-dim transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                Save Strategy
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl bg-bg-tertiary text-text-secondary text-sm font-medium hover:text-text-primary transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ===================== SHARED COMPONENTS ===================== */

function BotCard({ bot, onOpen, onDelete, showControls }: { bot: Bot; onOpen: () => void; onDelete: () => void; showControls?: boolean }) {
  const Icon = STRATEGY_ICONS[bot.strategy_type] || BotIcon
  return (
    <div className="rounded-xl bg-bg-secondary border border-border-default p-5 hover:border-border-light transition-colors flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-bg-tertiary flex items-center justify-center">
          <Icon className="w-5 h-5 text-brand-green" />
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-bg-tertiary text-text-secondary">{STRATEGY_LABELS[bot.strategy_type]}</span>
      </div>
      <h3 className="font-semibold mb-1">{bot.name}</h3>
      <p className="text-sm text-text-secondary leading-relaxed mb-4 flex-1">{bot.description || 'No description provided.'}</p>
      {showControls && (
        <div className="flex items-center gap-2">
          <button
            onClick={onOpen}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-bg-tertiary border border-border-light text-sm font-medium hover:bg-bg-hover transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            Open
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-xl text-text-muted hover:text-brand-red hover:bg-brand-red/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-bg-secondary border border-border-light p-6 slide-in max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-lg">{title}</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
