import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { OCCASIONS, PRODUCTS, productById, type OccasionId } from '../data/catalog'
import { useI18n } from '../lib/i18n'
import { useStore, orderStatus } from '../lib/store'
import { ProductArt } from '../components/ProductArt'
import { ProductCard } from '../components/ProductCard'
import { LogoMark } from '../components/Logo'
import { I } from '../components/Icons'
import { Button, cx, Empty, OccasionGlyph, PatternBg } from '../components/ui'
import { STATUS_LABEL } from './Order'

function Login() {
  const { tx } = useI18n()
  const login = useStore((s) => s.login)
  const [step, setStep] = useState<0 | 1>(0)
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [otp, setOtp] = useState('')
  const [err, setErr] = useState('')
  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 pt-10 md:grid-cols-2 md:px-8">
      <div className="relative hidden overflow-hidden rounded-[36px] bg-green p-10 text-cream-50 md:block">
                <div className="relative flex h-full flex-col">
          <LogoMark className="h-14 w-14" />
          <h2 className="mt-auto font-display text-4xl font-semibold leading-tight">{tx('كل مناسباتك في مكان واحد', 'All your occasions in one place')}</h2>
          <p className="mt-3 text-cream/70">{tx('تذكيرات بالمناسبات، طلبات محفوظة، وعناوين جاهزة.', 'Occasion reminders, saved orders and ready addresses.')}</p>
        </div>
      </div>
      <div className="rounded-[36px] bg-white p-6 shadow-soft md:p-10">
        <h1 className="font-display text-3xl font-semibold text-green">{tx('تسجيل الدخول', 'Sign in')}</h1>
        <p className="mt-2 text-sm text-ink/55">{tx('تسجيل تجريبي — لا نرسل رسائل حقيقية ولا نحفظ بياناتك خارج متصفحك.', 'Demo sign-in — no real SMS is sent and nothing leaves your browser.')}</p>
        <AnimatePresence mode="wait">
          {step === 0 ? (
            <motion.form key="a" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mt-8 space-y-4" onSubmit={(e) => { e.preventDefault(); if (name.trim().length < 2) return setErr(tx('اكتب اسمك', 'Enter your name')); if (!/^05\d{8}$/.test(phone)) return setErr(tx('رقم جوال سعودي يبدأ بـ 05', 'Saudi mobile starting with 05')); setErr(''); setStep(1) }}>
              <div><label htmlFor="lname" className="mb-1.5 block text-sm font-medium text-green">{tx('الاسم', 'Name')}</label><input id="lname" value={name} onChange={(e) => setName(e.target.value)} className="h-12 w-full rounded-2xl border border-green/15 px-4 outline-none focus:border-gold" /></div>
              <div><label htmlFor="lphone" className="mb-1.5 block text-sm font-medium text-green">{tx('رقم الجوال', 'Mobile number')}</label><input id="lphone" dir="ltr" inputMode="tel" placeholder="05XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} className="h-12 w-full rounded-2xl border border-green/15 px-4 text-start outline-none focus:border-gold" /></div>
              {err && <p className="text-sm text-blush-700" role="alert">{err}</p>}
              <Button size="lg" type="submit" className="w-full">{tx('أرسل رمز التحقق', 'Send code')}</Button>
              <button type="button" onClick={() => { login({ name: tx('ضيف لمّة', 'Lamma Guest'), phone: '0500000000' }) }} className="w-full text-center text-sm text-cocoa underline-offset-4 hover:underline">{tx('أو ادخل بحساب تجريبي جاهز', 'Or use a ready demo account')}</button>
            </motion.form>
          ) : (
            <motion.form key="b" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="mt-8 space-y-4" onSubmit={(e) => { e.preventDefault(); if (otp !== '1234') return setErr(tx('الرمز غير صحيح — في العرض الرمز 1234', 'Wrong code — the demo code is 1234')); login({ name: name.trim(), phone }) }}>
              <p className="text-sm text-ink/60">{tx('أدخل الرمز المرسل إلى', 'Enter the code sent to')} <span dir="ltr" className="font-medium text-green">{phone}</span></p>
              <div className="rounded-2xl bg-gold-100/60 px-4 py-2 text-sm text-cocoa">{tx('رمز العرض: 1234', 'Demo code: 1234')}</div>
              <label htmlFor="otp" className="sr-only">{tx('رمز التحقق', 'Verification code')}</label>
              <input id="otp" dir="ltr" inputMode="numeric" autoFocus maxLength={4} value={otp} onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setErr('') }} className="tabular h-14 w-full rounded-2xl border border-green/15 text-center text-2xl tracking-[.6em] outline-none focus:border-gold" />
              {err && <p className="text-sm text-blush-700" role="alert">{err}</p>}
              <Button size="lg" type="submit" className="w-full">{tx('تأكيد', 'Verify')}</Button>
              <button type="button" onClick={() => setStep(0)} className="w-full text-sm text-ink/50">{tx('تغيير الرقم', 'Change number')}</button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export function Account() {
  const { tx, l, money, date, lang } = useI18n()
  const { user, logout, orders, setLang, favorites } = useStore()
  const [tab, setTab] = useState<'orders' | 'dates' | 'settings'>('orders')
  const [dates, setDates] = useState<{ name: string; occ: OccasionId; date: string }[]>([
    { name: tx('الوالدة', 'Mum'), occ: 'birthday', date: '2026-11-03' },
    { name: tx('ذكرى زواجنا', 'Our anniversary'), occ: 'anniversary', date: '2027-01-14' },
  ])
  const [nd, setNd] = useState({ name: '', occ: 'birthday' as OccasionId, date: '' })
  if (!user) return <Login />
  return (
    <div className="mx-auto max-w-[1180px] px-4 pt-8 md:px-8">
      <div className="relative overflow-hidden rounded-[36px] bg-cream p-6 md:p-10">
                <div className="relative flex flex-wrap items-center gap-5">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-green font-display text-3xl text-gold">{user.name.slice(0, 1)}</span>
          <div className="flex-1">
            <h1 className="font-display text-3xl font-semibold text-green">{tx(`أهلاً ${user.name}`, `Hello, ${user.name}`)}</h1>
            <p className="text-sm text-ink/55" dir="ltr">{user.phone}</p>
          </div>
          <div className="flex gap-6 text-center">
            <div><div className="font-serif text-4xl text-green">{orders.length}</div><div className="text-xs text-ink/50">{tx('طلبات', 'Orders')}</div></div>
            <div><div className="font-serif text-4xl text-green">{favorites.length}</div><div className="text-xs text-ink/50">{tx('مفضلة', 'Saved')}</div></div>
          </div>
        </div>
      </div>
      <div className="mt-8 flex gap-6 border-b border-green/10" role="tablist">
        {([['orders', tx('طلباتي', 'My orders')], ['dates', tx('مناسباتي', 'My occasions')], ['settings', tx('الإعدادات', 'Settings')]] as const).map(([k, v]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cx('relative pb-3', tab === k ? 'text-green' : 'text-ink/50')}>{v}{tab === k && <motion.span layoutId="acct" className="absolute inset-x-0 -bottom-px h-0.5 bg-gold" />}</button>
        ))}
      </div>
      <div className="py-8">
        {tab === 'orders' && (
          <ul className="space-y-3">
            {orders.map((o) => {
              const s = orderStatus(o)
              return (
                <li key={o.id}>
                  <Link to={`/order/${o.id}`} className="flex flex-wrap items-center gap-4 rounded-3xl bg-white p-4 shadow-soft hover:shadow-lift">
                    <div className="flex -space-x-3 rtl:space-x-reverse">{o.lines.slice(0, 3).map((ln) => <div key={ln.key} className="h-16 w-14 overflow-hidden rounded-xl ring-2 ring-white"><ProductArt art={productById(ln.productId)!.art} className="h-full w-full" /></div>)}</div>
                    <div className="min-w-0 flex-1"><div className="tabular font-medium text-green" dir="ltr">{o.id}</div><div className="text-sm text-ink/55">{tx('إلى', 'To')} {o.recipient.name} · {date(o.delivery.date)}</div></div>
                    <div className="text-end"><div className="tabular font-semibold">{money(o.totals.total)}</div><span className={cx('mt-1 inline-block rounded-full px-3 py-0.5 text-[12px]', s === 'delivered' ? 'bg-green/10 text-green' : 'bg-gold/20 text-cocoa')}>{l(STATUS_LABEL[s])}</span></div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
        {tab === 'dates' && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <ul className="space-y-3">
              {dates.map((d, i) => {
                const days = Math.ceil((new Date(d.date + 'T00:00').getTime() - Date.now()) / 86400e3)
                return (
                  <li key={i} className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-soft">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-cream"><OccasionGlyph id={d.occ} className="h-9 w-9" /></span>
                    <div className="flex-1"><div className="font-medium text-green">{d.name}</div><div className="text-sm text-ink/55">{l(OCCASIONS.find((o) => o.id === d.occ)!.name)} · {date(d.date)}</div></div>
                    <div className="text-end"><div className="font-serif text-2xl text-green">{Math.max(0, days)}</div><div className="text-[11px] text-ink/45">{tx('يوم', 'days')}</div></div>
                    <Link to="/studio" state={{ text: `${l(OCCASIONS.find((o) => o.id === d.occ)!.name)} ${d.name}` }} className="grid h-10 w-10 place-items-center rounded-full bg-green text-gold" aria-label={tx('جهّزها بالاستوديو', 'Plan with Studio')}><I.sparkle size={18} /></Link>
                  </li>
                )
              })}
            </ul>
            <form onSubmit={(e) => { e.preventDefault(); if (nd.name && nd.date) { setDates([...dates, nd]); setNd({ name: '', occ: 'birthday', date: '' }) } }} className="space-y-3 rounded-3xl bg-cream p-5">
              <h3 className="font-display text-lg font-semibold text-green">{tx('أضف مناسبة للتذكير', 'Add a reminder')}</h3>
              <label htmlFor="ndname" className="sr-only">{tx('الاسم', 'Name')}</label>
              <input id="ndname" value={nd.name} onChange={(e) => setNd({ ...nd, name: e.target.value })} placeholder={tx('مثال: عيد ميلاد أختي', 'e.g. My sister’s birthday')} className="h-11 w-full rounded-2xl border border-green/15 bg-white px-4 outline-none" />
              <div className="grid grid-cols-2 gap-2">
                <label htmlFor="ndocc" className="sr-only">{tx('المناسبة', 'Occasion')}</label>
                <select id="ndocc" value={nd.occ} onChange={(e) => setNd({ ...nd, occ: e.target.value as OccasionId })} className="h-11 rounded-2xl border border-green/15 bg-white px-3">{OCCASIONS.map((o) => <option key={o.id} value={o.id}>{l(o.name)}</option>)}</select>
                <label htmlFor="nddate" className="sr-only">{tx('التاريخ', 'Date')}</label>
                <input id="nddate" type="date" value={nd.date} onChange={(e) => setNd({ ...nd, date: e.target.value })} className="h-11 rounded-2xl border border-green/15 bg-white px-3" />
              </div>
              <Button type="submit" className="w-full">{tx('حفظ', 'Save')}</Button>
              <p className="text-[11px] text-ink/45">{tx('التذكيرات في هذا العرض تُحفظ مؤقتاً في هذه الصفحة.', 'Reminders in this demo are kept for this page session.')}</p>
            </form>
          </div>
        )}
        {tab === 'settings' && (
          <div className="max-w-md space-y-4">
            <div className="flex items-center justify-between rounded-3xl bg-white p-4 shadow-soft"><span className="text-green">{tx('اللغة', 'Language')}</span><div className="flex gap-1 rounded-full bg-cream p-1">{(['ar', 'en'] as const).map((x) => <button key={x} onClick={() => setLang(x)} className={cx('rounded-full px-4 py-1.5 text-sm', lang === x ? 'bg-green text-cream-50' : 'text-green')}>{x === 'ar' ? 'العربية' : 'English'}</button>)}</div></div>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/dashboard/merchant" className="rounded-3xl bg-white p-4 text-green shadow-soft"><I.store className="mb-2 text-gold-700" />{tx('دخول كتاجر (تجريبي)', 'Merchant view (demo)')}</Link>
              <Link to="/dashboard/admin" className="rounded-3xl bg-white p-4 text-green shadow-soft"><I.chart className="mb-2 text-gold-700" />{tx('دخول كمدير (تجريبي)', 'Admin view (demo)')}</Link>
            </div>
            <Button variant="outline" onClick={logout}><I.logout size={16} />{tx('تسجيل الخروج', 'Sign out')}</Button>
          </div>
        )}
      </div>
    </div>
  )
}

export function Favorites() {
  const { tx } = useI18n()
  const favs = useStore((s) => s.favorites)
  const list = PRODUCTS.filter((p) => favs.includes(p.id))
  return (
    <div className="mx-auto max-w-[1440px] px-4 pt-8 md:px-8">
      <h1 className="font-display text-4xl font-semibold text-green md:text-5xl">{tx('المفضلة', 'Favourites')}</h1>
      <p className="mt-2 text-ink/60">{tx(`${list.length} منتجات محفوظة`, `${list.length} saved products`)}</p>
      {list.length === 0 ? <Empty title={tx('ما حفظت شي للحين', 'Nothing saved yet')} sub={tx('اضغط ♡ على أي منتج لحفظه هنا.', 'Tap ♡ on any product to save it here.')} action={<Button to="/shop">{tx('تصفح المنتجات', 'Browse products')}</Button>} /> : (
        <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-9 md:grid-cols-3 md:gap-x-5 lg:grid-cols-4">{list.map((p, i) => <ProductCard key={p.id} p={p} index={i} />)}</div>
      )}
    </div>
  )
}
