import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { CITIES, merchantById, productById } from '../data/catalog'
import { useI18n } from '../lib/i18n'
import { useStore, orderStatus, STATUS_FLOW, type StatusId, type SubStatus, type Order } from '../lib/store'
import { ProductArt } from '../components/ProductArt'
import { GreetingCard } from '../components/GreetingCard'
import { Confetti } from '../components/Confetti'
import { LogoMark } from '../components/Logo'
import { I } from '../components/Icons'
import { variantText } from '../components/Layout'
import { Button, cx, Empty, PatternBg } from '../components/ui'
import { apiMode } from '../lib/api'
import { useLiveOrder } from '../lib/sync'

export const STATUS_LABEL: Record<SubStatus, { ar: string; en: string; d: { ar: string; en: string } }> = {
  rejected: { ar: 'اعتذر المتجر', en: 'Declined by store', d: { ar: 'سيُعاد مبلغ هذا الجزء', en: 'This part will be refunded' } },
  cancelled: { ar: 'ملغي', en: 'Cancelled', d: { ar: 'تم إلغاء الطلب', en: 'The order was cancelled' } },
  placed: { ar: 'تم استلام الطلب', en: 'Order placed', d: { ar: 'وصل طلبك للمتجر', en: 'Your order reached the merchant' } },
  accepted: { ar: 'قبِل المتجر الطلب', en: 'Accepted', d: { ar: 'المتجر أكد الطلب', en: 'The merchant confirmed it' } },
  preparing: { ar: 'قيد التجهيز', en: 'Preparing', d: { ar: 'نجهز الفرحة بعناية', en: 'Crafting it with care' } },
  ready: { ar: 'جاهز للتوصيل', en: 'Ready', d: { ar: 'مغلّف وجاهز', en: 'Wrapped and ready' } },
  out: { ar: 'في الطريق', en: 'Out for delivery', d: { ar: 'المندوب في طريقه', en: 'The courier is on the way' } },
  delivered: { ar: 'تم التوصيل', en: 'Delivered', d: { ar: 'وصلت الفرحة 🤍', en: 'Joy delivered 🤍' } },
}

function Route({ idx }: { idx: number }) {
  const pct = idx / (STATUS_FLOW.length - 1)
  return (
    <div className="relative h-40 overflow-hidden rounded-[28px] bg-green md:h-48">
      <svg viewBox="0 0 600 180" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden>
        <path id="route" d="M40 140 C 140 40 220 160 320 90 S 480 30 560 60" stroke="#F6EDE7" strokeOpacity=".25" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" fill="none" />
        <motion.path d="M40 140 C 140 40 220 160 320 90 S 480 30 560 60" stroke="#D4A373" strokeWidth="4" strokeLinecap="round" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: pct }} transition={{ duration: 1.4, ease: 'easeInOut' }} />
        <circle cx="40" cy="140" r="8" fill="#D4A373" />
        <g transform="translate(560 60)"><circle r="16" fill="#F6EDE7" /><path d="M0 -8 C1.2 -2.4 2.4 -1.2 8 0 C2.4 1.2 1.2 2.4 0 8 C-1.2 2.4 -2.4 1.2 -8 0 C-2.4 -1.2 -1.2 -2.4 0 -8Z" fill="#0F3D32" /></g>
      </svg>
      <motion.div className="absolute grid h-10 w-10 place-items-center rounded-full bg-gold text-green-950 shadow-glow" initial={false} animate={{ left: `calc(${6 + pct * 82}% - 20px)`, top: `${pct < 0.5 ? 70 - pct * 60 : 40 - (pct - 0.5) * 20}%` }} transition={{ duration: 1.4, ease: 'easeInOut' }}>
        <I.truck size={20} />
      </motion.div>
    </div>
  )
}

