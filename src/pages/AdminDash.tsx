import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIES, CITIES, MERCHANTS, PRODUCTS, productById } from '../data/catalog'
import { useI18n } from '../lib/i18n'
import { useStore, orderStatus } from '../lib/store'
import { MerchantMonogram } from '../components/Layout'
import { AreaChart, BarList, Kpi } from '../components/Charts'
import { I } from '../components/Icons'
import { cx, DemoTag, Stars } from '../components/ui'
import { STATUS_LABEL } from './Order'
import { STATUS_TONE, syntheticSeries } from './MerchantDash'

export default function AdminDash() {
  const { tx, l, money, date, num } = useI18n()
  const { orders, merchantStatus, setMerchantStatus, studio, showToast } = useStore()
  const demoGmv = orders.reduce((a, o) => a + o.totals.total, 0)
  const series = useMemo(() => {
    const s = syntheticSeries(3, 30, 38000)
    orders.forEach((o) => { const idx = 29 - Math.floor((Date.now() - o.createdAt) / 86400e3); if (idx >= 0) s[idx] += o.totals.total })
    return s.map((y, i) => { const d = new Date(); d.setDate(d.getDate() - 29 + i); return { x: date(d, { day: 'numeric', month: 'short' }), y } })
  }, [orders.length, date])
  const gmv = series.reduce((a, d) => a + d.y, 0)
  const takeRate = 0.145
  const catData = CATEGORIES.map((c) => ({ label: l(c.name), value: Math.round(PRODUCTS.filter((p) => p.cat === c.id).reduce((a, p) => a + p.price * p.reviews, 0) / 40) })).sort((a, b) => b.value - a.value)
  const cityData = CITIES.map((c, i) => ({ label: l(c.name), value: Math.round(gmv * [0.34, 0.24, 0.1, 0.09, 0.08, 0.06, 0.05, 0.04][i]) }))

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-6 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[13px] text-ink/50">{tx('لوحة الإدارة', 'Admin console')}<DemoTag /></div>
          <h1 className="font-display text-3xl font-semibold text-green md:text-4xl">{tx('نبض لمّة', 'Lamma pulse')}</h1>
          <p className="text-sm text-ink/55">{tx('آخر ٣٠ يوم — أرقام تجريبية مع طلبات هذا العرض', 'Last 30 days — demo figures plus orders placed in this demo')}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label={tx('إجمالي قيمة الطلبات', 'GMV')} value={money(gmv)} delta={18} />
        <Kpi label={tx('إيراد المنصة', 'Platform revenue')} value={money(gmv * takeRate)} hint={tx(`نسبة ${(takeRate * 100).toFixed(1)}٪`, `${(takeRate * 100).toFixed(1)}% take rate`)} />
        <Kpi label={tx('الطلبات', 'Orders')} value={num(Math.round(gmv / 430))} delta={9} />
        <Kpi label={tx('لمّات الاستوديو', 'Studio bundles')} value={num(studio.bundlesGenerated)} hint={tx('٣١٪ تحويل (تجريبي)', '31% conversion (demo)')} />
        <Kpi label={tx('طلبات هذا العرض', 'This demo’s orders')} value={num(orders.length)} hint={money(demoGmv)} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-[28px] bg-white p-5 shadow-soft xl:col-span-2">
          <h2 className="mb-2 font-display text-lg font-semibold text-green">{tx('قيمة الطلبات اليومية', 'Daily GMV')}</h2>
          <AreaChart data={series} format={money} label={tx('قيمة الطلبات اليومية لآخر ٣٠ يوم', 'Daily GMV, last 30 days')} height={240} />
        </div>
        <div className="rounded-[28px] bg-white p-5 shadow-soft">
          <h2 className="mb-1 font-display text-lg font-semibold text-green">{tx('حسب المدينة', 'By city')}</h2>
          <p className="mb-4 text-xs text-ink/45">{tx('حصة من قيمة الطلبات', 'Share of GMV')}</p>
          <BarList format={money} data={cityData} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-[28px] bg-white p-5 shadow-soft xl:col-span-2">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-display text-lg font-semibold text-green">{tx('المتاجر', 'Merchants')}</h2><span className="text-xs text-ink/45">{tx('اعتماد وتعليق المتاجر يؤثر على ظهورها للعملاء', 'Approving or suspending affects storefront visibility')}</span></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="text-xs text-ink/50"><tr><th className="pb-3 text-start font-medium">{tx('المتجر', 'Merchant')}</th><th className="pb-3 text-start font-medium">{tx('التقييم', 'Rating')}</th><th className="pb-3 text-start font-medium">{tx('المدن', 'Cities')}</th><th className="pb-3 text-start font-medium">{tx('العمولة', 'Commission')}</th><th className="pb-3 text-start font-medium">{tx('الحالة', 'Status')}</th><th /></tr></thead>
              <tbody>
                {MERCHANTS.map((m) => {
                  const st = merchantStatus[m.id] ?? 'active'
                  return (
                    <tr key={m.id} className="border-t border-green/5">
                      <td className="py-3"><Link to={`/merchant/${m.id}`} className="flex items-center gap-2 font-medium text-green hover:underline"><MerchantMonogram m={m} small />{l(m.name)}</Link></td>
                      <td className="py-3"><Stars value={m.rating} /></td>
                      <td className="tabular py-3 text-ink/60">{m.cities.length}</td>
                      <td className="tabular py-3 text-ink/60">{Math.round(m.commission * 100)}%</td>
                      <td className="py-3">
                        <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs', st === 'active' ? 'bg-green/10 text-green' : st === 'pending' ? 'bg-gold/25 text-cocoa' : 'bg-blush-100 text-blush-700')}>
                          {st === 'active' ? <I.check size={12} /> : st === 'pending' ? <I.clock size={12} /> : <I.close size={12} />}
                          {st === 'active' ? tx('نشط', 'Active') : st === 'pending' ? tx('بانتظار الاعتماد', 'Pending') : tx('معلّق', 'Suspended')}
                        </span>
                      </td>
                      <td className="py-3 text-end">
                        {st === 'pending' && <button onClick={() => { setMerchantStatus(m.id, 'active'); showToast(tx('تم اعتماد المتجر', 'Merchant approved')) }} className="rounded-full bg-green px-3 py-1.5 text-xs text-cream-50">{tx('اعتماد', 'Approve')}</button>}
                        {st === 'active' && <button onClick={() => setMerchantStatus(m.id, 'suspended')} className="rounded-full px-3 py-1.5 text-xs text-blush-700 hover:bg-blush-100">{tx('تعليق', 'Suspend')}</button>}
                        {st === 'suspended' && <button onClick={() => setMerchantStatus(m.id, 'active')} className="rounded-full px-3 py-1.5 text-xs text-green hover:bg-green/5">{tx('إعادة تفعيل', 'Reactivate')}</button>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="rounded-[28px] bg-white p-5 shadow-soft">
          <h2 className="mb-1 font-display text-lg font-semibold text-green">{tx('حسب القسم', 'By category')}</h2>
          <p className="mb-4 text-xs text-ink/45">{tx('قيمة تقديرية · تجريبي', 'Estimated value · demo')}</p>
          <BarList format={money} data={catData} />
        </div>
      </div>

      <div className="mt-6 rounded-[28px] bg-white p-5 shadow-soft">
        <h2 className="mb-4 font-display text-lg font-semibold text-green">{tx('أحدث الطلبات على المنصة', 'Latest platform orders')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-xs text-ink/50"><tr><th className="pb-3 text-start font-medium">{tx('الطلب', 'Order')}</th><th className="pb-3 text-start font-medium">{tx('المدينة', 'City')}</th><th className="pb-3 text-start font-medium">{tx('المتاجر', 'Merchants')}</th><th className="pb-3 text-start font-medium">{tx('القيمة', 'Value')}</th><th className="pb-3 text-start font-medium">{tx('الحالة', 'Status')}</th></tr></thead>
            <tbody>
              {orders.slice(0, 10).map((o) => {
                const s = orderStatus(o)
                return (
                  <motion.tr layout key={o.id} className="border-t border-green/5">
                    <td className="py-3"><Link to={`/order/${o.id}`} className="tabular font-medium text-green hover:underline" dir="ltr">{o.id}</Link><div className="text-[11px] text-ink/45">{date(o.createdAt)}</div></td>
                    <td className="py-3 text-ink/60">{l(CITIES.find((c) => c.id === o.recipient.city)!.name)}</td>
                    <td className="tabular py-3 text-ink/60">{Object.keys(o.sub).length}</td>
                    <td className="tabular py-3">{money(o.totals.total)}</td>
                    <td className="py-3"><span className={cx('rounded-full px-2.5 py-1 text-xs', STATUS_TONE[s])}>{l(STATUS_LABEL[s])}</span></td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
export { productById }
