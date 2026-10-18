import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CITIES, OCCASIONS, RECIPIENTS, productById, type AgeGroup, type CityId, type Interest, type OccasionId, type RecipientId, type Relationship } from '../data/catalog'
import { useI18n } from '../lib/i18n'
import { useStore, unitPrice, type Brief } from '../lib/store'
import { AGE_GROUPS, INTERESTS, RELATIONSHIPS, defaultAge, defaultRelationship, generateBundles } from '../lib/ai'
import { ProductArt } from '../components/ProductArt'
import { Button, cx } from '../components/ui'

const STEPS = ['occasion', 'recipient', 'age', 'relationship', 'interests', 'budget'] as const
type Step = (typeof STEPS)[number]

function Pill({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={active} className={cx('rounded-2xl border px-4 py-3 text-start text-[15px] transition-all duration-300', active ? 'border-green bg-green text-cream-50 shadow-soft' : 'border-green/12 bg-white text-green hover:border-green/40')}>
      {children}
    </button>
  )
}

export default function Finder() {
  const { tx, l, money } = useI18n()
  const nav = useNavigate()
  const loc = useLocation() as { state?: { recipient?: RecipientId; age?: AgeGroup } }
  const { overrides, city: storeCity, addManyToCart, setBrief } = useStore()
  const [step, setStep] = useState(0)
  const [occasion, setOccasion] = useState<OccasionId>('birthday')
  const [recipient, setRecipient] = useState<RecipientId>(loc.state?.recipient ?? 'wife')
  const [age, setAge] = useState<AgeGroup>(loc.state?.age ?? defaultAge(loc.state?.recipient ?? 'wife'))
  const [relationship, setRelationship] = useState<Relationship>(defaultRelationship(loc.state?.recipient ?? 'wife'))
  const [interests, setInterests] = useState<Interest[]>([])
  const [budget, setBudget] = useState(600)
  const [city, setCity] = useState<CityId>(storeCity)
  const [done, setDone] = useState(false)
  const resRef = useRef<HTMLDivElement>(null)

  const brief: Brief = { text: '', occasion, recipient, age, relationship, interests, budget, city }
  const result = useMemo(() => (done ? generateBundles(brief, overrides) : null), [done, occasion, recipient, age, relationship, interests.join(), budget, city, overrides])

  const pickRecipient = (r: RecipientId) => { setRecipient(r); setAge(defaultAge(r)); setRelationship(defaultRelationship(r)) }
  const toggleInterest = (i: Interest) => setInterests((x) => (x.includes(i) ? x.filter((y) => y !== i) : x.length >= 4 ? x : [...x, i]))
  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1)
    else { setDone(true); setBrief(brief); setTimeout(() => resRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120) }
  }
  const cur: Step = STEPS[step]
  const titles: Record<Step, string> = {
    occasion: tx('وش المناسبة؟', 'What’s the occasion?'),
    recipient: tx('لمين الهدية؟', 'Who is it for?'),
    age: tx('كم عمره تقريباً؟', 'Roughly how old?'),
    relationship: tx('وش علاقتك فيه؟', 'How do you know them?'),
    interests: tx('وش يحب؟', 'What do they love?'),
    budget: tx('الميزانية والمدينة', 'Budget & city'),
  }
  const summary = [l(OCCASIONS.find((o) => o.id === occasion)!.name), l(RECIPIENTS.find((r) => r.id === recipient)!.name), l(AGE_GROUPS.find((a) => a.id === age)!.name), money(budget)]

  return (
    <div className="pb-12">
      <section className="mx-auto max-w-[1100px] px-4 pt-8 md:px-8 md:pt-14">
        <div className="text-center">
          <p className="eyebrow text-cocoa">{tx('دليل الهدايا الذكي', 'Smart Gift Finder')}</p>
          <h1 className="mx-auto mt-3 max-w-2xl font-display text-[34px] font-semibold leading-tight text-green md:text-[52px]">{tx('ست أسئلة، وثلاث هدايا تناسبه فعلاً', 'Six questions. Three gifts that truly fit.')}</h1>
          <p className="mx-auto mt-3 max-w-xl text-ink/60">{tx('نراعي العمر والاهتمامات والعلاقة — لا نفترض الاهتمامات من الجنس. الاقتراحات من كتالوج العرض بقواعد واضحة.', 'We consider age, interests and relationship — we never assume interests from gender. Suggestions come from the demo catalogue using transparent rules.')}</p>
        </div>

        <div className="mx-auto mt-10 max-w-3xl rounded-[32px] border border-green/10 bg-white p-5 shadow-lift md:p-8">
          {/* progress */}
          <div className="flex items-center gap-1.5" aria-hidden>{STEPS.map((s, i) => <motion.span key={s} className="h-1 flex-1 rounded-full bg-green/10" initial={false} animate={{ backgroundColor: i <= step ? '#0F3D32' : 'rgba(15,61,50,.1)' }} />)}</div>
          <div className="mt-2 flex justify-between text-[12px] text-ink/45"><span>{tx(`الخطوة ${step + 1} من ${STEPS.length}`, `Step ${step + 1} of ${STEPS.length}`)}</span>{done && <span className="text-green">{summary.join(' · ')}</span>}</div>

          <AnimatePresence mode="wait">
            <motion.div key={cur} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }} className="mt-6">
              <h2 className="font-display text-2xl font-semibold text-green">{titles[cur]}</h2>
              {cur === 'occasion' && <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">{OCCASIONS.map((o) => <Pill key={o.id} active={occasion === o.id} onClick={() => setOccasion(o.id)}>{l(o.name)}<span className={cx('block text-[12px]', occasion === o.id ? 'text-cream/70' : 'text-ink/45')}>{l(o.hint)}</span></Pill>)}</div>}
              {cur === 'recipient' && <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">{RECIPIENTS.map((r) => <Pill key={r.id} active={recipient === r.id} onClick={() => pickRecipient(r.id)}>{l(r.name)}</Pill>)}</div>}
              {cur === 'age' && (
                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {AGE_GROUPS.map((a) => <Pill key={a.id} active={age === a.id} onClick={() => setAge(a.id)}>{l(a.name)}</Pill>)}
                  <p className="col-span-full mt-1 text-[12px] text-ink/45">{tx('نستبعد أي منتج غير مناسب لهذا العمر — خصوصاً الألعاب.', 'Anything not suited to this age is excluded — especially toys.')}</p>
                </div>
              )}
              {cur === 'relationship' && <div className="mt-5 grid grid-cols-2 gap-2">{RELATIONSHIPS.map((r) => <Pill key={r.id} active={relationship === r.id} onClick={() => setRelationship(r.id)}>{l(r.name)}</Pill>)}<p className="col-span-full mt-1 text-[12px] text-ink/45">{tx('هدايا العمل تبقى رسمية ومناسبة.', 'Work gifts stay professional and appropriate.')}</p></div>}
              {cur === 'interests' && (
                <div className="mt-5">
                  <div className="flex flex-wrap gap-2">{INTERESTS.map((i) => <button key={i.id} onClick={() => toggleInterest(i.id)} aria-pressed={interests.includes(i.id)} className={cx('rounded-full border px-4 py-2 text-sm transition', interests.includes(i.id) ? 'border-gold bg-gold/20 text-green' : 'border-green/12 text-green hover:border-green/40')}>{l(i.name)}</button>)}</div>
                  <p className="mt-3 text-[12px] text-ink/45">{tx('اختر حتى ٤ اهتمامات، أو تخطَّ إذا ما تعرف.', 'Pick up to 4, or skip if you’re not sure.')}</p>
                </div>
              )}
              {cur === 'budget' && (
                <div className="mt-5 grid gap-6 sm:grid-cols-2">
                  <div>
                    <div className="flex items-baseline justify-between"><label htmlFor="fbudget" className="text-sm text-ink/60">{tx('الميزانية', 'Budget')}</label><span className="tabular font-display text-2xl font-semibold text-green">{money(budget)}</span></div>
                    <input id="fbudget" type="range" min={150} max={3000} step={25} value={budget} onChange={(e) => setBudget(+e.target.value)} className="mt-3 w-full" dir="ltr" />
                    <div className="mt-2 flex gap-1.5">{[300, 600, 1000, 2000].map((v) => <button key={v} onClick={() => setBudget(v)} className={cx('tabular rounded-full px-3 py-1 text-xs', budget === v ? 'bg-gold text-green-950' : 'bg-cream text-green')}>{v}</button>)}</div>
                  </div>
                  <div>
                    <label htmlFor="fcity" className="text-sm text-ink/60">{tx('مدينة التوصيل', 'Delivery city')}</label>
                    <select id="fcity" value={city} onChange={(e) => setCity(e.target.value as CityId)} className="mt-3 h-12 w-full rounded-2xl border border-green/15 bg-cream-50 px-4 text-green">{CITIES.map((c) => <option key={c.id} value={c.id}>{l(c.name)}</option>)}</select>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between">
            {step > 0 ? <Button variant="ghost" onClick={() => setStep(step - 1)}>{tx('رجوع', 'Back')}</Button> : <span />}
            <div className="flex gap-2">
              {cur === 'interests' && <Button variant="outline" onClick={next}>{tx('تخطّي', 'Skip')}</Button>}
              <Button size="lg" onClick={next}>{step === STEPS.length - 1 ? tx('اعرض الاقتراحات', 'Show my gifts') : tx('التالي', 'Next')}</Button>
            </div>
          </div>
        </div>
      </section>

      {result && (
        <section ref={resRef} className="mx-auto mt-14 max-w-[1440px] scroll-mt-24 px-4 md:px-8">
          <div className="mb-6">
            <p className="eyebrow text-cocoa">{tx('اقتراحاتك', 'Your matches')}</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-green md:text-4xl">{summary.slice(0, 2).join(' · ')}</h2>
            {result.poolNotes.map((n, i) => <p key={i} className="mt-2 text-sm text-ink/55">{l(n)}</p>)}
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {result.bundles.map((b, i) => {
              const total = b.items.reduce((a, it) => a + unitPrice(productById(it.productId)!, it.variant, overrides) * it.qty, 0)
              return (
                <motion.article key={b.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="flex flex-col rounded-[30px] bg-white p-4 shadow-soft">
                  <div className={cx('grid gap-2 overflow-hidden rounded-[22px]', b.items.length >= 3 ? 'grid-cols-2 grid-rows-2' : b.items.length === 2 ? 'grid-cols-2' : 'grid-cols-1')} style={{ aspectRatio: '1 / 1' }}>
                    {b.items.map((it, k) => {
                      const p = productById(it.productId)!
                      return <div key={it.productId} className={cx('relative overflow-hidden', b.items.length >= 3 && k === 0 && 'row-span-2')}><ProductArt art={p.art} className="absolute inset-0 h-full w-full" label={l(p.name)} sizes="(max-width:1024px) 50vw, 16vw" /></div>
                    })}
                  </div>
                  <div className="flex flex-1 flex-col p-2 pt-5">
                    <h3 className="font-display text-xl font-semibold text-green">{l(b.title)}</h3>
                    <p className="text-sm text-ink/55">{l(b.mood)}</p>
                    <ul className="mt-4 space-y-2.5">
                      {b.items.map((it) => {
                        const p = productById(it.productId)!
                        return <li key={it.productId} className="text-sm"><div className="flex justify-between gap-2"><span className="font-medium text-green">{l(p.name)}</span><span className="tabular shrink-0">{money(unitPrice(p, it.variant, overrides))}</span></div><p className="text-[12px] text-ink/50">{l(it.reason)}</p></li>
                      })}
                    </ul>
                    {b.notes.map((n, k) => <p key={k} className="mt-3 rounded-2xl bg-cream px-3 py-2 text-[12px] text-cocoa">{l(n)}</p>)}
                    <div className="mt-auto pt-5">
                      <div className="flex items-baseline justify-between"><span className="text-sm text-ink/55">{total <= budget ? tx('ضمن الميزانية', 'Within budget') : tx('أعلى من الميزانية', 'Over budget')}</span><span className="tabular font-display text-xl font-semibold text-green">{money(total)}</span></div>
                      <div className="mt-3 flex gap-2">
                        <Button className="flex-1" onClick={() => nav('/studio', { state: { brief, choose: i } })}>{tx('عدّلها في المنسّق', 'Tailor in builder')}</Button>
                        <Button variant="outline" disabled={!b.items.length} onClick={() => addManyToCart(b.items.map((it) => ({ productId: it.productId, variant: it.variant, qty: it.qty, bundle: `finder-${b.id}` })))}>{tx('أضف', 'Add')}</Button>
                      </div>
                    </div>
                  </div>
                </motion.article>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
