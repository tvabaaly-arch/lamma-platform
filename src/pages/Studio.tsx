import { isoLocal, parseLocal } from '../lib/dates'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CITIES, OCCASIONS, RECIPIENTS, merchantById, productById, type CityId, type OccasionId, type RecipientId, type AgeGroup, type Interest, type Relationship } from '../data/catalog'
import { useI18n } from '../lib/i18n'
import { useStore, unitPrice, defaultVariant, DELIVERY_PER_MERCHANT, type Brief } from '../lib/store'
import { parseBrief, generateBundles, alternativesFor, addSuggestions, AGE_GROUPS, INTERESTS, RELATIONSHIPS, defaultAge, defaultRelationship, type Bundle, type BundleItem } from '../lib/ai'
import { ProductArt } from '../components/ProductArt'
import { LogoMark } from '../components/Logo'
import { I } from '../components/Icons'
import { variantText } from '../components/Layout'
import { Button, Chip, cx, Magnetic, OccasionGlyph, PatternBg, QtyStepper } from '../components/ui'

const STYLES = [
  { id: '', ar: 'بدون تفضيل', en: 'No preference' },
  { id: 'simple', ar: 'بسيط وهادئ', en: 'Simple & calm' },
  { id: 'fun', ar: 'مبهج وملوّن', en: 'Fun & colourful' },
  { id: 'luxe', ar: 'فخم', en: 'Luxurious' },
]

function nextDays(n: number) {
  return Array.from({ length: n }).map((_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return isoLocal(d) })
}

function BudgetMeter({ total, budget }: { total: number; budget: number }) {
  const { tx, money } = useI18n()
  const pct = Math.min(100, (total / budget) * 100)
  const over = total > budget
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[12px]">
        <span className={over ? 'font-medium text-blush-700' : 'text-green/70'}>
          {over ? tx(`أعلى من الميزانية بـ ${money(total - budget)}`, `${money(total - budget)} over budget`) : tx(`متبقي ${money(budget - total)}`, `${money(budget - total)} left`)}
        </span>
        <span className="tabular text-ink/50">{money(total)} / {money(budget)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-green/10" role="meter" aria-valuemin={0} aria-valuemax={budget} aria-valuenow={total} aria-label={tx('الميزانية', 'Budget')}>
        <motion.div className={cx('h-full rounded-full', over ? 'bg-blush-700' : 'bg-gradient-to-r from-green to-gold')} initial={false} animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
      </div>
    </div>
  )
}

