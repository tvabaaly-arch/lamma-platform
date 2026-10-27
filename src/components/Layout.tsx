import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { CATEGORIES, CITIES, MERCHANTS, PRODUCTS, OCCASIONS, merchantById, productById, type Product } from '../data/catalog'
import { useI18n } from '../lib/i18n'
import { useStore, cartTotals, unitPrice, basePrice } from '../lib/store'
import { apiMode } from '../lib/api'
import { Logo, LogoMark } from './Logo'
import { I } from './Icons'
import { ProductArt } from './ProductArt'
import { Button, BorderStrip, cx, PatternBg, QtyStepper } from './ui'

export function variantText(p: Product, variant: Record<string, string>, l: (o: { ar: string; en: string }) => string) {
  return p.variants.map((g) => g.options.find((o) => o.id === variant[g.key])).filter(Boolean).map((o) => l(o!.label)).join(' · ')
}

/* ---------- Demo notice ---------- */
export function DemoBar() {
  const { tx } = useI18n()
  const reset = useStore((s) => s.resetDemo)
  const toast = useStore((s) => s.showToast)
  const [confirm, setConfirm] = useState(false)
  return (
    <div className="relative z-40 bg-green-950 text-cream/80">
      <div className="mx-auto flex max-w-[1440px] items-center justify-center gap-3 px-4 py-2 text-[12px]">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
        <span className="truncate">{tx('نسخة عرض تجريبية — جميع المتاجر والأسعار والطلبات وهمية، ولا يتم أي دفع فعلي.', 'Demo build — all merchants, prices and orders are fictional. No real payments.')}</span>
        {confirm ? (
          <span className="flex shrink-0 items-center gap-2">
            <button className="text-gold underline-offset-2 hover:underline" onClick={() => { reset(); setConfirm(false); toast(tx('تمت إعادة ضبط العرض', 'Demo reset')) }}>{tx('تأكيد', 'Confirm')}</button>
            <button className="opacity-70 hover:opacity-100" onClick={() => setConfirm(false)}>{tx('إلغاء', 'Cancel')}</button>
          </span>
        ) : (
          !apiMode && <button className="hidden shrink-0 text-gold underline-offset-2 hover:underline sm:inline" onClick={() => setConfirm(true)}>{tx('إعادة ضبط', 'Reset demo')}</button>
        )}
      </div>
    </div>
  )
}

