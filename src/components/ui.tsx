import { motion, useMotionValue, useSpring, useReducedMotion, useInView } from 'framer-motion'
import { forwardRef, useEffect, useId, useRef, useState, type ReactNode, type ButtonHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'
import { I } from './Icons'
import type { OccasionId } from '../data/catalog'
import { useI18n } from '../lib/i18n'

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ')

/* ---------- Buttons ---------- */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'gold' | 'ghost' | 'outline' | 'cream' | 'blush'; size?: 'sm' | 'md' | 'lg'; to?: string }
const variants = {
  primary: 'bg-green text-cream-50 hover:bg-green-700 shadow-[0_10px_30px_-12px_rgba(15,61,50,.55)]',
  gold: 'bg-gold text-green-950 hover:bg-gold-300 shadow-glow',
  ghost: 'text-green hover:bg-green/5',
  outline: 'border border-green/20 text-green hover:border-green/50 hover:bg-white/60',
  cream: 'bg-cream-50 text-green hover:bg-white',
  blush: 'bg-blush-100 text-blush-700 hover:bg-blush-300/50',
}
const sizes = { sm: 'h-9 px-4 text-sm gap-1.5', md: 'h-11 px-6 text-[15px] gap-2', lg: 'h-14 px-8 text-base gap-2.5' }

export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button({ variant = 'primary', size = 'md', className, to, children, ...rest }, ref) {
  const cls = cx('inline-flex items-center justify-center rounded-full font-medium transition-all duration-300 active:scale-[.97] disabled:opacity-40 disabled:pointer-events-none select-none whitespace-nowrap', variants[variant], sizes[size], className)
  if (to) return <Link to={to} className={cls}>{children}</Link>
  return <button ref={ref} className={cls} {...rest}>{children}</button>
})

/** Magnetic hover — the child gently follows the pointer. */
export function Magnetic({ children, strength = 0.3, className }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const x = useSpring(useMotionValue(0), { stiffness: 200, damping: 15 })
  const y = useSpring(useMotionValue(0), { stiffness: 200, damping: 15 })
  return (
    <motion.div
      ref={ref}
      className={cx('inline-block', className)}
      style={{ x, y }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== 'mouse' || !ref.current) return
        const r = ref.current.getBoundingClientRect()
        x.set((e.clientX - r.left - r.width / 2) * strength)
        y.set((e.clientY - r.top - r.height / 2) * strength)
      }}
      onPointerLeave={() => { x.set(0); y.set(0) }}
    >
      {children}
    </motion.div>
  )
}

/* ---------- Reveal on scroll ---------- */
/** Fades in when scrolled into view; falls back to visible after a moment so nothing stays hidden. */
export function useRevealed(amount = 0.12) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount })
  const [forced, setForced] = useState(false)
  useEffect(() => { const t = setTimeout(() => setForced(true), 2200); return () => clearTimeout(t) }, [])
  return [ref, inView || forced] as const
}
export function Reveal({ children, delay = 0, className, y = 28 }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  const [ref, shown] = useRevealed()
  return (
    <motion.div ref={ref} className={className} initial={{ opacity: 0, y }} animate={shown ? { opacity: 1, y: 0 } : undefined} transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  )
}

/** Generic motion wrapper: animates from `from` to `to` once in view (with the same fallback). */
export function Appear({ from, to, transition, className, children }: { from: Record<string, number>; to: Record<string, number>; transition?: object; className?: string; children: ReactNode }) {
  const [ref, shown] = useRevealed(0.05)
  return <motion.div ref={ref} className={className} initial={from} animate={shown ? to : undefined} transition={transition}>{children}</motion.div>
}

export function SectionHead({ eyebrow, title, sub, action, num }: { eyebrow?: string; title: ReactNode; sub?: ReactNode; action?: ReactNode; num?: string }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 md:mb-12">
      <div className="max-w-2xl">
        {eyebrow && (
          <div className="mb-3 flex items-center gap-3 text-cocoa">
            {num && <span className="font-serif text-3xl font-light leading-none text-green/70">{num}</span>}
            {num && <span className="h-6 w-px bg-green/20" />}
            <span className="eyebrow">{eyebrow}</span>
          </div>
        )}
        <h2 className="font-display text-[28px] font-semibold leading-[1.15] text-green md:text-[44px]">{title}</h2>
        {sub && <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink/65 md:text-base">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1 text-[13px] text-ink/70', className)}>
      <I.star size={14} className="fill-gold stroke-gold" />
      <span className="tabular font-medium">{value.toFixed(1)}</span>
    </span>
  )
}

