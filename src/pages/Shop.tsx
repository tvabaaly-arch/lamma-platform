import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CATEGORIES, MERCHANTS, OCCASIONS, PRODUCTS, productCities, inCategory, COLLECTIONS, type CategoryId, type OccasionId, type CollectionId, type AgeGroup } from '../data/catalog'
import { AGE_GROUPS } from '../lib/ai'
import { useI18n } from '../lib/i18n'
import { useStore, basePrice, isAvailable } from '../lib/store'
import { ProductArt } from '../components/ProductArt'
import { ProductCard } from '../components/ProductCard'
import { I } from '../components/Icons'
import { Button, Chip, cx, Empty, OccasionGlyph, PatternBg, Reveal } from '../components/ui'

type Sort = 'rec' | 'priceAsc' | 'priceDesc' | 'rating' | 'new'
const norm = (s: string) => s.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')

export function Shop() {
  const { cat } = useParams<{ cat?: CategoryId }>()
  const [sp, setSp] = useSearchParams()
  const nav = useNavigate()
  const { tx, l, money, isAr } = useI18n()
  const city = useStore((s) => s.city)
  const overrides = useStore((s) => s.overrides)
  const q = sp.get('q') ?? ''
  const occasion = (sp.get('occasion') as OccasionId | null) ?? null
  const forKey = (sp.get('for') as CollectionId | null) ?? null
  const coll = COLLECTIONS.find((c) => c.id === forKey)
  const [sort, setSort] = useState<Sort>('rec')
  const [maxPrice, setMaxPrice] = useState(1500)
  const [merchants, setMerchants] = useState<string[]>([])
  const [cityOnly, setCityOnly] = useState(false)
  const [sameDay, setSameDay] = useState(false)
  const [inStock, setInStock] = useState(false)
  const [topRated, setTopRated] = useState(false)
  const [ageF, setAgeF] = useState<AgeGroup | null>(null)
  const [sheet, setSheet] = useState(false)
  const category = CATEGORIES.find((c) => c.id === cat)
  const occ = OCCASIONS.find((o) => o.id === occasion)

  const list = useMemo(() => {
    const n = norm(q)
    let r = PRODUCTS.filter((p) =>
      (!cat || inCategory(p, cat)) &&
      (!coll || coll.match(p)) &&
      (!ageF || (p.ages ? p.ages.includes(ageF) : false)) &&
      (!occasion || p.occasions.includes(occasion)) &&
      (!n || norm(p.name.ar).includes(n) || norm(p.name.en).includes(n) || norm(p.desc.ar).includes(n) || norm(p.desc.en).includes(n)) &&
      basePrice(p, overrides) <= maxPrice &&
      (!merchants.length || merchants.includes(p.merchant)) &&
      (!cityOnly || productCities(p).includes(city)) &&
      (!sameDay || p.leadHours <= 3) &&
      (!inStock || isAvailable(p, overrides)) &&
      (!topRated || p.rating >= 4.8),
    )
    const sorters: Record<Sort, (a: (typeof r)[0], b: (typeof r)[0]) => number> = {
      rec: (a, b) => (isAvailable(b, overrides) ? 1 : 0) - (isAvailable(a, overrides) ? 1 : 0) || (b.art.img ? 1 : 0) - (a.art.img ? 1 : 0) || b.reviews * b.rating - a.reviews * a.rating,
      priceAsc: (a, b) => basePrice(a, overrides) - basePrice(b, overrides),
      priceDesc: (a, b) => basePrice(b, overrides) - basePrice(a, overrides),
      rating: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
      new: (a, b) => b.created - a.created,
    }
    return r.sort(sorters[sort])
  }, [cat, occasion, q, maxPrice, merchants, cityOnly, sameDay, inStock, topRated, sort, city, overrides, forKey, ageF])

  const activeCount = [merchants.length > 0, cityOnly, sameDay, inStock, topRated, maxPrice < 1500].filter(Boolean).length
  const clear = () => { setMerchants([]); setCityOnly(false); setSameDay(false); setInStock(false); setTopRated(false); setMaxPrice(1500) }
  const setParam = (k: string, v: string | null) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }) }

  const Filters = (
    <div className="space-y-7">
      <div>
        {(cat === 'kids' || forKey === 'kids' || forKey === 'baby') && (
          <div className="mb-7">
            <h3 className="eyebrow mb-3 text-cocoa">{tx('العمر', 'Age')}</h3>
            <div className="flex flex-wrap gap-1.5">
              {AGE_GROUPS.filter((a) => a.id !== 'adult').map((a) => <button key={a.id} onClick={() => setAgeF(ageF === a.id ? null : a.id)} aria-pressed={ageF === a.id} className={cx('rounded-full border px-3 py-1.5 text-[13px] transition', ageF === a.id ? 'border-green bg-green text-cream-50' : 'border-green/12 bg-white text-green hover:border-green/30')}>{l(a.name)}</button>)}
            </div>
          </div>
        )}
        <h3 className="eyebrow mb-3 text-cocoa">{tx('المناسبة', 'Occasion')}</h3>
        <div className="flex flex-wrap gap-1.5">
          {OCCASIONS.map((o) => (
            <button key={o.id} onClick={() => setParam('occasion', occasion === o.id ? null : o.id)} className={cx('rounded-full border px-3 py-1.5 text-[13px] transition', occasion === o.id ? 'border-green bg-green text-cream-50' : 'border-green/12 bg-white text-green hover:border-green/30')}>{l(o.name)}</button>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-3 flex items-center justify-between"><h3 className="eyebrow text-cocoa">{tx('السعر الأعلى', 'Max price')}</h3><span className="tabular text-sm font-medium text-green">{maxPrice >= 1500 ? tx('الكل', 'Any') : money(maxPrice)}</span></div>
        <input id="max-price" aria-label={tx('السعر الأعلى', 'Max price')} type="range" min={60} max={1500} step={10} value={maxPrice} onChange={(e) => setMaxPrice(+e.target.value)} className="w-full" dir="ltr" />
        <div className="mt-1 flex justify-between text-[11px] text-ink/45" dir="ltr"><span>60</span><span>1500+</span></div>
      </div>
      <div className="space-y-2.5">
        <h3 className="eyebrow mb-3 text-cocoa">{tx('التوصيل', 'Delivery')}</h3>
        {[
          [cityOnly, setCityOnly, tx('يوصل لمدينتي فقط', 'Delivers to my city')],
          [sameDay, setSameDay, tx('توصيل نفس اليوم', 'Same-day delivery')],
          [inStock, setInStock, tx('متوفر الآن', 'In stock now')],
          [topRated, setTopRated, tx('تقييم ٤.٨ فأعلى', 'Rated 4.8+')],
        ].map(([v, set, label], i) => (
          <label key={i} className="flex cursor-pointer items-center justify-between gap-3 text-sm text-ink/80">
            {label as string}
            <button role="switch" aria-checked={v as boolean} onClick={() => (set as (b: boolean) => void)(!(v as boolean))} className={cx('relative h-6 w-11 rounded-full transition-colors', v ? 'bg-green' : 'bg-green/15')}>
              <motion.span layout className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow', v ? 'end-0.5' : 'start-0.5')} />
            </button>
          </label>
        ))}
      </div>
      <div>
        <h3 className="eyebrow mb-3 text-cocoa">{tx('المتجر', 'Merchant')}</h3>
        <div className="space-y-2">
          {MERCHANTS.filter((m) => !cat || m.cats.includes(cat) || PRODUCTS.some((p) => p.merchant === m.id && inCategory(p, cat))).map((m) => (
            <label key={m.id} className="flex cursor-pointer items-center gap-2.5 text-sm text-ink/80">
              <input type="checkbox" checked={merchants.includes(m.id)} onChange={() => setMerchants((x) => (x.includes(m.id) ? x.filter((y) => y !== m.id) : [...x, m.id]))} className="h-4 w-4 rounded accent-[#0F3D32]" />
              {l(m.name)}
            </label>
          ))}
        </div>
      </div>
      {activeCount > 0 && <Button variant="ghost" size="sm" onClick={clear}>{tx('مسح الفلاتر', 'Clear filters')}</Button>}
    </div>
  )

  return (
    <div>
      {/* Header */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-[1440px] items-end gap-6 px-4 pb-8 pt-6 md:grid-cols-12 md:px-8 md:pb-12 md:pt-10">
          <div className="md:col-span-7">
            <nav className="mb-4 flex items-center gap-2 text-[13px] text-ink/50" aria-label={tx('مسار التنقل', 'Breadcrumb')}>
              <Link to="/" className="hover:text-green">{tx('الرئيسية', 'Home')}</Link><I.chevron size={12} className="rtl-flip rotate-180" />
              <Link to="/shop" className="hover:text-green">{tx('المتجر', 'Shop')}</Link>
              {category && <><I.chevron size={12} className="rtl-flip rotate-180" /><span className="text-green">{l(category.name)}</span></>}
            </nav>
            <h1 className="font-display text-[38px] font-semibold leading-tight text-green md:text-[60px]">
              {q ? tx(`نتائج «${q}»`, `Results for “${q}”`) : category ? l(category.name) : coll ? l(coll.name) : occ ? l(occ.name) : tx('كل الهدايا', 'All gifts')}
            </h1>
            <p className="mt-2 max-w-lg text-ink/60">{category ? l(category.blurb) : coll ? l(coll.blurb) : occ ? l(occ.hint) : tx('ورد وكيك وألعاب وعطور وجمال وهدايا مخصصة من أفضل المتاجر السعودية.', 'Flowers, cakes, toys, perfume, beauty and personalised gifts from the best Saudi merchants.')}</p>
          </div>
          {(category || occ) && (
            <div className="relative hidden h-44 overflow-hidden rounded-[32px] md:col-span-5 md:block">
              <ProductArt art={category ? category.art : (PRODUCTS.find((p) => p.occasions.includes(occ!.id) && p.art.img) ?? PRODUCTS[0]).art} view={category?.art.img ? 3 : 0} className="h-full w-full" sizes="40vw" eager />
            </div>
          )}
        </div>
        <div className="mx-auto max-w-[1440px] px-4 md:px-8">
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
            <Chip active={!cat} onClick={() => nav({ pathname: '/shop', search: sp.toString() })}>{tx('الكل', 'All')}</Chip>
            {CATEGORIES.map((c) => <Chip key={c.id} active={cat === c.id} onClick={() => nav({ pathname: `/shop/${c.id}`, search: sp.toString() })}>{l(c.name)}</Chip>)}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 pt-6 md:px-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block"><div className="sticky top-28">{Filters}</div></aside>
        <div className="min-w-0">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm text-ink/60">
              <span className="tabular">{tx(`${list.length} منتج`, `${list.length} products`)}</span>
              {q && <button onClick={() => setParam('q', null)} className="inline-flex items-center gap-1 rounded-full bg-green/5 px-3 py-1 text-green">«{q}» <I.close size={12} /></button>}
              {coll && <button onClick={() => setParam('for', null)} className="inline-flex items-center gap-1 rounded-full bg-blush-100 px-3 py-1 text-green">{l(coll.name)} <I.close size={12} /></button>}
              {occ && <button onClick={() => setParam('occasion', null)} className="inline-flex items-center gap-1 rounded-full bg-gold/20 px-3 py-1 text-green">{l(occ.name)} <I.close size={12} /></button>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setSheet(true)} className="flex h-10 items-center gap-2 rounded-full border border-green/15 bg-white px-4 text-sm text-green lg:hidden"><I.filter size={16} />{tx('فلترة', 'Filter')}{activeCount > 0 && <span className="grid h-5 w-5 place-items-center rounded-full bg-green text-[11px] text-cream-50">{activeCount}</span>}</button>
              <label className="sr-only" htmlFor="sort">{tx('ترتيب', 'Sort')}</label>
              <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-10 rounded-full border border-green/15 bg-white px-4 text-sm text-green outline-none">
                <option value="rec">{tx('الأنسب لك', 'Recommended')}</option>
                <option value="priceAsc">{tx('السعر: من الأقل', 'Price: low to high')}</option>
                <option value="priceDesc">{tx('السعر: من الأعلى', 'Price: high to low')}</option>
                <option value="rating">{tx('الأعلى تقييماً', 'Top rated')}</option>
                <option value="new">{tx('الأحدث', 'Newest')}</option>
              </select>
            </div>
          </div>
          {list.length === 0 ? (
            <Empty title={tx('ما فيه منتجات تطابق اختياراتك', 'Nothing matches those filters')} sub={tx('خفف الفلاتر أو خلّ الاستوديو يقترح لك.', 'Loosen the filters or let the Studio suggest something.')} action={<div className="flex gap-2"><Button variant="outline" onClick={() => { clear(); setSp({}) }}>{tx('مسح الكل', 'Clear all')}</Button><Button to="/studio"><I.sparkle size={16} />{tx('الاستوديو', 'Studio')}</Button></div>} />
          ) : (
            <motion.div layout className="grid grid-cols-2 gap-x-3 gap-y-9 md:grid-cols-3 md:gap-x-5 xl:grid-cols-4">
              {list.map((p, i) => <ProductCard key={p.id} p={p} index={i} />)}
            </motion.div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {sheet && (
          <>
            <motion.div className="fixed inset-0 z-50 bg-green-950/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSheet(false)} />
            <motion.div role="dialog" aria-label={tx('الفلاتر', 'Filters')} className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-[32px] bg-cream-50 p-6" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}>
              <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-green/15" />
              <div className="mb-5 flex items-center justify-between"><h2 className="font-display text-xl font-semibold text-green">{tx('الفلاتر', 'Filters')}</h2><button onClick={() => setSheet(false)} aria-label={tx('إغلاق', 'Close')}><I.close /></button></div>
              {Filters}
              <Button size="lg" className="sticky bottom-0 mt-6 w-full" onClick={() => setSheet(false)}>{tx(`عرض ${list.length} منتج`, `Show ${list.length} products`)}</Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Occasions() {
  const { tx, l } = useI18n()
  return (
    <div className="mx-auto max-w-[1440px] px-4 pt-8 md:px-8">
      <Reveal>
        <div className="max-w-2xl">
          <div className="eyebrow mb-3 text-cocoa">{tx('المناسبات', 'Occasions')}</div>
          <h1 className="font-display text-[40px] font-semibold leading-tight text-green md:text-[60px]">{tx('وش نحتفل فيه اليوم؟', 'What are we celebrating today?')}</h1>
          <p className="mt-3 text-ink/60">{tx('اختر المناسبة ونعرض لك أنسب المنتجات، أو خلّ الاستوديو يجهز لمّة كاملة.', 'Pick an occasion to see the best matches, or let the Studio build a complete bundle.')}</p>
        </div>
      </Reveal>
      <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {OCCASIONS.map((o, i) => {
          const items = PRODUCTS.filter((p) => p.occasions.includes(o.id))
          return (
            <Reveal key={o.id} delay={(i % 4) * 0.05}>
              <div className="group relative overflow-hidden rounded-[30px] bg-white shadow-soft transition-shadow hover:shadow-lift">
                <Link to={`/shop?occasion=${o.id}`} className="block">
                  <div className="grid h-44 grid-cols-3 gap-1 overflow-hidden">{[...items].sort((a, b) => (b.art.img ? 1 : 0) - (a.art.img ? 1 : 0)).slice(0, 3).map((p) => <ProductArt key={p.id} art={p.art} className="h-full w-full transition-transform duration-700 group-hover:scale-110" />)}</div>
                  <div className="flex items-center gap-3 p-4">
                                        <span className="min-w-0"><span className="block font-display text-lg font-medium text-green">{l(o.name)}</span><span className="text-[12px] text-ink/55">{tx(`${items.length} منتج`, `${items.length} products`)} · {l(o.hint)}</span></span>
                  </div>
                </Link>
                <Link to="/studio" state={{ text: tx(`${o.name.ar} — ميزانية ٥٠٠ ريال`, `${o.name.en} — budget SAR 500`) }} className="mx-4 mb-4 flex items-center justify-center gap-1.5 rounded-full bg-green/5 py-2 text-[13px] text-green transition hover:bg-green hover:text-cream-50"><I.sparkle size={14} />{tx('جهّزها بالاستوديو', 'Build with Studio')}</Link>
              </div>
            </Reveal>
          )
        })}
      </div>
    </div>
  )
}
