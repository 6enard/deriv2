import {
  MessageCircle,
  Send,
  Phone,
  Mail,
  TriangleAlert,
} from 'lucide-react'
import RiskDisclaimer from './RiskDisclaimer'

const contacts = [
  {
    label: 'WhatsApp',
    href: 'https://chat.whatsapp.com/JO4DEAgjFW15ky7h01pZ41?mode=gi_t',
    icon: MessageCircle,
    color: 'text-[#25D366]',
    value: 'Join our community',
  },
  {
    label: 'Telegram',
    href: 'https://t.me/deritraderslounge',
    icon: Send,
    color: 'text-[#0088cc]',
    value: '@deritraderslounge',
  },
  {
    label: 'Call / Text',
    href: 'tel:+254180557929',
    icon: Phone,
    color: 'text-brand-green',
    value: '+254 18 0557929',
  },
  {
    label: 'Email',
    href: 'mailto:odongofx@gmail.com',
    icon: Mail,
    color: 'text-brand-blue',
    value: 'odongofx@gmail.com',
  },
]

export default function Footer() {
  return (
    <footer className="border-t border-border-default bg-bg-secondary/50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {contacts.map((item) => {
            const Icon = item.icon
            return (
              <a
                key={item.label}
                href={item.href}
                target={item.href.startsWith('http') ? '_blank' : undefined}
                rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="flex items-center gap-3 p-3 rounded-xl border border-border-light bg-bg-tertiary/50 hover:border-brand-red/40 hover:bg-bg-tertiary transition-colors group"
              >
                <div className={`w-10 h-10 rounded-lg bg-bg-tertiary flex items-center justify-center shrink-0 ${item.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-text-primary">{item.label}</p>
                  <p className="text-xs text-text-secondary truncate group-hover:text-text-primary transition-colors">
                    {item.value}
                  </p>
                </div>
              </a>
            )
          })}
        </div>

        <RiskDisclaimer compact />

        <div className="flex items-start gap-2.5">
          <TriangleAlert className="w-3.5 h-3.5 text-brand-amber shrink-0 mt-0.5" />
          <p className="text-[11px] text-text-muted leading-relaxed">
            Trading derivatives and synthetic instruments may carry a high level of risk to your capital. DeriTraders is an independent third-party platform powered by the Deriv API and is not affiliated with, endorsed by, or sponsored by Deriv.
          </p>
        </div>

        <div className="pt-4 border-t border-border-default text-center">
          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} DeriTraders. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
