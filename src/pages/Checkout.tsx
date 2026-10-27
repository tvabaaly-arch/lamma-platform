import { isoLocal, parseLocal } from '../lib/dates'
import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CITIES, OCCASIONS, merchantById, productById, productCities, type CityId, type OccasionId } from '../data/catalog'
import { useI18n } from '../lib/i18n'
import { useStore, cartTotals, unitPrice } from '../lib/store'
import { suggestMessages } from '../lib/ai'
import { ProductArt } from '../components/ProductArt'
import { GreetingCard, CARD_DESIGNS } from '../components/GreetingCard'
import { LogoMark } from '../components/Logo'
import { I } from '../components/Icons'
import { variantText } from '../components/Layout'
import { Button, cx, Empty } from '../components/ui'
import { SLOTS, DEMO_PROMOS } from '../lib/model'
import { api, apiMode, ApiError } from '../lib/api'
import { Login } from './Account'


function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-green">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-blush-700" role="alert">{error}</p>}
    </div>
  )
}
const inputCls = (err?: boolean) => cx('h-12 w-full rounded-2xl border bg-white px-4 text-green outline-none transition focus:border-gold', err ? 'border-blush-700' : 'border-green/15')

export default function Checkout() {
  const { tx, l, money, date, lang } = useI18n()
  const nav = useNavigate()
  const { cart, overrides, city: storeCity, user, placeOrderAsync, studio } = useStore()
  const [step, setStep] = useState(0)
  const [r, setR] = useState({ name: '', phone: '', city: storeCity as CityId, district: '', address: '' })
  const [sender, setSender] = useState(user?.name ?? '')
  const maxLead = Math.max(0, ...cart.map((c) => productById(c.productId)?.leadHours ?? 0))
  const days = useMemo(() => Array.from({ length: 10 }).map((_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d }), [])
  const slotOk = (d: Date, s: (typeof SLOTS)[0]) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), s.start + 4).getTime() - Date.now() >= maxLead * 3600e3
  const firstDay = days.find((d) => SLOTS.some((s) => slotOk(d, s))) ?? days[days.length - 1]
  const [day, setDay] = useState(isoLocal(firstDay))
  const [slot, setSlot] = useState(SLOTS.find((s) => slotOk(firstDay, s))?.id ?? SLOTS[2].id)
  const [card, setCard] = useState({ design: 0, message: '', from: user?.name ?? '', hidePrice: true })
  const [occ, setOcc] = useState<OccasionId>(studio.brief?.occasion ?? 'birthday')
  const [surprise, setSurprise] = useState(true)
  const [pay, setPay] = useState('mada')
  const [promo, setPromo] = useState('')
  const [promoOn, setPromoOn] = useState<{ code: string; pct: number } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [processing, setProcessing] = useState(false)

  const t = cartTotals(cart, overrides)
  const discount = promoOn ? Math.round(t.subtotal * promoOn.pct) : 0
  const applyPromo = async () => {
    const code = promo.trim().toUpperCase()
    if (!code) return
    if (!apiMode) {
      if (DEMO_PROMOS[code]) { setPromoOn({ code, pct: DEMO_PROMOS[code] }); setErrors({}) } else setErrors({ promo: tx('الكود غير صحيح', 'Invalid code') })
      return
    }
    try {
      const r = await api.promo(code, cart.map(({ key: _k, ...ln }) => ln))
      if (r.valid && r.promo) { setPromoOn({ code: r.promo.code, pct: r.promo.percent / 100 }); setErrors({}) }
      else { setPromoOn(null); setErrors({ promo: r.problem ? (lang === 'ar' ? r.problem.messageAr : r.problem.message) : tx('الكود غير صحيح', 'Invalid code') }) }
    } catch (e) { setErrors({ promo: e instanceof ApiError ? e.text(lang) : tx('تعذر التحقق من الكود', 'Could not check the code') }) }
  }
  const undeliverable = cart.filter((c) => !productCities(productById(c.productId)!).includes(r.city))

  if (cart.length === 0 && !processing)
    return <div className="py-16"><Empty title={tx('سلتك فاضية', 'Your cart is empty')} sub={tx('أضف منتجات أو خلّ الاستوديو يجهز لك لمّة.', 'Add products or let the Studio build a bundle.')} action={<div className="flex gap-2"><Button variant="outline" to="/shop">{tx('تسوّق', 'Shop')}</Button><Button to="/studio"><I.sparkle size={16} />{tx('الاستوديو', 'Studio')}</Button></div>} /></div>

  // With the live API, orders belong to an account.
  if (apiMode && !user) return <Login title={tx('سجّل دخولك لإتمام الطلب', 'Sign in to place your order')} />

  function validate0() {
    const e: Record<string, string> = {}
    if (r.name.trim().length < 2) e.name = tx('اكتب اسم المستلم', 'Enter the recipient’s name')
    if (!/^05\d{8}$/.test(r.phone.replace(/\s/g, ''))) e.phone = tx('رقم جوال سعودي يبدأ بـ 05 (١٠ أرقام)', 'Saudi mobile starting with 05 (10 digits)')
    if (r.district.trim().length < 2) e.district = tx('اكتب الحي', 'Enter the district')
    if (sender.trim().length < 2) e.sender = tx('اكتب اسمك', 'Enter your name')
    if (undeliverable.length) e.city = tx('بعض المنتجات لا توصل لهذه المدينة', 'Some items don’t deliver to this city')
    setErrors(e)
    return Object.keys(e).length === 0
  }
  function next() {
    if (step === 0 && !validate0()) return
    if (step === 1 && !card.message.trim()) { setErrors({ message: tx('اكتب رسالة الكرت أو اختر اقتراحاً', 'Write a message or pick a suggestion') }); return }
    setErrors({})
    setStep((s) => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  async function submit() {
    setProcessing(true)
    setErrors({})
    try {
      const o = await placeOrderAsync({
        lines: cart,
        recipient: { ...r, phone: r.phone.replace(/\s/g, '') },
        sender: { name: sender },
        delivery: { date: day, slot },
        card: { ...card, from: card.from || sender },
        surprise, payment: pay, occasion: occ,
        totals: { subtotal: t.subtotal, delivery: t.delivery, discount, total: t.subtotal + t.delivery - discount },
        ...(promoOn ? { promoCode: promoOn.code } : {}),
      })
      nav(`/order/${o.id}`, { state: { fresh: true } })
    } catch (e) {
      setProcessing(false)
      let msg = tx('تعذر إتمام الطلب، حاول مرة أخرى', 'Could not place the order, please try again')
      if (e instanceof ApiError) {
        const first = Array.isArray(e.details) ? (e.details[0] as { message?: string; messageAr?: string } | undefined) : undefined
        msg = first?.message ? (lang === 'ar' ? first.messageAr ?? first.message : first.message) : e.text(lang)
      }
      setErrors({ submit: msg })
    }
  }

  const steps = [tx('التوصيل', 'Delivery'), tx('الكرت والمفاجأة', 'Card & surprise'), tx('الدفع', 'Payment')]

  return (
    <div className="mx-auto max-w-[1280px] px-4 pt-6 md:px-8 md:pt-10">
      <h1 className="font-display text-3xl font-semibold text-green md:text-5xl">{tx('إتمام الطلب', 'Checkout')}</h1>
      <ol className="mt-6 flex items-center gap-2" aria-label={tx('خطوات الطلب', 'Checkout steps')}>
        {steps.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <button disabled={i > step} onClick={() => setStep(i)} className={cx('flex items-center gap-2 text-sm', i <= step ? 'text-green' : 'text-ink/40')} aria-current={i === step ? 'step' : undefined}>
              <span className={cx('grid h-8 w-8 place-items-center rounded-full text-[13px] font-semibold transition', i < step ? 'bg-gold text-green-950' : i === step ? 'bg-green text-cream-50' : 'bg-green/10')}>{i < step ? <I.check size={15} /> : i + 1}</span>
              <span className="hidden sm:inline">{s}</span>
            </button>
            {i < steps.length - 1 && <span className="h-px flex-1 bg-green/15"><motion.span className="block h-px bg-gold" animate={{ width: i < step ? '100%' : '0%' }} /></span>}
          </li>
        ))}
      </ol>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.section key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="rounded-[30px] bg-white p-5 shadow-soft md:p-7">
                  <h2 className="mb-5 font-display text-xl font-semibold text-green">{tx('بيانات المستلم', 'Recipient')}</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field id="rname" label={tx('اسم المستلم', 'Recipient name')} error={errors.name}><input id="rname" className={inputCls(!!errors.name)} value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} autoComplete="off" /></Field>
                    <Field id="rphone" label={tx('جوال المستلم', 'Recipient mobile')} error={errors.phone}><input id="rphone" dir="ltr" inputMode="tel" placeholder="05XXXXXXXX" className={cx(inputCls(!!errors.phone), 'text-start')} value={r.phone} onChange={(e) => setR({ ...r, phone: e.target.value.replace(/[^\d\s]/g, '').slice(0, 12) })} autoComplete="off" /></Field>
                    <Field id="rcity" label={tx('المدينة', 'City')} error={errors.city}>
                      <select id="rcity" className={inputCls(!!errors.city)} value={r.city} onChange={(e) => setR({ ...r, city: e.target.value as CityId })}>{CITIES.map((c) => <option key={c.id} value={c.id}>{l(c.name)}</option>)}</select>
                    </Field>
                    <Field id="rdist" label={tx('الحي', 'District')} error={errors.district}><input id="rdist" className={inputCls(!!errors.district)} value={r.district} onChange={(e) => setR({ ...r, district: e.target.value })} placeholder={tx('مثال: حي الياسمين', 'e.g. Al Yasmin')} /></Field>
                    <div className="sm:col-span-2"><Field id="raddr" label={tx('وصف العنوان (اختياري)', 'Address notes (optional)')}><input id="raddr" className={inputCls()} value={r.address} onChange={(e) => setR({ ...r, address: e.target.value })} placeholder={tx('رقم المبنى، أقرب معلم…', 'Building no., nearest landmark…')} /></Field></div>
                  </div>
                  {undeliverable.length > 0 && (
                    <div className="mt-4 rounded-2xl bg-blush-100/60 p-3 text-sm text-blush-700">
                      {tx('هذه المنتجات لا توصل إلى المدينة المختارة:', 'These items don’t deliver to the selected city:')} {undeliverable.map((c) => l(productById(c.productId)!.name)).join(tx('، ', ', '))}.
                      {' '}<button className="underline" onClick={() => useStore.getState().setCartOpen(true)}>{tx('عدّل السلة', 'Edit cart')}</button>
                    </div>
                  )}
                </div>
                <div className="rounded-[30px] bg-white p-5 shadow-soft md:p-7">
                  <h2 className="mb-1 font-display text-xl font-semibold text-green">{tx('موعد التوصيل', 'Delivery time')}</h2>
                  <p className="mb-4 text-xs text-ink/50">{tx(`أطول وقت تجهيز في سلتك ${maxLead} ساعة — المواعيد غير المتاحة مخفية.`, `Longest prep time in your cart is ${maxLead}h — unavailable slots are disabled.`)}</p>
                  <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                    {days.map((d, i) => {
                      const iso = isoLocal(d)
                      const ok = SLOTS.some((s) => slotOk(d, s))
                      return (
                        <button key={iso} disabled={!ok} onClick={() => { setDay(iso); setSlot(SLOTS.find((s) => slotOk(d, s))!.id) }} aria-pressed={day === iso} className={cx('flex w-16 shrink-0 flex-col items-center rounded-2xl border py-2.5 text-sm transition disabled:opacity-30', day === iso ? 'border-green bg-green text-cream-50' : 'border-green/12 text-green hover:border-green/40')}>
                          <span className="text-[11px] opacity-70">{i === 0 ? tx('اليوم', 'Today') : i === 1 ? tx('بكرة', 'Tmrw') : date(d, { weekday: 'short' })}</span>
                          <span className="tabular text-lg font-semibold">{d.getDate()}</span>
                          <span className="text-[10px] opacity-60">{date(d, { month: 'short' })}</span>
                        </button>
                      )
                    })}
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {SLOTS.map((s) => {
                      const d = days.find((x) => isoLocal(x) === day)!
                      const ok = slotOk(d, s)
                      return <button key={s.id} disabled={!ok} onClick={() => setSlot(s.id)} aria-pressed={slot === s.id} className={cx('rounded-2xl border px-2 py-3 text-[13px] transition disabled:opacity-30', slot === s.id ? 'border-gold bg-gold/15 text-green' : 'border-green/12 text-green')}><I.clock size={15} className="mx-auto mb-1" />{tx(s.ar, s.en)}</button>
                    })}
                  </div>
                </div>
                <div className="rounded-[30px] bg-white p-5 shadow-soft md:p-7">
                  <Field id="sender" label={tx('اسمك (المُرسل)', 'Your name (sender)')} error={errors.sender}><input id="sender" className={inputCls(!!errors.sender)} value={sender} onChange={(e) => { setSender(e.target.value); if (!card.from) setCard({ ...card, from: e.target.value }) }} /></Field>
                  {!user && <p className="mt-3 text-xs text-ink/50">{tx('تقدر تطلب كضيف، أو', 'You can check out as a guest, or')} <Link to="/account" className="text-cocoa underline">{tx('سجّل دخول تجريبي', 'sign in (demo)')}</Link> {tx('لحفظ طلباتك.', 'to save your orders.')}</p>}
                </div>
              </motion.section>
            )}

            {step === 1 && (
              <motion.section key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="rounded-[30px] bg-white p-5 shadow-soft md:p-7">
                  <h2 className="mb-4 font-display text-xl font-semibold text-green">{tx('كرت التهنئة', 'Greeting card')}</h2>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-4">
                      <div>
                        <div className="mb-2 text-sm font-medium text-green">{tx('التصميم', 'Design')}</div>
                        <div className="grid grid-cols-4 gap-2">
                          {CARD_DESIGNS.map((d) => <button key={d.id} onClick={() => setCard({ ...card, design: d.id })} aria-label={tx(d.ar, d.en)} aria-pressed={card.design === d.id} className={cx('aspect-[4/5] rounded-xl ring-2 ring-offset-2 transition', d.bg, card.design === d.id ? 'ring-green' : 'ring-transparent')} />)}
                        </div>
                      </div>
                      <div>
                        <label htmlFor="cocc" className="mb-2 block text-sm font-medium text-green">{tx('اقتراحات حسب المناسبة', 'Suggestions by occasion')}</label>
                        <select id="cocc" value={occ} onChange={(e) => setOcc(e.target.value as OccasionId)} className="h-10 w-full rounded-full border border-green/15 bg-cream-50 px-3 text-sm text-green">{OCCASIONS.map((o) => <option key={o.id} value={o.id}>{l(o.name)}</option>)}</select>
                        <div className="mt-2 space-y-1.5">
                          {suggestMessages(occ).map((m, i) => <button key={i} onClick={() => { setCard({ ...card, message: l(m) }); setErrors({}) }} className="flex w-full items-start gap-2 rounded-2xl bg-cream-50 p-2.5 text-start text-[13px] text-ink/75 hover:bg-gold/15"><I.sparkle size={14} className="mt-0.5 shrink-0 text-gold-700" />{l(m)}</button>)}
                        </div>
                      </div>
                      <Field id="cmsg" label={tx('رسالتك', 'Your message')} error={errors.message}>
                        <textarea id="cmsg" rows={3} maxLength={180} className={cx(inputCls(!!errors.message), 'h-auto py-3')} value={card.message} onChange={(e) => setCard({ ...card, message: e.target.value })} />
                        <div className="mt-1 text-end text-[11px] text-ink/40">{card.message.length}/180</div>
                      </Field>
                      <Field id="cfrom" label={tx('التوقيع', 'Signed')}><input id="cfrom" className={inputCls()} value={card.from} onChange={(e) => setCard({ ...card, from: e.target.value })} /></Field>
                    </div>
                    <div className="sm:sticky sm:top-28 sm:self-start">
                      <div className="mb-2 text-sm font-medium text-green">{tx('معاينة', 'Preview')}</div>
                      <GreetingCard design={card.design} message={card.message} from={card.from || sender} to={r.name} lang={lang} />
                    </div>
                  </div>
                </div>
                <div className="rounded-[30px] bg-white p-5 shadow-soft md:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-green"><I.sparkle className="text-gold-700" />{tx('المفاجأة الرقمية', 'Digital surprise')}</h2>
                      <p className="mt-1 max-w-md text-sm text-ink/60">{tx('يوصل المستلم رابط خاص يفتح فيه الكرت والهدية بحركة كشف ممتعة — حتى قبل وصول الطلب.', 'The recipient gets a private link to unwrap the card and gift with a delightful reveal — even before delivery arrives.')}</p>
                    </div>
                    <button role="switch" aria-checked={surprise} aria-label={tx('المفاجأة الرقمية', 'Digital surprise')} onClick={() => setSurprise(!surprise)} className={cx('relative h-7 w-12 shrink-0 rounded-full transition-colors', surprise ? 'bg-green' : 'bg-green/15')}><motion.span layout className={cx('absolute top-0.5 h-6 w-6 rounded-full bg-white shadow', surprise ? 'end-0.5' : 'start-0.5')} /></button>
                  </div>
                  <label className="mt-4 flex items-center gap-2 text-sm text-ink/70"><input type="checkbox" checked={card.hidePrice} onChange={(e) => setCard({ ...card, hidePrice: e.target.checked })} className="h-4 w-4 accent-[#0F3D32]" />{tx('إخفاء الأسعار عن المستلم', 'Hide prices from the recipient')}</label>
                </div>
              </motion.section>
            )}

            {step === 2 && (
              <motion.section key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="rounded-[30px] bg-white p-5 shadow-soft md:p-7">
                  <h2 className="mb-1 font-display text-xl font-semibold text-green">{tx('طريقة الدفع', 'Payment method')}</h2>
                  <p className="mb-5 flex items-center gap-1.5 text-xs text-cocoa"><I.lock size={14} />{tx('دفع تجريبي — لن نطلب أو نحفظ أي بيانات بطاقة.', 'Simulated payment — no card details are requested or stored.')}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[['mada', 'mada', tx('بطاقة مدى', 'mada debit')], ['apple', 'Apple Pay', tx('الدفع السريع', 'Express pay')], ['stc', 'STC Pay', tx('محفظة رقمية', 'Digital wallet')], ['tabby', tx('قسّمها', 'Split'), tx('٤ دفعات بدون فوائد (تجريبي)', '4 interest-free payments (demo)')]].map(([id, name, sub]) => (
                      <button key={id} onClick={() => setPay(id)} aria-pressed={pay === id} className={cx('flex items-center gap-3 rounded-2xl border p-4 text-start transition', pay === id ? 'border-green bg-green/5 ring-2 ring-green/20' : 'border-green/12 hover:border-green/30')}>
                        <span className={cx('grid h-5 w-5 place-items-center rounded-full border-2', pay === id ? 'border-green' : 'border-green/30')}>{pay === id && <span className="h-2.5 w-2.5 rounded-full bg-green" />}</span>
                        <span><span className="block font-semibold text-green">{name}</span><span className="text-xs text-ink/50">{sub}</span></span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-6 flex gap-2">
                    <label htmlFor="promo" className="sr-only">{tx('كود الخصم', 'Promo code')}</label>
                    <input id="promo" value={promo} onChange={(e) => setPromo(e.target.value.toUpperCase())} placeholder={tx('كود الخصم (جرّب LAMMA10)', 'Promo code (try LAMMA10)')} className={inputCls()} dir="ltr" />
                    <Button variant="outline" onClick={() => void applyPromo()}>{tx('تطبيق', 'Apply')}</Button>
                  </div>
                  {errors.promo && <p className="mt-1 text-xs text-blush-700">{errors.promo}</p>}
                  {promoOn && <p className="mt-2 flex items-center gap-1 text-sm text-green"><I.check size={15} className="text-gold-700" />{tx(`خصم ${String(Math.round(promoOn.pct * 100)).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d])}٪ مفعّل`, `${Math.round(promoOn.pct * 100)}% off applied`)}</p>}
                </div>
                <div className="rounded-[30px] bg-cream p-5 text-sm text-ink/70 md:p-7">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><div className="text-xs text-ink/45">{tx('إلى', 'To')}</div><div className="font-medium text-green">{r.name} · <span dir="ltr">{r.phone}</span></div><div>{l(CITIES.find((c) => c.id === r.city)!.name)}، {r.district}</div></div>
                    <div><div className="text-xs text-ink/45">{tx('الموعد', 'When')}</div><div className="font-medium text-green">{date(day)} · <span dir="ltr">{slot}</span></div><div>{surprise ? tx('مع مفاجأة رقمية', 'With digital surprise') : tx('بدون مفاجأة رقمية', 'No digital surprise')}</div></div>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
          {errors.submit && <p className="mt-4 rounded-2xl bg-blush-100 px-4 py-3 text-sm text-blush-700" role="alert">{errors.submit}</p>}
          <div className="mt-6 flex items-center justify-between">
            {step > 0 ? <Button variant="ghost" onClick={() => setStep(step - 1)}><I.arrow size={16} className="rtl-flip" />{tx('رجوع', 'Back')}</Button> : <span />}
            {step < 2 ? <Button size="lg" onClick={next}>{tx('التالي', 'Continue')}<I.arrow size={16} className="rtl-flip rotate-180" /></Button>
              : <Button size="lg" onClick={submit} disabled={processing}><I.lock size={16} />{tx(`تأكيد الطلب · ${money(t.subtotal + t.delivery - discount)}`, `Place order · ${money(t.subtotal + t.delivery - discount)}`)}</Button>}
          </div>
        </div>

        {/* Summary */}
        <aside className="lg:col-span-5">
          <div className="rounded-[30px] bg-white p-5 shadow-soft md:p-6 lg:sticky lg:top-28">
            <h2 className="mb-4 font-display text-lg font-semibold text-green">{tx('ملخص الطلب', 'Order summary')}</h2>
            <ul className="max-h-[340px] space-y-3 overflow-y-auto pe-1">
              {t.merchants.map((mid) => (
                <li key={mid}>
                  <div className="mb-2 flex items-center gap-1.5 text-[12px] text-ink/50"><I.store size={14} />{l(merchantById(mid).name)}</div>
                  <ul className="space-y-2">
                    {cart.filter((c) => productById(c.productId)!.merchant === mid).map((c) => {
                      const p = productById(c.productId)!
                      return (
                        <li key={c.key} className="flex items-center gap-3">
                          <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded-xl"><ProductArt art={p.art} className="h-full w-full" /><span className="absolute end-0.5 top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-green px-1 text-[10px] text-cream-50">{c.qty}</span></div>
                          <div className="min-w-0 flex-1"><div className="truncate text-sm text-green">{l(p.name)}</div><div className="truncate text-[11px] text-ink/50">{variantText(p, c.variant, l)}{c.note ? ` · “${c.note}”` : ''}</div></div>
                          <span className="tabular text-sm">{money(unitPrice(p, c.variant, overrides) * c.qty)}</span>
                        </li>
                      )
                    })}
                  </ul>
                </li>
              ))}
            </ul>
            <div className="mt-5 space-y-1.5 border-t border-green/10 pt-4 text-sm">
              <div className="flex justify-between text-ink/60"><span>{tx('المجموع الفرعي', 'Subtotal')}</span><span className="tabular">{money(t.subtotal)}</span></div>
              <div className="flex justify-between text-ink/60"><span>{tx('التوصيل', 'Delivery')}</span><span className="tabular">{money(t.delivery)}</span></div>
              {discount > 0 && <div className="flex justify-between text-green"><span>{tx('الخصم', 'Discount')}</span><span className="tabular">−{money(discount)}</span></div>}
              <div className="flex justify-between pt-2 text-lg font-semibold text-green"><span>{tx('الإجمالي', 'Total')}</span><span className="tabular">{money(t.subtotal + t.delivery - discount)}</span></div>
              <p className="text-[11px] text-ink/45">{tx('شامل ضريبة القيمة المضافة ١٥٪ · أسعار تجريبية', 'Incl. 15% VAT · demo prices')}</p>
            </div>
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {processing && (
          <motion.div className="fixed inset-0 z-[80] grid place-items-center bg-cream-50/90 backdrop-blur" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="status" aria-live="assertive">
            <div className="text-center">
              <LogoMark className="mx-auto h-20 w-20" spin />
              <p className="mt-6 font-display text-xl text-green">{tx('نؤكد طلبك…', 'Confirming your order…')}</p>
              <p className="mt-1 text-sm text-ink/50">{tx('دفع تجريبي — لا يتم خصم أي مبلغ', 'Simulated payment — nothing is charged')}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
