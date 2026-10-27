/*
 * LAMMA AI Studio & Smart Gift Finder — rule-based demo engine.
 * No external AI service is called. Briefs are parsed with keyword rules; bundles are assembled
 * from slot templates (what a gift for this person/occasion is made of), filtered by age,
 * city, stock and lead time, scored by interests, then fitted to the budget.
 * Interests are never inferred from gender: recipient only adds a small, overridable prior.
 */
import {
  PRODUCTS, CITIES, OCCASIONS, RECIPIENTS, merchantById, inCategory,
  type CategoryId, type CityId, type OccasionId, type RecipientId, type Product, type L, type AgeGroup, type Interest, type Relationship,
} from '../data/catalog'
import { isAvailable, unitPrice, defaultVariant } from './model'
import type { Brief } from './model'

type Ov = Parameters<typeof isAvailable>[1]

export const AGE_GROUPS: { id: AgeGroup; name: L }[] = [
  { id: 'baby', name: { ar: 'رضيع (٠–١)', en: 'Baby (0–1)' } },
  { id: 'toddler', name: { ar: 'صغير (١–٣)', en: 'Toddler (1–3)' } },
  { id: 'kids', name: { ar: 'طفل (٤–٧)', en: 'Child (4–7)' } },
  { id: 'tween', name: { ar: 'ما قبل المراهقة (٨–١٢)', en: 'Tween (8–12)' } },
  { id: 'teen', name: { ar: 'مراهق (١٣–١٧)', en: 'Teen (13–17)' } },
  { id: 'adult', name: { ar: 'بالغ (١٨+)', en: 'Adult (18+)' } },
]
export const INTERESTS: { id: Interest; name: L }[] = [
  { id: 'flowers', name: { ar: 'الورد', en: 'Flowers' } },
  { id: 'sweets', name: { ar: 'الحلا', en: 'Sweets' } },
  { id: 'fragrance', name: { ar: 'العطور', en: 'Fragrance' } },
  { id: 'beauty', name: { ar: 'المكياج والعناية', en: 'Beauty' } },
  { id: 'selfcare', name: { ar: 'الاسترخاء', en: 'Self-care' } },
  { id: 'style', name: { ar: 'الأناقة والإكسسوارات', en: 'Style' } },
  { id: 'heritage', name: { ar: 'التراث والعود', en: 'Heritage' } },
  { id: 'home', name: { ar: 'ديكور البيت', en: 'Home' } },
  { id: 'tech', name: { ar: 'التقنية', en: 'Tech' } },
  { id: 'travel', name: { ar: 'السفر', en: 'Travel' } },
  { id: 'reading', name: { ar: 'القراءة والكتابة', en: 'Reading & writing' } },
  { id: 'art', name: { ar: 'الرسم والفن', en: 'Art' } },
  { id: 'science', name: { ar: 'العلوم', en: 'Science' } },
  { id: 'building', name: { ar: 'البناء والتركيب', en: 'Building' } },
  { id: 'cars', name: { ar: 'السيارات', en: 'Cars' } },
  { id: 'pretend', name: { ar: 'اللعب التخيلي', en: 'Pretend play' } },
]
export const RELATIONSHIPS: { id: Relationship; name: L }[] = [
  { id: 'family', name: { ar: 'عائلة', en: 'Family' } },
  { id: 'partner', name: { ar: 'شريك الحياة', en: 'Partner' } },
  { id: 'friend', name: { ar: 'صداقة', en: 'Friend' } },
  { id: 'colleague', name: { ar: 'عمل', en: 'Work' } },
]
export const defaultAge = (r: RecipientId): AgeGroup => (r === 'baby' ? 'baby' : r === 'child' ? 'kids' : 'adult')
export const defaultRelationship = (r: RecipientId): Relationship =>
  r === 'wife' || r === 'husband' ? 'partner' : r === 'colleague' || r === 'team' ? 'colleague' : r === 'friend' ? 'friend' : 'family'