export function OrderPage() {
  const { id } = useParams()
  const loc = useLocation() as { state?: { fresh?: boolean } }
  const nav = useNavigate()
  const { tx, l, money, date, lang } = useI18n()
  const order = useStore((s) => s.orders.find((o) => o.id === id))
  const setMerchant = useStore((s) => s.setMerchantSession)
  const toast = useStore((s) => s.showToast)
  const [copied, setCopied] = useState(false)
  const role = useStore((s) => s.user?.role)
  useLiveOrder(order)
  if (!order) return <div className="py-16"><Empty title={tx('ما لقينا الطلب', 'Order not found')} sub={tx('تأكد من رقم الطلب.', 'Check the order number.')} action={<Button to="/track">{tx('تتبع طلب', 'Track an order')}</Button>} /></div>

  const status = orderStatus(order)
  const idx = STATUS_FLOW.indexOf(status as StatusId)
  const fresh = loc.state?.fresh
  // With the live API the shareable link carries the order's secret token.
  const surprisePath = `/surprise/${order.id}${order.publicToken ? `?t=${order.publicToken}` : ''}`
  const surpriseHash = `#${surprisePath}`
  const copy = async () => {
    const url = `${location.origin}${location.pathname}${surpriseHash}`
    try { await navigator.clipboard.writeText(url); setCopied(true); toast(tx('نُسخ الرابط', 'Link copied')) } catch { setCopied(true) }
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 pt-6 md:px-8 md:pt-10">
      {fresh && <Confetti />}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[36px] bg-cream p-6 md:p-10">
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            {fresh && <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-green px-3 py-1.5 text-[13px] text-cream-50"><I.check size={14} className="text-gold" />{tx('تم تأكيد طلبك (تجريبي)', 'Order confirmed (demo)')}</div>}
            <h1 className="font-display text-3xl font-semibold text-green md:text-5xl">{fresh ? tx(`شكراً ${order.sender.name}! الفرحة في الطريق`, `Thank you, ${order.sender.name}! Joy is on its way`) : tx('تتبع الطلب', 'Order tracking')}</h1>
            <p className="mt-2 text-ink/60">{tx('رقم الطلب', 'Order')} <span className="tabular font-semibold text-green" dir="ltr">{order.id}</span> · {tx('إلى', 'to')} {order.recipient.name} · {date(order.delivery.date)} <span dir="ltr">{order.delivery.slot}</span></p>
          </div>
          <div className="text-end">
            <div className="text-sm text-ink/50">{tx('الحالة الآن', 'Current status')}</div>
            <motion.div key={status} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="font-display text-2xl font-semibold text-green">{l(STATUS_LABEL[status])}</motion.div>
          </div>
        </div>
      </motion.div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <Route idx={idx} />
          <div className="rounded-[30px] bg-white p-5 shadow-soft md:p-7">
            <h2 className="mb-5 font-display text-xl font-semibold text-green">{tx('مراحل الطلب', 'Progress')}</h2>
            <ol className="relative space-y-5">
              {STATUS_FLOW.map((s, i) => {
                const at = Math.max(...Object.values(order.sub).map((x) => x.history.find((h) => h.status === s)?.at ?? 0))
                const done = i <= idx
                return (
                  <li key={s} className="relative flex gap-4">
                    {i < STATUS_FLOW.length - 1 && <span className={cx('absolute start-[15px] top-8 h-[calc(100%-4px)] w-0.5', i < idx ? 'bg-gold' : 'bg-green/10')} />}
                    <motion.span initial={false} animate={{ scale: i === idx ? [1, 1.15, 1] : 1 }} transition={{ repeat: i === idx && idx < 5 ? Infinity : 0, duration: 1.8 }} className={cx('relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full', done ? 'bg-green text-gold' : 'border-2 border-green/15 bg-white text-transparent')}>
                      <I.check size={15} />
                    </motion.span>
                    <div className="pt-1">
                      <div className={cx('font-medium', done ? 'text-green' : 'text-ink/40')}>{l(STATUS_LABEL[s])}</div>
                      <div className="text-[13px] text-ink/50">{done ? l(STATUS_LABEL[s].d) : ''}{done && at > 0 && <span className="tabular"> · {new Date(at).toLocaleTimeString(lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}</span>}</div>
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
          <div className="rounded-[30px] bg-white p-5 shadow-soft md:p-7">
            <h2 className="mb-1 font-display text-xl font-semibold text-green">{tx('حسب المتجر', 'By merchant')}</h2>
            <p className="mb-4 text-xs text-ink/50">{tx('كل متجر يحدّث حالته من لوحة التاجر، وتظهر هنا فوراً.', 'Each merchant updates status from the Merchant hub, reflected here instantly.')}</p>
            <ul className="space-y-3">
              {Object.entries(order.sub).map(([mid, s]) => (
                <li key={mid} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-cream-50 p-3">
                  <div className="flex items-center gap-2"><I.store size={18} className="text-gold-700" /><span className="font-medium text-green">{l(merchantById(mid).name)}</span></div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-white px-3 py-1 text-[13px] text-green">{l(STATUS_LABEL[s.status])}</span>
                    {(!apiMode || role === 'admin') && <button onClick={() => { setMerchant(mid); nav('/dashboard/merchant') }} className="text-[12px] text-cocoa underline-offset-2 hover:underline">{tx('افتح لوحة التاجر', 'Open merchant hub')}</button>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="space-y-6 lg:col-span-5">
          {order.surprise && (
            <div className="relative overflow-hidden rounded-[30px] bg-green p-6 text-cream-50 shadow-lift">
              <div className="relative">
                <div className="flex items-center gap-2 text-gold"><I.sparkle />{tx('المفاجأة الرقمية جاهزة', 'Digital surprise ready')}</div>
                <p className="mt-2 text-sm text-cream/75">{tx('أرسل الرابط للمستلم ليفتح الكرت والهدية بحركة كشف — أو جرّبها بنفسك.', 'Send this link to the recipient to unwrap the card and gift — or preview it yourself.')}</p>
                <div className="mt-4 flex items-center gap-2 rounded-2xl bg-cream-50/10 p-2 ps-4 text-sm"><span className="flex-1 truncate font-mono text-cream/80" dir="ltr">…{surpriseHash}</span><button onClick={copy} className="flex items-center gap-1 rounded-xl bg-cream-50/15 px-3 py-2 hover:bg-cream-50/25">{copied ? <I.check size={15} /> : <I.copy size={15} />}{copied ? tx('تم', 'Copied') : tx('نسخ', 'Copy')}</button></div>
                <Button variant="gold" className="mt-4 w-full" to={surprisePath}><I.gift size={18} />{tx('معاينة المفاجأة', 'Preview the surprise')}</Button>
              </div>
            </div>
          )}
          <div className="rounded-[30px] bg-white p-5 shadow-soft">
            <h2 className="mb-4 font-display text-lg font-semibold text-green">{tx('محتوى الطلب', 'Items')}</h2>
            <ul className="space-y-3">
              {order.lines.map((ln) => {
                const p = productById(ln.productId)!
                return (
                  <li key={ln.key} className="flex items-center gap-3">
                    <Link to={`/product/${p.id}`} className="h-14 w-12 shrink-0 overflow-hidden rounded-xl"><ProductArt art={p.art} className="h-full w-full" /></Link>
                    <div className="min-w-0 flex-1"><div className="truncate text-sm text-green">{l(p.name)} {ln.qty > 1 && <span className="text-ink/50">×{ln.qty}</span>}</div><div className="truncate text-[11px] text-ink/50">{l(merchantById(ln.merchant).name)}{variantText(p, ln.variant, l) ? ` · ${variantText(p, ln.variant, l)}` : ''}</div></div>
                    <span className="tabular text-sm">{money(ln.unit * ln.qty)}</span>
                  </li>
                )
              })}
            </ul>
            <div className="mt-4 space-y-1 border-t border-green/10 pt-3 text-sm">
              <div className="flex justify-between text-ink/60"><span>{tx('التوصيل', 'Delivery')}</span><span className="tabular">{money(order.totals.delivery)}</span></div>
              {order.totals.discount > 0 && <div className="flex justify-between text-green"><span>{tx('الخصم', 'Discount')}</span><span className="tabular">−{money(order.totals.discount)}</span></div>}
              <div className="flex justify-between font-semibold text-green"><span>{tx('الإجمالي', 'Total')}</span><span className="tabular">{money(order.totals.total)}</span></div>
            </div>
            <p className="mt-3 text-xs text-ink/50"><I.pin size={13} className="me-1 inline" />{l(CITIES.find((c) => c.id === order.recipient.city)!.name)}، {order.recipient.district}</p>
          </div>
          <div className="max-w-[320px]"><GreetingCard design={order.card.design} message={order.card.message} from={order.card.from} to={order.recipient.name} lang={lang} /></div>
        </aside>
      </div>
    </div>
  )
}

export function TrackLookup() {
  const { tx, l, money, date } = useI18n()
  const orders = useStore((s) => s.orders)
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [err, setErr] = useState(false)
  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 md:px-8">
      <div className="text-center">
        <LogoMark className="mx-auto h-14 w-14" />
        <h1 className="mt-4 font-display text-4xl font-semibold text-green">{tx('تتبع طلبك', 'Track your order')}</h1>
        <p className="mt-2 text-ink/60">{tx('اكتب رقم الطلب مثل LM-24852', 'Enter an order number like LM-24852')}</p>
      </div>
      <form className="mt-8 flex gap-2" onSubmit={(e) => { e.preventDefault(); const id = q.trim().toUpperCase(); if (orders.some((o) => o.id === id)) nav(`/order/${id}`); else setErr(true) }}>
        <label htmlFor="trackid" className="sr-only">{tx('رقم الطلب', 'Order number')}</label>
        <input id="trackid" dir="ltr" value={q} onChange={(e) => { setQ(e.target.value); setErr(false) }} placeholder="LM-XXXXX" className="h-14 min-w-0 flex-1 rounded-full border border-green/15 bg-white px-6 text-lg text-green outline-none focus:border-gold" />
        <Button size="lg" type="submit">{tx('تتبع', 'Track')}</Button>
      </form>
      {err && <p className="mt-2 text-center text-sm text-blush-700">{tx('ما لقينا طلب بهذا الرقم.', 'No order found with that number.')}</p>}
      <h2 className="mb-3 mt-12 eyebrow text-cocoa">{tx('طلبات العرض الأخيرة', 'Recent demo orders')}</h2>
      <ul className="space-y-3">
        {orders.slice(0, 8).map((o: Order) => {
          const s = orderStatus(o)
          return (
            <li key={o.id}>
              <Link to={`/order/${o.id}`} className="flex items-center gap-4 rounded-3xl bg-white p-3 shadow-soft hover:shadow-lift">
                <div className="flex -space-x-3 rtl:space-x-reverse">{o.lines.slice(0, 3).map((ln) => <div key={ln.key} className="h-14 w-12 overflow-hidden rounded-xl ring-2 ring-white"><ProductArt art={productById(ln.productId)!.art} className="h-full w-full" /></div>)}</div>
                <div className="min-w-0 flex-1"><div className="tabular font-medium text-green" dir="ltr">{o.id}</div><div className="truncate text-xs text-ink/50">{o.recipient.name} · {date(o.createdAt)} · {money(o.totals.total)}</div></div>
                <span className={cx('rounded-full px-3 py-1 text-[12px]', s === 'delivered' ? 'bg-green/10 text-green' : 'bg-gold/20 text-cocoa')}>{l(STATUS_LABEL[s])}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