export function DemoTag({ className }: { className?: string }) {
  const { tx } = useI18n()
  return <span className={cx('inline-flex items-center gap-1 rounded-full border border-cocoa/25 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-cocoa', className)}>{tx('تجريبي', 'Demo')}</span>
}

export function Chip({ active, children, onClick, className }: { active?: boolean; children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cx('inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm transition-all', active ? 'border-green bg-green text-cream-50' : 'border-green/15 bg-white/60 text-green hover:border-green/40', className)}
    >
      {children}
    </button>
  )
}

export function QtyStepper({ value, onChange, small }: { value: number; onChange: (n: number) => void; small?: boolean }) {
  const { tx } = useI18n()
  return (
    <div className={cx('inline-flex items-center rounded-full border border-green/15 bg-white', small ? 'h-8' : 'h-11')}>
      <button aria-label={tx('إنقاص', 'Decrease')} className={cx('grid place-items-center text-green hover:text-gold-700', small ? 'w-8' : 'w-11')} onClick={() => onChange(value - 1)}><I.minus size={small ? 14 : 16} /></button>
      <span className={cx('tabular text-center font-medium text-green', small ? 'w-5 text-sm' : 'w-6')}>{value}</span>
      <button aria-label={tx('زيادة', 'Increase')} className={cx('grid place-items-center text-green hover:text-gold-700', small ? 'w-8' : 'w-11')} onClick={() => onChange(value + 1)}><I.plus size={small ? 14 : 16} /></button>
    </div>
  )
}

/* ---------- Brand patterns (extensions of the logo's petals, star and dots) ---------- */
export function PatternTile({ id, scale = 1, tone = 'full', opacity = 1 }: { id: string; scale?: number; tone?: 'full' | 'subtle' | 'mono'; opacity?: number }) {
  const g = tone === 'mono' ? '#F6EDE7' : '#0F3D32'
  const p = tone === 'mono' ? '#D4A373' : '#E89B9A'
  const s = 120 * scale
  if (tone === 'subtle')
    return (
      <pattern id={id} width={s} height={s} patternUnits="userSpaceOnUse" patternTransform={`scale(${scale})`}>
        <g transform="translate(60 60)" opacity={opacity}>
          <path d="M0 -9 C1.4 -2.8 2.8 -1.4 9 0 C2.8 1.4 1.4 2.8 0 9 C-1.4 2.8 -2.8 1.4 -9 0 C-2.8 -1.4 -1.4 -2.8 0 -9Z" fill="#0F3D32" />
          {[0, 90, 180, 270].map((a) => <ellipse key={a} transform={`rotate(${a + 45}) translate(0 -14)`} rx="4" ry="6" fill={a % 180 ? '#0F3D32' : '#D4A373'} />)}
          {[0, 90, 180, 270].map((a) => <circle key={a} transform={`rotate(${a}) translate(0 -22)`} r="2.6" fill={a % 180 ? '#D4A373' : '#0F3D32'} />)}
        </g>
        <circle cx="0" cy="0" r="2.4" fill="#D4A373" opacity={opacity * 0.8} />
        <circle cx="120" cy="0" r="2.4" fill="#D4A373" opacity={opacity * 0.8} />
        <circle cx="0" cy="120" r="2.4" fill="#D4A373" opacity={opacity * 0.8} />
        <circle cx="120" cy="120" r="2.4" fill="#D4A373" opacity={opacity * 0.8} />
      </pattern>
    )
  return (
    <pattern id={id} width={120} height={120} patternUnits="userSpaceOnUse" patternTransform={`scale(${scale})`}>
      <g opacity={opacity}>
        <path d="M60 30 C 63 50 70 57 90 60 C 70 63 63 70 60 90 C 57 70 50 63 30 60 C 50 57 57 50 60 30Z" fill={g} />
        {[[0, 0, 45, p], [120, 0, 135, g], [120, 120, 225, p], [0, 120, 315, g]].map(([x, y, r, c], i) => (
          <path key={i} transform={`translate(${x} ${y}) rotate(${r})`} d="M0 8 C 12 8 22 18 22 30 C 22 42 12 48 0 48 C -12 48 -22 42 -22 30 C -22 18 -12 8 0 8Z" fill={c as string} />
        ))}
        {[[60, 4], [116, 60], [60, 116], [4, 60]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="8" fill={i % 2 ? p : g} />)}
      </g>
    </pattern>
  )
}