/* ---------- 1. Brief parsing ---------- */
const OCC_WORDS: Record<OccasionId, string[]> = {
  birthday: ['ميلاد', 'عيد ميلاد', 'birthday', 'bday', 'شمعة'],
  wedding: ['زواج', 'زفاف', 'عرس', 'wedding', 'marriage'],
  engagement: ['خطوبة', 'ملكة', 'ملچة', 'engagement', 'milka'],
  graduation: ['تخرج', 'تخرّج', 'graduation', 'graduate', 'grad'],
  newborn: ['مولود', 'مولودة', 'ولادة', 'baby', 'newborn', 'born'],
  eid: ['العيد', 'عيدية', 'عيد الفطر', 'عيد الأضحى', 'eid'],
  ramadan: ['رمضان', 'افطار', 'إفطار', 'ramadan', 'iftar', 'سحور'],
  anniversary: ['ذكرى', 'سنوية', 'anniversary'],
  promotion: ['ترقية', 'نجاح', 'وظيفة', 'promotion', 'new job', 'success', 'منصب'],
  getwell: ['سلامتك', 'مريض', 'مستشفى', 'عملية', 'get well', 'sick', 'hospital', 'recovery'],
  newhome: ['بيت جديد', 'منزل جديد', 'شقة', 'new home', 'house', 'housewarming'],
  thanks: ['شكر', 'امتنان', 'thank', 'thanks', 'appreciation'],
  national: ['اليوم الوطني', 'وطني', 'التأسيس', 'national day', 'founding'],
}
const REC_WORDS: Record<RecipientId, string[]> = {
  mother: ['أمي', 'امي', 'الوالدة', 'والدتي', 'mom', 'mother', 'mum'],
  father: ['أبوي', 'ابوي', 'أبي', 'الوالد', 'والدي', 'dad', 'father'],
  wife: ['زوجتي', 'الزوجة', 'مرتي', 'wife'],
  husband: ['زوجي', 'الزوج', 'رجلي', 'husband'],
  sister: ['أختي', 'اختي', 'الأخت', 'sister'],
  brother: ['أخوي', 'اخوي', 'أخي', 'الأخ', 'brother'],
  friend: ['صديق', 'صديقتي', 'صاحبي', 'صاحبتي', 'رفيق', 'friend', 'bestie'],
  colleague: ['زميل', 'زميلتي', 'مديري', 'مديرتي', 'colleague', 'boss', 'manager', 'coworker'],
  baby: ['رضيع', 'مولودنا', 'infant'],
  child: ['ولدي', 'بنتي', 'طفل', 'طفلة', 'ابني', 'son', 'daughter', 'kid', 'child'],
  team: ['فريق', 'المكتب', 'الموظفين', 'الشركة', 'team', 'office', 'staff'],
}
const CITY_WORDS: Record<CityId, string[]> = {
  riyadh: ['الرياض', 'رياض', 'riyadh'], jeddah: ['جدة', 'جده', 'jeddah', 'jedda'], dammam: ['الدمام', 'دمام', 'dammam'],
  khobar: ['الخبر', 'khobar'], makkah: ['مكة', 'مكه', 'makkah', 'mecca'], madinah: ['المدينة', 'madinah', 'medina'],
  abha: ['أبها', 'ابها', 'abha'], taif: ['الطائف', 'طايف', 'taif'],
}
const INTEREST_WORDS: Partial<Record<Interest, string[]>> = {
  flowers: ['ورد', 'زهور', 'flower'], sweets: ['حلا', 'شوكولات', 'sweet', 'chocolate'], fragrance: ['عطر', 'عطور', 'perfume', 'fragrance'],
  beauty: ['مكياج', 'ميك اب', 'makeup', 'beauty', 'سكن كير', 'skincare'], selfcare: ['استرخاء', 'سبا', 'spa', 'relax'],
  style: ['أناقة', 'ساعة', 'اكسسوار', 'style', 'watch', 'fashion'], heritage: ['عود', 'بخور', 'مسبحة', 'oud', 'bakhoor'],
  home: ['ديكور', 'بيت', 'home', 'decor'], tech: ['تقنية', 'جوال', 'تكنولوجيا', 'tech', 'gadget'], travel: ['سفر', 'يسافر', 'travel'],
  reading: ['قراءة', 'كتب', 'كتابة', 'read', 'book', 'writing'], art: ['رسم', 'فن', 'تلوين', 'art', 'draw', 'paint'],
  science: ['علوم', 'تجارب', 'science', 'experiment'], building: ['تركيب', 'مكعبات', 'بناء', 'lego', 'blocks', 'building'],
  cars: ['سيارات', 'سيارة', 'cars', 'car'], pretend: ['دمى', 'دمية', 'doll', 'pretend'],
}
const normDigits = (s: string) => s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))

