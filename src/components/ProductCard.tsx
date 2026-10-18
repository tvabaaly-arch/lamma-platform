import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { merchantById, productCities, type Product } from '../data/catalog'
import { useI18n } from '../lib/i18n'
import { useStore, basePrice, isAvailable, defaultVariant, stockOf } from '../lib/store'
import { ProductArt } from './ProductArt'
import { I } from './Icons'
import { cx, Stars, useRevealed } from './ui'

export function FavButton({ id, className }: { id: string; className?: string }) {
  const fav = useStore((s) => s.favorites.includes(id))
  const toggle = useStore((s) => s.toggleFav)
  const toast = useStore((s) => s.showToast)
  const { tx } = useI18n()
  return (
    <button
      aria-label={fav ? tx('إزالة من المفضلة', 'Remove from favourites') : tx('أضف للمفضلة', 'Add to favourites')}
      aria-pressed={fav}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(id); if (!fav) toast(tx('أُضيف للمفضلة', 'Saved to favourites')) }}
      className={cx('grid h-10 w-10 place-items-center rounded-full bg-white/80 backdrop-blur transition hover:bg-white', className)}
    >
      <motion.span key={String(fav)} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 15 }}>
        <I.heart size={18} className={fav ? 'fill-blush stroke-blush' : 'text-green'} />
      </motion.span>
      <AnimatePresence>
        {fav && (
          <motion.span className="absolute inset-0 rounded-full border-2 border-blush" initial={{ scale: 0.6, opacity: 1 }} animate={{ scale: 1.6, opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} />
        )}
      </AnimatePresence>
    </button>
  )
}

export const BADGE: Record<NonNullable<Product['badge']>, { ar: string; en: string; cls: string }> = {
  best: { ar: 'الأكثر طلباً', en: 'Bestseller', cls: 'bg-green text-cream-50' },
  new: { ar: 'جديد', en: 'New', cls: 'bg-blush text-white' },
  sameday: { ar: 'نفس اليوم', en: 'Same day', cls: 'bg-gold text-green-950' },
  limited: { ar: 'كمية محدودة', en: 'Limited', cls: 'bg-cocoa text-cream-50' },
}

export function ProductCard({ p, index = 0, size = 'md' }: { p: Product; index?: number; size?: 'md' | 'lg' }) {
  const { l, money, tx } = useI18n()
  const overrides = useStore((s) => s.overrides)
  const city = useStore((s) => s.city)
  const add = useStore((s) => s.addToCart)
  const toast = useStore((s) => s.showToast)
  const [hover, setHover] = useState(false)
  const [rref, shown] = useRevealed(0.05)
  const m = merchantById(p.merchant)
  const avail = isAvailable(p, overrides)
  const inCity = productCities(p).includes(city)
  const stock = stockOf(p, overrides)
  const needsChoice = !!p.personalize

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      ref={rref as React.Ref<HTMLElement>}
      animate={shown ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.6, delay: (index % 4) * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className="group relative"
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
    >
      <div className="relative">
        <Link to={`/product/${p.id}`} className="block" aria-label={l(p.name)}>
          <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] bg-cream shadow-soft transition-shadow duration-500 group-hover:shadow-lift">
            <motion.div className="absolute inset-0" animate={{ scale: hover ? 1.05 : 1 }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}>
              <ProductArt art={p.art} className="h-full w-full" label={l(p.name)} />
            </motion.div>
            {!p.art.img && (
              <motion.div className="absolute inset-0" initial={false} animate={{ opacity: hover ? 1 : 0 }} transition={{ duration: 0.5 }}>
                <ProductArt art={p.art} view={1} className="h-full w-full" />
              </motion.div>
            )}
            {p.badge && <span className={cx('absolute top-3 start-3 rounded-full px-3 py-1 text-[11px] font-medium', BADGE[p.badge].cls)}>{tx(BADGE[p.badge].ar, BADGE[p.badge].en)}</span>}
            {!avail && <div className="absolute inset-0 grid place-items-center bg-cream/70 backdrop-blur-[2px]"><span className="rounded-full bg-white px-4 py-2 text-sm font-medium text-cocoa">{tx('نفدت الكمية', 'Sold out')}</span></div>}
            {avail && stock <= 5 && <span className="absolute bottom-3 start-3 rounded-full bg-white/85 px-2.5 py-1 text-[11px] text-cocoa backdrop-blur">{tx(`باقي ${stock} فقط`, `Only ${stock} left`)}</span>}
          </div>
        </Link>
        <FavButton id={p.id} className="absolute top-3 end-3" />
        {avail && (needsChoice ? (
          <Link to={`/product/${p.id}`} aria-label={tx('خصّص المنتج', 'Personalise')} className="absolute bottom-3 end-3 inline-flex h-11 items-center gap-1.5 rounded-full bg-white/90 px-4 text-[13px] font-medium text-green shadow-soft backdrop-blur transition hover:bg-white">
            <I.edit size={15} />{tx('خصّص', 'Personalise')}
          </Link>
        ) : (
          <motion.button
            aria-label={tx('أضف للسلة', 'Add to cart')}
            whileTap={{ scale: 0.85 }}
            onClick={() => { add({ productId: p.id, variant: defaultVariant(p), qty: 1 }); toast(tx('أُضيف للسلة', 'Added to cart')) }}
            className="absolute bottom-3 end-3 grid h-11 w-11 place-items-center rounded-full bg-green text-cream-50 shadow-lift transition-all duration-300 hover:bg-green-700 md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
          >
            <I.plus size={18} />
          </motion.button>
        ))}
      </div>
      <div className="mt-4 px-1">
        <div className="flex items-center justify-between gap-2 text-[12px] text-ink/55">
          <Link to={`/merchant/${m.id}`} className="truncate hover:text-cocoa">{l(m.name)}</Link>
          <Stars value={p.rating} />
        </div>
        <Link to={`/product/${p.id}`} className="mt-1 block font-display text-[16px] font-medium leading-snug text-green transition-colors hover:text-cocoa">{l(p.name)}</Link>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="tabular text-[15px] font-semibold text-ink">
            {p.variants.length > 0 && <span className="text-[12px] font-normal text-ink/50">{tx('من ', 'from ')}</span>}
            {money(basePrice(p, overrides))}
          </span>
          {!inCity ? (
            <span className="text-[11px] text-cocoa/80">{tx('غير متاح في مدينتك', 'Not in your city')}</span>
          ) : p.leadHours <= 3 ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-green/70"><I.truck size={14} />{tx('اليوم', 'Today')}</span>
          ) : null}
        </div>
      </div>
    </motion.article>
  )
}