/* ---------- Header ---------- */
export function Header({ onSearch }: { onSearch: () => void }) {
  const { tx, l, isAr } = useI18n()
  const { lang, setLang, city, setCity, cart, setCartOpen, favorites, user } = useStore()
  const count = cart.reduce((a, c) => a + c.qty, 0)
  const [scrolled, setScrolled] = useState(false)
  const [menu, setMenu] = useState(false)
  const [cityOpen, setCityOpen] = useState(false)
  const loc = useLocation()
  useEffect(() => { setMenu(false); setCityOpen(false) }, [loc.pathname])
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 12)
    f(); window.addEventListener('scroll', f, { passive: true })
    return () => window.removeEventListener('scroll', f)
  }, [])

  const nav = [
    { to: '/shop', label: tx('المتجر', 'Shop') },
    { to: '/studio', label: tx('استوديو لمّة', 'AI Studio'), star: true },
    { to: '/finder', label: tx('دليل الهدايا', 'Gift Finder') },
    { to: '/occasions', label: tx('المناسبات', 'Occasions') },
    { to: '/merchants', label: tx('المتاجر', 'Merchants') },
    { to: '/track', label: tx('تتبع طلبك', 'Track order') },
  ]

  return (
    <header className={cx('sticky top-0 z-30 transition-all duration-500', scrolled ? 'bg-cream-50/85 shadow-[0_1px_0_rgba(15,61,50,.08)] backdrop-blur-xl' : 'bg-transparent')}>
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center gap-3 px-4 md:h-20 md:px-8">
        <button className="grid h-10 w-10 place-items-center rounded-full text-green hover:bg-green/5 lg:hidden" onClick={() => setMenu(true)} aria-label={tx('القائمة', 'Menu')}><I.menu size={22} /></button>
        <Link to="/" className="shrink-0" aria-label={tx('الرئيسية', 'Home')}><Logo className="h-9 w-auto md:h-11" /></Link>
        <nav className="ms-6 hidden items-center gap-1 lg:flex" aria-label={tx('التنقل الرئيسي', 'Main')}>
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => cx('relative rounded-full px-4 py-2 text-[15px] transition-colors', isActive ? 'text-green' : 'text-ink/70 hover:text-green')}>
              {({ isActive }) => (
                <>
                  {n.star && <I.sparkle size={14} className="me-1 inline-block -translate-y-px text-gold" />}
                  {n.label}
                  {isActive && <motion.span layoutId="navdot" className="absolute inset-x-4 -bottom-0.5 h-[2px] rounded-full bg-gold" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-1 md:gap-2">
          <div className="relative hidden md:block">
            <button onClick={() => setCityOpen((o) => !o)} className="flex h-10 items-center gap-1.5 rounded-full px-3 text-sm text-green hover:bg-green/5" aria-expanded={cityOpen} aria-haspopup="listbox">
              <I.pin size={16} className="text-gold-700" />{l(CITIES.find((c) => c.id === city)!.name)}<I.chevronDown size={14} />
            </button>
            <AnimatePresence>
              {cityOpen && (
                <motion.ul role="listbox" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="absolute end-0 top-12 z-50 w-48 rounded-2xl border border-green/10 bg-white p-1.5 shadow-lift">
                  {CITIES.map((c) => (
                    <li key={c.id}>
                      <button role="option" aria-selected={c.id === city} onClick={() => { setCity(c.id); setCityOpen(false) }} className={cx('flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-cream', c.id === city && 'text-green font-medium')}>
                        {l(c.name)}{c.id === city && <I.check size={16} className="text-gold-700" />}
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
          <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} className="flex h-10 items-center gap-1 rounded-full px-3 text-sm font-medium text-green hover:bg-green/5" aria-label={tx('Switch to English', 'التبديل للعربية')}>
            <I.globe size={17} /><span className={isAr ? 'font-sans' : 'font-sans'}>{lang === 'ar' ? 'EN' : 'ع'}</span>
          </button>
          <button onClick={onSearch} className="grid h-10 w-10 place-items-center rounded-full text-green hover:bg-green/5" aria-label={tx('بحث', 'Search')}><I.search /></button>
          <Link to="/favorites" className="relative hidden h-10 w-10 place-items-center rounded-full text-green hover:bg-green/5 sm:grid" aria-label={tx('المفضلة', 'Favourites')}>
            <I.heart />{favorites.length > 0 && <span className="absolute end-1.5 top-1.5 h-2 w-2 rounded-full bg-blush" />}
          </Link>
          <Link to="/account" className="hidden h-10 items-center gap-2 rounded-full px-2 text-green hover:bg-green/5 sm:flex" aria-label={tx('حسابي', 'Account')}>
            {user ? <span className="grid h-8 w-8 place-items-center rounded-full bg-gold/30 text-sm font-semibold">{user.name.slice(0, 1)}</span> : <I.user />}
          </Link>
          <button onClick={() => setCartOpen(true)} className="relative flex h-10 items-center gap-2 rounded-full bg-green ps-3 pe-4 text-cream-50 transition hover:bg-green-700" aria-label={tx(`السلة، ${count} منتجات`, `Cart, ${count} items`)}>
            <I.bag size={18} />
            <motion.span key={count} initial={{ scale: 1.6 }} animate={{ scale: 1 }} className="tabular text-sm font-medium">{count}</motion.span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menu && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-green-950/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenu(false)} />
            <motion.aside
              className="fixed inset-y-0 start-0 z-50 flex w-[86%] max-w-sm flex-col overflow-y-auto bg-cream-50 p-6"
              initial={{ x: isAr ? '100%' : '-100%' }} animate={{ x: 0 }} exit={{ x: isAr ? '100%' : '-100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              role="dialog" aria-label={tx('القائمة', 'Menu')}
            >
              <div className="flex items-center justify-between">
                <Logo className="h-9" />
                <button onClick={() => setMenu(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-green/5" aria-label={tx('إغلاق', 'Close')}><I.close /></button>
              </div>
              <nav className="mt-8 flex flex-col">
                {[{ to: '/', label: tx('الرئيسية', 'Home') }, ...nav, { to: '/favorites', label: tx('المفضلة', 'Favourites') }, { to: '/account', label: tx('حسابي', 'My account') }].map((n, i) => (
                  <motion.div key={n.to} initial={{ opacity: 0, x: isAr ? 20 : -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}>
                    <Link to={n.to} className="flex items-center justify-between border-b border-green/10 py-4 font-display text-xl text-green">{n.label}<I.chevron size={18} className="rtl-flip rotate-180 opacity-40" /></Link>
                  </motion.div>
                ))}
              </nav>
              <div className="mt-6">
                <div className="eyebrow mb-2 text-cocoa">{tx('مدينة التوصيل', 'Delivery city')}</div>
                <div className="flex flex-wrap gap-2">
                  {CITIES.map((c) => <button key={c.id} onClick={() => setCity(c.id)} className={cx('rounded-full border px-3 py-1.5 text-sm', c.id === city ? 'border-green bg-green text-cream-50' : 'border-green/15')}>{l(c.name)}</button>)}
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-2 text-sm">
                <Link to="/dashboard/merchant" className="rounded-2xl bg-white p-4 text-green shadow-soft"><I.store className="mb-2 text-gold-700" />{tx('لوحة التاجر', 'Merchant hub')}</Link>
                <Link to="/dashboard/admin" className="rounded-2xl bg-white p-4 text-green shadow-soft"><I.chart className="mb-2 text-gold-700" />{tx('لوحة الإدارة', 'Admin')}</Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </header>
  )
}

/* ---------- Mobile tab bar ---------- */
export function MobileTabBar() {
  const { tx } = useI18n()
  const count = useStore((s) => s.cart.reduce((a, c) => a + c.qty, 0))
  const setCartOpen = useStore((s) => s.setCartOpen)
  const onCheckout = useLocation().pathname === '/checkout'
  const tabs = [
    { to: '/', icon: I.home, label: tx('الرئيسية', 'Home') },
    { to: '/shop', icon: I.grid, label: tx('المتجر', 'Shop') },
    { to: '/studio', icon: I.sparkle, label: tx('استوديو', 'Studio'), center: true },
    { to: '/favorites', icon: I.heart, label: tx('المفضلة', 'Saved') },
    { to: '/account', icon: I.user, label: tx('حسابي', 'Account') },
  ]
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-green/10 bg-cream-50/90 backdrop-blur-xl lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} aria-label={tx('تنقل سريع', 'Quick navigation')}>
      <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-2">
        {tabs.map((t) =>
          t.center ? (
            <NavLink key={t.to} to={t.to} className="flex justify-center" aria-label={t.label}>
              <span className="-mt-7 grid h-14 w-14 place-items-center rounded-full bg-green text-gold shadow-lift ring-4 ring-cream-50"><t.icon size={24} /></span>
            </NavLink>
          ) : (
            <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => cx('flex flex-col items-center gap-0.5 text-[10.5px]', isActive ? 'text-green' : 'text-ink/45')}>
              <t.icon size={21} />{t.label}
            </NavLink>
          ),
        )}
      </div>
      {count > 0 && !onCheckout && (
        <button onClick={() => setCartOpen(true)} className="absolute -top-14 end-4 flex h-11 items-center gap-2 rounded-full bg-gold px-4 text-sm font-medium text-green-950 shadow-glow" aria-label={tx('افتح السلة', 'Open cart')}>
          <I.bag size={17} />{count}
        </button>
      )}
    </nav>
  )
}

/* ---------- Cart drawer ---------- */
export function CartDrawer() {
  const { tx, l, money, isAr } = useI18n()
  const { cart, cartOpen, setCartOpen, updateQty, removeLine, overrides } = useStore()
  const nav = useNavigate()
  const t = cartTotals(cart, overrides)
  useEffect(() => {
    if (!cartOpen) return
    const f = (e: KeyboardEvent) => e.key === 'Escape' && setCartOpen(false)
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [cartOpen, setCartOpen])
  return (
    <AnimatePresence>
      {cartOpen && (
        <>
          <motion.div className="fixed inset-0 z-50 bg-green-950/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCartOpen(false)} />
          <motion.aside
            role="dialog" aria-modal="true" aria-label={tx('سلة التسوق', 'Shopping cart')}
            className="fixed inset-y-0 end-0 z-50 flex w-full max-w-[440px] flex-col bg-cream-50 shadow-2xl"
            initial={{ x: isAr ? '-100%' : '100%' }} animate={{ x: 0 }} exit={{ x: isAr ? '-100%' : '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 320 }}
          >
            <div className="flex items-center justify-between border-b border-green/10 px-6 py-5">
              <div>
                <h2 className="font-display text-xl font-semibold text-green">{tx('سلتك', 'Your cart')}</h2>
                <p className="text-xs text-ink/50">{tx(`${cart.length} منتجات من ${t.merchants.length} متاجر`, `${cart.length} items from ${t.merchants.length} merchants`)}</p>
              </div>
              <button onClick={() => setCartOpen(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-green/5" aria-label={tx('إغلاق', 'Close')}><I.close /></button>
            </div>
            {cart.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
                <LogoMark className="h-20 w-20" spin />
                <h3 className="font-display text-xl text-green">{tx('سلتك تنتظر لمّتك', 'Your cart is waiting')}</h3>
                <p className="text-sm text-ink/60">{tx('خلّ استوديو لمّة يقترح لك هدية كاملة خلال ثوانٍ.', 'Let Lamma Studio build a complete gift for you in seconds.')}</p>
                <Button onClick={() => { setCartOpen(false); nav('/studio') }}><I.sparkle size={16} />{tx('جرّب استوديو لمّة', 'Try Lamma Studio')}</Button>
              </div>
            ) : (
              <>
                <ul className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                  <AnimatePresence initial={false}>
                    {cart.map((c) => {
                      const p = productById(c.productId)!
                      return (
                        <motion.li key={c.key} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: isAr ? -60 : 60 }} className="flex gap-3 rounded-3xl bg-white p-3 shadow-soft">
                          <Link to={`/product/${p.id}`} onClick={() => setCartOpen(false)} className="h-24 w-20 shrink-0 overflow-hidden rounded-2xl"><ProductArt art={p.art} className="h-full w-full" /></Link>
                          <div className="flex min-w-0 flex-1 flex-col">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-[11px] text-ink/50">{l(merchantById(p.merchant).name)}</p>
                                <p className="truncate font-medium text-green">{l(p.name)}</p>
                                {variantText(p, c.variant, l) && <p className="truncate text-xs text-ink/55">{variantText(p, c.variant, l)}</p>}
                                {c.note && <p className="truncate text-xs text-cocoa">“{c.note}”</p>}
                                {c.bundle && <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-gold-700"><I.sparkle size={12} />{tx('من استوديو لمّة', 'From Lamma Studio')}</p>}
                              </div>
                              <button onClick={() => removeLine(c.key)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink/40 hover:bg-blush-100 hover:text-blush-700" aria-label={tx('حذف', 'Remove')}><I.trash size={16} /></button>
                            </div>
                            <div className="mt-auto flex items-center justify-between pt-2">
                              <QtyStepper small value={c.qty} onChange={(n) => updateQty(c.key, n)} />
                              <span className="tabular font-semibold">{money(unitPrice(p, c.variant, overrides) * c.qty)}</span>
                            </div>
                          </div>
                        </motion.li>
                      )
                    })}
                  </AnimatePresence>
                </ul>
                <div className="border-t border-green/10 bg-white px-6 pb-6 pt-4" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom, 0px))' }}>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-ink/60">{tx('المجموع الفرعي', 'Subtotal')}</span><span className="tabular">{money(t.subtotal)}</span></div>
                    <div className="flex justify-between"><span className="text-ink/60">{tx(`التوصيل (${t.merchants.length} متجر)`, `Delivery (${t.merchants.length} merchant${t.merchants.length > 1 ? 's' : ''})`)}</span><span className="tabular">{money(t.delivery)}</span></div>
                    <div className="flex justify-between pt-2 text-base font-semibold text-green"><span>{tx('الإجمالي', 'Total')}</span><span className="tabular">{money(t.total)}</span></div>
                    <p className="text-[11px] text-ink/45">{tx('الأسعار تشمل ضريبة القيمة المضافة', 'Prices include VAT')}</p>
                  </div>
                  <Button size="lg" className="mt-4 w-full" onClick={() => { setCartOpen(false); nav('/checkout') }}>{tx('إتمام الطلب', 'Checkout')}<I.arrow size={18} className="rtl-flip rotate-180" /></Button>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

/* ---------- Search overlay ---------- */
const norm = (s: string) => s.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ًٌٍَُِّْ]/g, '')

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tx, l, money } = useI18n()
  const overrides = useStore((s) => s.overrides)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  const nav = useNavigate()
  useEffect(() => { if (open) { setTimeout(() => ref.current?.focus(), 50) } else setQ('') }, [open])
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [onClose])
  const res = useMemo(() => {
    const n = norm(q.trim())
    if (!n) return null
    const hit = (o: { ar: string; en: string }) => norm(o.ar).includes(n) || norm(o.en).includes(n)
    return {
      products: PRODUCTS.filter((p) => hit(p.name) || hit(p.desc) || hit(CATEGORIES.find((c) => c.id === p.cat)!.name)).sort((a, b) => (b.art.img ? 1 : 0) - (a.art.img ? 1 : 0)).slice(0, 8),
      merchants: MERCHANTS.filter((m) => hit(m.name) || hit(m.tagline)).slice(0, 4),
      cats: CATEGORIES.filter((c) => hit(c.name)),
      occ: OCCASIONS.filter((o) => hit(o.name)).slice(0, 4),
    }
  }, [q])
  const go = (to: string) => { onClose(); nav(to) }
  const popular = [tx('ورد', 'Roses'), tx('كيك', 'Cake'), tx('عود', 'Oud'), tx('تخرج', 'Graduation'), tx('مولود', 'Baby'), tx('ماكرون', 'Macarons')]
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] overflow-y-auto bg-cream-50/95 backdrop-blur-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label={tx('بحث', 'Search')}>
          <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 md:pt-16">
            <div className="flex items-center gap-3">
              <div className="flex h-14 flex-1 items-center gap-3 rounded-full border border-green/15 bg-white px-5 shadow-soft focus-within:border-green/40">
                <I.search className="text-green/50" />
                <input id="global-search" ref={ref} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && q.trim()) go(`/shop?q=${encodeURIComponent(q.trim())}`) }} placeholder={tx('ابحث عن ورد، كيك، متجر، مناسبة…', 'Search flowers, cakes, merchants, occasions…')} className="h-full flex-1 bg-transparent text-lg text-green outline-none placeholder:text-ink/35" />
              </div>
              <button onClick={onClose} className="grid h-12 w-12 place-items-center rounded-full hover:bg-green/5" aria-label={tx('إغلاق', 'Close')}><I.close /></button>
            </div>
            {!res ? (
              <div className="mt-10">
                <div className="eyebrow mb-3 text-cocoa">{tx('الأكثر بحثاً', 'Popular')}</div>
                <div className="flex flex-wrap gap-2">{popular.map((p) => <button key={p} onClick={() => setQ(p)} className="rounded-full border border-green/15 bg-white px-4 py-2 text-sm text-green hover:border-green/40">{p}</button>)}</div>
                <button onClick={() => go('/studio')} className="mt-10 flex w-full items-center gap-4 rounded-3xl bg-green p-5 text-start text-cream-50">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-gold/20 text-gold"><I.sparkle /></span>
                  <span className="flex-1"><span className="block font-display text-lg">{tx('مو متأكد وش تختار؟', 'Not sure what to pick?')}</span><span className="text-sm text-cream/70">{tx('وصف المناسبة واستوديو لمّة يقترح ٣ هدايا كاملة', 'Describe the occasion and Lamma Studio suggests 3 complete gifts')}</span></span>
                  <I.arrow className="rtl-flip rotate-180" />
                </button>
              </div>
            ) : (
              <div className="mt-8 space-y-8">
                {res.cats.length + res.occ.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {res.cats.map((c) => <button key={c.id} onClick={() => go(`/shop/${c.id}`)} className="rounded-full bg-green px-4 py-2 text-sm text-cream-50">{l(c.name)}</button>)}
                    {res.occ.map((o) => <button key={o.id} onClick={() => go(`/shop?occasion=${o.id}`)} className="rounded-full bg-gold/25 px-4 py-2 text-sm text-green">{l(o.name)}</button>)}
                  </div>
                )}
                {res.products.length > 0 && (
                  <div>
                    <div className="eyebrow mb-3 text-cocoa">{tx('منتجات', 'Products')}</div>
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {res.products.map((p, i) => (
                        <motion.li key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                          <button onClick={() => go(`/product/${p.id}`)} className="flex w-full items-center gap-3 rounded-2xl bg-white p-2 text-start shadow-soft hover:shadow-lift">
                            <span className="h-16 w-14 shrink-0 overflow-hidden rounded-xl"><ProductArt art={p.art} className="h-full w-full" /></span>
                            <span className="min-w-0 flex-1"><span className="block truncate font-medium text-green">{l(p.name)}</span><span className="text-xs text-ink/50">{l(merchantById(p.merchant).name)}</span></span>
                            <span className="tabular pe-2 text-sm font-semibold">{money(basePrice(p, overrides))}</span>
                          </button>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                )}
                {res.merchants.length > 0 && (
                  <div>
                    <div className="eyebrow mb-3 text-cocoa">{tx('متاجر', 'Merchants')}</div>
                    <div className="flex flex-wrap gap-2">{res.merchants.map((m) => <button key={m.id} onClick={() => go(`/merchant/${m.id}`)} className="flex items-center gap-2 rounded-full border border-green/15 bg-white py-1.5 pe-4 ps-1.5 text-sm"><MerchantMonogram m={m} small />{l(m.name)}</button>)}</div>
                  </div>
                )}
                {res.products.length + res.merchants.length + res.cats.length === 0 && <p className="py-10 text-center text-ink/60">{tx('ما لقينا نتائج. جرّب كلمة ثانية أو استوديو لمّة.', 'No results. Try another word, or Lamma Studio.')}</p>}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const MONO = [['#0F3D32', '#D4A373'], ['#E89B9A', '#FFFFFF'], ['#D4A373', '#0F3D32'], ['#F2C3C2', '#8C5E3C'], ['#8C5E3C', '#F6EDE7']]
export function MerchantMonogram({ m, small, large }: { m: { hue: number; initials: string }; small?: boolean; large?: boolean }) {
  const [bg, fg] = MONO[m.hue]
  return (
    <span className={cx('relative grid shrink-0 place-items-center overflow-hidden rounded-full font-display font-semibold', small ? 'h-7 w-7 text-sm' : large ? 'h-24 w-24 text-4xl ring-4 ring-cream-50' : 'h-12 w-12 text-xl')} style={{ background: bg, color: fg }}>
      <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full opacity-20" aria-hidden><path d="M20 4c1.5 9 3.5 11 12 12-8.5 1-10.5 3-12 12-1.5-9-3.5-11-12-12 8.5-1 10.5-3 12-12Z" fill={fg} transform="translate(8 8) scale(.6)" /></svg>
      <span className="relative">{m.initials}</span>
    </span>
  )
}

/* ---------- Footer ---------- */
export function Footer() {
  const { tx, l } = useI18n()
  return (
    <footer className="relative mt-24 overflow-hidden bg-green text-cream/80">
      <div className="relative mx-auto grid max-w-[1440px] gap-12 px-4 pb-28 pt-16 md:grid-cols-12 md:px-8 lg:pb-16">
        <div className="md:col-span-4">
          <div className="inline-flex rounded-[28px] bg-cream-50 px-6 py-4"><Logo className="h-12" /></div>
          <p className="mt-6 max-w-sm font-display text-2xl leading-snug text-cream-50">{tx('نلمّ لك الفرحة، من الفكرة إلى باب البيت.', 'We gather the joy for you — from idea to doorstep.')}</p>
          <p className="mt-4 text-sm text-cream/60">{tx('سوق سعودي للهدايا والاحتفالات · نسخة عرض للمستثمرين', 'A Saudi gifting & celebration marketplace · investor demo')}</p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-8">
          <div>
            <h3 className="eyebrow mb-4 text-gold">{tx('تسوّق', 'Shop')}</h3>
            <ul className="space-y-2.5 text-sm">{CATEGORIES.map((c) => <li key={c.id}><Link className="hover:text-cream-50" to={`/shop/${c.id}`}>{l(c.name)}</Link></li>)}</ul>
          </div>
          <div>
            <h3 className="eyebrow mb-4 text-gold">{tx('لمّة', 'Lamma')}</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link className="hover:text-cream-50" to="/studio">{tx('استوديو لمّة', 'Lamma Studio')}</Link></li>
              <li><Link className="hover:text-cream-50" to="/occasions">{tx('المناسبات', 'Occasions')}</Link></li>
              <li><Link className="hover:text-cream-50" to="/merchants">{tx('المتاجر', 'Merchants')}</Link></li>
              <li><Link className="hover:text-cream-50" to="/track">{tx('تتبع الطلب', 'Track order')}</Link></li>
              <li><Link className="hover:text-cream-50" to="/account">{tx('حسابي', 'Account')}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="eyebrow mb-4 text-gold">{tx('للشركاء', 'Partners')}</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link className="hover:text-cream-50" to="/dashboard/merchant">{tx('لوحة التاجر', 'Merchant hub')}</Link></li>
              <li><Link className="hover:text-cream-50" to="/dashboard/admin">{tx('لوحة الإدارة', 'Admin console')}</Link></li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-2 text-[11px] text-cream/60">
              {['mada', 'Apple Pay', 'STC Pay', 'Visa'].map((x) => <span key={x} className="rounded-md border border-cream/20 px-2 py-1">{x}</span>)}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-cream/10 pt-6 text-xs text-cream/50 md:col-span-12">
          <span>© 2026 LAMMA · {tx('جميع الأسماء التجارية والمنتجات والأسعار في هذا العرض وهمية.', 'All merchant names, products and prices in this demo are fictional.')}</span>
          <span>{tx('صور المنتجات مقدّمة من لمّة لأغراض العرض', 'Product photos supplied by Lamma for demo purposes')}</span>
        </div>
      </div>
    </footer>
  )
}

/* ---------- Toast ---------- */
export function Toast() {
  const toast = useStore((s) => s.toast)
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (!toast) return
    setShow(true)
    const t = setTimeout(() => setShow(false), 2200)
    return () => clearTimeout(t)
  }, [toast])
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex justify-center px-4 lg:bottom-8" aria-live="polite">
      <AnimatePresence>
        {show && toast && (
          <motion.div key={toast.id} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} className="flex items-center gap-2 rounded-full bg-green px-5 py-3 text-sm text-cream-50 shadow-lift">
            <I.check size={16} className="text-gold" />{toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