export function ageFromYears(y: number): AgeGroup {
  return y < 1 ? 'baby' : y <= 3 ? 'toddler' : y <= 7 ? 'kids' : y <= 12 ? 'tween' : y <= 17 ? 'teen' : 'adult'
}

export function parseBrief(text: string): Partial<Brief> & { found: string[] } {
  const t = ' ' + normDigits(text.toLowerCase()) + ' '
  const out: Partial<Brief> & { found: string[] } = { found: [] }
  for (const [k, ws] of Object.entries(OCC_WORDS)) if (ws.some((w) => t.includes(w))) { out.occasion = k as OccasionId; out.found.push('occasion'); break }
  for (const [k, ws] of Object.entries(REC_WORDS)) if (ws.some((w) => t.includes(w))) { out.recipient = k as RecipientId; out.found.push('recipient'); break }
  for (const [k, ws] of Object.entries(CITY_WORDS)) if (ws.some((w) => t.includes(w))) { out.city = k as CityId; out.found.push('city'); break }
  // age: "عمره 7" / "7 سنوات" / "7 years"
  const ageM = t.match(/(?:عمره|عمرها|age|aged)\s*(\d{1,2})/) || t.match(/(\d{1,2})\s*(?:سنوات|سنة|سنين|years?|yrs?)/)
  if (ageM) { out.age = ageFromYears(parseInt(ageM[1], 10)); out.found.push('age') }
  else if (/مراهق|teen/.test(t)) { out.age = 'teen'; out.found.push('age') }
  // budget: prefer numbers next to currency words, else the largest number that is not an age
  const money = t.match(/(\d{2,6})\s*(?:ريال|ر\.?س|sar|rs)/) || t.match(/(?:ميزانية|ميزانيتي|budget|حدود|بـ)\s*(\d{2,6})/)
  const thousand = t.match(/(\d+(?:\.\d+)?)\s*(?:k|ألف|الف)/)
  if (thousand) out.budget = Math.round(parseFloat(thousand[1]) * 1000)
  else if (money) out.budget = parseInt(money[1], 10)
  else if (/ألف|الف/.test(t)) out.budget = 1000
  else { const nums = [...t.matchAll(/(\d{2,6})/g)].map((m) => parseInt(m[1], 10)).filter((n) => n >= 50); if (nums.length) out.budget = Math.max(...nums) }
  if (out.budget) { out.budget = Math.min(20000, Math.max(50, out.budget)); out.found.push('budget') }
  const ints = (Object.entries(INTEREST_WORDS) as [Interest, string[]][]).filter(([, ws]) => ws.some((w) => t.includes(w))).map(([k]) => k)
  if (ints.length) { out.interests = ints; out.found.push('interests') }
  if (/فخم|فاخر|luxury|premium|راقي/.test(t)) out.style = 'luxe'
  if (/بسيط|simple|minimal|هادي/.test(t)) out.style = 'simple'
  if (/مبهج|ملون|fun|colorful|playful|وناسة/.test(t)) out.style = 'fun'
  return out
}

/* ---------- 2. Bundle generation ---------- */
export type BundleItem = { productId: string; variant: Record<string, string>; qty: number; reason: L }
export type Bundle = { id: 'elegant' | 'joyful' | 'signature'; title: L; mood: L; items: BundleItem[]; notes: L[]; budget: number }

