import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIES, CITIES, MERCHANTS, PRODUCTS, merchantById, productById } from '../data/catalog'
import { useI18n } from '../lib/i18n'
import { useStore, STATUS_FLOW, basePrice, stockOf, type StatusId } from '../lib/store'
import { ProductArt } from '../components/ProductArt'
import { MerchantMonogram, variantText } from '../components/Layout'
import { AreaChart, BarList, Kpi } from '../components/Charts'
import { I } from '../components/Icons'
import { Button, cx, DemoTag } from '../components/ui'
import { STATUS_LABEL } from './Order'

const NEXT_ACTION: Partial<Record<StatusId, { ar: string; en: string }>> = {
  placed: { ar: 'قبول الطلب', en: 'Accept order' },
  accepted: { ar: 'بدء التجهيز', en: 'Start preparing' },
  preparing: { ar: 'جاهز للتوصيل', en: 'Mark ready' },
  ready: { ar: 'تسليم للمندوب', en: 'Hand to courier' },
  out: { ar: 'تأكيد التوصيل', en: 'Confirm delivered' },
}
export const STATUS_TONE: Record<StatusId, string> = {
  placed: 'bg-blush-100 text-blush-700', accepted: 'bg-gold/20 text-cocoa', preparing: 'bg-gold/30 text-cocoa',
  ready: 'bg-green/10 text-green', out: 'bg-green/15 text-green', delivered: 'bg-green text-cream-50',
}

/** Deterministic synthetic history so charts look alive (labelled as demo). */
export function syntheticSeries(seed: number, days: number, base: number) {
  return Array.from({ length: days }).map((_, i) => Math.round(base * (0.75 + 0.35 * Math.sin((i + seed) * 0.9) + 0.25 * Math.cos((i * seed) % 7) + i * 0.012)))
}

