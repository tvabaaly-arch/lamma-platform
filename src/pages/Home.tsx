import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CATEGORIES, MERCHANTS, OCCASIONS, PRODUCTS, PHOTO_PRODUCTS, productById, merchantById, REVIEW_POOL, COLLECTIONS, inCategory, type RecipientId, type AgeGroup } from '../data/catalog'
import { useI18n } from '../lib/i18n'
import { useStore, defaultVariant, basePrice } from '../lib/store'
import { ProductArt } from '../components/ProductArt'
import { ProductCard } from '../components/ProductCard'
import { MerchantMonogram } from '../components/Layout'
import { I } from '../components/Icons'
import { Button, Chip, cx, DemoTag, Magnetic, Reveal, SectionHead, Stars } from '../components/ui'

const EXAMPLES = [
  { ar: 'عيد ميلاد أمي في الرياض، ميزانيتي ٦٠٠ ريال، تحب الورد الناعم', en: "Mum's birthday in Riyadh, budget SAR 600, she loves soft flowers" },
  { ar: 'ذكرى زواجنا في جدة، حدود ٨٠٠ ريال', en: 'Our anniversary in Jeddah, around SAR 800' },
  { ar: 'هدية شكر لفريق المكتب بالرياض بـ ٤٠٠ ريال', en: 'A thank-you for the office team in Riyadh, SAR 400' },
]

const ease = [0.22, 1, 0.36, 1] as const

/* ---------- Hero: the supplied banner, uncropped, with copy in its open left area ---------- */
function Hero() {
  const { tx, l, isAr } = useI18n()
  const nav = useNavigate()
  const [text, setText] = useState('')
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const imgY = useTransform(scrollYProgress, [0, 1], [0, 60])
  const submit = () => nav('/studio', { state: { text: text.trim() || l(EXAMPLES[0]) } })
  const words = tx('وش المناسبة اللي نجهزها لك؟', 'What are we celebrating for you?').split(' ')

  const copy = () => (
    <div dir={isAr ? 'rtl' : 'ltr'} className="max-w-xl lg:max-w-[460px]">
      <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.7 }} className="eyebrow text-cocoa">
        {tx('هدايا واحتفالات · السعودية', 'Gifts & celebrations · Saudi Arabia')}
      </motion.p>
      <h1 className="mt-3 font-display text-[34px] font-semibold leading-[1.15] text-green sm:text-[44px] lg:text-[40px] xl:text-[54px]">
        {words.map((w, i) => (
          <span key={i} className="-mb-[0.22em] inline-block overflow-hidden pb-[0.22em] align-bottom">
            <motion.span className="inline-block" initial={{ y: '105%' }} animate={{ y: 0 }} transition={{ delay: 0.6 + i * 0.08, duration: 0.9, ease }}>{w}{' '}</motion.span>
          </span>
        ))}
      </h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1, duration: 0.8 }} className="mt-3 text-[16px] leading-relaxed text-ink/65">
        {tx('ورد وكيك وشوكولاتة من أفضل المتاجر، نرتّبها لك في لمّة واحدة وتوصل لين الباب.', 'Flowers, cakes and chocolate from the finest merchants — arranged into one gift and delivered to the door.')}
      </motion.p>
      <motion.form initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.25, duration: 0.7, ease }} onSubmit={(e) => { e.preventDefault(); submit() }}
        className="mt-6 flex items-center gap-2 rounded-full border border-green/10 bg-white/95 p-1.5 ps-5 shadow-lift backdrop-blur focus-within:border-gold">
        <label htmlFor="hero-brief" className="sr-only">{tx('صف المناسبة', 'Describe the occasion')}</label>
        <input id="hero-brief" value={text} onChange={(e) => setText(e.target.value)} placeholder={l(EXAMPLES[0])} className="h-11 min-w-0 flex-1 bg-transparent text-[15px] text-green outline-none placeholder:text-ink/40" />
        <Magnetic strength={0.2}><Button type="submit" className="h-11 px-5">{tx('جهّز لمّتي', 'Plan my gift')}</Button></Magnetic>
      </motion.form>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink/55">
        {OCCASIONS.slice(0, 5).map((o) => (
          <button key={o.id} onClick={() => setText(tx(`${o.name.ar} — ميزانية ٥٠٠ ريال`, `${o.name.en} — budget SAR 500`))} className="underline-offset-4 transition-colors hover:text-green hover:underline">{l(o.name)}</button>
        ))}
      </motion.div>
    </div>
  )

  return (
    <section ref={ref} className="mx-auto max-w-[1440px] px-4 pt-2 md:px-8 md:pt-4">
      <div className="relative" dir="ltr">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} className="relative overflow-hidden rounded-[22px] bg-[#F3EEE9] md:rounded-[32px]">
        {/* Native 23:10 ratio — nothing is cropped or stretched */}
        <motion.div style={{ y: imgY }} className="relative aspect-[23/10] w-full">
          <motion.img
            src="hero/banner-2400.webp"
            srcSet="hero/banner-1280.webp 1280w, hero/banner-2400.webp 2400w"
            sizes="(max-width: 1440px) 100vw, 1440px"
            alt={tx('رجل يقدم سلة هدايا من الورد والشوكولاتة لامرأة مبتسمة', 'A man presenting a basket of roses and chocolates to a smiling woman')}
            className="absolute inset-0 h-full w-full scale-[1.012] object-cover"
            initial={{ scale: 1.08 }} animate={{ scale: 1.012 }} transition={{ duration: 1.8, ease }}
            loading="eager" decoding="async" {...{ fetchpriority: "high" }}
          />
        </motion.div>
      </motion.div>
        {/* One copy block: flows under the photo on small screens, sits in the banner's open left area on desktop */}
        <div className="px-1 pt-7 lg:absolute lg:inset-y-0 lg:left-0 lg:flex lg:w-[44%] lg:items-center lg:px-0 lg:pt-0 lg:ps-[4%]">
          {copy()}
        </div>
      </div>
    </section>
  )
}