/** A slot is one role in the gift, e.g. "a cake" or "a personal gift matched to interests". */
type Slot = { role: L; cats: CategoryId[]; personal?: boolean; forBaby?: boolean }
const S = {
  flowers: { role: { ar: 'ورد', en: 'Flowers' }, cats: ['flowers'] } as Slot,
  cake: { role: { ar: 'كيك', en: 'Cake' }, cats: ['cakes'] } as Slot,
  balloons: { role: { ar: 'بالونات', en: 'Balloons' }, cats: ['balloons'] } as Slot,
  sweets: { role: { ar: 'حلا وشوكولاتة', en: 'Sweets' }, cats: ['chocolate', 'desserts'] } as Slot,
  toy: { role: { ar: 'لعبة تناسب العمر', en: 'Age-right toy' }, cats: ['kids'], personal: true } as Slot,
  baby: { role: { ar: 'هدية المولود', en: 'Baby gift' }, cats: ['kids'], forBaby: true, personal: true } as Slot,
  plush: { role: { ar: 'دمية ناعمة', en: 'Soft toy' }, cats: ['kids'], forBaby: true } as Slot,
  personal: { role: { ar: 'هدية شخصية', en: 'Personal gift' }, cats: ['beauty', 'perfume', 'men', 'lifestyle', 'custom'], personal: true } as Slot,
  keepsake: { role: { ar: 'ذكرى محفورة', en: 'Keepsake' }, cats: ['custom'] } as Slot,
}
type Template = { id: Bundle['id']; title: L; mood: L; slots: Slot[]; share: number; luxe?: boolean }

function templates(b: Brief, age: AgeGroup): Template[] {
  const T = (id: Bundle['id'], ar: string, en: string, mar: string, men: string, slots: Slot[], share: number, luxe = false): Template => ({ id, title: { ar, en }, mood: { ar: mar, en: men }, slots, share, luxe })
  if (b.occasion === 'newborn' || age === 'baby')
    return [
      T('elegant', 'أهلاً بالصغير', 'Welcome, Little One', 'ورد للأم ودمية ناعمة للمولود', 'Flowers for mum, a soft toy for baby', [S.flowers, S.plush, S.sweets], 0.85),
      T('joyful', 'سلة الفرح', 'Basket of Joy', 'هدية مولود عملية مع حلا للزوار', 'A practical baby gift plus sweets for visitors', [S.baby, S.sweets, S.balloons], 0.9),
      T('signature', 'ذكرى العمر', 'A Lifetime Keepsake', 'هدية مميزة تبقى للذكرى', 'A standout gift kept for years', [S.baby, S.keepsake, S.flowers], 1, true),
    ]
  if (age === 'toddler' || age === 'kids' || age === 'tween')
    return [
      T('joyful', 'حفلة صغيرة', 'Little Party', 'كيك وبالونات ولعبة تناسب عمره', 'Cake, balloons and an age-right toy', [S.cake, S.balloons, S.toy], 0.9),
      T('elegant', 'لعب وتعلّم', 'Play & Learn', 'لعبة تنمّي اهتمامه مع لمسة حلا', 'A toy that grows their interests, plus a sweet touch', [S.toy, S.sweets], 0.85),
      T('signature', 'الهدية الكبرى', 'The Big Surprise', 'لعبة مميزة مع بالونات واحتفال', 'A standout toy with balloons and celebration', [S.toy, S.balloons, S.cake], 1, true),
    ]
  const celebratory = ['birthday', 'graduation', 'engagement', 'anniversary', 'promotion'].includes(b.occasion)
  return [
    T('elegant', 'أنيقة وهادئة', 'Quietly Elegant', 'ورد وحلا وهدية تشبهه', 'Flowers, sweets and a gift that suits them', [S.flowers, S.personal, S.sweets], 0.85),
    T('joyful', celebratory ? 'فرحة ملوّنة' : 'دفء ولمّة', celebratory ? 'Colourful Joy' : 'Warm Gathering', celebratory ? 'كيك واحتفال وهدية شخصية' : 'حلا للمّة وهدية شخصية', celebratory ? 'Cake, celebration and a personal gift' : 'Sweets to share and a personal gift',
      celebratory ? [S.cake, S.personal, S.balloons] : [S.sweets, S.personal, S.flowers], 0.9),
    T('signature', 'بصمة لمّة', 'Lamma Signature', 'هدية شخصية فاخرة مع ورد وذكرى', 'A premium personal gift with flowers and a keepsake', [S.personal, S.flowers, S.keepsake], 1, true),
  ]
}

