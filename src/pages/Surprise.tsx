import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { productById } from '../data/catalog'
import { useI18n } from '../lib/i18n'
import { useStore, orderStatus } from '../lib/store'
import { ProductArt } from '../components/ProductArt'
import { GreetingCard } from '../components/GreetingCard'
import { Confetti } from '../components/Confetti'
import { Logo } from '../components/Logo'
import { I } from '../components/Icons'
import { Button, PatternBg } from '../components/ui'
import { STATUS_LABEL } from './Order'
import { api, apiMode } from '../lib/api'
import type { Order } from '../lib/model'

export default function Surprise() {
  const { id } = useParams()
  const { tx, l, date, lang } = useI18n()
  const [params] = useSearchParams()
  const token = params.get('t')
  const own = useStore((s) => s.orders.find((o) => o.id === id))
  const { markRevealed, setLang, showToast } = useStore()
  const [stage, setStage] = useState<0 | 1 | 2>(0)
  const [thanks, setThanks] = useState('')
  const [sent, setSent] = useState(false)
  // Recipients open the link without an account: load the order with its secret token.
  const [shared, setShared] = useState<Order | null | undefined>(apiMode && !own && token ? undefined : null)
  useEffect(() => {
    if (!apiMode || own || !token || !id) return
    api.orders.surprise(id, token).then((r) => setShared(r.order)).catch(() => setShared(null))
  }, [id, token, own])
  const order = own ?? shared ?? undefined

  if (shared === undefined) return <div className="grid min-h-screen place-items-center bg-green"><Logo className="h-12 opacity-80" /></div>
  if (!order)
    return (
      <div className="grid min-h-screen place-items-center bg-cream-50 p-6 text-center">
        <div><Logo className="mx-auto h-14" /><p className="mt-6 text-ink/60">{tx('الرابط غير صالح أو انتهت صلاحيته.', 'This link is invalid or has expired.')}</p><Button className="mt-6" to="/">{tx('اكتشف لمّة', 'Discover Lamma')}</Button></div>
      </div>
    )

  const open = () => {
    setStage(1)
    if (own) markRevealed(order.id)
    else if (token) api.orders.reveal(order.id, token).catch(() => {})
    setTimeout(() => setStage(2), 1600)
  }
  const status = orderStatus(order)

  return (
    <div className="relative min-h-screen overflow-hidden bg-green text-cream-50">
      <PatternBg tone="mono" opacity={0.06} drift />
      <div className="absolute start-1/2 top-1/3 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gold/20 blur-3xl" aria-hidden />
      <header className="relative z-10 flex items-center justify-between p-4 md:p-6">
        <div className="rounded-full bg-cream-50 px-4 py-2"><Logo className="h-7" /></div>
        <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} className="rounded-full bg-cream-50/10 px-4 py-2 text-sm">{lang === 'ar' ? 'English' : 'العربية'}</button>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] max-w-xl flex-col items-center justify-center px-4 pb-16 text-center">
        <AnimatePresence mode="wait">
          {stage === 0 && (
            <motion.div key="closed" exit={{ opacity: 0, scale: 1.2 }} transition={{ duration: 0.5 }} className="flex flex-col items-center">
              <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-gold">{tx(`${order.recipient.name}،`, `${order.recipient.name},`)}</motion.p>
              <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-2 font-display text-3xl font-semibold leading-tight md:text-5xl">{tx(`عندك مفاجأة من ${order.sender.name}`, `You have a surprise from ${order.sender.name}`)}</motion.h1>
              <motion.button
                onClick={open}
                aria-label={tx('افتح المفاجأة', 'Open the surprise')}
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1, rotate: [0, -3, 3, -2, 0] }}
                transition={{ delay: 0.4, rotate: { repeat: Infinity, repeatDelay: 1.6, duration: 0.7 } }}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="relative mt-12 h-56 w-56 md:h-64 md:w-64"
              >
                <svg viewBox="0 0 200 200" className="h-full w-full drop-shadow-2xl">
                  <rect x="30" y="80" width="140" height="105" rx="10" fill="#F6EDE7" />
                  <rect x="30" y="80" width="30" height="105" fill="#000" opacity=".05" />
                  <rect x="22" y="58" width="156" height="34" rx="8" fill="#F6EDE7" />
                  <rect x="22" y="82" width="156" height="10" fill="#000" opacity=".06" />
                  <rect x="90" y="58" width="20" height="127" fill="#D4A373" />
                  <path d="M100 58 C 60 15 40 60 96 60 M100 58 C 140 15 160 60 104 60" stroke="#D4A373" strokeWidth="12" fill="none" strokeLinecap="round" />
                  <circle cx="100" cy="58" r="10" fill="#E89B9A" />
                  <path d="M60 130 c 1.5 7 3 8.5 10 10 c -7 1.5 -8.5 3 -10 10 c -1.5 -7 -3 -8.5 -10 -10 c 7 -1.5 8.5 -3 10 -10Z" fill="#0F3D32" />
                </svg>
              </motion.button>
              <p className="mt-6 flex items-center gap-2 text-sm text-cream/70"><I.sparkle size={16} className="text-gold" />{tx('اضغط على الهدية لفتحها', 'Tap the gift to open it')}</p>
            </motion.div>
          )}
          {stage === 1 && (
            <motion.div key="opening" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: [0.6, 1.3, 1], opacity: 1, rotate: [0, 180, 360] }} exit={{ opacity: 0 }} transition={{ duration: 1.4 }}>
              <svg viewBox="-50 -50 100 100" className="h-40 w-40"><path d="M0 -45 C6 -12 12 -6 45 0 C12 6 6 12 0 45 C-6 12 -12 6 -45 0 C-12 -6 -6 -12 0 -45Z" fill="#D4A373" /></svg>
            </motion.div>
          )}
          {stage === 2 && (
            <motion.div key="open" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
              <Confetti count={60} />
              <motion.div initial={{ y: 80, opacity: 0, rotate: -4 }} animate={{ y: 0, opacity: 1, rotate: -2 }} transition={{ type: 'spring', stiffness: 80, damping: 14 }} className="mx-auto w-full max-w-[340px] text-start">
                <GreetingCard design={order.card.design === 0 ? 2 : order.card.design} message={order.card.message} from={order.card.from} to={order.recipient.name} lang={lang} />
              </motion.div>
              <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-10 font-display text-2xl">{tx('وهذي هديتك', 'And here’s your gift')}</motion.h2>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                {order.lines.map((ln, i) => {
                  const p = productById(ln.productId)!
                  return (
                    <motion.div key={ln.key} initial={{ opacity: 0, y: 30, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.8 + i * 0.15, type: 'spring' }} className="w-32 text-center">
                      <div className="aspect-[4/5] overflow-hidden rounded-[22px] border-4 border-cream-50/90 shadow-2xl"><ProductArt art={p.art} className="h-full w-full" /></div>
                      <div className="mt-2 text-[13px] text-cream/90">{l(p.name)}</div>
                    </motion.div>
                  )
                })}
              </div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }} className="mx-auto mt-8 max-w-sm rounded-3xl bg-cream-50/10 p-4 text-sm backdrop-blur">
                <div className="flex items-center justify-center gap-2 text-gold"><I.truck size={18} />{l(STATUS_LABEL[status])}</div>
                <p className="mt-1 text-cream/75">{status === 'delivered' ? tx('وصلت هديتك، استمتع!', 'Your gift has arrived — enjoy!') : tx(`توصلك ${date(order.delivery.date)} بين ${order.delivery.slot}`, `Arriving ${date(order.delivery.date)}, ${order.delivery.slot}`)}</p>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.7 }} className="mx-auto mt-6 max-w-sm">
                {sent ? (
                  <p className="flex items-center justify-center gap-2 text-sm text-gold"><I.check size={16} />{tx(`وصل شكرك لـ${order.sender.name} (تجريبي)`, `Thanks sent to ${order.sender.name} (demo)`)}</p>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); if (thanks.trim()) { setSent(true); showToast(tx('تم الإرسال', 'Sent')) } }} className="flex gap-2">
                    <label htmlFor="thanks" className="sr-only">{tx('رسالة شكر', 'Thank-you note')}</label>
                    <input id="thanks" value={thanks} onChange={(e) => setThanks(e.target.value)} placeholder={tx('اكتب كلمة شكر…', 'Write a thank-you…')} className="h-12 flex-1 rounded-full bg-cream-50 px-5 text-green outline-none placeholder:text-ink/40" />
                    <Button variant="gold" type="submit" size="md">{tx('أرسل', 'Send')}</Button>
                  </form>
                )}
                <Link to="/" className="mt-6 inline-block text-[13px] text-cream/60 underline-offset-4 hover:underline">{tx('اكتشف لمّة وجهّز فرحة لغيرك', 'Discover Lamma and surprise someone too')}</Link>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
