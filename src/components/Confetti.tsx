import { motion, useReducedMotion } from 'framer-motion'
import { useMemo } from 'react'

/** Brand confetti: petals, stars and dots in the Lamma palette. */
export function Confetti({ count = 40, className = 'fixed inset-0 z-[90]' }: { count?: number; className?: string }) {
  const reduce = useReducedMotion()
  const bits = useMemo(() => Array.from({ length: count }).map((_, i) => ({
    x: Math.random() * 100, d: 2.4 + Math.random() * 2.2, delay: Math.random() * 0.8, r: Math.random() * 720 - 360,
    s: 8 + Math.random() * 12, kind: i % 3, c: ['#0F3D32', '#D4A373', '#E89B9A', '#8C5E3C'][i % 4], drift: Math.random() * 30 - 15,
  })), [count])
  if (reduce) return null
  return (
    <div className={`pointer-events-none overflow-hidden ${className}`} aria-hidden>
      {bits.map((b, i) => (
        <motion.svg key={i} viewBox="-10 -10 20 20" width={b.s} height={b.s} className="absolute -top-6" style={{ left: `${b.x}%` }}
          initial={{ y: -40, rotate: 0, opacity: 1 }} animate={{ y: '110vh', x: b.drift * 4, rotate: b.r, opacity: [1, 1, 0.8, 0] }} transition={{ duration: b.d, delay: b.delay, ease: 'easeIn' }}>
          {b.kind === 0 && <path d="M0 -10 C1.5 -3 3 -1.5 10 0 C3 1.5 1.5 3 0 10 C-1.5 3 -3 1.5 -10 0 C-3 -1.5 -1.5 -3 0 -10Z" fill={b.c} />}
          {b.kind === 1 && <path d="M0 -9 C 6 -9 9 -3 9 2 C 9 7 5 9 0 9 C -5 9 -9 7 -9 2 C -9 -3 -6 -9 0 -9Z" fill={b.c} />}
          {b.kind === 2 && <circle r="6" fill={b.c} />}
        </motion.svg>
      ))}
    </div>
  )
}
