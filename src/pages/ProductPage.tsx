import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CATEGORIES, CITIES, OCCASIONS, PRODUCTS, REVIEW_POOL, merchantById, productById, productCities } from '../data/catalog'
import { useI18n } from '../lib/i18n'
import { useStore, unitPrice, defaultVariant, isAvailable, stockOf } from '../lib/store'
import { ProductArt } from '../components/ProductArt'
import { ProductCard, FavButton, BADGE } from '../components/ProductCard'
import { MerchantMonogram } from '../components/Layout'
import { I } from '../components/Icons'
import { Button, cx, DemoTag, QtyStepper, Stars, SectionHead } from '../components/ui'
import NotFound from './NotFound'
import { AGE_GROUPS } from '../lib/ai'

export function earliestDelivery(leadHours: number) {
  const d = new Date(Date.now() + leadHours * 3600e3)
  if (d.getHours() >= 21) { d.setDate(d.getDate() + 1); d.setHours(10) }
  return d
}

export default function ProductPage() {
  const { id } = useParams()
  const p = productById(id ?? '')
  const { tx, l, money, date, isAr } = useI18n()
  const { overrides, city, setCity, addToCart } = useStore()
  const nav = useNavigate()
  const [view, setView] = useState(0)
  const [variant, setVariant] = useState<Record<string, string>>(p ? defaultVariant(p) : {})
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState('')
  const [noteErr, setNoteErr] = useState(false)
  const [tab, setTab] = useState<'details' | 'delivery' | 'reviews'>('details')
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null)
  useEffect(() => { if (p) { setVariant(defaultVariant(p)); setView(0); setQty(1); setNote('') } }, [id])
  if (!p) return <NotFound />

  const m = merchantById(p.merchant)
  const price = unitPrice(p, variant, overrides)
  const avail = isAvailable(p, overrides)
  const stock = stockOf(p, overrides)
  const cities = productCities(p)
  const deliverable = cities.includes(city)
  const eta = earliestDelivery(p.leadHours)
  const isToday = eta.toDateString() === new Date().toDateString()
  const cat = CATEGORIES.find((c) => c.id === p.cat)!
  const related = PRODUCTS.filter((x) => x.cat === p.cat && x.id !== p.id && (!p.ages || !x.ages || x.ages.some((a) => p.ages!.includes(a)))).slice(0, 4)
  const complete = PRODUCTS.filter((x) => x.cat !== p.cat && x.occasions.some((o) => p.occasions.includes(o)) && productCities(x).some((c) => cities.includes(c)) && (!x.ages || !p.ages || x.ages.some((a) => p.ages!.includes(a))) && (!x.ages || !!p.ages)).sort((a, b) => (b.art.img ? 1 : 0) - (a.art.img ? 1 : 0)).slice(0, 4)
  const reviews = [0, 1, 2].map((k) => REVIEW_POOL[(parseInt(p.id.slice(1)) + k) % REVIEW_POOL.length])

  const add = (buy = false) => {
    if (p.personalize && !note.trim()) { setNoteErr(true); document.getElementById('personalize')?.focus(); return }
    addToCart({ productId: p.id, variant, qty, note: note.trim() || undefined }, buy)
    if (buy) nav('/checkout')
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 pt-4 md:px-8 md:pt-8">
      <nav className="mb-6 flex items-center gap-2 text-[13px] text-ink/50" aria-label={tx('مسار التنقل', 'Breadcrumb')}>
        <Link to="/" className="hover:text-green">{tx('الرئيسية', 'Home')}</Link><I.chevron size={12} className="rtl-flip rotate-180" />
        <Link to={`/shop/${p.cat}`} className="hover:text-green">{l(cat.name)}</Link><I.chevron size={12} className="rtl-flip rotate-180" />
        <span className="truncate text-green">{l(p.name)}</span>
      </nav>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-14">
        {/* Gallery */}
        <div className="min-w-0 lg:col-span-7">
          <div className="flex flex-col-reverse gap-3 md:flex-row">
            <div className="no-scrollbar flex gap-3 overflow-x-auto md:flex-col">
              {[0, 1, 2, 3].map((v) => (
                <button key={v} onClick={() => setView(v)} aria-label={tx(`صورة ${v + 1}`, `View ${v + 1}`)} aria-pressed={view === v} className={cx('h-24 w-20 shrink-0 overflow-hidden rounded-2xl ring-2 transition', view === v ? 'ring-green' : 'ring-transparent opacity-70 hover:opacity-100')}>
                  <ProductArt art={p.art} view={v} className="h-full w-full" />
                </button>
              ))}
            </div>
            <div
              className="relative flex-1 cursor-zoom-in overflow-hidden rounded-[36px] bg-cream shadow-soft"
              onPointerMove={(e) => { if (e.pointerType !== 'mouse') return; const r = e.currentTarget.getBoundingClientRect(); setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }) }}
              onPointerLeave={() => setZoom(null)}
            >
              <AnimatePresence mode="wait">
                <motion.div key={view} initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="aspect-[4/5] w-full" style={zoom ? { transform: `scale(1.6)`, transformOrigin: `${zoom.x}% ${zoom.y}%`, transition: 'transform .2s' } : undefined}>
                  <ProductArt art={p.art} view={view} className="h-full w-full" label={l(p.name)} sizes="(max-width: 1024px) 100vw, 55vw" eager />
                </motion.div>
              </AnimatePresence>
              {p.badge && <span className={cx('absolute top-5 start-5 rounded-full px-3 py-1 text-xs font-medium', BADGE[p.badge].cls)}>{tx(BADGE[p.badge].ar, BADGE[p.badge].en)}</span>}
              <FavButton id={p.id} className="absolute top-5 end-5 h-12 w-12" />
              {!p.art.img && <span className="absolute bottom-5 start-5 rounded-full bg-white/80 px-3 py-1 text-[11px] text-ink/60 backdrop-blur">{tx('رسم توضيحي', 'Illustration')}</span>}
            </div>
          </div>
        </div>

        {/* Buy box */}
        <div className="min-w-0 lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <Link to={`/merchant/${m.id}`} className="inline-flex items-center gap-2 text-sm text-ink/60 hover:text-cocoa"><MerchantMonogram m={m} small />{l(m.name)}<DemoTag /></Link>
            <h1 className="mt-3 font-display text-[32px] font-semibold leading-tight text-green md:text-[42px]">{l(p.name)}</h1>
            <div className="mt-3 flex items-center gap-3 text-sm text-ink/60"><Stars value={p.rating} /><button onClick={() => { setTab('reviews'); document.getElementById('tabs')?.scrollIntoView({ behavior: 'smooth' }) }} className="underline-offset-4 hover:underline">{tx(`${p.reviews} تقييم`, `${p.reviews} reviews`)}</button></div>
            <div className="mt-5 flex items-baseline gap-3">
              <motion.span key={price} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="tabular font-display text-3xl font-semibold text-green">{money(price)}</motion.span>
              <span className="text-xs text-ink/45">{tx('شامل الضريبة · سعر تجريبي', 'incl. VAT · demo price')}</span>
            </div>
            <p className="mt-5 leading-relaxed text-ink/70">{l(p.desc)}</p>
            {p.ages && (
              <p className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-2xl bg-cream px-4 py-2 text-sm text-green">
                <span className="font-medium">{tx('العمر المناسب:', 'Suitable for:')}</span>{p.ages.map((a) => l(AGE_GROUPS.find((x) => x.id === a)!.name)).join(tx('، ', ', '))}
              </p>
            )}

            {p.variants.map((g) => (
              <fieldset key={g.key} className="mt-6">
                <legend className="mb-2.5 text-sm font-medium text-green">{l(g.label)}</legend>
                <div className="flex flex-wrap gap-2">
                  {g.options.map((o) => (
                    <button key={o.id} onClick={() => setVariant((v) => ({ ...v, [g.key]: o.id }))} aria-pressed={variant[g.key] === o.id} className={cx('relative rounded-2xl border px-4 py-2.5 text-sm transition', variant[g.key] === o.id ? 'border-green bg-green text-cream-50' : 'border-green/15 bg-white text-green hover:border-green/40')}>
                      {l(o.label)}{o.delta > 0 && <span className={cx('ms-1.5 text-xs', variant[g.key] === o.id ? 'text-gold' : 'text-ink/45')}>+{o.delta}</span>}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}

            {p.personalize && (
              <div className="mt-6">
                <label htmlFor="personalize" className="mb-2 flex items-center gap-2 text-sm font-medium text-green"><I.edit size={16} className="text-gold-700" />{l(p.personalize)}<span className="text-xs font-normal text-ink/45">{tx('(مطلوب)', '(required)')}</span></label>
                <input id="personalize" value={note} maxLength={40} onChange={(e) => { setNote(e.target.value); setNoteErr(false) }} placeholder={tx('مثال: نورة', 'e.g. Noura')} className={cx('h-12 w-full rounded-2xl border bg-white px-4 text-green outline-none focus:border-gold', noteErr ? 'border-blush-700' : 'border-green/15')} aria-invalid={noteErr} aria-describedby="pz-help" />
                <p id="pz-help" className={cx('mt-1.5 text-xs', noteErr ? 'text-blush-700' : 'text-ink/45')}>{noteErr ? tx('اكتب النص المطلوب قبل الإضافة للسلة.', 'Add the text before adding to cart.') : tx(`${note.length}/40 حرف · يُراجع من المتجر قبل التنفيذ`, `${note.length}/40 · reviewed by the merchant before production`)}</p>
              </div>
            )}

            <div className={cx('mt-6 rounded-3xl border p-4', deliverable ? 'border-green/10 bg-white' : 'border-blush/40 bg-blush-100/40')}>
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="pcity" className="flex items-center gap-2 text-sm text-ink/70"><I.pin size={16} className="text-gold-700" />{tx('التوصيل إلى', 'Deliver to')}</label>
                <select id="pcity" value={city} onChange={(e) => setCity(e.target.value as typeof city)} className="rounded-full border border-green/15 bg-cream-50 px-3 py-1.5 text-sm text-green outline-none">
                  {CITIES.map((c) => <option key={c.id} value={c.id}>{l(c.name)}</option>)}
                </select>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm">
                {deliverable ? (
                  <><I.truck size={18} className="text-green" /><span className="text-green">{tx('أقرب توصيل:', 'Earliest delivery:')} <strong className="font-semibold">{isToday ? tx('اليوم', 'Today') : date(eta)}</strong></span><span className="text-ink/45">· {tx(`تجهيز ${l(m.prepTime)}`, `prep ${l(m.prepTime)}`)}</span></>
                ) : (
                  <span className="text-blush-700">{tx(`غير متاح في هذه المدينة. يوصل إلى: ${cities.map((c) => l(CITIES.find((x) => x.id === c)!.name)).join('، ')}`, `Not available here. Delivers to: ${cities.map((c) => l(CITIES.find((x) => x.id === c)!.name)).join(', ')}`)}</span>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <QtyStepper value={qty} onChange={(n) => setQty(Math.max(1, Math.min(Math.max(1, stock), n)))} />
              <Button size="lg" className="flex-1" disabled={!avail || !deliverable} onClick={() => add(false)}><I.bag size={18} />{avail ? tx('أضف للسلة', 'Add to cart') : tx('نفدت الكمية', 'Sold out')}</Button>
            </div>
            <Button variant="outline" size="lg" className="mt-3 w-full" disabled={!avail || !deliverable} onClick={() => add(true)}>{tx('اشترِ الآن', 'Buy now')} · {money(price * qty)}</Button>
            {avail && stock <= 8 && <p className="mt-3 text-center text-xs text-cocoa">{tx(`باقي ${stock} قطع فقط في المخزون`, `Only ${stock} left in stock`)}</p>}
            <p className="mt-6 text-center text-[12px] text-ink/50">{tx('كرت تهنئة مجاني · مفاجأة رقمية · دفع تجريبي آمن', 'Free greeting card · Digital surprise · Simulated checkout')}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <section id="tabs" className="mt-16 max-w-3xl">
        <div className="flex gap-6 border-b border-green/10" role="tablist">
          {([['details', tx('التفاصيل', 'Details')], ['delivery', tx('التوصيل والعناية', 'Delivery & care')], ['reviews', tx(`التقييمات (${p.reviews})`, `Reviews (${p.reviews})`)]] as const).map(([k, v]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cx('relative pb-3 text-[15px]', tab === k ? 'text-green' : 'text-ink/50')}>
              {v}{tab === k && <motion.span layoutId="ptab" className="absolute inset-x-0 -bottom-px h-0.5 bg-gold" />}
            </button>
          ))}
        </div>
        <div className="py-6 text-[15px] leading-relaxed text-ink/70">
          {tab === 'details' && (
            <div className="space-y-3">
              <p>{l(p.desc)}</p>
              <p>{tx('مناسب لـ:', 'Great for:')} {p.occasions.map((o) => l(OCCASIONS.find((x) => x.id === o)!.name)).join(tx('، ', ', '))}</p>
              <p className="text-xs text-ink/45">{tx('رقم المنتج', 'SKU')}: LM-{p.id.toUpperCase()} · {p.art.img ? tx('صورة المنتج حقيقية؛ المتجر والسعر وهميان لأغراض العرض.', 'Real product photo; merchant and price are fictional for the demo.') : tx('صورة المنتج رسم توضيحي لأغراض العرض.', 'Product image is an illustration for demo purposes.')}</p>
            </div>
          )}
          {tab === 'delivery' && (
            <ul className="space-y-2">
              <li>• {tx(`وقت التجهيز: ${l(m.prepTime)}، والتوصيل خلال نافذة الوقت التي تختارها.`, `Preparation: ${l(m.prepTime)}, delivered in your chosen time window.`)}</li>
              <li>• {tx('رسوم التوصيل ٢٠ ر.س لكل متجر في الطلب.', 'Delivery fee SAR 20 per merchant in the order.')}</li>
              <li>• {tx('يُحفظ في مكان بارد وبعيد عن الشمس المباشرة.', 'Keep cool and away from direct sunlight.')}</li>
            </ul>
          )}
          {tab === 'reviews' && (
            <ul className="space-y-4">
              {reviews.map((r, i) => (
                <li key={i} className="rounded-3xl bg-white p-5 shadow-soft">
                  <div className="flex items-center justify-between"><span className="font-medium text-green">{l(r.name)}</span><span className="flex text-gold">{Array.from({ length: 5 }).map((_, k) => <I.star key={k} size={13} className="fill-gold" />)}</span></div>
                  <p className="mt-2 text-sm">{l(r.text)}</p>
                  <p className="mt-2 text-[11px] text-ink/40">{l(CITIES.find((c) => c.id === r.city)!.name)} · {tx('تقييم تجريبي', 'demo review')}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {complete.length > 0 && (
        <section className="mt-12">
          <SectionHead eyebrow={tx('كمّل اللمّة', 'Complete the moment')} title={tx('يحلو معها', 'Pairs beautifully with')} />
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-5">{complete.map((x, i) => <ProductCard key={x.id} p={x} index={i} />)}</div>
        </section>
      )}
      <section className="mt-20">
        <SectionHead eyebrow={l(cat.name)} title={tx('قد يعجبك أيضاً', 'You may also like')} />
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-5">{related.map((x, i) => <ProductCard key={x.id} p={x} index={i} />)}</div>
      </section>
    </div>
  )
}