/** soft recipient → category prior (only used when no interests are chosen, and always small) */
const REC_PRIOR: Partial<Record<RecipientId, Partial<Record<CategoryId, number>>>> = {
  mother: { beauty: 0.6, perfume: 0.6, lifestyle: 0.4 }, wife: { beauty: 0.6, perfume: 0.6 }, sister: { beauty: 0.5, perfume: 0.4 },
  father: { men: 0.6, perfume: 0.5, lifestyle: 0.3 }, husband: { men: 0.6, perfume: 0.6 }, brother: { men: 0.5, perfume: 0.4 },
  colleague: { lifestyle: 0.6, perfume: 0.2 }, team: { lifestyle: 0.4, chocolate: 0.6 }, friend: { perfume: 0.4, lifestyle: 0.4, beauty: 0.2 },
}
const INTIMATE: CategoryId[] = ['beauty', 'perfume']
const OCC_CAT: Partial<Record<OccasionId, Partial<Record<CategoryId, number>>>> = {
  birthday: { cakes: 2, balloons: 2, flowers: 1 }, wedding: { flowers: 2, chocolate: 1.5 }, engagement: { flowers: 2, chocolate: 1 },
  graduation: { cakes: 1.5, balloons: 2 }, newborn: { flowers: 1.5, kids: 2 }, eid: { chocolate: 2, desserts: 2 }, ramadan: { desserts: 2, chocolate: 2 },
  anniversary: { flowers: 2, custom: 1.5 }, promotion: { flowers: 1.5, chocolate: 1.5 }, getwell: { flowers: 2 }, newhome: { flowers: 1.5, lifestyle: 2 },
  thanks: { flowers: 2, chocolate: 2 }, national: { chocolate: 1.5, balloons: 1.5 },
}

const lbl = (list: { id: string; name: L }[], id: string) => list.find((x) => x.id === id)!.name
function hoursUntil(date?: string) { if (!date) return Infinity; return (new Date(date + 'T20:00:00').getTime() - Date.now()) / 3600e3 }

export function fitsAge(p: Product, age: AgeGroup) { return !p.ages || p.ages.includes(age) }

function score(p: Product, b: Brief, age: AgeGroup, ov: Ov, luxe: boolean) {
  const rel = b.relationship ?? defaultRelationship(b.recipient)
  const ints = b.interests ?? []
  let s = 0
  if (p.occasions.includes(b.occasion)) s += 2.5
  const recFit = p.recipients.includes(b.recipient)
  if (recFit) s += 2
  s += OCC_CAT[b.occasion]?.[p.cat] ?? 0
  const hits = (p.interests ?? []).filter((i) => ints.includes(i)).length
  s += hits * 4
  if (!recFit && !hits && p.recipients.length < 9) s -= 1.5 // merchant didn't suggest it for this recipient and no interest match
  if (ints.includes('flowers') && p.cat === 'flowers') s += 2
  if (ints.includes('sweets') && (p.cat === 'chocolate' || p.cat === 'desserts' || p.cat === 'cakes')) s += 2
  if (!ints.length) s += REC_PRIOR[b.recipient]?.[p.cat] ?? 0
  if (rel === 'colleague' && (INTIMATE.includes(p.cat) || p.interests?.includes('beauty'))) s -= 3
  if (rel === 'partner' && (p.occasions.includes('anniversary') || p.cat === 'flowers')) s += 1
  if (p.ages && p.ages.length <= 2 && p.ages.includes(age)) s += 1 // made for exactly this age
  s += (p.rating - 4.5) * 2
  if (p.badge === 'best') s += 0.5
  if (p.art.img) s += 1.2
  if (b.style === 'luxe' || luxe) s += Math.min(1.2, unitPrice(p, defaultVariant(p), ov) / 500)
  if (b.style === 'fun' && (p.cat === 'balloons' || p.cat === 'cakes' || p.cat === 'kids')) s += 0.8
  return s
}

