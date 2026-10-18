import { parseLocal } from './dates'
import { useStore } from './store'
import type { L } from '../data/catalog'

export type Lang = 'ar' | 'en'

export function useI18n() {
  const lang = useStore((s) => s.lang)
  const isAr = lang === 'ar'
  return {
    lang,
    isAr,
    dir: (isAr ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
    /** inline bilingual string */
    tx: (ar: string, en: string) => (isAr ? ar : en),
    /** bilingual object */
    l: (o: L | undefined) => (o ? (isAr ? o.ar : o.en) : ''),
    money: (n: number) => formatMoney(n, lang),
    num: (n: number) => new Intl.NumberFormat(isAr ? 'ar-SA-u-nu-latn' : 'en-US').format(n),
    date: (d: string | number | Date, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) =>
      new Intl.DateTimeFormat(isAr ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB', opts).format(typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? parseLocal(d) : new Date(d)),
  }
}

export function formatMoney(n: number, lang: Lang) {
  const v = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(n))
  return lang === 'ar' ? `${v} ر.س` : `SAR ${v}`
}
