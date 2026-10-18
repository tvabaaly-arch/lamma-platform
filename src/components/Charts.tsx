import { useState } from 'react'
import { motion } from 'framer-motion'
import { cx } from './ui'

/** Single-series area chart with crosshair + tooltip. */
export function AreaChart({ data, format, label, height = 220 }: { data: { x: string; y: number }[]; format: (n: number) => string; label: string; height?: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 640, H = height, pl = 8, pr = 8, pt = 16, pb = 28
  const max = Math.max(1, ...data.map((d) => d.y)) * 1.15
  const step = (W - pl - pr) / Math.max(1, data.length - 1)
  const px = (i: number) => pl + i * step
  const py = (v: number) => pt + (H - pt - pb) * (1 - v / max)
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${px(i)} ${py(d.y)}`).join(' ')
  const area = `${line} L${px(data.length - 1)} ${H - pb} L${px(0)} ${H - pb} Z`
  const ticks = [0.25, 0.5, 0.75, 1].map((f) => max * f / 1.15)
  const last = data.length - 1
  return (
    <div className="relative" dir="ltr">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={label}
        onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); const x = ((e.clientX - r.left) / r.width) * W; setHover(Math.max(0, Math.min(last, Math.round((x - pl) / step)))) }}
        onPointerLeave={() => setHover(null)}>
        <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0F3D32" stopOpacity=".22" /><stop offset="1" stopColor="#0F3D32" stopOpacity="0" /></linearGradient></defs>
        {ticks.map((t, i) => <line key={i} x1={pl} x2={W - pr} y1={py(t)} y2={py(t)} stroke="#0F3D32" strokeOpacity=".07" />)}
        <line x1={pl} x2={W - pr} y1={H - pb} y2={H - pb} stroke="#0F3D32" strokeOpacity=".2" />
        <motion.path d={area} fill="url(#ag)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} />
        <motion.path d={line} fill="none" stroke="#0F3D32" strokeWidth="2" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2 }} />
        <circle cx={px(last)} cy={py(data[last].y)} r="5" fill="#D4A373" stroke="#fff" strokeWidth="2" />
        {data.map((d, i) => (i % Math.ceil(data.length / 7) === 0 || i === last) && <text key={i} x={px(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === last ? 'end' : 'middle'} fontSize="11" fill="#17302A" fillOpacity=".5">{d.x}</text>)}
        {hover !== null && (
          <g>
            <line x1={px(hover)} x2={px(hover)} y1={pt} y2={H - pb} stroke="#0F3D32" strokeOpacity=".3" strokeDasharray="3 3" />
            <circle cx={px(hover)} cy={py(data[hover].y)} r="5" fill="#0F3D32" stroke="#fff" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute top-0 rounded-xl bg-green px-3 py-1.5 text-xs text-cream-50 shadow-lift" style={{ left: `${(px(hover) / W) * 100}%`, transform: `translateX(${hover > last / 2 ? '-105%' : '5%'})` }}>
          <div className="opacity-70">{data[hover].x}</div><div className="tabular font-semibold">{format(data[hover].y)}</div>
        </div>
      )}
    </div>
  )
}

/** Sorted horizontal bars, one hue, value labels in text ink. */
export function BarList({ data, format }: { data: { label: string; value: number; sub?: string }[]; format: (n: number) => string }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <ul className="space-y-3">
      {data.map((d, i) => (
        <li key={d.label} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} className="group">
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-ink/80">{d.label}{d.sub && <span className="ms-2 text-xs text-ink/45">{d.sub}</span>}</span>
            <span className="tabular shrink-0 font-medium text-ink">{format(d.value)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-green/[.06]">
            <motion.div className={cx('h-full rounded-full transition-colors', hover === i ? 'bg-gold' : 'bg-green')} initial={{ width: 0 }} animate={{ width: `${(d.value / max) * 100}%` }} transition={{ duration: 0.8, delay: i * 0.05 }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function Kpi({ label, value, delta, hint }: { label: string; value: string; delta?: number; hint?: string }) {
  return (
    <div className="rounded-[26px] bg-white p-5 shadow-soft">
      <div className="text-[13px] text-ink/55">{label}</div>
      <div className="tabular mt-2 font-display text-2xl font-semibold text-green md:text-[28px]">{value}</div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {delta !== undefined && <span className={cx('tabular rounded-full px-2 py-0.5', delta >= 0 ? 'bg-green/10 text-green' : 'bg-blush-100 text-blush-700')}>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%</span>}
        {hint && <span className="text-ink/45">{hint}</span>}
      </div>
    </div>
  )
}