export function generateBundles(b: Brief, ov: Ov): { bundles: Bundle[]; poolNotes: L[] } {
  const age = b.age ?? defaultAge(b.recipient)
  const cityName = lbl(CITIES, b.city)
  const hrs = hoursUntil(b.date)
  const inCity = PRODUCTS.filter((p) => merchantById(p.merchant).cities.includes(b.city) && isAvailable(p, ov))
  const ageOk = inCity.filter((p) => fitsAge(p, age))
  const pool = ageOk.filter((p) => p.leadHours <= hrs)
  const poolNotes: L[] = []
  const ageName = lbl(AGE_GROUPS, age)
  const ageOut = inCity.length - ageOk.length
  if (ageOut > 0) poolNotes.push({ ar: `استبعدنا ${ageOut} منتجات لا تناسب فئة «${ageName.ar}».`, en: `We excluded ${ageOut} products not suitable for “${ageName.en}”.` })
  const late = ageOk.length - pool.length
  if (late > 0) poolNotes.push({ ar: `واستبعدنا ${late} منتجات تحتاج وقت تجهيز أطول من موعدك.`, en: `And ${late} products that need more preparation time than your date allows.` })

  const used = new Set<string>()
  const price = (p: Product) => unitPrice(p, defaultVariant(p), ov)
  const bundles = templates(b, age).map((tp) => {
    const target = Math.round(b.budget * tp.share)
    const notes: L[] = []
    const picked: (BundleItem | null)[] = tp.slots.map(() => null)
    let total = 0
    const W = (sl: Slot) => (sl.personal ? 0.48 : sl === S.cake || sl === S.flowers || sl === S.keepsake ? 0.3 : sl === S.plush ? 0.22 : 0.16)
    const wSum = tp.slots.reduce((a, sl) => a + W(sl), 0)
    // Secure the most important roles first (personal gift / toy), then fill the rest with what remains.
    const order = tp.slots.map((sl, i) => i).sort((a, c) => W(tp.slots[c]) - W(tp.slots[a]))
    let carry = 0
    order.forEach((si, k) => {
      const slot = tp.slots[si]
      let cands = pool.filter((p) => slot.cats.some((c) => inCategory(p, c)) && !used.has(p.id) && !picked.some((it) => it?.productId === p.id))
      if (slot.forBaby) cands = cands.filter((p) => p.ages?.includes('baby'))
      if (slot === S.toy) cands = cands.filter((p) => p.ages && !p.ages.includes('adult'))
      if ((b.relationship ?? defaultRelationship(b.recipient)) === 'colleague') cands = cands.filter((p) => p.cat !== 'beauty') // keep work gifts appropriate
      if (!cands.length) { notes.push({ ar: `لا يوجد «${slot.role.ar}» متاح في ${cityName.ar} حالياً، فتجاوزناه.`, en: `No “${slot.role.en}” is available in ${cityName.en} right now, so we skipped it.` }); carry += target * W(slot) / wSum; return }
      const share = target * W(slot) / wSum + carry
      const cap = Math.min(target - total, k === order.length - 1 ? target - total : slot.personal ? Math.max(share * 1.25, target * 0.7) : share * 1.25)
      const ranked = [...cands].sort((x, y) => score(y, b, age, ov, !!tp.luxe) - score(x, b, age, ov, !!tp.luxe))
      let pick = ranked.find((p) => price(p) <= cap) ?? ranked.find((p) => price(p) <= target - total)
      if (!pick && k === 0) {
        pick = [...cands].sort((x, y) => price(x) - price(y))[0]
        if (price(pick) > b.budget)
          notes.push({ ar: `أقل «${slot.role.ar}» مناسب سعره ${price(pick)} ر.س، أعلى من الميزانية بـ ${price(pick) - b.budget} ر.س. أبقيناه لأنه أساس الهدية.`, en: `The most affordable fitting “${slot.role.en}” is SAR ${price(pick)}, SAR ${price(pick) - b.budget} over budget. We kept it as the heart of the gift.` })
      }
      if (!pick) { notes.push({ ar: `الميزانية لا تكفي لإضافة «${slot.role.ar}».`, en: `The budget doesn't stretch to “${slot.role.en}”.` }); return }
      carry = Math.max(0, share - price(pick))
      picked[si] = { productId: pick.id, variant: defaultVariant(pick), qty: 1, reason: reasonFor(pick, b, age, slot) }
      used.add(pick.id)
      total += price(pick)
    })
    const items = picked.filter(Boolean) as BundleItem[]
    // upgrade the first item's size if there is room
    const first = items[0] && PRODUCTS.find((p) => p.id === items[0].productId)
    if (first?.variants[0] && b.budget - total > 120) {
      const g = first.variants[0]
      const best = [...g.options].reverse().find((o) => total + o.delta <= target)
      if (best && best.delta > 0) {
        items[0].variant = { ...items[0].variant, [g.key]: best.id }
        total += best.delta
        notes.push({ ar: `رقّينا ${first.name.ar} إلى «${best.label.ar}» لأن ميزانيتك تسمح.`, en: `Upgraded ${first.name.en} to “${best.label.en}” since your budget allows.` })
      }
    }
    if (!items.length) notes.push({ ar: 'لا توجد منتجات متاحة بهذه الشروط.', en: 'No products match these conditions.' })
    return { id: tp.id, title: tp.title, mood: tp.mood, items, notes, budget: b.budget }
  })
  return { bundles, poolNotes }
}

