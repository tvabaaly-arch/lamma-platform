import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import { useEffect, useState } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { CartDrawer, DemoBar, Footer, Header, MobileTabBar, SearchOverlay, Toast } from './components/Layout'
import { Logo } from './components/Logo'
import { useStore } from './lib/store'
import Home from './pages/Home'
import { Shop, Occasions } from './pages/Shop'
import ProductPage from './pages/ProductPage'
import { Merchants, MerchantProfile } from './pages/Merchants'
import Studio from './pages/Studio'
import Finder from './pages/Finder'
import Checkout from './pages/Checkout'
import { OrderPage, TrackLookup } from './pages/Order'
import Surprise from './pages/Surprise'
import { Account, Favorites } from './pages/Account'
import MerchantDash from './pages/MerchantDash'
import AdminDash from './pages/AdminDash'
import NotFound from './pages/NotFound'

function Intro() {
  const seen = useStore((s) => s.introSeen)
  const setSeen = useStore((s) => s.setIntroSeen)
  const [show, setShow] = useState(!seen)
  useEffect(() => {
    if (!show) return
    const t = setTimeout(() => { setShow(false); setSeen() }, 2100)
    return () => clearTimeout(t)
  }, [show, setSeen])
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] grid place-items-center bg-cream-50"
          exit={{ clipPath: 'circle(0% at 50% 50%)', opacity: 0.6 }}
          initial={{ clipPath: 'circle(150% at 50% 50%)' }}
          transition={{ duration: 0.8, ease: [0.7, 0, 0.3, 1] }}
          onClick={() => { setShow(false); setSeen() }}
        >
          <Logo animate className="h-24 w-auto md:h-36" />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Shell() {
  const loc = useLocation()
  const lang = useStore((s) => s.lang)
  const [search, setSearch] = useState(false)
  const bare = loc.pathname.startsWith('/surprise/')
  const dash = loc.pathname.startsWith('/dashboard')

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.title = lang === 'ar' ? 'لَمّة | هدايا واحتفالات' : 'LAMMA | Gifts & Celebrations'
  }, [lang])
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }) }, [loc.pathname])
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') { e.preventDefault(); setSearch(true) }
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [])

  return (
    <div className="min-h-screen">
      {!bare && <DemoBar />}
      {!bare && <Header onSearch={() => setSearch(true)} />}
      <AnimatePresence mode="wait">
        <motion.main
          key={loc.pathname}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <Routes location={loc}>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/shop/:cat" element={<Shop />} />
            <Route path="/occasions" element={<Occasions />} />
            <Route path="/product/:id" element={<ProductPage />} />
            <Route path="/merchants" element={<Merchants />} />
            <Route path="/merchant/:id" element={<MerchantProfile />} />
            <Route path="/studio" element={<Studio />} />
            <Route path="/finder" element={<Finder />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order/:id" element={<OrderPage />} />
            <Route path="/track" element={<TrackLookup />} />
            <Route path="/surprise/:id" element={<Surprise />} />
            <Route path="/account" element={<Account />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/dashboard/merchant" element={<MerchantDash />} />
            <Route path="/dashboard/admin" element={<AdminDash />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </motion.main>
      </AnimatePresence>
      {!bare && !dash && <Footer />}
      {!bare && <MobileTabBar />}
      <CartDrawer />
      <SearchOverlay open={search} onClose={() => setSearch(false)} />
      <Toast />
      <Intro />
    </div>
  )
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <HashRouter>
        <Shell />
      </HashRouter>
    </MotionConfig>
  )
}
