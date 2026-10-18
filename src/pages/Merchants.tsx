import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CATEGORIES, CITIES, MERCHANTS, PRODUCTS, merchantById } from '../data/catalog'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'
import { ProductArt } from '../components/ProductArt'
import { ProductCard } from '../components/ProductCard'
import { MerchantMonogram } from '../components/Layout'
import { I } from '../components/Icons'
import { Chip, DemoTag, PatternBg, Reveal, Stars } from '../components/ui'
import NotFound from './NotFound'

export function Merchants() {
  const { tx, l } = useI18n()
  const status = useStore((s) => s.merchantStatus)
  const [city, setCity] = useState<string | null>(null)
  const list = MERCHANTS.filter((m) => status[m.id] !== 'suspended' && (!city || m.cities.includes(city as never)))
  return (
    <div className="mx-auto max-w-[1440px] px-4 pt-8 md:px-8">
      <div className="max-w-2xl">
        <div className="eyebrow mb-3 flex items-center gap-2 text-cocoa">{tx('المتاجر', 'Merchants')}<DemoTag /></div>
        <h1 className="font-display text-[40px] font-semibold leading-tight text-green md:text-[60px]">{tx('صنّاع الفرحة', 'The makers of joy')}</h1>
        <p className="mt-3 text-ink/60">{tx('متاجر سعودية مختارة بعناية — هذه الأسماء وهمية لأغراض العرض.', 'Carefully selected Saudi merchants — these names are fictional, for demo purposes.')}</p>
      </div>
      <div className="no-scrollbar -mx-4 mt-8 flex gap-2 overflow-x-auto px-4">
        <Chip active={!city} onClick={() => setCity(null)}>{tx('كل المدن', 'All cities')}</Chip>
        {CITIES.map((c) => <Chip key={c.id} active={city === c.id} onClick={() => setCity(c.id)}>{l(c.name)}</Chip>)}
      </div>
      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {list.map((m, i) => {
          const prods = PRODUCTS.filter((p) => p.merchant === m.id)
          return (
            <Reveal key={m.id} delay={(i % 3) * 0.06}>
              <Link to={`/merchant/${m.id}`} className="group block overflow-hidden rounded-[32px] bg-white shadow-soft transition-shadow hover:shadow-lift">
                <div className="grid h-48 grid-cols-4 gap-1">
                  {[...prods].sort((a, b) => (b.art.img ? 1 : 0) - (a.art.img ? 1 : 0)).slice(0, 4).map((p, k) => <div key={p.id} className={k === 0 ? 'col-span-2 row-span-1 overflow-hidden' : 'overflow-hidden'}><ProductArt art={p.art} className="h-full w-full transition-transform duration-700 group-hover:scale-110" /></div>)}
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-3">
                    <MerchantMonogram m={m} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 font-display text-lg font-medium text-green">{l(m.name)}{status[m.id] === 'pending' && <span className="rounded-full bg-gold/20 px-2 text-[10px] text-cocoa">{tx('قيد المراجعة', 'In review')}</span>}</div>
                      <div className="truncate text-[13px] text-ink/55">{l(m.tagline)}</div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">{m.cats.map((c) => <span key={c} className="rounded-full bg-cream px-2.5 py-1 text-[11px] text-green">{l(CATEGORIES.find((x) => x.id === c)!.name)}</span>)}</div>
                  <div className="mt-4 flex items-center justify-between border-t border-green/5 pt-4 text-[12px] text-ink/55">
                    <Stars value={m.rating} /><span>{tx(`${m.reviews} تقييم`, `${m.reviews} reviews`)}</span><span>{tx(`${prods.length} منتج`, `${prods.length} products`)}</span>
                  </div>
                </div>
              </Link>
            </Reveal>
          )
        })}
      </div>
    </div>
  )
}

export function MerchantProfile() {
  const { id } = useParams()
  const { tx, l } = useI18n()
  const m = MERCHANTS.find((x) => x.id === id)
  const [cat, setCat] = useState<string | null>(null)
  if (!m) return <NotFound />
  const prods = PRODUCTS.filter((p) => p.merchant === m.id && (!cat || p.cat === cat)).sort((a, b) => (b.art.img ? 1 : 0) - (a.art.img ? 1 : 0))
  return (
    <div>
      <section className="mx-auto grid h-56 max-w-[1440px] grid-cols-3 gap-1.5 overflow-hidden px-4 pt-2 md:h-80 md:px-8">
        {PRODUCTS.filter((p) => p.merchant === m.id).sort((a, b) => (b.art.img ? 1 : 0) - (a.art.img ? 1 : 0)).slice(0, 3).map((p, k) => (
          <div key={p.id} className={`relative overflow-hidden ${k === 0 ? 'rounded-s-[28px]' : k === 2 ? 'rounded-e-[28px]' : ''}`}><ProductArt art={p.art} view={3} className="absolute inset-0 h-full w-full" sizes="33vw" eager /></div>
        ))}
      </section>
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <div className="-mt-12 flex flex-wrap items-end gap-5 px-4">
          <MerchantMonogram m={m} large />
          <div className="min-w-0 flex-1 pb-2">
            <div className="flex flex-wrap items-center gap-2"><h1 className="font-display text-3xl font-semibold text-green md:text-4xl">{l(m.name)}</h1><DemoTag /></div>
            <p className="text-ink/60">{l(m.tagline)}</p>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <aside className="space-y-5 lg:col-span-4">
            <div className="rounded-[28px] bg-white p-6 shadow-soft">
              <p className="leading-relaxed text-ink/70">{l(m.about)}</p>
              <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-ink/45">{tx('التقييم', 'Rating')}</dt><dd className="mt-1"><Stars value={m.rating} /> <span className="text-xs text-ink/45">({m.reviews})</span></dd></div>
                <div><dt className="text-ink/45">{tx('منذ', 'Since')}</dt><dd className="mt-1 font-medium text-green">{m.since}</dd></div>
                <div><dt className="text-ink/45">{tx('وقت التجهيز', 'Prep time')}</dt><dd className="mt-1 font-medium text-green">{l(m.prepTime)}</dd></div>
                <div><dt className="text-ink/45">{tx('المنتجات', 'Products')}</dt><dd className="mt-1 font-medium text-green">{PRODUCTS.filter((p) => p.merchant === m.id).length}</dd></div>
              </dl>
            </div>
            <div className="rounded-[28px] bg-cream p-6">
              <h2 className="eyebrow mb-3 text-cocoa">{tx('يوصل إلى', 'Delivers to')}</h2>
              <div className="flex flex-wrap gap-2">{m.cities.map((c) => <span key={c} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-sm text-green"><I.pin size={14} className="text-gold-700" />{l(CITIES.find((x) => x.id === c)!.name)}</span>)}</div>
            </div>
          </aside>
          <div className="lg:col-span-8">
            <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4">
              <Chip active={!cat} onClick={() => setCat(null)}>{tx('الكل', 'All')}</Chip>
              {m.cats.map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{l(CATEGORIES.find((x) => x.id === c)!.name)}</Chip>)}
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-5">{prods.map((p, i) => <ProductCard key={p.id} p={p} index={i} />)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
export { merchantById }