function reasonFor(p: Product, b: Brief, age: AgeGroup, slot: Slot): L {
  const occ = lbl(OCCASIONS, b.occasion)
  const m = merchantById(p.merchant)
  const bits: L[] = [slot.role]
  const hits = (p.interests ?? []).filter((i) => b.interests?.includes(i))
  if (hits.length) bits.push({ ar: `يناسب اهتمامه بـ${hits.map((h) => lbl(INTERESTS, h).ar).join(' و')}`, en: `matches their interest in ${hits.map((h) => lbl(INTERESTS, h).en.toLowerCase()).join(' & ')}` })
  if (p.ages) bits.push({ ar: `مناسب لفئة ${lbl(AGE_GROUPS, age).ar}`, en: `suitable for ${lbl(AGE_GROUPS, age).en.toLowerCase()}` })
  else if (p.occasions.includes(b.occasion)) bits.push({ ar: `مناسب لـ${occ.ar}`, en: `made for ${occ.en.toLowerCase()}` })
  if (p.leadHours <= 3) bits.push({ ar: 'توصيل نفس اليوم', en: 'same-day delivery' })
  bits.push({ ar: `من ${m.name.ar} ★${m.rating}`, en: `by ${m.name.en} ★${m.rating}` })
  return { ar: bits.map((x) => x.ar).join(' · '), en: bits.map((x) => x.en).join(' · ') }
}

/** Ranked alternatives for swapping an item in the builder (same category, same city, age-safe). */
export function alternativesFor(pid: string, b: Brief, ov: Ov, exclude: string[]) {
  const p = PRODUCTS.find((x) => x.id === pid)!
  const age = b.age ?? defaultAge(b.recipient)
  return PRODUCTS.filter((x) => (x.cat === p.cat || inCategory(x, p.cat)) && x.id !== pid && !exclude.includes(x.id) && fitsAge(x, age) && merchantById(x.merchant).cities.includes(b.city) && isAvailable(x, ov))
    .sort((x, y) => score(y, b, age, ov, false) - score(x, b, age, ov, false))
}

/** Suggestions to add (age-safe, available in city). */
export function addSuggestions(b: Brief, ov: Ov, exclude: string[]) {
  const age = b.age ?? defaultAge(b.recipient)
  return PRODUCTS.filter((x) => !exclude.includes(x.id) && fitsAge(x, age) && merchantById(x.merchant).cities.includes(b.city) && isAvailable(x, ov))
    .sort((x, y) => score(y, b, age, ov, false) - score(x, b, age, ov, false))
    .slice(0, 12)
}

