import { motion } from 'framer-motion'
import { LogoMark } from './Logo'
import { PatternBg, cx } from './ui'

export const CARD_DESIGNS = [
  { id: 0, ar: 'أخضر لمّة', en: 'Lamma green', bg: 'bg-green', fg: 'text-cream-50', accent: 'text-gold' },
  { id: 1, ar: 'بتلات وردية', en: 'Blush petals', bg: 'bg-blush-100', fg: 'text-green', accent: 'text-blush-700' },
  { id: 2, ar: 'كريمي وذهبي', en: 'Cream & gold', bg: 'bg-cream-50', fg: 'text-green', accent: 'text-gold-700' },
  { id: 3, ar: 'كرافت دافئ', en: 'Warm kraft', bg: 'bg-[#E9D6C2]', fg: 'text-cocoa-700', accent: 'text-cocoa' },
]

export function GreetingCard({ design, message, from, to, className, lang }: { design: number; message: string; from: string; to?: string; className?: string; lang: 'ar' | 'en' }) {
  const d = CARD_DESIGNS[design] ?? CARD_DESIGNS[0]
  return (
    <motion.div layout className={cx('relative flex aspect-[4/5] flex-col overflow-hidden rounded-[28px] p-7 shadow-lift', d.bg, d.fg, className)} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {design === 0 && <PatternBg tone="mono" opacity={0.1} />}
      {design === 1 && <PatternBg tone="subtle" opacity={0.4} />}
      {design === 2 && <div className="absolute inset-3 rounded-[22px] border border-gold/60" />}
      {design === 3 && <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent 0 6px, rgba(140,94,60,.08) 6px 7px)' }} />}
      <div className="relative flex items-center justify-between">
        <LogoMark className="h-9 w-9" />
        <span className={cx('font-serif text-sm italic', d.accent)}>{lang === 'ar' ? 'بكل حب' : 'with love'}</span>
      </div>
      <div className="relative mt-auto">
        {to && <p className={cx('mb-2 text-sm', d.accent)}>{lang === 'ar' ? `إلى ${to}` : `To ${to}`}</p>}
        <p className="font-display text-[clamp(16px,2.2vw,22px)] leading-relaxed">{message || (lang === 'ar' ? 'اكتب رسالتك هنا…' : 'Write your message here…')}</p>
        <p className={cx('mt-4 text-sm', d.accent)}>— {from || (lang === 'ar' ? 'اسمك' : 'Your name')}</p>
      </div>
    </motion.div>
  )
}