export function PatternBg({ tone = 'full', scale = 1, opacity = 1, className, drift = false }: { tone?: 'full' | 'subtle' | 'mono'; scale?: number; opacity?: number; className?: string; drift?: boolean }) {
  const id = 'pt' + useId().replace(/:/g, '')
  const reduce = useReducedMotion()
  return (
    <div className={cx('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
      <motion.svg
        className="absolute -inset-[120px] h-[calc(100%+240px)] w-[calc(100%+240px)]"
        animate={drift && !reduce ? { x: [0, -120 * scale], y: [0, -120 * scale] } : undefined}
        transition={drift ? { duration: 40, repeat: Infinity, ease: 'linear' } : undefined}
      >
        <defs><PatternTile id={id} tone={tone} scale={scale} opacity={opacity} /></defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </motion.svg>
    </div>
  )
}

/** Accent border strip — petals, dots and stars (pattern 03). */
export function BorderStrip({ className, mono }: { className?: string; mono?: boolean }) {
  const id = 'bs' + useId().replace(/:/g, '')
  const g = mono ? '#D4A373' : '#0F3D32', p = mono ? '#F6EDE7' : '#E89B9A'
  return (
    <svg className={cx('block h-6 w-full', className)} aria-hidden>
      <defs>
        <pattern id={id} width="64" height="24" patternUnits="userSpaceOnUse">
          <path d="M16 4 C17 10 19 11 25 12 C19 13 17 14 16 20 C15 14 13 13 7 12 C13 11 15 10 16 4Z" fill={g} />
          <circle cx="40" cy="12" r="4" fill={p} />
          <circle cx="56" cy="12" r="2" fill={g} opacity=".5" />
        </pattern>
      </defs>
      <rect width="100%" height="24" fill={`url(#${id})`} />
    </svg>
  )
}

/* ---------- Occasion glyphs (duotone) ---------- */
export function OccasionGlyph({ id, className = 'h-10 w-10' }: { id: OccasionId; className?: string }) {
  const g = '#0F3D32', gold = '#D4A373', b = '#E89B9A'
  const c: Record<OccasionId, ReactNode> = {
    birthday: <><rect x="10" y="26" width="28" height="14" rx="3" fill={b} /><rect x="13" y="19" width="22" height="8" rx="2" fill={g} /><path d="M24 10v8" stroke={g} strokeWidth="2" /><path d="M24 5c2 3 2 5 0 6-2-1-2-3 0-6Z" fill={gold} /></>,
    wedding: <><circle cx="19" cy="28" r="9" fill="none" stroke={gold} strokeWidth="3" /><circle cx="29" cy="28" r="9" fill="none" stroke={g} strokeWidth="3" /><path d="M24 10l3 4-3 3-3-3Z" fill={b} /></>,
    engagement: <><circle cx="24" cy="29" r="10" fill="none" stroke={gold} strokeWidth="3" /><path d="M18 12h12l-6 8Z" fill={b} /><path d="M18 12l6 8 6-8" fill="none" stroke={g} strokeWidth="1.5" /></>,
    graduation: <><path d="M6 20 24 12l18 8-18 8Z" fill={g} /><path d="M14 24v8c4 4 16 4 20 0v-8l-10 4Z" fill={g} opacity=".75" /><path d="M40 21v10" stroke={gold} strokeWidth="2" /><circle cx="40" cy="33" r="2.5" fill={gold} /></>,
    newborn: <><circle cx="24" cy="22" r="11" fill={b} /><circle cx="20" cy="21" r="1.5" fill={g} /><circle cx="28" cy="21" r="1.5" fill={g} /><path d="M20 26c2 2 6 2 8 0" stroke={g} strokeWidth="1.5" fill="none" /><path d="M16 38h16" stroke={gold} strokeWidth="3" strokeLinecap="round" /></>,
    eid: <><path d="M30 8a14 14 0 1 0 8 25A12 12 0 0 1 30 8Z" fill={g} /><path d="M33 16l1.2 2.6 2.8.4-2 2 .5 2.8-2.5-1.4-2.5 1.4.5-2.8-2-2 2.8-.4Z" fill={gold} /></>,
    ramadan: <><path d="M24 6v4" stroke={g} strokeWidth="2" /><path d="M18 10h12l3 6H15Z" fill={gold} /><path d="M15 16h18l-2 18H17Z" fill={g} /><path d="M24 20c2 3 2 6 0 8-2-2-2-5 0-8Z" fill={gold} /><path d="M17 34h14l-2 4H19Z" fill={gold} /></>,
    anniversary: <><path d="M24 38S9 29 9 19a7.5 7.5 0 0 1 15-2 7.5 7.5 0 0 1 15 2c0 10-15 19-15 19Z" fill={b} /><path d="M24 16c.8 4 2 5 6 6-4 1-5.2 2-6 6-.8-4-2-5-6-6 4-1 5.2-2 6-6Z" fill={g} /></>,
    promotion: <><path d="M15 8h18v8a9 9 0 0 1-18 0Z" fill={gold} /><path d="M15 11H9c0 5 3 7 6 7M33 11h6c0 5-3 7-6 7" stroke={gold} strokeWidth="2" fill="none" /><path d="M21 25h6v6h-6zM16 31h16v5H16z" fill={g} /></>,
    getwell: <><path d="M24 40S8 30 8 19a8 8 0 0 1 16-3 8 8 0 0 1 16 3c0 11-16 21-16 21Z" fill={g} /><path d="M24 17v12M18 23h12" stroke={gold} strokeWidth="3" strokeLinecap="round" /></>,
    newhome: <><path d="M8 22 24 9l16 13v17H8Z" fill={g} /><rect x="20" y="27" width="8" height="12" rx="4" fill={gold} /><circle cx="24" cy="19" r="2.5" fill={b} /></>,
    thanks: <><path d="M10 26c0-4 3-6 6-6h6l6-6c2-2 5 1 3 3l-3 4h7c3 0 3 4 0 4h-2c2 0 2 4 0 4h-2c2 0 2 4-1 4H18c-5 0-8-3-8-7Z" fill={b} /><circle cx="36" cy="12" r="3" fill={gold} /></>,
    national: <><path d="M24 6c-2 6-2 10 0 14 2-4 2-8 0-14Z" fill={g} /><path d="M24 20c-5-5-11-5-15-2 5 0 10 1 15 2Zm0 0c5-5 11-5 15-2-5 0-10 1-15 2Z" fill={g} /><path d="M24 20v18" stroke={cssCocoa} strokeWidth="3" /><path d="M10 40c6-4 10-4 14-2s8 2 14-2" stroke={gold} strokeWidth="2.5" fill="none" strokeLinecap="round" /></>,
  }
  return <svg viewBox="0 0 48 48" className={className} aria-hidden>{c[id]}</svg>
}
const cssCocoa = '#8C5E3C'

export function Empty({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="relative mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-16 text-center">
      <svg viewBox="0 0 120 120" className="h-24 w-24" aria-hidden>
        <circle cx="60" cy="60" r="56" fill="#F6EDE7" />
        <path d="M60 32c2 14 6 18 20 20-14 2-18 6-20 20-2-14-6-18-20-20 14-2 18-6 20-20Z" fill="#0F3D32" />
        <circle cx="60" cy="18" r="6" fill="#E89B9A" /><circle cx="60" cy="102" r="6" fill="#E89B9A" />
      </svg>
      <h3 className="font-display text-xl font-semibold text-green">{title}</h3>
      {sub && <p className="text-sm text-ink/60">{sub}</p>}
      {action}
    </div>
  )
}