/* ---------- 3. Greeting-card message suggestions ---------- */
const MSG: Partial<Record<OccasionId, L[]>> = {
  birthday: [
    { ar: 'كل عام وأنت أجمل حكاية في حياتي، عساك تبلغ كل أمانيك.', en: 'Happy birthday to the best story in my life — may every wish come true.' },
    { ar: 'سنة جديدة مليانة فرح وضحك وأيام تشبهك.', en: 'Here\'s to a new year full of joy, laughter and days as lovely as you.' },
    { ar: 'عساك من عواده، وعسى الفرح ما يفارق بيتك.', en: 'Many happy returns — may joy never leave your home.' },
  ],
  graduation: [
    { ar: 'مبروك التخرج! تعب السنين صار فرحة اليوم، فخورين فيك.', en: 'Congratulations, graduate! Years of effort became today\'s joy. So proud of you.' },
    { ar: 'هذي البداية بس… القادم أجمل بإذن الله.', en: 'This is only the beginning — the best is yet to come.' },
  ],
  newborn: [
    { ar: 'الحمد لله على السلامة، يتربى بعزكم ويكون قرة عين لكم.', en: 'Congratulations on your little one — may they grow up surrounded by love.' },
    { ar: 'أهلاً بأصغر فرد في العائلة وأحلى خبر هالسنة!', en: 'Welcome to the smallest member of the family and the best news of the year!' },
  ],
  wedding: [
    { ar: 'بارك الله لكما وبارك عليكما وجمع بينكما في خير.', en: 'May your life together be blessed with love, mercy and joy.' },
    { ar: 'ألف مبروك، عسى أيامكم كلها فرح.', en: 'Congratulations — may all your days be this happy.' },
  ],
  engagement: [{ ar: 'مبروك الخطوبة! بداية حلوة لحكاية أحلى.', en: 'Congratulations on your engagement — a sweet start to a sweeter story.' }],
  eid: [
    { ar: 'عيدكم مبارك، وكل عام وأنتم بخير وصحة وسعادة.', en: 'Eid Mubarak — wishing you health and happiness every year.' },
    { ar: 'من العايدين الفايزين، وهذي عيديتك مع حبي.', en: 'Eid Mubarak! Here\'s your eidiya, with love.' },
  ],
  ramadan: [{ ar: 'رمضان كريم، تقبل الله صيامكم وقيامكم.', en: 'Ramadan Kareem — may your fasting and prayers be accepted.' }],
  anniversary: [
    { ar: 'سنة جديدة معك، وكل يوم أختارك من جديد.', en: 'Another year with you — and I\'d choose you again every day.' },
    { ar: 'ذكرانا أحلى أيامي، والقادم معك أجمل.', en: 'Our anniversary is my favourite day; what\'s ahead with you is even better.' },
  ],
  promotion: [{ ar: 'مبروك الترقية! تستاهل كل خير، وهذي بداية إنجازات أكبر.', en: 'Congrats on the promotion — well deserved, and just the start.' }],
  getwell: [
    { ar: 'سلامتك ما تشوف شر، طهور إن شاء الله.', en: 'Get well soon — wishing you a swift and full recovery.' },
    { ar: 'أجر وعافية، ننتظر رجعتك بالسلامة.', en: 'Sending strength and healing — we can\'t wait to see you back.' },
  ],
  newhome: [{ ar: 'مبارك البيت الجديد، عسى أيامكم فيه كلها خير وبركة.', en: 'Congrats on the new home — may it be filled with blessings.' }],
  thanks: [
    { ar: 'شكراً لأنك دايم موجود، هذي لمسة بسيطة من الامتنان.', en: 'Thank you for always being there — a small token of gratitude.' },
    { ar: 'كلمة شكر ما تكفي، بس هذي بداية.', en: '"Thank you" isn\'t enough, but it\'s a start.' },
  ],
  national: [{ ar: 'دام عزك يا وطن، وكل عام ونحن فخورين.', en: 'Happy Saudi National Day — proud today and always.' }],
}
export function suggestMessages(o?: OccasionId): L[] {
  return MSG[o ?? 'thanks'] ?? MSG.thanks!
}