function TrustLine() {
  const { tx } = useI18n()
  const items = [tx('توصيل نفس اليوم في ٨ مدن', 'Same-day delivery in 8 cities'), tx('كرت تهنئة مجاني', 'Free greeting card'), tx('مفاجأة رقمية للمستلم', 'Digital surprise for the recipient'), tx('دفع تجريبي آمن', 'Simulated secure checkout')]
  return (
    <div className="mx-auto mt-10 max-w-[1440px] px-4 md:px-8">
      <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 border-y border-green/10 py-4 text-[13px] text-ink/60">
        {items.map((t, i) => <li key={t} className="flex items-center gap-8">{i > 0 && <span className="hidden h-1 w-1 rounded-full bg-gold sm:block" />}{t}</li>)}
      </ul>
    </div>
  )
}

function Categories() {
  const { tx, l } = useI18n()
  const ORDER = ['flowers', 'cakes', 'chocolate', 'balloons', 'kids', 'beauty', 'perfume', 'men', 'custom', 'lifestyle']
  const photoCats = ORDER.map((id) => CATEGORIES.find((c) => c.id === id)!)
  const rest = CATEGORIES.filter((c) => !ORDER.includes(c.id))
  return (
    <section className="mx-auto max-w-[1440px] px-4 pt-20 md:px-8 md:pt-28">
      <Reveal><SectionHead eyebrow={tx('تسوّق حسب القسم', 'Shop by category')} title={tx('كل ما تحتاجه الفرحة', 'Everything a celebration needs')} /></Reveal>
      <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-5 md:overflow-visible md:px-0">
        {photoCats.map((c, i) => (
          <Reveal key={c.id} delay={i * 0.06} className="w-[62%] shrink-0 snap-start sm:w-[40%] md:w-auto">
            <Link to={`/shop/${c.id}`} className="group block">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[24px]">
                <ProductArt art={c.art} className="absolute inset-0 h-full w-full transition-transform duration-[1.2s] ease-out group-hover:scale-[1.05]" label={l(c.name)} sizes="(max-width: 768px) 62vw, 20vw" />
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-2">
                <span className="font-display text-lg font-medium text-green">{l(c.name)}</span>
                <span className="text-[12px] text-ink/45">{PRODUCTS.filter((p) => inCategory(p, c.id)).length} {tx('منتج', 'items')}</span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {rest.map((c) => <Link key={c.id} to={`/shop/${c.id}`} className="rounded-full border border-green/12 px-4 py-2 text-sm text-green transition hover:border-green/40 hover:bg-white">{l(c.name)}</Link>)}
      </div>
    </section>
  )
}

function Editorial() {
  const { tx, l, money } = useI18n()
  const overrides = useStore((s) => s.overrides)
  const feature = productById('ph05')!
  const side = ['ph04', 'ph09', 'ph21', 'ph02'].map((id) => productById(id)!)
  return (
    <section className="mx-auto max-w-[1440px] px-4 pt-20 md:px-8 md:pt-28">
      <Reveal><SectionHead eyebrow={tx('اختيارات الأسبوع', 'Editor’s picks')} title={tx('قطع تستاهل المناسبة', 'Pieces worthy of the moment')} action={<Button variant="outline" to="/shop">{tx('تسوّق الكل', 'Shop all')}</Button>} /></Reveal>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Reveal className="lg:col-span-6">
          <Link to={`/product/${feature.id}`} className="group block">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] lg:aspect-auto lg:h-[min(76vh,760px)]">
              <ProductArt art={feature.art} className="absolute inset-0 h-full w-full transition-transform duration-[1.4s] ease-out group-hover:scale-[1.04]" label={l(feature.name)} sizes="(max-width: 1024px) 100vw, 50vw" />
            </div>
            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-[12px] text-ink/50">{l(merchantById(feature.merchant).name)}</p>
                <h3 className="font-display text-2xl font-medium text-green">{l(feature.name)}</h3>
                <p className="mt-1 max-w-md text-sm text-ink/60">{l(feature.desc)}</p>
              </div>
              <span className="tabular shrink-0 font-display text-xl text-green">{money(basePrice(feature, overrides))}</span>
            </div>
          </Link>
        </Reveal>
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:col-span-6">
          {side.map((p, i) => <ProductCard key={p.id} p={p} index={i} />)}
        </div>
      </div>
    </section>
  )
}

function BirthdayBanner() {
  const { tx } = useI18n()
  const p = productById('ph22')!
  return (
    <section className="mx-auto max-w-[1440px] px-4 pt-20 md:px-8 md:pt-28">
      <Reveal>
        <div className="relative" dir="ltr">
        <div className="relative overflow-hidden rounded-[22px] bg-[#EFE6DC] md:rounded-[32px]">
          <div className="relative aspect-[1200/565] w-full">
            <img src="products/bundle-birthday.webp" alt={tx('مجموعة عيد ميلاد: ورد ليلكي ودبدوب وكيكة صغيرة', 'Birthday set: lilac roses, teddy and a mini cake')} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full scale-[1.02] object-cover" />
          </div>
        </div>
          <div className="pt-6 md:absolute md:inset-y-0 md:left-0 md:flex md:w-[40%] md:items-center md:pt-0 md:ps-[5%]">
            <Copy />
          </div>
        </div>
      </Reveal>
    </section>
  )
  function Copy() {
    const { tx: t, isAr, money } = useI18n()
    return (
      <div dir={isAr ? 'rtl' : 'ltr'} className="max-w-sm">
        <p className="eyebrow text-cocoa">{t('مجموعة جديدة', 'New collection')}</p>
        <h2 className="mt-2 font-display text-3xl font-semibold leading-tight text-green lg:text-[42px]">{t('لمّة عيد الميلاد', 'The Birthday Set')}</h2>
        <p className="mt-2 text-[15px] text-ink/65">{t('ورد ودبدوب وكيكة في طلب واحد', 'Flowers, a teddy and cake in one order')} · <span className="tabular">{money(p.price)}</span></p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button to={`/product/${p.id}`}>{t('اطلبها الآن', 'Order now')}</Button>
          <Button variant="outline" to="/shop?occasion=birthday">{t('كل هدايا الميلاد', 'All birthday gifts')}</Button>
        </div>
      </div>
    )
  }
}

function Featured() {
  const { tx } = useI18n()
  const [tab, setTab] = useState<'best' | 'new' | 'sameday'>('best')
  const list = useMemo(() => {
    const src = PHOTO_PRODUCTS
    if (tab === 'best') return [...src].sort((a, b) => b.reviews * b.rating - a.reviews * a.rating).slice(0, 8)
    if (tab === 'new') return [...src].filter((p) => p.badge === 'new' || p.badge === 'limited').concat(src.filter((p) => p.badge !== 'new' && p.badge !== 'limited')).slice(0, 8)
    return src.filter((p) => p.leadHours <= 3).slice(0, 8)
  }, [tab])
  return (
    <section className="mx-auto max-w-[1440px] px-4 pt-20 md:px-8 md:pt-28">
      <Reveal>
        <SectionHead eyebrow={tx('الأكثر طلباً', 'Bestsellers')} title={tx('اللي الكل يطلبه هالأسبوع', 'What everyone’s ordering this week')}
          action={<div className="flex gap-2">{([['best', tx('الأكثر طلباً', 'Bestsellers')], ['new', tx('جديد', 'New')], ['sameday', tx('نفس اليوم', 'Same day')]] as const).map(([k, v]) => <Chip key={k} active={tab === k} onClick={() => setTab(k)}>{v}</Chip>)}</div>} />
      </Reveal>
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {list.map((p, i) => <ProductCard key={p.id} p={p} index={i} />)}
        </motion.div>
      </AnimatePresence>
    </section>
  )
}

function StudioTeaser() {
  const { tx, l, money } = useI18n()
  const nav = useNavigate()
  const picks = [
    { t: tx('أنيقة وهادئة', 'Quietly Elegant'), ids: ['ph01', 'ph16'] },
    { t: tx('فرحة ملوّنة', 'Colourful Joy'), ids: ['ph09', 'ph13'] },
    { t: tx('بصمة لمّة', 'Lamma Signature'), ids: ['ph07', 'ph21'] },
  ]
  return (
    <section className="mx-auto max-w-[1440px] px-4 pt-20 md:px-8 md:pt-28">
      <div className="grid grid-cols-1 items-center gap-10 rounded-[32px] bg-cream px-6 py-12 md:px-12 lg:grid-cols-12 lg:py-16">
        <Reveal className="lg:col-span-5">
          <p className="eyebrow text-cocoa">{tx('استوديو لمّة', 'Lamma Studio')}</p>
          <h2 className="mt-3 font-display text-[32px] font-semibold leading-tight text-green md:text-[46px]">{tx('سطر واحد، وثلاث هدايا جاهزة', 'One line. Three ready gifts.')}</h2>
          <p className="mt-4 max-w-md leading-relaxed text-ink/65">{tx('اكتب المناسبة والشخص والميزانية والمدينة. نقترح ثلاث لمّات من منتجات متوفرة فعلاً، وتعدّلها كما تحب والسعر يتحدث فوراً.', 'Write the occasion, recipient, budget and city. We suggest three bundles from products actually in stock — tailor them and watch the total update.')}</p>
          <Magnetic className="mt-8"><Button size="lg" onClick={() => nav('/studio')}>{tx('جرّب الاستوديو', 'Try the Studio')}</Button></Magnetic>
        </Reveal>
        <div className="grid grid-cols-3 gap-3 lg:col-span-7">
          {picks.map((b, i) => (
            <Reveal key={b.t} delay={i * 0.12}>
              <button onClick={() => nav('/studio')} className="group block w-full text-start">
                <div className="grid gap-2">
                  {b.ids.map((id, k) => (
                    <div key={id} className={cx('relative overflow-hidden rounded-[18px]', k === 0 ? 'aspect-[4/5]' : 'aspect-[4/3]')}>
                      <ProductArt art={productById(id)!.art} className="absolute inset-0 h-full w-full transition-transform duration-700 group-hover:scale-105" sizes="20vw" />
                    </div>
                  ))}
                </div>
                <div className="mt-3 font-display text-[15px] font-medium text-green">{b.t}</div>
                <div className="tabular text-[13px] text-ink/55">{money(b.ids.reduce((a, id) => a + productById(id)!.price, 0))}</div>
              </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export const CURATED = [
  { id: 'cb1', title: { ar: 'لمّة الأمهات', en: 'For Mum, With Love' }, sub: { ar: 'باقة ربيع وعلبة شوكولاتة', en: 'A spring bouquet and a chocolate box' }, ids: ['ph01', 'ph16'] },
  { id: 'cb2', title: { ar: 'عيد ميلاد كامل', en: 'The Full Birthday' }, sub: { ar: 'كيكة وبالونات وورد', en: 'Cake, balloons and flowers' }, ids: ['ph09', 'ph13', 'ph08'] },
  { id: 'cb3', title: { ar: 'حب وامتنان', en: 'Love & Gratitude' }, sub: { ar: 'جوري أحمر وقلب مخملي وشوكولاتة', en: 'Red roses, velvet heart and chocolate' }, ids: ['ph07', 'ph10', 'ph21'] },
]

function Bundles() {
  const { tx, l, money } = useI18n()
  const add = useStore((s) => s.addManyToCart)
  const overrides = useStore((s) => s.overrides)
  return (
    <section className="mx-auto max-w-[1440px] px-4 pt-20 md:px-8 md:pt-28">
      <Reveal><SectionHead eyebrow={tx('لمّات جاهزة', 'Curated bundles')} title={tx('منسّقة بعناية، بضغطة وحدة', 'Thoughtfully paired, in one tap')} sub={tx('منتجات من متاجر مختلفة توصل معاً في نفس الموعد.', 'Products from different merchants, delivered together.')} /></Reveal>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {CURATED.map((b, i) => {
          const items = b.ids.map((id) => productById(id)!)
          const total = items.reduce((a, p) => a + basePrice(p, overrides), 0)
          return (
            <Reveal key={b.id} delay={i * 0.1}>
              <article className="group">
                <div className={cx('grid gap-2 overflow-hidden rounded-[26px]', items.length === 3 ? 'grid-cols-2 grid-rows-2' : 'grid-cols-2')} style={{ aspectRatio: '1 / 1' }}>
                  {items.map((p, k) => (
                    <Link key={p.id} to={`/product/${p.id}`} className={cx('relative overflow-hidden', items.length === 3 && k === 0 && 'row-span-2')}>
                      <ProductArt art={p.art} className="absolute inset-0 h-full w-full transition-transform duration-1000 group-hover:scale-[1.04]" label={l(p.name)} sizes="(max-width: 768px) 50vw, 17vw" />
                    </Link>
                  ))}
                </div>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <h3 className="font-display text-xl font-medium text-green">{l(b.title)}</h3>
                    <p className="text-sm text-ink/55">{l(b.sub)} · <span className="tabular">{money(total)}</span></p>
                  </div>
                  <Button size="sm" onClick={() => add(items.map((p) => ({ productId: p.id, variant: defaultVariant(p), qty: 1, bundle: b.id })))}>{tx('أضف اللمّة', 'Add bundle')}</Button>
                </div>
              </article>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}

function Moods() {
  const { tx, l } = useI18n()
  const moods = [
    { t: { ar: 'رومانسية', en: 'Romance' }, d: { ar: 'جوري أحمر وقلوب', en: 'Red roses & hearts' }, ids: ['ph07', 'ph10'], q: 'anniversary' },
    { t: { ar: 'احتفال', en: 'Celebration' }, d: { ar: 'كيك وبالونات', en: 'Cakes & balloons' }, ids: ['ph09', 'ph14'], q: 'birthday' },
    { t: { ar: 'ضيافة', en: 'Hospitality' }, d: { ar: 'شوكولاتة وتنسيقات', en: 'Chocolate & arrangements' }, ids: ['ph15', 'ph06'], q: 'eid' },
  ]
  return (
    <section className="mx-auto max-w-[1440px] px-4 pt-20 md:px-8 md:pt-28">
      <Reveal><SectionHead eyebrow={tx('تسوّق حسب الإحساس', 'Shop by mood')} title={tx('لكل لحظة طابعها', 'Every moment has its mood')} /></Reveal>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {moods.map((m, i) => (
          <Reveal key={i} delay={i * 0.1}>
            <Link to={`/shop?occasion=${m.q}`} className="group block">
              <div className="grid aspect-[4/5] grid-rows-[3fr_2fr] gap-2 overflow-hidden rounded-[26px]">
                {m.ids.map((id) => <div key={id} className="relative overflow-hidden"><ProductArt art={productById(id)!.art} className="absolute inset-0 h-full w-full transition-transform duration-[1.2s] group-hover:scale-105" sizes="(max-width: 768px) 100vw, 33vw" /></div>)}
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <h3 className="font-display text-2xl font-medium text-green">{l(m.t)}</h3>
                <span className="text-sm text-ink/55">{l(m.d)}</span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function MerchantsRow() {
  const { tx, l } = useI18n()
  const list = [...MERCHANTS].sort((a, b) => PHOTO_PRODUCTS.filter((p) => p.merchant === b.id).length - PHOTO_PRODUCTS.filter((p) => p.merchant === a.id).length)
  return (
    <section className="mx-auto max-w-[1440px] px-4 pt-20 md:px-8 md:pt-28">
      <Reveal><SectionHead eyebrow={tx('المتاجر', 'Merchants')} title={tx('صنّاع الفرحة في مدنك', 'The makers behind the joy')} action={<Button variant="outline" to="/merchants">{tx('كل المتاجر', 'All merchants')}</Button>} /></Reveal>
      <div className="no-scrollbar -mx-4 flex snap-x gap-5 overflow-x-auto px-4 pb-2">
        {list.map((m) => {
          const sample = PRODUCTS.filter((p) => p.merchant === m.id).slice(0, 2)
          return (
            <Link key={m.id} to={`/merchant/${m.id}`} className="group w-[260px] shrink-0 snap-start">
              <div className="grid h-40 grid-cols-2 gap-1.5 overflow-hidden rounded-[22px]">
                {sample.map((p) => <div key={p.id} className="relative overflow-hidden"><ProductArt art={p.art} className="absolute inset-0 h-full w-full transition-transform duration-700 group-hover:scale-105" sizes="130px" /></div>)}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <MerchantMonogram m={m} small />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><span className="truncate font-medium text-green">{l(m.name)}</span><DemoTag /></div>
                  <div className="truncate text-[12px] text-ink/50">{l(m.tagline)}</div>
                </div>
                <Stars value={m.rating} />
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function HowItWorks() {
  const { tx } = useI18n()
  const steps = [
    [tx('قل لنا المناسبة', 'Tell us the occasion'), tx('المناسبة، الشخص، الميزانية، والمدينة.', 'Occasion, recipient, budget and city.')],
    [tx('اختر لمّتك وعدّلها', 'Pick & tailor'), tx('بدّل وأضف والسعر يتحدث فوراً.', 'Swap and add — the total updates instantly.')],
    [tx('اكتب الكرت', 'Write the card'), tx('كرت تهنئة ومفاجأة رقمية للمستلم.', 'A greeting card plus a digital surprise.')],
    [tx('تابعها لين توصل', 'Track to the door'), tx('كل متجر يحدّث حالة الطلب لحظياً.', 'Each merchant updates status live.')],
  ]
  return (
    <section className="mx-auto max-w-[1440px] px-4 pt-20 md:px-8 md:pt-28">
      <Reveal><SectionHead eyebrow={tx('كيف تعمل لمّة', 'How it works')} title={tx('أربع خطوات، وفرحة كاملة', 'Four steps to a complete celebration')} /></Reveal>
      <ol className="grid grid-cols-1 gap-8 border-t border-green/10 pt-8 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(([t, d], i) => (
          <Reveal key={i} delay={i * 0.08}>
            <li>
              <span className="font-serif text-5xl font-light text-gold">{i + 1}</span>
              <h3 className="mt-3 font-display text-lg font-medium text-green">{t}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink/60">{d}</p>
            </li>
          </Reveal>
        ))}
      </ol>
    </section>
  )
}

function Voices() {
  const { tx, l } = useI18n()
  return (
    <section className="mx-auto max-w-[1440px] px-4 pt-20 md:px-8 md:pt-28">
      <Reveal><SectionHead eyebrow={tx('آراء العملاء (تجريبية)', 'Customer voices (demo)')} title={tx('فرحة توصل، وذكرى تبقى', 'Joy delivered, memories kept')} /></Reveal>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {REVIEW_POOL.slice(0, 3).map((r, i) => (
          <Reveal key={i} delay={i * 0.08}>
            <figure className="h-full rounded-[24px] bg-white p-7 shadow-soft">
              <blockquote className="font-display text-[17px] leading-relaxed text-green">“{l(r.text)}”</blockquote>
              <figcaption className="mt-5 text-sm text-ink/55">{l(r.name)}</figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function Collections() {
  const { tx, l } = useI18n()
  return (
    <section className="mx-auto max-w-[1440px] px-4 pt-20 md:px-8 md:pt-28">
      <Reveal><SectionHead eyebrow={tx('تسوّق حسب الشخص', 'Shop by recipient')} title={tx('لكل شخص هدية تشبهه', 'A gift that suits every person')} sub={tx('مجموعات منسّقة للأطفال والمولود وله ولها، والهدايا المخصصة — والاهتمامات دائماً من اختيارك.', 'Curated edits for kids, babies, her, him and personalised gifts — interests are always yours to choose.')} /></Reveal>
      <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
        {COLLECTIONS.map((c, i) => (
          <Reveal key={c.id} delay={i * 0.07} className="w-[70%] shrink-0 snap-start sm:w-[42%] lg:w-auto">
            <Link to={`/shop?for=${c.id}`} className="group block">
              <div className="relative aspect-[3/4] overflow-hidden rounded-[26px] bg-cream">
                <ProductArt art={{ k: 'giftbox', c: 0, img: c.img }} className="absolute inset-0 h-full w-full transition-transform duration-[1.2s] ease-out group-hover:scale-[1.05]" label={l(c.name)} sizes="(max-width: 1024px) 70vw, 20vw" />
                <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-green-950/55 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-cream-50">
                  <div className="font-display text-2xl font-semibold">{l(c.name)}</div>
                  <div className="mt-1 text-[13px] leading-snug text-cream/85">{l(c.blurb)}</div>
                </div>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function FinderBand() {
  const { tx } = useI18n()
  const nav = useNavigate()
  const quick: { label: string; recipient: RecipientId; age: AgeGroup; img: string }[] = [
    { label: tx('طفل ٤–٧', 'Child 4–7'), recipient: 'child', age: 'kids', img: 'kid-art-kit' },
    { label: tx('مراهق', 'Teen'), recipient: 'child', age: 'teen', img: 'kid-science-kit' },
    { label: tx('مولود', 'Newborn'), recipient: 'baby', age: 'baby', img: 'baby-knit-set' },
    { label: tx('زميل عمل', 'Colleague'), recipient: 'colleague', age: 'adult', img: 'men-pen-notebook' },
  ]
  return (
    <section className="mx-auto max-w-[1440px] px-4 pt-20 md:px-8 md:pt-28">
      <div className="grid grid-cols-1 items-center gap-10 rounded-[32px] bg-green px-6 py-12 text-cream-50 md:px-12 lg:grid-cols-12">
        <Reveal className="lg:col-span-5">
          <p className="eyebrow text-gold">{tx('دليل الهدايا الذكي', 'Smart Gift Finder')}</p>
          <h2 className="mt-3 font-display text-[32px] font-semibold leading-tight md:text-[44px]">{tx('محتار؟ ست أسئلة وتلقى الهدية', 'Stuck? Six questions to the right gift')}</h2>
          <p className="mt-4 max-w-md leading-relaxed text-cream/75">{tx('المناسبة، الشخص، العمر، العلاقة، الاهتمامات والميزانية — ونقترح ثلاث تشكيلات تناسب عمره وذوقه.', 'Occasion, recipient, age, relationship, interests and budget — and we suggest three combinations that fit their age and taste.')}</p>
          <Magnetic className="mt-8"><Button variant="gold" size="lg" onClick={() => nav('/finder')}>{tx('ابدأ الدليل', 'Start the finder')}</Button></Magnetic>
        </Reveal>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:col-span-7">
          {quick.map((q, i) => (
            <Reveal key={q.label} delay={i * 0.08}>
              <button onClick={() => nav('/finder', { state: { recipient: q.recipient, age: q.age } })} className="group block w-full text-start">
                <div className="relative aspect-[3/4] overflow-hidden rounded-[20px] bg-cream">
                  <ProductArt art={{ k: 'giftbox', c: 0, img: q.img }} className="absolute inset-0 h-full w-full transition-transform duration-700 group-hover:scale-105" sizes="20vw" />
                </div>
                <div className="mt-2 text-sm text-cream/90">{q.label}</div>
              </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <>
      <Hero />
      <TrustLine />
      <Collections />
      <Categories />
      <FinderBand />
      <Editorial />
      <BirthdayBanner />
      <Featured />
      <StudioTeaser />
      <Bundles />
      <Moods />
      <MerchantsRow />
      <HowItWorks />
      <Voices />
    </>
  )
}