export default function MerchantDash() {
  const { tx, l, money, date, num } = useI18n()
  const { merchantSession, setMerchantSession, orders, advance, overrides, setOverride, showToast } = useStore()
  const m = merchantById(merchantSession)
  const [tab, setTab] = useState<'overview' | 'orders' | 'products' | 'analytics'>('overview')
  const [filter, setFilter] = useState<'active' | 'all' | 'delivered'>('active')
  const products = PRODUCTS.filter((p) => p.merchant === m.id)
  const myOrders = orders.filter((o) => o.sub[m.id])
  const lines = (o: (typeof orders)[0]) => o.lines.filter((ln) => ln.merchant === m.id)
  const orderRev = (o: (typeof orders)[0]) => lines(o).reduce((a, ln) => a + ln.unit * ln.qty, 0)
  const realRev = myOrders.reduce((a, o) => a + orderRev(o), 0)
  const series = useMemo(() => {
    const s = syntheticSeries(m.hue + m.id.length, 14, 1400 + m.reviews)
    const days = Array.from({ length: 14 }).map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 13 + i); return d })
    myOrders.forEach((o) => { const idx = 13 - Math.floor((Date.now() - o.createdAt) / 86400e3); if (idx >= 0 && idx < 14) s[idx] += orderRev(o) })
    return days.map((d, i) => ({ x: date(d, { day: 'numeric', month: 'short' }), y: s[i] }))
  }, [m.id, orders.length, date])
  const rev14 = series.reduce((a, d) => a + d.y, 0)
  const commission = Math.round(rev14 * m.commission)
  const pending = myOrders.filter((o) => o.sub[m.id].status !== 'delivered')
  const lowStock = products.filter((p) => stockOf(p, overrides) <= 5)
  const shown = myOrders.filter((o) => filter === 'all' || (filter === 'active' ? o.sub[m.id].status !== 'delivered' : o.sub[m.id].status === 'delivered'))

  const act = (oid: string) => {
    advance(oid, m.id)
    showToast(tx('تم تحديث الحالة — تظهر للعميل فوراً', 'Status updated — customer sees it instantly'))
  }

  const nav = [
    ['overview', I.home, tx('نظرة عامة', 'Overview')],
    ['orders', I.box, tx('الطلبات', 'Orders')],
    ['products', I.grid, tx('المنتجات والمخزون', 'Products & stock')],
    ['analytics', I.chart, tx('التحليلات', 'Analytics')],
  ] as const

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-6 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <MerchantMonogram m={m} />
          <div>
            <div className="flex items-center gap-2 text-[13px] text-ink/50">{tx('لوحة التاجر', 'Merchant hub')}<DemoTag /></div>
            <h1 className="font-display text-2xl font-semibold text-green md:text-3xl">{l(m.name)}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="msel" className="text-sm text-ink/55">{tx('الدخول كـ', 'Signed in as')}</label>
          <select id="msel" value={m.id} onChange={(e) => setMerchantSession(e.target.value)} className="h-10 rounded-full border border-green/15 bg-white px-4 text-sm text-green">{MERCHANTS.map((x) => <option key={x.id} value={x.id}>{l(x.name)}</option>)}</select>
          <Link to={`/merchant/${m.id}`} className="hidden h-10 items-center gap-1 rounded-full px-3 text-sm text-cocoa hover:bg-cocoa/5 sm:flex"><I.eye size={16} />{tx('صفحة المتجر', 'Storefront')}</Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0" aria-label={tx('أقسام اللوحة', 'Dashboard sections')}>
          {nav.map(([k, Ic, label]) => (
            <button key={k} onClick={() => setTab(k)} aria-current={tab === k ? 'page' : undefined} className={cx('flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-sm transition', tab === k ? 'bg-green text-cream-50' : 'bg-white text-green hover:bg-cream lg:bg-transparent')}>
              <Ic size={18} />{label}
              {k === 'orders' && pending.length > 0 && <span className={cx('ms-auto grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px]', tab === k ? 'bg-gold text-green-950' : 'bg-blush text-white')}>{pending.length}</span>}
            </button>
          ))}
          <div className="hidden rounded-2xl bg-cream p-4 text-[12px] leading-relaxed text-ink/60 lg:mt-4 lg:block">{tx('غيّر حالة أي طلب هنا، وافتح صفحة تتبع العميل في تبويب ثاني لتشوف التحديث مباشرة.', 'Change any order status here, then open the customer’s tracking page in another tab to watch it update live.')}</div>
        </nav>

        <div className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              {tab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                    <Kpi label={tx('المبيعات (١٤ يوم)', 'Sales (14 days)')} value={money(rev14)} delta={12} hint={tx('مقابل الفترة السابقة', 'vs prior period')} />
                    <Kpi label={tx('طلبات نشطة', 'Active orders')} value={num(pending.length)} hint={tx('تحتاج إجراء', 'need action')} />
                    <Kpi label={tx(`عمولة لمّة (${m.commission * 100}٪)`, `Lamma commission (${m.commission * 100}%)`)} value={money(commission)} />
                    <Kpi label={tx('صافي المستحق', 'Net payout')} value={money(rev14 - commission)} hint={tx('يُحوّل أسبوعياً', 'paid weekly')} />
                  </div>
                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                    <div className="rounded-[28px] bg-white p-5 shadow-soft xl:col-span-2">
                      <div className="mb-2 flex items-center justify-between"><h2 className="font-display text-lg font-semibold text-green">{tx('المبيعات اليومية', 'Daily sales')}</h2><span className="text-[11px] text-ink/45">{tx('بيانات تجريبية + طلبات العرض', 'Demo history + live demo orders')}</span></div>
                      <AreaChart data={series} format={money} label={tx('المبيعات اليومية لآخر ١٤ يوم', 'Daily sales, last 14 days')} />
                    </div>
                    <div className="rounded-[28px] bg-white p-5 shadow-soft">
                      <h2 className="mb-4 font-display text-lg font-semibold text-green">{tx('تنبيهات', 'Alerts')}</h2>
                      <ul className="space-y-3 text-sm">
                        {pending.filter((o) => o.sub[m.id].status === 'placed').map((o) => (
                          <li key={o.id} className="flex items-center gap-3 rounded-2xl bg-blush-100/60 p-3"><I.box size={18} className="text-blush-700" /><span className="flex-1">{tx(`طلب جديد ${o.id}`, `New order ${o.id}`)}</span><button onClick={() => act(o.id)} className="rounded-full bg-green px-3 py-1 text-xs text-cream-50">{tx('قبول', 'Accept')}</button></li>
                        ))}
                        {lowStock.map((p) => (
                          <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-gold-100/60 p-3"><I.clock size={18} className="text-cocoa" /><span className="flex-1 truncate">{tx(`مخزون منخفض: ${l(p.name)} (${stockOf(p, overrides)})`, `Low stock: ${l(p.name)} (${stockOf(p, overrides)})`)}</span><button onClick={() => setOverride(p.id, { stock: stockOf(p, overrides) + 10 })} className="shrink-0 rounded-full bg-white px-3 py-1 text-xs text-green">+10</button></li>
                        ))}
                        {pending.filter((o) => o.sub[m.id].status === 'placed').length + lowStock.length === 0 && <li className="flex items-center gap-2 text-ink/55"><I.check size={16} className="text-gold-700" />{tx('كل شي تحت السيطرة', 'All caught up')}</li>}
                      </ul>
                    </div>
                  </div>
                  <div className="rounded-[28px] bg-white p-5 shadow-soft">
                    <div className="mb-4 flex items-center justify-between"><h2 className="font-display text-lg font-semibold text-green">{tx('أحدث الطلبات', 'Latest orders')}</h2><Button variant="ghost" size="sm" onClick={() => setTab('orders')}>{tx('عرض الكل', 'View all')}</Button></div>
                    <OrderTable orders={myOrders.slice(0, 5)} mid={m.id} onAct={act} />
                  </div>
                </div>
              )}

              {tab === 'orders' && (
                <div>
                  <div className="mb-5 flex flex-wrap gap-2">
                    {([['active', tx('نشطة', 'Active')], ['delivered', tx('مكتملة', 'Delivered')], ['all', tx('الكل', 'All')]] as const).map(([k, v]) => (
                      <button key={k} onClick={() => setFilter(k)} className={cx('rounded-full px-4 py-2 text-sm', filter === k ? 'bg-green text-cream-50' : 'bg-white text-green')}>{v}</button>
                    ))}
                  </div>
                  {shown.length === 0 ? <p className="rounded-3xl bg-white p-10 text-center text-ink/55">{tx('لا توجد طلبات هنا. جرّب طلب من المتجر كعميل.', 'No orders here. Place one from the storefront as a customer.')}</p> : (
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                      {shown.map((o) => {
                        const s = o.sub[m.id].status
                        const next = NEXT_ACTION[s]
                        return (
                          <motion.article layout key={o.id} className="rounded-[28px] bg-white p-5 shadow-soft">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="tabular font-semibold text-green" dir="ltr">{o.id}</div>
                                <div className="text-xs text-ink/50">{tx('التوصيل', 'Deliver')} {date(o.delivery.date)} · <span dir="ltr">{o.delivery.slot}</span> · {l(CITIES.find((c) => c.id === o.recipient.city)!.name)}</div>
                              </div>
                              <span className={cx('rounded-full px-3 py-1 text-xs font-medium', STATUS_TONE[s])}>{l(STATUS_LABEL[s])}</span>
                            </div>
                            <ul className="mt-4 space-y-2">
                              {lines(o).map((ln) => {
                                const p = productById(ln.productId)!
                                return (
                                  <li key={ln.key} className="flex items-center gap-3 rounded-2xl bg-cream-50 p-2">
                                    <div className="h-12 w-10 shrink-0 overflow-hidden rounded-lg"><ProductArt art={p.art} className="h-full w-full" /></div>
                                    <div className="min-w-0 flex-1 text-sm"><div className="truncate text-green">{l(p.name)} <span className="text-ink/50">×{ln.qty}</span></div><div className="truncate text-[11px] text-ink/50">{variantText(p, ln.variant, l)}{ln.note && <span className="text-cocoa"> · {tx('تخصيص', 'Custom')}: “{ln.note}”</span>}</div></div>
                                    <span className="tabular text-sm">{money(ln.unit * ln.qty)}</span>
                                  </li>
                                )
                              })}
                            </ul>
                            <div className="mt-3 rounded-2xl border border-dashed border-green/15 p-3 text-xs text-ink/60"><I.gift size={14} className="me-1 inline text-gold-700" />{tx('كرت:', 'Card:')} “{o.card.message}” — {o.card.from}</div>
                            {/* status stepper */}
                            <div className="mt-4 flex items-center gap-1" aria-hidden>{STATUS_FLOW.map((x, i) => <span key={x} className={cx('h-1.5 flex-1 rounded-full', i <= STATUS_FLOW.indexOf(s) ? 'bg-green' : 'bg-green/10')} />)}</div>
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                              <span className="text-sm text-ink/55">{tx('صافي لك', 'Your net')} <span className="tabular font-semibold text-green">{money(orderRev(o) * (1 - m.commission))}</span></span>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="sm" to={`/order/${o.id}`}><I.eye size={15} />{tx('عرض العميل', 'Customer view')}</Button>
                                {next ? <Button size="sm" onClick={() => act(o.id)}>{l(next)}<I.arrow size={14} className="rtl-flip rotate-180" /></Button> : <span className="inline-flex items-center gap-1 text-sm text-green"><I.check size={16} className="text-gold-700" />{tx('مكتمل', 'Complete')}</span>}
                              </div>
                            </div>
                          </motion.article>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {tab === 'products' && (
                <div className="overflow-hidden rounded-[28px] bg-white shadow-soft">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-green/10 p-5">
                    <h2 className="font-display text-lg font-semibold text-green">{tx(`${products.length} منتجات`, `${products.length} products`)}</h2>
                    <p className="text-xs text-ink/50">{tx('التعديلات تظهر في المتجر فوراً', 'Changes show on the storefront instantly')}</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead className="text-start text-xs text-ink/50"><tr className="border-b border-green/5">
                        <th className="p-4 text-start font-medium">{tx('المنتج', 'Product')}</th><th className="p-4 text-start font-medium">{tx('السعر (ر.س)', 'Price (SAR)')}</th><th className="p-4 text-start font-medium">{tx('المخزون', 'Stock')}</th><th className="p-4 text-start font-medium">{tx('الحالة', 'Status')}</th>
                      </tr></thead>
                      <tbody>
                        {products.map((p) => {
                          const st = stockOf(p, overrides)
                          const active = overrides[p.id]?.active !== false
                          return (
                            <tr key={p.id} className="border-b border-green/5 last:border-0">
                              <td className="p-4"><div className="flex items-center gap-3"><div className="h-12 w-10 shrink-0 overflow-hidden rounded-lg"><ProductArt art={p.art} className="h-full w-full" /></div><div className="min-w-0"><Link to={`/product/${p.id}`} className="block truncate font-medium text-green hover:underline">{l(p.name)}</Link><div className="text-[11px] text-ink/45">{l(CATEGORIES.find((c) => c.id === p.cat)!.name)}</div></div></div></td>
                              <td className="p-4"><label className="sr-only" htmlFor={`pr-${p.id}`}>{tx('السعر', 'Price')}</label><input id={`pr-${p.id}`} type="number" min={1} dir="ltr" value={basePrice(p, overrides)} onChange={(e) => setOverride(p.id, { price: Math.max(1, +e.target.value || 1) })} className="tabular h-9 w-24 rounded-xl border border-green/15 px-2 text-center" /></td>
                              <td className="p-4"><div className="inline-flex items-center rounded-full border border-green/15"><button aria-label={tx('إنقاص', 'Decrease')} onClick={() => setOverride(p.id, { stock: Math.max(0, st - 1) })} className="grid h-8 w-8 place-items-center"><I.minus size={14} /></button><span className={cx('tabular w-8 text-center', st <= 5 && 'font-semibold text-blush-700')}>{st}</span><button aria-label={tx('زيادة', 'Increase')} onClick={() => setOverride(p.id, { stock: st + 1 })} className="grid h-8 w-8 place-items-center"><I.plus size={14} /></button></div></td>
                              <td className="p-4"><button role="switch" aria-checked={active} onClick={() => setOverride(p.id, { active: !active })} className={cx('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs', active && st > 0 ? 'bg-green/10 text-green' : 'bg-blush-100 text-blush-700')}><span className={cx('h-2 w-2 rounded-full', active && st > 0 ? 'bg-green' : 'bg-blush-700')} />{!active ? tx('مخفي', 'Hidden') : st === 0 ? tx('نفد', 'Sold out') : tx('معروض', 'Live')}</button></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {tab === 'analytics' && (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <div className="rounded-[28px] bg-white p-5 shadow-soft">
                    <h2 className="mb-1 font-display text-lg font-semibold text-green">{tx('الأكثر مبيعاً', 'Top products')}</h2>
                    <p className="mb-5 text-xs text-ink/45">{tx('إيراد تقديري ٣٠ يوم · تجريبي', 'Estimated 30-day revenue · demo')}</p>
                    <BarList format={money} data={products.map((p) => ({ label: l(p.name), value: Math.round(basePrice(p, overrides) * (p.reviews / 12)) })).sort((a, b) => b.value - a.value).slice(0, 6)} />
                  </div>
                  <div className="rounded-[28px] bg-white p-5 shadow-soft">
                    <h2 className="mb-1 font-display text-lg font-semibold text-green">{tx('الطلبات حسب المدينة', 'Orders by city')}</h2>
                    <p className="mb-5 text-xs text-ink/45">{tx('آخر ٣٠ يوم · تجريبي', 'Last 30 days · demo')}</p>
                    <BarList format={(n) => num(n)} data={m.cities.map((c, i) => ({ label: l(CITIES.find((x) => x.id === c)!.name), value: Math.round((m.reviews / 9) / (i + 1.2)) + myOrders.filter((o) => o.recipient.city === c).length }))} />
                  </div>
                  <div className="rounded-[28px] bg-white p-5 shadow-soft xl:col-span-2">
                    <h2 className="mb-4 font-display text-lg font-semibold text-green">{tx('تفصيل المستحقات (١٤ يوم)', 'Payout breakdown (14 days)')}</h2>
                    <div className="grid gap-4 sm:grid-cols-3">
                      {[[tx('إجمالي المبيعات', 'Gross sales'), rev14], [tx('عمولة لمّة', 'Lamma commission'), -commission], [tx('صافي التحويل', 'Net transfer'), rev14 - commission]].map(([a, b], i) => (
                        <div key={i} className={cx('rounded-2xl p-4', i === 2 ? 'bg-green text-cream-50' : 'bg-cream-50')}><div className="text-xs opacity-70">{a as string}</div><div className="tabular mt-1 font-display text-xl font-semibold">{(b as number) < 0 ? '−' : ''}{money(Math.abs(b as number))}</div></div>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-ink/45">{tx(`منها ${money(realRev)} من طلبات أُنشئت في هذا العرض.`, `${money(realRev)} of this comes from orders placed in this demo.`)}</p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function OrderTable({ orders, mid, onAct }: { orders: ReturnType<typeof useStore.getState>['orders']; mid: string; onAct: (id: string) => void }) {
  const { tx, l, money, date } = useI18n()
  if (!orders.length) return <p className="py-6 text-center text-sm text-ink/50">{tx('لا توجد طلبات بعد', 'No orders yet')}</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="text-xs text-ink/50"><tr><th className="pb-3 text-start font-medium">{tx('الطلب', 'Order')}</th><th className="pb-3 text-start font-medium">{tx('التوصيل', 'Delivery')}</th><th className="pb-3 text-start font-medium">{tx('القيمة', 'Value')}</th><th className="pb-3 text-start font-medium">{tx('الحالة', 'Status')}</th><th /></tr></thead>
        <tbody>
          {orders.map((o) => {
            const s = o.sub[mid].status
            const v = o.lines.filter((x) => x.merchant === mid).reduce((a, x) => a + x.unit * x.qty, 0)
            return (
              <tr key={o.id} className="border-t border-green/5">
                <td className="tabular py-3 font-medium text-green" dir="ltr">{o.id}</td>
                <td className="py-3 text-ink/60">{date(o.delivery.date)}</td>
                <td className="tabular py-3">{money(v)}</td>
                <td className="py-3"><span className={cx('rounded-full px-2.5 py-1 text-xs', STATUS_TONE[s])}>{l(STATUS_LABEL[s])}</span></td>
                <td className="py-3 text-end">{NEXT_ACTION[s] && <button onClick={() => onAct(o.id)} className="rounded-full bg-green px-3 py-1.5 text-xs text-cream-50 hover:bg-green-700">{l(NEXT_ACTION[s]!)}</button>}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