export default function Studio() {
  const { tx, l, money, date, isAr } = useI18n()
  const loc = useLocation() as { state?: { text?: string; brief?: Brief; choose?: number } }
  const nav = useNavigate()
  const { overrides, city: storeCity, setBrief, addManyToCart, studio, showToast } = useStore()

  const [text, setText] = useState(loc.state?.text ?? studio.brief?.text ?? '')
  const [occasion, setOccasion] = useState<OccasionId>(studio.brief?.occasion ?? 'birthday')
  const [recipient, setRecipient] = useState<RecipientId>(studio.brief?.recipient ?? 'mother')
  const [budget, setBudget] = useState(studio.brief?.budget ?? 600)
  const [city, setCity] = useState<CityId>(studio.brief?.city ?? storeCity)
  const [dateSel, setDateSel] = useState<string>(studio.brief?.date ?? nextDays(2)[1])
  const [style, setStyle] = useState(studio.brief?.style ?? '')
  const [age, setAge] = useState<AgeGroup>(studio.brief?.age ?? defaultAge(studio.brief?.recipient ?? 'mother'))
  const [relationship, setRelationship] = useState<Relationship>(studio.brief?.relationship ?? defaultRelationship(studio.brief?.recipient ?? 'mother'))
  const [interests, setInterests] = useState<Interest[]>(studio.brief?.interests ?? [])
  const pendingChoose = useRef<number | null>(null)
  const [found, setFound] = useState<string[]>([])
  const [phase, setPhase] = useState<'brief' | 'thinking' | 'results'>('brief')
  const [result, setResult] = useState<{ bundles: Bundle[]; poolNotes: { ar: string; en: string }[] } | null>(null)
  const [brief, setBriefLocal] = useState<Brief | null>(null)
  const [sel, setSel] = useState<number | null>(null)
  const [items, setItems] = useState<BundleItem[]>([])
  const [swapFor, setSwapFor] = useState<string | null>(null)
  const [mode, setMode] = useState<'table' | 'box' | 'flat'>('table')
  const builderRef = useRef<HTMLDivElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Parse incoming text automatically
  useEffect(() => {
    const st = loc.state
    if (st?.brief) {
      const b = st.brief
      setOccasion(b.occasion); setRecipient(b.recipient); setBudget(b.budget); setCity(b.city)
      if (b.age) setAge(b.age); if (b.relationship) setRelationship(b.relationship); setInterests(b.interests ?? [])
      pendingChoose.current = st.choose ?? null
      generate({ ...b, date: b.date ?? dateSel })
    } else if (st?.text) applyParse(st.text, true)
  }, []) // eslint-disable-line
  // Arriving from the Gift Finder with a chosen bundle: open it in the builder once results exist
  useEffect(() => { if (result && pendingChoose.current !== null) { const i = pendingChoose.current; pendingChoose.current = null; choose(i) } }, [result]) // eslint-disable-line

  function applyParse(t: string, autoGen = false) {
    const r = parseBrief(t)
    if (r.occasion) setOccasion(r.occasion)
    if (r.recipient) setRecipient(r.recipient)
    if (r.budget) setBudget(r.budget)
    if (r.city) setCity(r.city)
    if (r.style) setStyle(r.style)
    if (r.recipient) { setAge(r.age ?? defaultAge(r.recipient)); setRelationship(defaultRelationship(r.recipient)) } else if (r.age) setAge(r.age)
    if (r.interests) setInterests(r.interests)
    setFound(r.found)
    if (autoGen) generate({ text: t, occasion: r.occasion ?? occasion, recipient: r.recipient ?? recipient, budget: r.budget ?? budget, city: r.city ?? city, date: dateSel, style: r.style ?? style, age: r.age ?? (r.recipient ? defaultAge(r.recipient) : age), relationship: r.recipient ? defaultRelationship(r.recipient) : relationship, interests: r.interests ?? interests })
  }

  function generate(b?: Brief) {
    const br: Brief = b ?? { text, occasion, recipient, budget, city, date: dateSel, style, age, relationship, interests }
    setBriefLocal(br)
    setBrief(br)
    setPhase('thinking')
    setSel(null)
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    setTimeout(() => {
      setResult(generateBundles(br, overrides))
      setPhase('results')
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    }, reduce ? 50 : 1900)
  }

  function choose(i: number) {
    if (!result) return
    setSel(i)
    setItems(result.bundles[i].items.map((x) => ({ ...x })))
    setTimeout(() => builderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  const priceOf = (it: BundleItem) => unitPrice(productById(it.productId)!, it.variant, overrides) * it.qty
  const bundleTotal = (its: BundleItem[]) => its.reduce((a, it) => a + priceOf(it), 0)
  const total = bundleTotal(items)
  const merchants = [...new Set(items.map((it) => productById(it.productId)!.merchant))]
  const deliveryFee = merchants.length * DELIVERY_PER_MERCHANT

  const swapOptions = useMemo(() => (swapFor && brief ? alternativesFor(swapFor, brief, overrides, items.map((x) => x.productId)).slice(0, 6) : []), [swapFor, brief, overrides, items])
  const adds = useMemo(() => (brief ? addSuggestions(brief, overrides, items.map((x) => x.productId)) : []), [brief, overrides, items])

  function fitToBudget() {
    if (!brief) return
    let its = items.map((x) => ({ ...x }))
    let guard = 0
    while (bundleTotal(its) > brief.budget && guard++ < 12) {
      // 1) reset upgraded variants; 2) swap priciest to cheaper alt; 3) drop the priciest extra
      const up = its.findIndex((it) => JSON.stringify(it.variant) !== JSON.stringify(defaultVariant(productById(it.productId)!)) || it.qty > 1)
      if (up >= 0) { its[up] = { ...its[up], variant: defaultVariant(productById(its[up].productId)!), qty: 1 }; continue }
      const sorted = [...its].sort((a, b) => priceOf(b) - priceOf(a))
      const top = sorted[0]
      const alt = alternativesFor(top.productId, brief, overrides, its.map((x) => x.productId)).filter((p) => unitPrice(p, defaultVariant(p), overrides) < priceOf(top)).sort((a, b) => unitPrice(b, defaultVariant(b), overrides) - unitPrice(a, defaultVariant(a), overrides))
      const fitting = alt.find((p) => bundleTotal(its) - priceOf(top) + unitPrice(p, defaultVariant(p), overrides) <= brief.budget) ?? alt[alt.length - 1]
      if (fitting) its = its.map((x) => (x.productId === top.productId ? { productId: fitting.id, variant: defaultVariant(fitting), qty: 1, reason: { ar: 'بديل أوفر ضمن الميزانية', en: 'A thriftier swap within budget' } } : x))
      else if (its.length > 1) its = its.filter((x) => x !== sorted[0])
      else break
    }
    setItems(its)
    showToast(bundleTotal(its) <= brief.budget ? tx('عدّلنا اللمّة لتناسب ميزانيتك', 'Bundle adjusted to fit your budget') : tx('هذا أقرب خيار ممكن للميزانية', 'This is as close to budget as possible'))
  }

  function addBundleToCart() {
    addManyToCart(items.map((it) => ({ productId: it.productId, variant: it.variant, qty: it.qty, bundle: `studio-${result?.bundles[sel ?? 0].id}` })))
  }

  const thinkingSteps = [
    tx(`نقرأ المناسبة: ${l(OCCASIONS.find((o) => o.id === occasion)!.name)}`, `Reading the occasion: ${l(OCCASIONS.find((o) => o.id === occasion)!.name)}`),
    tx(`نفلتر المتاجر اللي توصل ${l(CITIES.find((c) => c.id === city)!.name)}`, `Filtering merchants that deliver to ${l(CITIES.find((c) => c.id === city)!.name)}`),
    tx('نتحقق من وقت التجهيز والمخزون', 'Checking prep time and stock'),
    tx(`نوازن الاقتراحات ضمن ${money(budget)}`, `Balancing picks within ${money(budget)}`),
  ]

  return (
    <div className="pb-10">
      {/* Intro + brief */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-32 start-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-gold-100/70 blur-3xl" aria-hidden />
        <div className="relative mx-auto max-w-[1180px] px-4 pt-8 md:px-8 md:pt-14">
          <div className="text-center">
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 120 }} className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-[28px] bg-white shadow-lift">
              <LogoMark className="h-12 w-12" animate />
            </motion.div>
            <div className="eyebrow text-cocoa">{tx('استوديو لمّة', 'Lamma AI Studio')}</div>
            <h1 className="mx-auto mt-3 max-w-3xl font-display text-[36px] font-semibold leading-tight text-green md:text-[56px]">{tx('صف المناسبة، ونرتّب لك الفرحة', 'Describe the moment. We’ll arrange the joy.')}</h1>
            <p className="mx-auto mt-3 max-w-xl text-ink/60">{tx('محرك اقتراحات قائم على قواعد واضحة يعمل على كتالوج العرض — بدون اتصال بخدمة ذكاء اصطناعي خارجية.', 'A transparent, rule-based suggestion engine running on the demo catalogue — not connected to an external AI service.')}</p>
          </div>

          <div className="mx-auto mt-10 max-w-4xl rounded-[36px] border border-green/10 bg-white p-4 shadow-lift md:p-7">
            <label htmlFor="brief" className="mb-2 block text-sm font-medium text-green">{tx('اكتبها بكلامك', 'In your own words')}</label>
            <div className="flex flex-col gap-3 md:flex-row">
              <textarea id="brief" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder={tx('مثال: عيد ميلاد أمي في الرياض، ميزانيتي ٦٠٠ ريال، تحب الورد', 'e.g. My mum’s birthday in Riyadh, budget SAR 600, she loves flowers')} className="min-h-[64px] flex-1 resize-none rounded-2xl border border-green/10 bg-cream-50 px-4 py-3 text-green outline-none focus:border-gold" />
              <Button variant="outline" className="md:h-auto" onClick={() => applyParse(text)} disabled={!text.trim()}><I.wand size={16} />{tx('افهم طلبي', 'Read my brief')}</Button>
            </div>
            <AnimatePresence>
              {found.length > 0 && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0 }} className="mt-2 flex items-center gap-1.5 text-[13px] text-green/70">
                  <I.check size={14} className="text-gold-700" />{tx(`فهمنا ${found.length} من ٤: `, `Understood ${found.length} of 4: `)}{found.map((f) => ({ occasion: tx('المناسبة', 'occasion'), recipient: tx('الشخص', 'recipient'), budget: tx('الميزانية', 'budget'), city: tx('المدينة', 'city') }[f])).join(tx('، ', ', '))} — {tx('راجع الباقي تحت', 'check the rest below')}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <div className="mb-2 text-sm font-medium text-green">{tx('المناسبة', 'Occasion')}</div>
                <div className="flex flex-wrap gap-1.5">
                  {OCCASIONS.map((o) => (
                    <button key={o.id} onClick={() => setOccasion(o.id)} aria-pressed={occasion === o.id} className={cx('flex items-center gap-1 rounded-full border py-1 pe-3 ps-1 text-[13px] transition', occasion === o.id ? 'border-green bg-green text-cream-50' : 'border-green/12 text-green hover:border-green/30')}>
                      <span className={cx('grid h-6 w-6 place-items-center rounded-full', occasion === o.id ? 'bg-cream-50' : 'bg-cream')}><OccasionGlyph id={o.id} className="h-5 w-5" /></span>{l(o.name)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 text-sm font-medium text-green">{tx('لمين الهدية؟', 'Who is it for?')}</div>
                <div className="flex flex-wrap gap-1.5">{RECIPIENTS.map((r) => <Chip key={r.id} active={recipient === r.id} onClick={() => { setRecipient(r.id); setAge(defaultAge(r.id)); setRelationship(defaultRelationship(r.id)) }} className="h-8 px-3 text-[13px]">{l(r.name)}</Chip>)}</div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="sage" className="mb-1 block text-[12px] text-ink/55">{tx('الفئة العمرية', 'Age group')}</label>
                    <select id="sage" value={age} onChange={(e) => setAge(e.target.value as AgeGroup)} className="h-10 w-full rounded-xl border border-green/15 bg-cream-50 px-2 text-sm text-green">{AGE_GROUPS.map((a) => <option key={a.id} value={a.id}>{l(a.name)}</option>)}</select>
                  </div>
                  <div>
                    <label htmlFor="srel" className="mb-1 block text-[12px] text-ink/55">{tx('العلاقة', 'Relationship')}</label>
                    <select id="srel" value={relationship} onChange={(e) => setRelationship(e.target.value as Relationship)} className="h-10 w-full rounded-xl border border-green/15 bg-cream-50 px-2 text-sm text-green">{RELATIONSHIPS.map((r) => <option key={r.id} value={r.id}>{l(r.name)}</option>)}</select>
                  </div>
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="mb-2 text-sm font-medium text-green">{tx('اهتماماته (اختياري، حتى ٤)', 'Their interests (optional, up to 4)')}</div>
                <div className="flex flex-wrap gap-1.5">{INTERESTS.map((i) => <Chip key={i.id} active={interests.includes(i.id)} onClick={() => setInterests((x) => (x.includes(i.id) ? x.filter((y) => y !== i.id) : x.length >= 4 ? x : [...x, i.id]))} className="h-8 px-3 text-[13px]">{l(i.name)}</Chip>)}</div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between"><label htmlFor="budget" className="text-sm font-medium text-green">{tx('الميزانية', 'Budget')}</label>
                  <div className="flex items-center gap-1 rounded-full border border-green/15 px-3 py-1" dir="ltr"><span className="text-xs text-ink/50">SAR</span><input aria-label={tx('الميزانية بالريال', 'Budget in SAR')} type="number" min={50} max={20000} value={budget} onChange={(e) => setBudget(Math.max(50, Math.min(20000, +e.target.value || 50)))} className="tabular w-16 bg-transparent text-end text-sm font-semibold text-green outline-none" /></div>
                </div>
                <input id="budget" type="range" min={100} max={3000} step={25} value={Math.min(3000, budget)} onChange={(e) => setBudget(+e.target.value)} className="w-full" dir="ltr" />
                <div className="mt-2 flex gap-1.5">{[300, 600, 1000, 2000].map((v) => <button key={v} onClick={() => setBudget(v)} className={cx('tabular rounded-full px-3 py-1 text-xs', budget === v ? 'bg-gold text-green-950' : 'bg-cream text-green')}>{v}</button>)}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="scity" className="mb-2 block text-sm font-medium text-green">{tx('مدينة التوصيل', 'Delivery city')}</label>
                  <select id="scity" value={city} onChange={(e) => setCity(e.target.value as CityId)} className="h-11 w-full rounded-2xl border border-green/15 bg-cream-50 px-3 text-sm text-green outline-none">{CITIES.map((c) => <option key={c.id} value={c.id}>{l(c.name)}</option>)}</select>
                </div>
                <div>
                  <label htmlFor="sstyle" className="mb-2 block text-sm font-medium text-green">{tx('الطابع', 'Style')}</label>
                  <select id="sstyle" value={style} onChange={(e) => setStyle(e.target.value)} className="h-11 w-full rounded-2xl border border-green/15 bg-cream-50 px-3 text-sm text-green outline-none">{STYLES.map((s) => <option key={s.id} value={s.id}>{tx(s.ar, s.en)}</option>)}</select>
                </div>
                <div className="col-span-2">
                  <div className="mb-2 text-sm font-medium text-green">{tx('موعد التوصيل', 'Delivery date')}</div>
                  <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
                    {nextDays(7).map((d, i) => (
                      <button key={d} onClick={() => setDateSel(d)} aria-pressed={dateSel === d} className={cx('flex shrink-0 flex-col items-center rounded-2xl border px-3 py-1.5 text-[12px] transition', dateSel === d ? 'border-green bg-green text-cream-50' : 'border-green/12 text-green')}>
                        <span className="opacity-70">{i === 0 ? tx('اليوم', 'Today') : i === 1 ? tx('بكرة', 'Tmrw') : date(d, { weekday: 'short' })}</span>
                        <span className="tabular font-semibold">{parseLocal(d).getDate()}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-7 flex flex-col items-center justify-between gap-3 border-t border-green/10 pt-5 sm:flex-row">
              <p className="text-[12px] text-ink/45">{tx('نقترح ٣ لمّات من منتجات متوفرة في مدينتك وتلحق موعدك.', 'We suggest 3 bundles from products available in your city and in time for your date.')}</p>
              <Magnetic><Button size="lg" onClick={() => generate()} disabled={phase === 'thinking'}><I.sparkle size={18} className="text-gold" />{phase === 'results' ? tx('أعد الاقتراح', 'Regenerate') : tx('اقترح ٣ لمّات', 'Suggest 3 bundles')}</Button></Magnetic>
            </div>
          </div>
        </div>
      </section>

      {/* Thinking */}
      <AnimatePresence>
        {phase === 'thinking' && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mx-auto mt-10 max-w-md px-4" aria-live="polite">
            <div className="rounded-[32px] bg-green p-6 text-cream-50 shadow-lift">
              <div className="mb-4 flex items-center gap-3"><LogoMark className="h-8 w-8" spin /><span className="font-display text-lg">{tx('نجهّز اقتراحاتك…', 'Preparing your picks…')}</span></div>
              <ul className="space-y-2.5">
                {thinkingSteps.map((s, i) => (
                  <motion.li key={i} initial={{ opacity: 0.3 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.42 }} className="flex items-center gap-2 text-sm text-cream/85">
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.42 + 0.3, type: 'spring' }} className="grid h-5 w-5 place-items-center rounded-full bg-gold text-green-950"><I.check size={12} /></motion.span>{s}
                  </motion.li>
                ))}
              </ul>
              <div className="shimmer mt-5 h-1.5 rounded-full bg-cream/10" />
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Results */}
      {phase === 'results' && result && brief && (
        <section ref={resultsRef} className="mx-auto mt-14 max-w-[1440px] scroll-mt-24 px-4 md:px-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="eyebrow text-cocoa">{tx('اقتراحاتك', 'Your bundles')}</div>
              <h2 className="mt-2 font-display text-3xl font-semibold text-green md:text-4xl">{tx(`ثلاث لمّات لـ${l(RECIPIENTS.find((r) => r.id === brief.recipient)!.name)}`, `Three bundles for your ${l(RECIPIENTS.find((r) => r.id === brief.recipient)!.name).toLowerCase()}`)}</h2>
              <p className="mt-1 text-sm text-ink/55">{l(OCCASIONS.find((o) => o.id === brief.occasion)!.name)} · {l(CITIES.find((c) => c.id === brief.city)!.name)} · {money(brief.budget)} · {brief.date ? date(brief.date) : ''}</p>
            </div>
          </div>
          {result.poolNotes.map((n, i) => <p key={i} className="mb-4 flex items-start gap-2 rounded-2xl bg-gold-100/60 px-4 py-3 text-sm text-cocoa"><I.clock size={16} className="mt-0.5 shrink-0" />{l(n)}</p>)}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {result.bundles.map((b, i) => {
              const t = bundleTotal(b.items)
              return (
                <motion.article key={b.id + i} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className={cx('relative flex flex-col overflow-hidden rounded-[34px] border bg-white p-5 shadow-soft transition-all', sel === i ? 'border-gold ring-4 ring-gold/20' : 'border-green/8', i === 2 && 'lg:bg-green lg:text-cream-50')}>
                  
                  <div className="relative">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={cx('font-serif text-4xl font-light', i === 2 ? 'text-gold' : 'text-green/25')}>0{i + 1}</span>
                        <h3 className={cx('font-display text-2xl font-semibold', i === 2 ? 'lg:text-cream-50 text-green' : 'text-green')}>{l(b.title)}</h3>
                        <p className={cx('text-sm', i === 2 ? 'lg:text-cream/70 text-ink/55' : 'text-ink/55')}>{l(b.mood)}</p>
                      </div>
                      {t <= brief.budget ? <span className="shrink-0 rounded-full bg-gold/25 px-2.5 py-1 text-[11px] font-medium text-cocoa lg:text-current">{tx('ضمن الميزانية', 'In budget')}</span> : <span className="shrink-0 rounded-full bg-blush-100 px-2.5 py-1 text-[11px] font-medium text-blush-700">{tx('استثناء', 'Exception')}</span>}
                    </div>
                    <div className="mt-5 grid grid-cols-4 gap-2">
                      {b.items.map((it, k) => (
                        <motion.div key={it.productId} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 + i * 0.15 + k * 0.08, type: 'spring' }} className={cx('overflow-hidden rounded-2xl', k === 0 ? 'col-span-2 row-span-2 aspect-[4/5]' : 'aspect-square')}>
                          <ProductArt art={productById(it.productId)!.art} view={k === 0 ? 0 : 1} className="h-full w-full" />
                        </motion.div>
                      ))}
                    </div>
                    <ul className="mt-5 space-y-3">
                      {b.items.map((it) => {
                        const p = productById(it.productId)!
                        return (
                          <li key={it.productId} className="flex gap-3 text-sm">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                            <span className="min-w-0 flex-1"><span className="flex justify-between gap-2 font-medium"><span className="truncate">{l(p.name)}{variantText(p, it.variant, l) && <span className="font-normal opacity-60"> · {variantText(p, it.variant, l)}</span>}</span><span className="tabular shrink-0">{money(priceOf(it))}</span></span><span className={cx('block text-[12px]', i === 2 ? 'lg:text-cream/60 text-ink/50' : 'text-ink/50')}>{l(it.reason)}</span></span>
                          </li>
                        )
                      })}
                    </ul>
                    {b.notes.map((n, k) => <p key={k} className={cx('mt-3 rounded-2xl px-3 py-2 text-[12px]', i === 2 ? 'bg-cream-50/10 lg:text-cream/80 text-cocoa' : 'bg-cream text-cocoa')}>{l(n)}</p>)}
                  </div>
                  <div className="relative mt-auto pt-6">
                    <div className={cx('rounded-2xl p-3', i === 2 ? 'bg-white text-ink lg:bg-cream-50' : 'bg-cream-50')}><BudgetMeter total={t} budget={brief.budget} /></div>
                    <div className="mt-4 flex gap-2">
                      <Button variant={i === 2 ? 'gold' : 'primary'} className="flex-1" onClick={() => choose(i)}><I.edit size={16} />{tx('خصّصها', 'Customise')}</Button>
                      <Button variant={i === 2 ? 'cream' : 'outline'} onClick={() => addManyToCart(b.items.map((it) => ({ productId: it.productId, variant: it.variant, qty: it.qty, bundle: `studio-${b.id}` })))} aria-label={tx('أضف للسلة', 'Add to cart')}><I.bag size={16} /></Button>
                    </div>
                  </div>
                </motion.article>
              )
            })}
          </div>
        </section>
      )}

      {/* Celebration Builder */}
      {sel !== null && brief && result && (
        <section ref={builderRef} className="mx-auto mt-20 max-w-[1440px] scroll-mt-24 px-4 md:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="eyebrow flex items-center gap-2 text-cocoa"><I.wand size={14} />{tx('منسّق الاحتفال', 'Celebration Builder')}</div>
              <h2 className="mt-2 font-display text-3xl font-semibold text-green md:text-4xl">{l(result.bundles[sel].title)}</h2>
            </div>
            <div className="flex rounded-full border border-green/15 bg-white p-1" role="tablist" aria-label={tx('طريقة العرض', 'Preview mode')}>
              {([['table', tx('طاولة', 'Table')], ['box', tx('صندوق', 'Gift box')], ['flat', tx('فلات لاي', 'Flat lay')]] as const).map(([k, v]) => (
                <button key={k} role="tab" aria-selected={mode === k} onClick={() => setMode(k)} className={cx('relative rounded-full px-4 py-1.5 text-sm transition', mode === k ? 'text-cream-50' : 'text-green')}>
                  {mode === k && <motion.span layoutId="modepill" className="absolute inset-0 rounded-full bg-green" />}<span className="relative">{v}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Stage */}
            <div className="min-w-0 lg:col-span-7">
              <div className={cx('relative aspect-[5/4] overflow-hidden rounded-[36px] shadow-lift transition-colors duration-700', mode === 'table' ? 'bg-cream' : mode === 'box' ? 'bg-green' : 'bg-blush-100')}>
                
                {mode === 'table' && <><div className="absolute inset-x-[12%] bottom-[18%] top-[6%] rounded-t-full bg-white/60" /><div className="absolute inset-x-0 bottom-0 h-[22%] bg-cream-400/60" /><div className="absolute inset-x-0 bottom-[22%] h-1 bg-white/70" /></>}
                {mode === 'box' && <><div className="absolute inset-[10%] rounded-[28px] border-[10px] border-gold/70 bg-cream-50/95 shadow-2xl" /></>}
                <LayoutGroup>
                  {items.map((it, k) => {
                    const p = productById(it.productId)!
                    const n = items.length
                    const pos = stagePos(mode, k, n)
                    return (
                      <motion.div key={it.productId} layout layoutId={'st-' + it.productId} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1, rotate: pos.r }} exit={{ opacity: 0, scale: 0.5 }} transition={{ type: 'spring', stiffness: 140, damping: 18 }}
                        className={cx('absolute overflow-hidden shadow-lift', mode === 'flat' ? 'rounded-2xl border-[5px] border-white' : 'rounded-[22px]')} style={{ left: `${pos.x}%`, top: `${pos.y}%`, width: `${pos.w}%`, aspectRatio: '4/5', zIndex: pos.z }}>
                        <ProductArt art={p.art} className="h-full w-full" />
                        {it.qty > 1 && <span className="absolute end-2 top-2 rounded-full bg-green px-2 py-0.5 text-[11px] text-cream-50">×{it.qty}</span>}
                      </motion.div>
                    )
                  })}
                </LayoutGroup>
                {items.length === 0 && <div className="absolute inset-0 grid place-items-center text-ink/50">{tx('اللمّة فاضية — أضف قطعة', 'Empty — add a piece')}</div>}
                <div className="absolute bottom-4 start-4 rounded-full bg-white/85 px-3 py-1.5 text-[12px] text-green backdrop-blur">{tx(`${items.length} قطع · ${merchants.length} متاجر`, `${items.length} pieces · ${merchants.length} merchants`)}</div>
              </div>

              {/* Add more */}
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-medium text-green">{tx('أضف للمّة', 'Add to the bundle')}</h3>
                <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
                  {adds.map((p) => (
                    <button key={p.id} onClick={() => setItems((x) => [...x, { productId: p.id, variant: defaultVariant(p), qty: 1, reason: { ar: 'أضفتها بنفسك', en: 'Added by you' } }])} className="group w-32 shrink-0 text-start">
                      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl"><ProductArt art={p.art} className="h-full w-full transition-transform duration-500 group-hover:scale-110" /><span className="absolute bottom-2 end-2 grid h-8 w-8 place-items-center rounded-full bg-green text-cream-50 shadow"><I.plus size={16} /></span></div>
                      <div className="mt-1.5 truncate text-[13px] text-green">{l(p.name)}</div>
                      <div className="tabular text-[12px] text-ink/55">{money(unitPrice(p, defaultVariant(p), overrides))}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Item list */}
            <div className="min-w-0 lg:col-span-5">
              <div className="rounded-[32px] bg-white p-4 shadow-soft md:p-5 lg:sticky lg:top-28">
                <ul className="space-y-3">
                  <AnimatePresence initial={false}>
                    {items.map((it) => {
                      const p = productById(it.productId)!
                      return (
                        <motion.li key={it.productId} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <div className="flex gap-3 rounded-2xl bg-cream-50 p-2.5">
                            <div className="h-20 w-16 shrink-0 overflow-hidden rounded-xl"><ProductArt art={p.art} className="h-full w-full" /></div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0"><div className="truncate text-sm font-medium text-green">{l(p.name)}</div><div className="truncate text-[11px] text-ink/50">{l(merchantById(p.merchant).name)}</div></div>
                                <motion.span key={priceOf(it)} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="tabular shrink-0 text-sm font-semibold">{money(priceOf(it))}</motion.span>
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                {p.variants[0] && (
                                  <select aria-label={l(p.variants[0].label)} value={it.variant[p.variants[0].key]} onChange={(e) => setItems((x) => x.map((y) => (y.productId === it.productId ? { ...y, variant: { ...y.variant, [p.variants[0].key]: e.target.value } } : y)))} className="h-8 max-w-[150px] rounded-full border border-green/15 bg-white px-2 text-[12px] text-green outline-none">
                                    {p.variants[0].options.map((o) => <option key={o.id} value={o.id}>{l(o.label)}{o.delta ? ` +${o.delta}` : ''}</option>)}
                                  </select>
                                )}
                                <QtyStepper small value={it.qty} onChange={(n) => setItems((x) => x.map((y) => (y.productId === it.productId ? { ...y, qty: Math.max(1, Math.min(10, n)) } : y)))} />
                                <button onClick={() => setSwapFor(swapFor === it.productId ? null : it.productId)} aria-expanded={swapFor === it.productId} className={cx('inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-[12px] transition', swapFor === it.productId ? 'bg-gold text-green-950' : 'bg-white text-green hover:bg-gold/20')}><I.swap size={14} />{tx('بدّل', 'Swap')}</button>
                                <button onClick={() => { setItems((x) => x.filter((y) => y.productId !== it.productId)); if (swapFor === it.productId) setSwapFor(null) }} className="grid h-8 w-8 place-items-center rounded-full text-ink/40 hover:bg-blush-100 hover:text-blush-700" aria-label={tx('حذف', 'Remove')}><I.trash size={15} /></button>
                              </div>
                            </div>
                          </div>
                          <AnimatePresence>
                            {swapFor === it.productId && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                <div className="no-scrollbar flex gap-2 overflow-x-auto px-1 pb-1 pt-2">
                                  {swapOptions.length === 0 && <p className="px-2 py-3 text-xs text-ink/50">{tx('لا توجد بدائل متاحة في مدينتك لهذا القسم.', 'No alternatives in your city for this category.')}</p>}
                                  {swapOptions.map((alt) => {
                                    const diff = unitPrice(alt, defaultVariant(alt), overrides) - priceOf(it) / it.qty
                                    return (
                                      <button key={alt.id} onClick={() => { setItems((x) => x.map((y) => (y.productId === it.productId ? { productId: alt.id, variant: defaultVariant(alt), qty: y.qty, reason: { ar: 'بديل اخترته', en: 'Your swap' } } : y))); setSwapFor(null) }} className="w-28 shrink-0 rounded-2xl border border-green/10 bg-white p-1.5 text-start hover:border-gold">
                                        <div className="aspect-square overflow-hidden rounded-xl"><ProductArt art={alt.art} className="h-full w-full" /></div>
                                        <div className="mt-1 truncate text-[12px] text-green">{l(alt.name)}</div>
                                        <div className={cx('tabular text-[11px]', diff > 0 ? 'text-blush-700' : 'text-green/70')}>{diff > 0 ? '+' : ''}{money(diff)}</div>
                                      </button>
                                    )
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.li>
                      )
                    })}
                  </AnimatePresence>
                </ul>
                <div className="mt-5 space-y-3 border-t border-green/10 pt-5">
                  <BudgetMeter total={total} budget={brief.budget} />
                  {total > brief.budget && (
                    <div className="flex items-center justify-between gap-2 rounded-2xl bg-blush-100/60 p-3 text-[13px] text-blush-700">
                      <span>{tx('تجاوزت الميزانية. نقدر نعدلها لك تلقائياً.', 'You’re over budget. We can adjust it for you.')}</span>
                      <Button size="sm" variant="blush" onClick={fitToBudget}>{tx('ناسب الميزانية', 'Fit to budget')}</Button>
                    </div>
                  )}
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-ink/60"><span>{tx('المنتجات', 'Items')}</span><span className="tabular">{money(total)}</span></div>
                    <div className="flex justify-between text-ink/60"><span>{tx(`التوصيل (${merchants.length} متاجر)`, `Delivery (${merchants.length} merchants)`)}</span><span className="tabular">{money(deliveryFee)}</span></div>
                    <div className="flex justify-between pt-1 text-lg font-semibold text-green"><span>{tx('الإجمالي', 'Total')}</span><motion.span key={total} initial={{ scale: 1.1 }} animate={{ scale: 1 }} className="tabular">{money(total + deliveryFee)}</motion.span></div>
                    <p className="text-[11px] text-ink/45">{tx('الميزانية تُقارن بسعر المنتجات، والتوصيل يُحسب منفصلاً.', 'Budget is compared against item prices; delivery is shown separately.')}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="lg" className="flex-1" disabled={!items.length} onClick={addBundleToCart}><I.bag size={18} />{tx('أضف اللمّة للسلة', 'Add bundle to cart')}</Button>
                    <Button size="lg" variant="outline" disabled={!items.length} onClick={() => { addBundleToCart(); useStore.getState().setCartOpen(false); nav('/checkout') }}>{tx('ادفع', 'Checkout')}</Button>
                  </div>
                  <button onClick={() => choose(sel)} className="mx-auto flex items-center gap-1 text-[12px] text-ink/50 hover:text-green"><I.refresh size={13} />{tx('استرجع الاقتراح الأصلي', 'Restore original suggestion')}</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

/** Composition presets for the preview stage (percent coordinates). */
function stagePos(mode: 'table' | 'box' | 'flat', k: number, n: number) {
  if (mode === 'table') {
    if (k === 0) return { x: 36, y: 16, w: 28, r: 0, z: 5 }
    const side = [
      { x: 14, y: 36, w: 20, r: 0, z: 4 }, { x: 66, y: 36, w: 20, r: 0, z: 4 },
      { x: 2, y: 50, w: 16, r: 0, z: 6 }, { x: 82, y: 50, w: 16, r: 0, z: 6 },
      { x: 26, y: 56, w: 14, r: 0, z: 7 }, { x: 60, y: 56, w: 14, r: 0, z: 7 },
    ]
    return side[(k - 1) % side.length]
  }
  if (mode === 'box') {
    const cols = n <= 2 ? 2 : n <= 4 ? 2 : 3
    const rows = Math.ceil(n / cols)
    const cellW = 74 / cols, cellH = 74 / rows
    // stage is 5:4 and items are 4:5, so an item's height in stage-% equals 1.5625 × its width-%
    const H = 1.5625
    const w = Math.min(cellW * 0.85, (cellH * 0.85) / H)
    const c = k % cols, r = Math.floor(k / cols)
    return { x: 13 + c * cellW + (cellW - w) / 2, y: 13 + r * cellH + (cellH - w * H) / 2, w, r: 0, z: 2 }
  }
  const spots = [
    { x: 30, y: 10, w: 30, r: -6 }, { x: 60, y: 18, w: 24, r: 8 }, { x: 8, y: 30, w: 24, r: 5 },
    { x: 52, y: 48, w: 22, r: -10 }, { x: 22, y: 52, w: 20, r: 12 }, { x: 74, y: 52, w: 18, r: -4 },
  ]
  const s = spots[k % spots.length]
  return { ...s, z: 10 - k }
}
