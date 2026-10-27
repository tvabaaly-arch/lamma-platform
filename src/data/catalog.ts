/*
 * DEMO DATA — every merchant, product, price, rating and review here is fictional
 * and exists only to demonstrate the LAMMA experience.
 */
export type L = { ar: string; en: string }
export type CategoryId = 'flowers' | 'cakes' | 'chocolate' | 'balloons' | 'decoration' | 'gifts' | 'desserts' | 'custom' | 'kids' | 'beauty' | 'perfume' | 'men' | 'lifestyle'
export type AgeGroup = 'baby' | 'toddler' | 'kids' | 'tween' | 'teen' | 'adult'
export type Interest = 'art' | 'science' | 'building' | 'reading' | 'tech' | 'travel' | 'style' | 'beauty' | 'fragrance' | 'home' | 'heritage' | 'pretend' | 'cars' | 'selfcare' | 'sweets' | 'flowers'
export type Relationship = 'partner' | 'family' | 'friend' | 'colleague'
export type CityId = 'riyadh' | 'jeddah' | 'dammam' | 'khobar' | 'makkah' | 'madinah' | 'abha' | 'taif'
export type OccasionId =
  | 'birthday' | 'wedding' | 'engagement' | 'graduation' | 'newborn' | 'eid' | 'ramadan'
  | 'anniversary' | 'promotion' | 'getwell' | 'newhome' | 'thanks' | 'national'
export type RecipientId = 'mother' | 'father' | 'wife' | 'husband' | 'sister' | 'brother' | 'friend' | 'colleague' | 'child' | 'baby' | 'team'

export type ArtKind =
  | 'bouquet' | 'rosebox' | 'vase' | 'cake' | 'drip' | 'cupcakes' | 'pralines' | 'bar' | 'dates'
  | 'cluster' | 'number' | 'heart' | 'arch' | 'lantern' | 'table' | 'giftbox' | 'perfume' | 'candle'
  | 'macarons' | 'kunafa' | 'cookies' | 'mug' | 'frame' | 'engraved'
/** img: photo basename in /products (rendered instead of the illustration). url: absolute photo URL (merchant uploads). fit 'contain' = white-background packshot. */
export type Art = { k: ArtKind; c: number; n?: string; img?: string; url?: string; fit?: 'contain'; pos?: string }

export type VariantOption = { id: string; label: L; delta: number }
export type VariantGroup = { key: string; label: L; options: VariantOption[] }

export type Product = {
  id: string
  cat: CategoryId
  merchant: string
  name: L
  desc: L
  price: number
  was?: number
  rating: number
  reviews: number
  stock: number
  leadHours: number
  occasions: OccasionId[]
  recipients: RecipientId[]
  variants: VariantGroup[]
  personalize?: L
  art: Art
  badge?: 'new' | 'best' | 'sameday' | 'limited'
  created: number
  /** Illustrated legacy item in a category now covered by real photography — kept for old orders, hidden from the storefront. */
  hidden?: boolean
  /** Also listed in these categories (e.g. a wallet that can be engraved shows in Personalized). */
  extraCats?: CategoryId[]
  /** Suitable age groups. Omitted = suitable for everyone (flowers, cake, chocolate…). */
  ages?: AgeGroup[]
  interests?: Interest[]
}

export type Merchant = {
  id: string
  name: L
  tagline: L
  about: L
  cats: CategoryId[]
  cities: CityId[]
  rating: number
  reviews: number
  since: number
  hue: number // palette index for the monogram
  initials: string
  prepTime: L
  commission: number
}

export const CATEGORIES: { id: CategoryId; name: L; blurb: L; art: Art }[] = [
  { id: 'flowers', name: { ar: 'ورود', en: 'Flowers' }, blurb: { ar: 'باقات تنطق عنك', en: 'Bouquets that speak for you' }, art: { k: 'bouquet', c: 1, img: 'flowers-garden-vase' } },
  { id: 'cakes', name: { ar: 'كيك', en: 'Cakes' }, blurb: { ar: 'لكل شمعة قصة', en: 'A story for every candle' }, art: { k: 'drip', c: 0, img: 'cake-floral-macaron' } },
  { id: 'chocolate', name: { ar: 'شوكولاتة', en: 'Chocolate' }, blurb: { ar: 'حلاوة بتوقيع محلي', en: 'Locally crafted indulgence' }, art: { k: 'pralines', c: 4, img: 'choc-hospitality-chest', fit: 'contain' } },
  { id: 'balloons', name: { ar: 'بالونات', en: 'Balloons' }, blurb: { ar: 'فرحة ترتفع', en: 'Joy that floats' }, art: { k: 'cluster', c: 1, img: 'balloons-blush-champagne', fit: 'contain' } },
  { id: 'decoration', name: { ar: 'تنسيق وزينة', en: 'Decoration' }, blurb: { ar: 'نحوّل المكان لاحتفال', en: 'We turn spaces into parties' }, art: { k: 'arch', c: 2 } },
  { id: 'gifts', name: { ar: 'هدايا', en: 'Gifts' }, blurb: { ar: 'عطور، عود، ولمسات راقية', en: 'Perfume, oud & refined touches' }, art: { k: 'giftbox', c: 0, img: 'bundle-birthday', pos: '66% 55%' } },
  { id: 'desserts', name: { ar: 'حلويات', en: 'Desserts' }, blurb: { ar: 'من كنافة لماكرون', en: 'From kunafa to macarons' }, art: { k: 'macarons', c: 1 } },
  { id: 'custom', name: { ar: 'هدايا مخصصة', en: 'Personalized' }, blurb: { ar: 'محفورة باسمه وبذوقك', en: 'Engraved with their name' }, art: { k: 'engraved', c: 3, img: 'men-wallet' } },
  { id: 'kids', name: { ar: 'أطفال وألعاب', en: 'Kids & Toys' }, blurb: { ar: 'ألعاب تناسب كل عمر', en: 'Toys for every age' }, art: { k: 'giftbox', c: 1, img: 'kid-shape-sorter' } },
  { id: 'beauty', name: { ar: 'جمال وعناية', en: 'Beauty & Skincare' }, blurb: { ar: 'لحظة دلال تستاهلها', en: 'A moment of pampering' }, art: { k: 'giftbox', c: 1, img: 'beauty-skincare-set' } },
  { id: 'perfume', name: { ar: 'عطور وبخور', en: 'Perfumes & Fragrances' }, blurb: { ar: 'أثر يبقى في الذاكرة', en: 'A scent they remember' }, art: { k: 'perfume', c: 1, img: 'perf-floral' } },
  { id: 'men', name: { ar: 'هدايا رجالية', en: "Men's Gifts" }, blurb: { ar: 'أناقة في التفاصيل', en: 'Elegance in the details' }, art: { k: 'engraved', c: 0, img: 'men-watch' } },
  { id: 'lifestyle', name: { ar: 'لايف ستايل وبيت', en: 'Lifestyle & Home' }, blurb: { ar: 'لمسات للبيت والمكتب', en: 'Touches for home & desk' }, art: { k: 'vase', c: 2, img: 'men-tech-stand' } },
]

export const CITIES: { id: CityId; name: L }[] = [
  { id: 'riyadh', name: { ar: 'الرياض', en: 'Riyadh' } },
  { id: 'jeddah', name: { ar: 'جدة', en: 'Jeddah' } },
  { id: 'dammam', name: { ar: 'الدمام', en: 'Dammam' } },
  { id: 'khobar', name: { ar: 'الخبر', en: 'Khobar' } },
  { id: 'makkah', name: { ar: 'مكة المكرمة', en: 'Makkah' } },
  { id: 'madinah', name: { ar: 'المدينة المنورة', en: 'Madinah' } },
  { id: 'abha', name: { ar: 'أبها', en: 'Abha' } },
  { id: 'taif', name: { ar: 'الطائف', en: 'Taif' } },
]

export const OCCASIONS: { id: OccasionId; name: L; hint: L; tone: number }[] = [
  { id: 'birthday', name: { ar: 'عيد ميلاد', en: 'Birthday' }, hint: { ar: 'شموع وكيك وبالونات', en: 'Candles, cake & balloons' }, tone: 1 },
  { id: 'wedding', name: { ar: 'زواج', en: 'Wedding' }, hint: { ar: 'تهنئة تليق باليوم', en: 'Worthy of the big day' }, tone: 2 },
  { id: 'engagement', name: { ar: 'خطوبة', en: 'Engagement' }, hint: { ar: 'بداية حكاية', en: 'The start of a story' }, tone: 1 },
  { id: 'graduation', name: { ar: 'تخرج', en: 'Graduation' }, hint: { ar: 'تعبك ما راح', en: 'Hard work, celebrated' }, tone: 0 },
  { id: 'newborn', name: { ar: 'مولود جديد', en: 'New baby' }, hint: { ar: 'يتربى بعزكم', en: 'Welcome, little one' }, tone: 3 },
  { id: 'eid', name: { ar: 'العيد', en: 'Eid' }, hint: { ar: 'عيدية بذوق', en: 'Eidiya with style' }, tone: 0 },
  { id: 'ramadan', name: { ar: 'رمضان', en: 'Ramadan' }, hint: { ar: 'سفرة وزيارة', en: 'Iftar visits' }, tone: 4 },
  { id: 'anniversary', name: { ar: 'ذكرى سنوية', en: 'Anniversary' }, hint: { ar: 'سنة جديدة معك', en: 'Another year together' }, tone: 1 },
  { id: 'promotion', name: { ar: 'نجاح وترقية', en: 'Promotion' }, hint: { ar: 'مبروك الإنجاز', en: 'Congrats on the win' }, tone: 0 },
  { id: 'getwell', name: { ar: 'سلامتك', en: 'Get well' }, hint: { ar: 'طهور إن شاء الله', en: 'Wishing a quick recovery' }, tone: 3 },
  { id: 'newhome', name: { ar: 'بيت جديد', en: 'New home' }, hint: { ar: 'مبارك المسكن', en: 'Blessings on the new place' }, tone: 4 },
  { id: 'thanks', name: { ar: 'شكر وامتنان', en: 'Thank you' }, hint: { ar: 'لأن الشكر يستاهل', en: 'Because thanks matter' }, tone: 2 },
  { id: 'national', name: { ar: 'اليوم الوطني', en: 'National Day' }, hint: { ar: 'فخر أخضر', en: 'Green pride' }, tone: 0 },
]

export const RECIPIENTS: { id: RecipientId; name: L }[] = [
  { id: 'mother', name: { ar: 'الوالدة', en: 'Mother' } },
  { id: 'father', name: { ar: 'الوالد', en: 'Father' } },
  { id: 'wife', name: { ar: 'الزوجة', en: 'Wife' } },
  { id: 'husband', name: { ar: 'الزوج', en: 'Husband' } },
  { id: 'sister', name: { ar: 'الأخت', en: 'Sister' } },
  { id: 'friend', name: { ar: 'صديق/ة', en: 'Friend' } },
  { id: 'brother', name: { ar: 'الأخ', en: 'Brother' } },
  { id: 'colleague', name: { ar: 'زميل عمل', en: 'Colleague' } },
  { id: 'child', name: { ar: 'طفل', en: 'Child' } },
  { id: 'baby', name: { ar: 'مولود', en: 'Baby' } },
  { id: 'team', name: { ar: 'فريق / مكتب', en: 'Team / office' } },
]

export const MERCHANTS: Merchant[] = [
  {
    id: 'numu', name: { ar: 'نُمو للألعاب', en: 'Numu Toys' }, initials: 'ن',
    tagline: { ar: 'ألعاب تعليمية وآمنة لكل عمر', en: 'Safe, educational toys for every age' },
    about: { ar: 'متجر ألعاب في الرياض يختار ألعاباً تنمّي الخيال والمهارات، مع توضيح العمر المناسب لكل لعبة.', en: 'A Riyadh toy store choosing toys that grow imagination and skills, with a clear age guide on every item.' },
    cats: ['kids'], cities: ['riyadh', 'jeddah', 'dammam', 'khobar', 'makkah', 'madinah'], rating: 4.8, reviews: 1120, since: 2019, hue: 2,
    prepTime: { ar: 'نفس اليوم', en: 'Same day' }, commission: 0.14,
  },
  {
    id: 'mahd', name: { ar: 'مهد', en: 'Mahd Baby' }, initials: 'م',
    tagline: { ar: 'هدايا المواليد بخامات ناعمة', en: 'Newborn gifts in gentle fabrics' },
    about: { ar: 'بوتيك هدايا مواليد يجهّز سلال الاستقبال بالقطن العضوي والتريكو اليدوي.', en: 'A newborn boutique preparing welcome baskets in organic cotton and hand knits.' },
    cats: ['kids', 'gifts'], cities: ['riyadh', 'jeddah', 'dammam', 'khobar'], rating: 4.9, reviews: 640, since: 2021, hue: 3,
    prepTime: { ar: '٣ ساعات', en: '3 hours' }, commission: 0.15,
  },
  {
    id: 'rawnaq', name: { ar: 'رونق', en: 'Rawnaq Beauty' }, initials: 'ر',
    tagline: { ar: 'عناية وجمال بلمسة هدية', en: 'Beauty & care, gift-ready' },
    about: { ar: 'نجهّز أطقم العناية والمكياج والإكسسوارات في صناديق هدايا أنيقة.', en: 'Skincare, makeup and accessory sets prepared in elegant gift boxes.' },
    cats: ['beauty', 'gifts'], cities: ['riyadh', 'jeddah', 'dammam', 'khobar', 'makkah'], rating: 4.8, reviews: 980, since: 2020, hue: 1,
    prepTime: { ar: 'نفس اليوم', en: 'Same day' }, commission: 0.16,
  },
  {
    id: 'misk', name: { ar: 'دار المسك', en: 'Dar Al Misk' }, initials: 'د',
    tagline: { ar: 'عطور شرقية ومسك وبخور', en: 'Oriental perfumes, musk & bakhoor' },
    about: { ar: 'دار عطور تمزج المسك والعود والورد، مع أطقم تجربة لمن يحتار.', en: 'A perfume house blending musk, oud and rose — with discovery sets for the undecided.' },
    cats: ['perfume', 'lifestyle'], cities: ['riyadh', 'jeddah', 'dammam', 'khobar', 'makkah', 'madinah', 'abha', 'taif'], rating: 4.9, reviews: 1430, since: 2014, hue: 4,
    prepTime: { ar: 'نفس اليوم', en: 'Same day' }, commission: 0.12,
  },
  {
    id: 'samt', name: { ar: 'سَمت', en: 'Samt Gentleman' }, initials: 'س',
    tagline: { ar: 'إكسسوارات رجالية بخامات راقية', en: 'Refined accessories for him' },
    about: { ar: 'محافظ وساعات وأطقم عناية بجلد طبيعي وخشب جوز، مع خدمة الحفر بالأحرف.', en: 'Wallets, watches and grooming sets in natural leather and walnut, with initials engraving.' },
    cats: ['men', 'custom', 'lifestyle'], cities: ['riyadh', 'jeddah', 'dammam', 'khobar', 'makkah', 'madinah'], rating: 4.8, reviews: 760, since: 2018, hue: 0,
    prepTime: { ar: '٢٤ ساعة', en: '24 hours' }, commission: 0.14,
  },
  {
    id: 'reem', name: { ar: 'ورد الريم', en: 'Al Reem Florals' }, initials: 'ر',
    tagline: { ar: 'تنسيقات ورد يومية من مزارع مختارة', en: 'Daily arrangements from hand-picked farms' },
    about: { ar: 'استوديو ورد في حي الملقا يجهز الباقات صباح كل يوم، ويهتم بالتغليف الهادئ والألوان الناعمة.', en: 'A floral studio in Al Malqa preparing bouquets fresh every morning, known for quiet wrapping and soft palettes.' },
    cats: ['flowers', 'gifts'], cities: ['riyadh', 'jeddah'], rating: 4.9, reviews: 1284, since: 2019, hue: 1,
    prepTime: { ar: '٢–٣ ساعات', en: '2–3 hours' }, commission: 0.15,
  },
  {
    id: 'sukkar', name: { ar: 'مخبز سُكّر', en: 'Sukkar Bakery' }, initials: 'س',
    tagline: { ar: 'كيك مناسبات بطبقات من الحكايات', en: 'Celebration cakes, layered with stories' },
    about: { ar: 'مخبز عائلي في الخبر بدأ من مطبخ البيت، اليوم يخبز أكثر من ١٠٠ كيكة أسبوعياً بمكونات طبيعية.', en: 'A family bakery in Khobar that started in a home kitchen and now bakes 100+ cakes a week with natural ingredients.' },
    cats: ['cakes', 'desserts'], cities: ['riyadh', 'dammam', 'khobar'], rating: 4.8, reviews: 932, since: 2017, hue: 0,
    prepTime: { ar: '٢٤ ساعة', en: '24 hours' }, commission: 0.15,
  },
  {
    id: 'najd', name: { ar: 'كاكاو نجد', en: 'Najd Cacao' }, initials: 'ك',
    tagline: { ar: 'شوكولاتة حرفية بنكهات سعودية', en: 'Craft chocolate with Saudi flavours' },
    about: { ar: 'نصنع البرالين يدوياً بنكهات الهيل والزعفران وتمر السكري، وتغليفنا مستوحى من نقوش نجد.', en: 'Hand-made pralines flavoured with cardamom, saffron and Sukkari dates, wrapped in Najdi-inspired patterns.' },
    cats: ['chocolate', 'gifts'], cities: ['riyadh', 'jeddah', 'dammam', 'khobar'], rating: 4.9, reviews: 2107, since: 2016, hue: 4,
    prepTime: { ar: 'نفس اليوم', en: 'Same day' }, commission: 0.12,
  },
  {
    id: 'farha', name: { ar: 'بالونات فرحة', en: 'Farha Balloons' }, initials: 'ف',
    tagline: { ar: 'بالونات هيليوم وتنسيقات مبهجة', en: 'Helium balloons & joyful setups' },
    about: { ar: 'فريق شاب يحب التفاصيل: أرقام، قلوب، وأقواس بالونات تُركّب في موقعك خلال ساعة.', en: 'A young team obsessed with details: numbers, hearts and balloon arches installed on site within an hour.' },
    cats: ['balloons', 'decoration'], cities: ['riyadh', 'jeddah', 'makkah'], rating: 4.7, reviews: 768, since: 2020, hue: 1,
    prepTime: { ar: '٣ ساعات', en: '3 hours' }, commission: 0.18,
  },
  {
    id: 'sahra', name: { ar: 'زينة السهرة', en: 'Sahra Décor' }, initials: 'ز',
    tagline: { ar: 'تنسيق جلسات وطاولات المناسبات', en: 'Event tables & majlis styling' },
    about: { ar: 'ننسق جلسات الاستقبال والملكة وحفلات التخرج بلمسة عصرية ودفء سعودي.', en: 'We style reception majlis, milka nights and graduations with a modern touch and Saudi warmth.' },
    cats: ['decoration', 'balloons'], cities: ['riyadh', 'jeddah', 'dammam', 'khobar'], rating: 4.8, reviews: 415, since: 2018, hue: 2,
    prepTime: { ar: '٤٨ ساعة', en: '48 hours' }, commission: 0.18,
  },
  {
    id: 'oudbox', name: { ar: 'صندوق عود', en: 'Oud Box' }, initials: 'ع',
    tagline: { ar: 'عطور وبخور وصناديق هدايا فاخرة', en: 'Perfume, bukhoor & luxury gift boxes' },
    about: { ar: 'نجمع أفضل العطور المحلية ودهن العود في صناديق هدايا جاهزة تصل لكل مدن المملكة.', en: 'Curated local perfumes and oud oils in ready gift boxes, delivered across the Kingdom.' },
    cats: ['gifts', 'custom'], cities: ['riyadh', 'jeddah', 'dammam', 'khobar', 'makkah', 'madinah', 'abha', 'taif'], rating: 4.8, reviews: 1650, since: 2015, hue: 4,
    prepTime: { ar: 'نفس اليوم', en: 'Same day' }, commission: 0.12,
  },
  {
    id: 'haladar', name: { ar: 'حلا الدار', en: 'Hala Al Dar' }, initials: 'ح',
    tagline: { ar: 'حلويات حجازية وكنافة على أصولها', en: 'Hijazi sweets & kunafa done right' },
    about: { ar: 'من جدة القديمة، نحضّر الكنافة والمعمول والبسبوسة يومياً بوصفات الجدات.', en: 'From old Jeddah — kunafa, maamoul and basbousa made daily with our grandmothers\' recipes.' },
    cats: ['desserts', 'chocolate'], cities: ['riyadh', 'jeddah', 'makkah', 'madinah', 'taif'], rating: 4.9, reviews: 1890, since: 2012, hue: 3,
    prepTime: { ar: '٣ ساعات', en: '3 hours' }, commission: 0.12,
  },
  {
    id: 'naqsh', name: { ar: 'استوديو نقش', en: 'Naqsh Studio' }, initials: 'ن',
    tagline: { ar: 'هدايا محفورة ومطبوعة بالاسم', en: 'Engraved & printed name gifts' },
    about: { ar: 'نحفر الأسماء والتواريخ على الخشب والجلد والكريستال، كل قطعة تُصنع لك فقط.', en: 'We engrave names and dates on wood, leather and crystal — every piece is made just for you.' },
    cats: ['custom', 'gifts'], cities: ['riyadh', 'jeddah', 'dammam', 'khobar', 'makkah', 'madinah', 'abha', 'taif'], rating: 4.7, reviews: 604, since: 2021, hue: 2,
    prepTime: { ar: '٤٨ ساعة', en: '48 hours' }, commission: 0.15,
  },
  {
    id: 'batla', name: { ar: 'بتلة', en: 'Batla' }, initials: 'ب',
    tagline: { ar: 'ورد وحلا من الساحل للجنوب', en: 'Flowers & sweets from coast to south' },
    about: { ar: 'متجر ورد بفروع في جدة والشرقية وأبها، معروف بصناديق الورد والتنسيقات الموسمية.', en: 'A florist with branches in Jeddah, the Eastern Province and Abha, known for rose boxes and seasonal designs.' },
    cats: ['flowers', 'desserts', 'gifts'], cities: ['riyadh', 'jeddah', 'dammam', 'khobar', 'abha'], rating: 4.8, reviews: 1022, since: 2018, hue: 1,
    prepTime: { ar: '٢–٤ ساعات', en: '2–4 hours' }, commission: 0.15,
  },
  {
    id: 'qamariya', name: { ar: 'قمرية', en: 'Qamariya Patisserie' }, initials: 'ق',
    tagline: { ar: 'باتيسري فرنسي بروح حجازية', en: 'French patisserie, Hijazi soul' },
    about: { ar: 'ماكرون وتارت وكيك مخملي، بتصاميم مستوحاة من رواشين جدة التاريخية.', en: 'Macarons, tarts and velvet cakes, designed after the rawasheen of historic Jeddah.' },
    cats: ['cakes', 'desserts'], cities: ['riyadh', 'jeddah', 'makkah', 'taif'], rating: 4.9, reviews: 811, since: 2019, hue: 0,
    prepTime: { ar: '١٢ ساعة', en: '12 hours' }, commission: 0.15,
  },
]

/* ---------- variant templates ---------- */
const V = {
  flowerSize: (): VariantGroup => ({
    key: 'size', label: { ar: 'الحجم', en: 'Size' }, options: [
      { id: 'classic', label: { ar: 'كلاسيك', en: 'Classic' }, delta: 0 },
      { id: 'grand', label: { ar: 'جراند', en: 'Grand' }, delta: 90 },
      { id: 'luxe', label: { ar: 'فاخر', en: 'Luxe' }, delta: 190 },
    ],
  }),
  wrap: (): VariantGroup => ({
    key: 'wrap', label: { ar: 'لون التغليف', en: 'Wrap' }, options: [
      { id: 'cream', label: { ar: 'كريمي', en: 'Cream' }, delta: 0 },
      { id: 'green', label: { ar: 'أخضر داكن', en: 'Deep green' }, delta: 0 },
      { id: 'blush', label: { ar: 'وردي', en: 'Blush' }, delta: 0 },
    ],
  }),
  cakeSize: (): VariantGroup => ({
    key: 'size', label: { ar: 'الحجم', en: 'Size' }, options: [
      { id: 's', label: { ar: '٦ إنش · ٨ أشخاص', en: '6" · serves 8' }, delta: 0 },
      { id: 'm', label: { ar: '٨ إنش · ١٤ شخص', en: '8" · serves 14' }, delta: 95 },
      { id: 'l', label: { ar: '١٠ إنش · ٢٠ شخص', en: '10" · serves 20' }, delta: 195 },
    ],
  }),
  flavor: (): VariantGroup => ({
    key: 'flavor', label: { ar: 'النكهة', en: 'Flavour' }, options: [
      { id: 'vanilla', label: { ar: 'فانيلا وتوت', en: 'Vanilla berry' }, delta: 0 },
      { id: 'choco', label: { ar: 'شوكولاتة بلجيكية', en: 'Belgian chocolate' }, delta: 0 },
      { id: 'pistachio', label: { ar: 'فستق وورد', en: 'Pistachio rose' }, delta: 25 },
      { id: 'lotus', label: { ar: 'لوتس', en: 'Lotus' }, delta: 15 },
    ],
  }),
  pieces: (base = 16): VariantGroup => ({
    key: 'pieces', label: { ar: 'عدد القطع', en: 'Pieces' }, options: [
      { id: 'p1', label: { ar: `${toAr(base)} قطعة`, en: `${base} pcs` }, delta: 0 },
      { id: 'p2', label: { ar: `${toAr(base * 2)} قطعة`, en: `${base * 2} pcs` }, delta: Math.round(base * 6.5) },
      { id: 'p3', label: { ar: `${toAr(base * 3)} قطعة`, en: `${base * 3} pcs` }, delta: Math.round(base * 12) },
    ],
  }),
  balloonCount: (): VariantGroup => ({
    key: 'count', label: { ar: 'الكمية', en: 'Quantity' }, options: [
      { id: 'b1', label: { ar: 'باقة صغيرة', en: 'Small bunch' }, delta: 0 },
      { id: 'b2', label: { ar: 'باقة متوسطة', en: 'Medium bunch' }, delta: 70 },
      { id: 'b3', label: { ar: 'باقة كبيرة', en: 'Large bunch' }, delta: 150 },
    ],
  }),
  setup: (): VariantGroup => ({
    key: 'setup', label: { ar: 'حجم التنسيق', en: 'Setup size' }, options: [
      { id: 'cozy', label: { ar: 'جلسة صغيرة', en: 'Cozy corner' }, delta: 0 },
      { id: 'room', label: { ar: 'غرفة كاملة', en: 'Full room' }, delta: 450 },
      { id: 'hall', label: { ar: 'مجلس / قاعة', en: 'Majlis / hall' }, delta: 1200 },
    ],
  }),
  volume: (): VariantGroup => ({
    key: 'vol', label: { ar: 'الحجم', en: 'Volume' }, options: [
      { id: '50', label: { ar: '٥٠ مل', en: '50 ml' }, delta: 0 },
      { id: '100', label: { ar: '١٠٠ مل', en: '100 ml' }, delta: 160 },
    ],
  }),
  tray: (): VariantGroup => ({
    key: 'tray', label: { ar: 'حجم الصينية', en: 'Tray size' }, options: [
      { id: 't1', label: { ar: 'صغيرة', en: 'Small' }, delta: 0 },
      { id: 't2', label: { ar: 'وسط', en: 'Medium' }, delta: 70 },
      { id: 't3', label: { ar: 'كبيرة · للضيافة', en: 'Large · for guests' }, delta: 150 },
    ],
  }),
  material: (): VariantGroup => ({
    key: 'mat', label: { ar: 'الخامة', en: 'Material' }, options: [
      { id: 'wood', label: { ar: 'خشب جوز', en: 'Walnut' }, delta: 0 },
      { id: 'leather', label: { ar: 'جلد طبيعي', en: 'Leather' }, delta: 60 },
      { id: 'crystal', label: { ar: 'كريستال', en: 'Crystal' }, delta: 140 },
    ],
  }),
}

function toAr(n: number) {
  return String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d])
}

const ALL_R: RecipientId[] = ['mother', 'father', 'wife', 'husband', 'sister', 'friend', 'colleague', 'child', 'team']
const FEM: RecipientId[] = ['mother', 'wife', 'sister', 'friend']

let seq = 0
function p(
  cat: CategoryId, merchant: string, ar: string, en: string, price: number, art: Art,
  o: Partial<Omit<Product, 'id' | 'cat' | 'merchant' | 'name' | 'price' | 'art'>> & { dAr?: string; dEn?: string } = {},
): Product {
  seq++
  const { dAr, dEn, ...rest } = o
  return {
    id: `p${String(seq).padStart(3, '0')}`,
    cat, merchant, name: { ar, en }, price, art,
    desc: { ar: dAr ?? '', en: dEn ?? '' },
    rating: +(4.5 + ((seq * 37) % 5) / 10).toFixed(1),
    reviews: 30 + ((seq * 97) % 420),
    stock: 4 + ((seq * 53) % 40),
    leadHours: 3,
    occasions: [],
    recipients: ALL_R,
    variants: [],
    created: 100 - seq,
    ...rest,
  }
}

const ILLUSTRATED: Product[] = [
  /* ---------------- FLOWERS ---------------- */
  p('flowers', 'reem', 'باقة نسيم الصباح', 'Morning Breeze Bouquet', 245, { k: 'bouquet', c: 1 }, {
    dAr: 'ورد جوري وردي مع قرنفل كريمي وأوكالبتوس، ملفوف بورق كرافت ناعم وشريطة ساتان.',
    dEn: 'Blush roses with cream carnations and eucalyptus, wrapped in soft kraft paper with a satin ribbon.',
    occasions: ['birthday', 'thanks', 'getwell', 'anniversary'], recipients: FEM, variants: [V.flowerSize(), V.wrap()], badge: 'best',
  }),
  p('flowers', 'reem', 'صندوق ورد الأمنيات', 'Wishes Rose Box', 395, { k: 'rosebox', c: 1 }, {
    dAr: '٢٥ وردة جوري في صندوق أسطواني مخملي، تدوم حتى ٧ أيام.', dEn: '25 premium roses in a round velvet hatbox, lasts up to 7 days.',
    occasions: ['anniversary', 'engagement', 'birthday', 'wedding'], recipients: ['wife', 'mother', 'sister'], variants: [V.flowerSize()], badge: 'best',
  }),
  p('flowers', 'reem', 'مزهرية الحديقة الهادئة', 'Quiet Garden Vase', 320, { k: 'vase', c: 2 }, {
    dAr: 'تنسيق موسمي في مزهرية سيراميك يدوية الصنع، تبقى زينة بعد الورد.', dEn: 'A seasonal arrangement in a handmade ceramic vase that stays as décor.',
    occasions: ['newhome', 'thanks', 'getwell', 'promotion'], variants: [V.flowerSize()], leadHours: 4,
  }),
  p('flowers', 'reem', 'باقة الذهب الأبيض', 'White Gold Bouquet', 289, { k: 'bouquet', c: 2 }, {
    dAr: 'ورد أبيض وليسيانثوس بلمسات ذهبية، اختيار راقٍ للتهاني الرسمية.', dEn: 'White roses and lisianthus with gold accents — a refined pick for formal congratulations.',
    occasions: ['wedding', 'promotion', 'graduation', 'thanks'], variants: [V.flowerSize(), V.wrap()],
  }),
  p('flowers', 'reem', 'وردة واحدة تكفي', 'Just One Rose', 69, { k: 'bouquet', c: 3, n: '1' }, {
    dAr: 'وردة جوري حمراء طويلة الساق في غلاف شفاف مع كرت صغير.', dEn: 'A single long-stem rose in a clear sleeve with a mini card.',
    occasions: ['anniversary', 'thanks', 'getwell'], recipients: FEM, badge: 'sameday', leadHours: 2,
  }),
  p('flowers', 'batla', 'صندوق بتلة الأخضر', 'Batla Green Box', 365, { k: 'rosebox', c: 0 }, {
    dAr: 'صندوق أخضر داكن بورد أبيض وذهبي، توقيع بتلة الأشهر.', dEn: 'Our signature deep-green box with white and gold roses.',
    occasions: ['national', 'promotion', 'graduation', 'eid'], variants: [V.flowerSize()], badge: 'best',
  }),
  p('flowers', 'batla', 'باقة غروب أبها', 'Abha Sunset Bouquet', 275, { k: 'bouquet', c: 4 }, {
    dAr: 'ألوان دافئة من الخوخي والكراميل، مستوحاة من غروب جبال السودة.', dEn: 'Warm peach and caramel tones inspired by sunsets over Al Soudah.',
    occasions: ['birthday', 'thanks', 'newhome'], variants: [V.flowerSize(), V.wrap()], badge: 'new',
  }),
  p('flowers', 'batla', 'مزهرية الكادي', 'Kadi Vase', 410, { k: 'vase', c: 1 }, {
    dAr: 'تنسيق فاخر بأزهار الفاوانيا الموسمية في مزهرية زجاجية مضلعة.', dEn: 'Seasonal peonies in a fluted glass vase.',
    occasions: ['wedding', 'anniversary', 'newhome', 'newborn'], recipients: FEM, variants: [V.flowerSize()], badge: 'limited', stock: 3,
  }),
  p('flowers', 'batla', 'باقة يتربى بعزكم', 'Welcome Baby Bouquet', 255, { k: 'bouquet', c: 0 }, {
    dAr: 'ورد أبيض وأخضر ناعم مع دبدوب صغير، للمواليد الجدد.', dEn: 'Soft white and green blooms with a tiny teddy, for newborns.',
    occasions: ['newborn'], recipients: ['mother', 'sister', 'friend'], variants: [V.wrap()],
  }),

  /* ---------------- CAKES ---------------- */
  p('cakes', 'sukkar', 'كيكة الدريب الوردية', 'Blush Drip Cake', 285, { k: 'drip', c: 1 }, {
    dAr: 'كيكة فانيلا بطبقات توت وكريمة، مزينة بدريب وردي وماكرون.', dEn: 'Vanilla layers with berries and cream, finished with a blush drip and macarons.',
    occasions: ['birthday', 'engagement', 'anniversary'], variants: [V.cakeSize(), V.flavor()], leadHours: 24, badge: 'best',
    personalize: { ar: 'عبارة على الكيكة', en: 'Message on cake' },
  }),
  p('cakes', 'sukkar', 'كيكة التخرج الخضراء', 'Green Graduation Cake', 320, { k: 'cake', c: 0, n: '2' }, {
    dAr: 'كيكة طابقين بالأخضر والذهبي مع قبعة تخرج من الفوندان.', dEn: 'Two tiers in green and gold topped with a fondant graduation cap.',
    occasions: ['graduation', 'promotion'], variants: [V.cakeSize(), V.flavor()], leadHours: 24,
    personalize: { ar: 'اسم الخريج/ة', en: 'Graduate name' },
  }),
  p('cakes', 'sukkar', 'كيكة الأرقام', 'Number Cake', 230, { k: 'cake', c: 1, n: '1' }, {
    dAr: 'كيكة على شكل رقم العمر، مزينة بالورد الطبيعي والماكرون.', dEn: 'A cake shaped like the age number, dressed with real flowers and macarons.',
    occasions: ['birthday', 'anniversary'], recipients: ['child', 'wife', 'friend', 'sister', 'mother'], variants: [V.flavor()], leadHours: 24,
    personalize: { ar: 'الرقم', en: 'Number' },
  }),
  p('cakes', 'sukkar', 'كيكة السعادة بالشوكولاتة', 'Chocolate Bliss Cake', 210, { k: 'drip', c: 4 }, {
    dAr: 'شوكولاتة بلجيكية داكنة بطبقات غاناش وكراميل مملح.', dEn: 'Dark Belgian chocolate with ganache and salted caramel layers.',
    occasions: ['birthday', 'promotion', 'thanks'], recipients: ['father', 'husband', 'friend', 'colleague', 'team'], variants: [V.cakeSize()], leadHours: 12,
  }),
  p('cakes', 'qamariya', 'كيكة الروشان', 'Rawshan Cake', 450, { k: 'cake', c: 2, n: '3' }, {
    dAr: 'كيكة ثلاث طبقات بنقوش الرواشين الحجازية بالسكر الملكي.', dEn: 'Three tiers piped with Hijazi rawshan latticework in royal icing.',
    occasions: ['wedding', 'engagement', 'anniversary'], variants: [V.cakeSize(), V.flavor()], leadHours: 48, badge: 'limited',
  }),
  p('cakes', 'qamariya', 'كيكة المخمل الأحمر', 'Red Velvet Cake', 240, { k: 'drip', c: 3 }, {
    dAr: 'مخمل أحمر كلاسيكي بكريمة الجبن ورقائق الذهب.', dEn: 'Classic red velvet with cream cheese frosting and gold leaf.',
    occasions: ['birthday', 'anniversary', 'thanks'], variants: [V.cakeSize()], leadHours: 12,
  }),
  p('cakes', 'qamariya', 'كب كيك الاحتفال (١٢)', 'Celebration Cupcakes (12)', 155, { k: 'cupcakes', c: 1 }, {
    dAr: '١٢ كب كيك بكريمة الزبدة ونكهات منوعة.', dEn: '12 buttercream cupcakes in mixed flavours.',
    occasions: ['birthday', 'newborn', 'thanks', 'graduation'], recipients: ['child', 'team', 'colleague', 'friend'], leadHours: 6, badge: 'sameday',
  }),
  p('cakes', 'sukkar', 'كيكة مرحباً بالمولود', 'Hello Baby Cake', 265, { k: 'cake', c: 3, n: '1' }, {
    dAr: 'كيكة ناعمة بألوان الباستيل مع خطوات صغيرة من الفوندان.', dEn: 'Soft pastel cake with little fondant footprints.',
    occasions: ['newborn'], variants: [V.cakeSize(), V.flavor()], leadHours: 24, badge: 'new',
  }),

  /* ---------------- CHOCOLATE ---------------- */
  p('chocolate', 'najd', 'صندوق برالين نجد', 'Najd Praline Box', 185, { k: 'pralines', c: 4 }, {
    dAr: 'برالين يدوي بنكهات الهيل والزعفران وتمر السكري.', dEn: 'Hand-made pralines with cardamom, saffron and Sukkari dates.',
    occasions: ['thanks', 'eid', 'ramadan', 'promotion', 'birthday'], variants: [V.pieces(16)], badge: 'best', leadHours: 2,
  }),
  p('chocolate', 'najd', 'تمر محشي بالشوكولاتة', 'Chocolate-Dipped Dates', 140, { k: 'dates', c: 4 }, {
    dAr: 'تمر مجدول محشي باللوز ومغطى بالشوكولاتة البلجيكية.', dEn: 'Medjool dates stuffed with almonds and dipped in Belgian chocolate.',
    occasions: ['ramadan', 'eid', 'thanks', 'newhome'], recipients: ['mother', 'father', 'colleague', 'team'], variants: [V.pieces(12)], leadHours: 2,
  }),
  p('chocolate', 'najd', 'ألواح الشوكولاتة الحرفية', 'Craft Bar Trio', 95, { k: 'bar', c: 0 }, {
    dAr: 'ثلاثة ألواح: داكن ٧٠٪، حليب بالفستق، وأبيض بالورد.', dEn: 'Three bars: 70% dark, pistachio milk, and rose white.',
    occasions: ['thanks', 'birthday', 'getwell'], recipients: ['friend', 'colleague', 'husband', 'team'], badge: 'sameday', leadHours: 2,
  }),
  p('chocolate', 'najd', 'صندوق العيد الذهبي', 'Golden Eid Box', 320, { k: 'pralines', c: 2 }, {
    dAr: 'صندوق فاخر بطبقتين من البرالين المذهب والملبس.', dEn: 'A two-layer luxury box of gilded pralines and dragées.',
    occasions: ['eid', 'ramadan', 'wedding'], variants: [V.pieces(24)], badge: 'limited',
  }),
  p('chocolate', 'najd', 'شوكولاتة اليوم الوطني', 'National Day Chocolate', 120, { k: 'bar', c: 0, n: '96' }, {
    dAr: 'ألواح بتغليف أخضر ونقوش سدو، إصدار محدود.', dEn: 'Bars in green Sadu-pattern wrapping, limited edition.',
    occasions: ['national'], recipients: ALL_R, badge: 'limited',
  }),
  p('chocolate', 'haladar', 'شوكولاتة بالفستق الحلبي', 'Pistachio Chocolate Tray', 165, { k: 'pralines', c: 3 }, {
    dAr: 'قطع شوكولاتة محشية بالفستق الحلبي والكنافة المحمصة.', dEn: 'Chocolates filled with Aleppo pistachio and toasted kunafa.',
    occasions: ['eid', 'ramadan', 'thanks', 'birthday'], variants: [V.pieces(16)], badge: 'new',
  }),
  p('chocolate', 'najd', 'علبة القلوب', 'Heart Box', 210, { k: 'pralines', c: 1 }, {
    dAr: 'علبة على شكل قلب بقطع الشوكولاتة الوردية والبيضاء.', dEn: 'A heart-shaped box of blush and white chocolates.',
    occasions: ['anniversary', 'engagement', 'birthday'], recipients: ['wife', 'husband', 'mother', 'sister'], variants: [V.pieces(12)],
  }),
  p('chocolate', 'haladar', 'تمر الضيافة الملكي', 'Royal Hospitality Dates', 260, { k: 'dates', c: 2 }, {
    dAr: 'تشكيلة تمور فاخرة على صينية خشبية مع الشوكولاتة.', dEn: 'Premium dates on a wooden tray with chocolate pieces.',
    occasions: ['ramadan', 'eid', 'newhome', 'wedding'], recipients: ['mother', 'father', 'team', 'colleague'], variants: [V.tray()],
  }),

  /* ---------------- BALLOONS ---------------- */
  p('balloons', 'farha', 'باقة بالونات لمّة', 'Lamma Balloon Bunch', 145, { k: 'cluster', c: 1 }, {
    dAr: 'بالونات هيليوم بألوان الوردي والذهبي والكريمي مع شرائط.', dEn: 'Helium balloons in blush, gold and cream with ribbons.',
    occasions: ['birthday', 'graduation', 'newborn', 'promotion'], variants: [V.balloonCount()], badge: 'best', leadHours: 3,
  }),
  p('balloons', 'farha', 'بالونات الأرقام الذهبية', 'Gold Number Balloons', 120, { k: 'number', c: 2, n: '25' }, {
    dAr: 'رقمان من الفويل الذهبي بارتفاع ٨٠ سم مع هيليوم.', dEn: 'Two 80 cm gold foil numbers, helium filled.',
    occasions: ['birthday', 'anniversary', 'graduation'], personalize: { ar: 'الرقم', en: 'Number' }, leadHours: 3,
  }),
  p('balloons', 'farha', 'قلب الحب العملاق', 'Giant Heart Balloon', 95, { k: 'heart', c: 1 }, {
    dAr: 'بالون قلب بحجم ٩٠ سم مع وزن مزين.', dEn: 'A 90 cm heart balloon with a decorated weight.',
    occasions: ['anniversary', 'engagement', 'getwell'], recipients: ['wife', 'husband', 'mother', 'sister'], badge: 'sameday', leadHours: 2,
  }),
  p('balloons', 'farha', 'بالونات مرحباً بالمولود', 'Baby Welcome Balloons', 165, { k: 'cluster', c: 3 }, {
    dAr: 'بالونات باستيل مع بالون "أهلاً بالمولود" الشفاف.', dEn: 'Pastel balloons with a clear "Welcome baby" bubble balloon.',
    occasions: ['newborn'], variants: [V.balloonCount()], personalize: { ar: 'اسم المولود', en: 'Baby name' },
  }),
  p('balloons', 'sahra', 'بالونات التخرج الخضراء', 'Green Graduation Balloons', 155, { k: 'cluster', c: 0 }, {
    dAr: 'بالونات أخضر داكن وذهبي مع بالون قبعة التخرج.', dEn: 'Deep green and gold balloons with a grad-cap foil.',
    occasions: ['graduation', 'national', 'promotion'], variants: [V.balloonCount()],
  }),
  p('balloons', 'farha', 'صندوق مفاجأة البالونات', 'Balloon Surprise Box', 230, { k: 'giftbox', c: 1, n: 'b' }, {
    dAr: 'صندوق كبير يفتح وتطير منه البالونات مع رسالتك.', dEn: 'A big box that opens to release balloons carrying your message.',
    occasions: ['birthday', 'anniversary', 'engagement', 'graduation'], personalize: { ar: 'رسالة على البالون', en: 'Balloon message' }, badge: 'new',
  }),
  p('balloons', 'sahra', 'أرقام فضية وكريمية', 'Silver & Cream Numbers', 135, { k: 'number', c: 4, n: '40' }, {
    dAr: 'أرقام فويل بلون الشامبين مع بالونات صغيرة.', dEn: 'Champagne foil numbers with mini balloons.',
    occasions: ['birthday', 'anniversary'], personalize: { ar: 'الرقم', en: 'Number' },
  }),

  /* ---------------- DECORATION ---------------- */
  p('decoration', 'sahra', 'قوس بالونات الاستقبال', 'Welcome Balloon Arch', 690, { k: 'arch', c: 1 }, {
    dAr: 'قوس عضوي بطول ٣ أمتار مع ورد صناعي فاخر، يشمل التركيب.', dEn: 'A 3 m organic arch with premium faux florals, installation included.',
    occasions: ['birthday', 'engagement', 'newborn', 'graduation'], variants: [V.setup()], leadHours: 48, badge: 'best',
  }),
  p('decoration', 'sahra', 'جلسة الملكة', 'Milka Night Setup', 1450, { k: 'table', c: 2 }, {
    dAr: 'تنسيق جلسة ملكة كاملة: طاولة، ورد، شموع، ولوحة ترحيب بالأسماء.', dEn: 'A full milka setup: table, florals, candles and a welcome sign with names.',
    occasions: ['engagement', 'wedding'], variants: [V.setup()], leadHours: 72, personalize: { ar: 'أسماء العروسين', en: 'Couple names' }, badge: 'limited',
  }),
  p('decoration', 'sahra', 'فوانيس رمضان', 'Ramadan Lantern Set', 380, { k: 'lantern', c: 4 }, {
    dAr: 'ثلاثة فوانيس نحاسية مع إضاءة دافئة وفرش طاولة.', dEn: 'Three brass lanterns with warm lights and a table runner.',
    occasions: ['ramadan', 'eid', 'newhome'], recipients: ['mother', 'father', 'team', 'friend'], leadHours: 24,
  }),
  p('decoration', 'farha', 'زاوية عيد الميلاد', 'Birthday Corner', 520, { k: 'arch', c: 3 }, {
    dAr: 'خلفية، بالونات، ولافتة باسم صاحب المناسبة.', dEn: 'Backdrop, balloons and a banner with the guest of honour\'s name.',
    occasions: ['birthday'], recipients: ['child', 'wife', 'friend', 'sister', 'mother'], variants: [V.setup()], leadHours: 24,
    personalize: { ar: 'الاسم على اللافتة', en: 'Banner name' },
  }),
  p('decoration', 'sahra', 'طاولة تخرج أنيقة', 'Graduation Table', 760, { k: 'table', c: 0 }, {
    dAr: 'طاولة استقبال بالأخضر والذهبي مع حامل كب كيك ولوحة تهنئة.', dEn: 'A green-and-gold welcome table with cupcake stand and congratulations board.',
    occasions: ['graduation', 'promotion'], variants: [V.setup()], leadHours: 48, personalize: { ar: 'الاسم', en: 'Name' },
  }),
  p('decoration', 'sahra', 'تنسيق اليوم الوطني', 'National Day Décor', 440, { k: 'lantern', c: 0 }, {
    dAr: 'أعلام، بالونات خضراء، وتنسيق مدخل للمكاتب والبيوت.', dEn: 'Flags, green balloons and entrance styling for homes and offices.',
    occasions: ['national'], recipients: ['team', 'colleague', 'father', 'mother'], variants: [V.setup()], leadHours: 24,
  }),
  p('decoration', 'farha', 'تنسيق استقبال المولود', 'Baby Welcome Setup', 610, { k: 'arch', c: 2 }, {
    dAr: 'قوس صغير، لوحة اسم المولود، وتوزيعات للضيوف في المستشفى أو البيت.', dEn: 'Mini arch, baby name board and guest favours — at hospital or home.',
    occasions: ['newborn'], variants: [V.setup()], leadHours: 24, personalize: { ar: 'اسم المولود', en: 'Baby name' },
  }),

  /* ---------------- GIFTS ---------------- */
  p('gifts', 'oudbox', 'صندوق العود الملكي', 'Royal Oud Box', 590, { k: 'giftbox', c: 0 }, {
    dAr: 'دهن عود كمبودي ١٢ مل، مبخرة سيراميك، وبخور معطر.', dEn: '12 ml Cambodian oud oil, ceramic burner and scented bukhoor.',
    occasions: ['eid', 'promotion', 'wedding', 'thanks', 'newhome'], recipients: ['father', 'husband', 'colleague', 'mother'], badge: 'best', leadHours: 2,
  }),
  p('gifts', 'oudbox', 'عطر ورد الطائف', 'Taif Rose Perfume', 340, { k: 'perfume', c: 1 }, {
    dAr: 'عطر بخلاصة ورد الطائف والمسك الأبيض.', dEn: 'Eau de parfum with Taif rose essence and white musk.',
    occasions: ['birthday', 'anniversary', 'eid', 'thanks'], recipients: FEM, variants: [V.volume()], badge: 'best', leadHours: 2,
  }),
  p('gifts', 'oudbox', 'عطر ليالي نجد', 'Najd Nights Perfume', 380, { k: 'perfume', c: 0 }, {
    dAr: 'عطر خشبي بالعود والعنبر والزعفران.', dEn: 'A woody scent of oud, amber and saffron.',
    occasions: ['birthday', 'eid', 'promotion', 'anniversary'], recipients: ['husband', 'father', 'friend'], variants: [V.volume()],
  }),
  p('gifts', 'reem', 'شمعة البيت الجديد', 'New Home Candle', 135, { k: 'candle', c: 2 }, {
    dAr: 'شمعة صويا بعطر الياسمين والعود في وعاء حجري.', dEn: 'Soy candle scented with jasmine and oud in a stone vessel.',
    occasions: ['newhome', 'thanks', 'getwell', 'birthday'], badge: 'sameday', leadHours: 2,
  }),
  p('gifts', 'najd', 'سلة القهوة السعودية', 'Saudi Coffee Hamper', 275, { k: 'giftbox', c: 4 }, {
    dAr: 'بن خولاني، هيل، دلة صغيرة وفناجين مع تمر.', dEn: 'Khawlani coffee, cardamom, a small dallah, cups and dates.',
    occasions: ['ramadan', 'eid', 'newhome', 'thanks'], recipients: ['father', 'mother', 'colleague', 'team'], badge: 'new',
  }),
  p('gifts', 'batla', 'صندوق العناية', 'Self-care Box', 260, { k: 'giftbox', c: 3 }, {
    dAr: 'زيوت استحمام، شمعة، ومناشف قطنية في صندوق وردي.', dEn: 'Bath oils, a candle and cotton towels in a blush box.',
    occasions: ['getwell', 'birthday', 'thanks', 'newborn'], recipients: FEM,
  }),
  p('gifts', 'oudbox', 'بخور المجلس', 'Majlis Bukhoor Set', 165, { k: 'candle', c: 4 }, {
    dAr: 'ثلاث علب بخور معطر مع فحم سريع الاشتعال.', dEn: 'Three tins of scented bukhoor with quick-light charcoal.',
    occasions: ['ramadan', 'eid', 'newhome', 'wedding'], recipients: ['mother', 'father', 'team'], leadHours: 2,
  }),
  p('gifts', 'oudbox', 'هدية الموظف المثالي', 'Star Colleague Kit', 199, { k: 'giftbox', c: 2 }, {
    dAr: 'مفكرة جلدية، قلم، وعطر جيب في صندوق أنيق.', dEn: 'Leather notebook, pen and a pocket perfume in a sleek box.',
    occasions: ['promotion', 'thanks', 'graduation'], recipients: ['colleague', 'team', 'friend'],
  }),

  /* ---------------- DESSERTS ---------------- */
  p('desserts', 'qamariya', 'ماكرون قمرية (١٢)', 'Qamariya Macarons (12)', 115, { k: 'macarons', c: 1 }, {
    dAr: 'ماكرون فرنسي بنكهات الورد، الفستق، والزعفران.', dEn: 'French macarons in rose, pistachio and saffron.',
    occasions: ['birthday', 'thanks', 'engagement', 'newborn'], badge: 'best', leadHours: 4,
  }),
  p('desserts', 'haladar', 'كنافة نابلسية بالجبن', 'Nabulsi Cheese Kunafa', 135, { k: 'kunafa', c: 4 }, {
    dAr: 'كنافة طازجة بالجبن العكاوي والقطر، تصل ساخنة.', dEn: 'Fresh kunafa with akkawi cheese and syrup, delivered warm.',
    occasions: ['ramadan', 'eid', 'thanks', 'newhome'], recipients: ['mother', 'father', 'team', 'friend'], variants: [V.tray()], leadHours: 2, badge: 'sameday',
  }),
  p('desserts', 'haladar', 'معمول العيد', 'Eid Maamoul', 150, { k: 'cookies', c: 4 }, {
    dAr: 'معمول بالتمر والفستق والجوز، مخبوز يومياً.', dEn: 'Maamoul with dates, pistachio and walnut, baked daily.',
    occasions: ['eid', 'ramadan'], variants: [V.tray()], badge: 'best',
  }),
  p('desserts', 'sukkar', 'كوكيز لمّة', 'Lamma Cookie Box', 89, { k: 'cookies', c: 1 }, {
    dAr: '٩ كوكيز محشوة: لوتس، نوتيلا، وشوكولاتة بيضاء بالتوت.', dEn: '9 stuffed cookies: Lotus, Nutella and white-choc berry.',
    occasions: ['birthday', 'thanks', 'getwell'], recipients: ['child', 'friend', 'colleague', 'team'], leadHours: 3, badge: 'sameday',
  }),
  p('desserts', 'qamariya', 'تارت الفواكه', 'Fruit Tart', 175, { k: 'cake', c: 3, n: 't' }, {
    dAr: 'تارت كاسترد فانيلا بالفواكه الموسمية.', dEn: 'Vanilla custard tart with seasonal fruit.',
    occasions: ['thanks', 'newhome', 'birthday'], leadHours: 12,
  }),
  p('desserts', 'batla', 'ماكرون الورد', 'Rose Macaron Tower', 230, { k: 'macarons', c: 3 }, {
    dAr: 'برج ماكرون ٢٤ قطعة مع ورد طبيعي.', dEn: 'A 24-piece macaron tower with fresh roses.',
    occasions: ['engagement', 'wedding', 'birthday', 'newborn'], recipients: FEM, leadHours: 12, badge: 'new',
  }),
  p('desserts', 'haladar', 'بسبوسة بالقشطة', 'Cream Basbousa', 95, { k: 'kunafa', c: 2 }, {
    dAr: 'بسبوسة ناعمة محشية بالقشطة ومزينة بالفستق.', dEn: 'Soft basbousa filled with qishta and topped with pistachio.',
    occasions: ['ramadan', 'eid', 'thanks', 'getwell'], variants: [V.tray()], leadHours: 3,
  }),
  p('desserts', 'sukkar', 'صينية حلا الضيافة', 'Hospitality Dessert Tray', 290, { k: 'cupcakes', c: 4 }, {
    dAr: 'تشكيلة حلا صغيرة: تشيز كيك، تارت، وبراونيز لـ ٢٠ شخص.', dEn: 'Mini cheesecakes, tarts and brownies for 20 guests.',
    occasions: ['newhome', 'graduation', 'promotion', 'newborn', 'thanks'], recipients: ['team', 'mother', 'friend'], leadHours: 24,
  }),

  /* ---------------- CUSTOM ---------------- */
  p('custom', 'naqsh', 'صندوق ذكرياتنا المحفور', 'Engraved Memory Box', 245, { k: 'engraved', c: 4 }, {
    dAr: 'صندوق خشب جوز محفور بالأسماء والتاريخ، لحفظ الرسائل والصور.', dEn: 'A walnut box engraved with names and a date, for letters and photos.',
    occasions: ['anniversary', 'wedding', 'engagement', 'newborn'], variants: [V.material()], leadHours: 48, badge: 'best',
    personalize: { ar: 'الأسماء والتاريخ', en: 'Names & date' },
  }),
  p('custom', 'naqsh', 'كوب باسمك', 'Name Mug', 79, { k: 'mug', c: 0 }, {
    dAr: 'كوب سيراميك مطفي مع الاسم بخط عربي أنيق.', dEn: 'Matte ceramic mug with a name in elegant Arabic calligraphy.',
    occasions: ['birthday', 'thanks', 'promotion', 'graduation'], recipients: ['friend', 'colleague', 'team', 'sister', 'father'],
    personalize: { ar: 'الاسم على الكوب', en: 'Name on mug' }, leadHours: 24,
  }),
  p('custom', 'naqsh', 'إطار صورة محفور', 'Engraved Photo Frame', 165, { k: 'frame', c: 2 }, {
    dAr: 'إطار خشبي مع عبارة محفورة بالليزر.', dEn: 'A wooden frame with a laser-engraved message.',
    occasions: ['anniversary', 'graduation', 'newborn', 'wedding', 'thanks'], variants: [V.material()],
    personalize: { ar: 'العبارة المحفورة', en: 'Engraved message' }, leadHours: 48,
  }),
  p('custom', 'oudbox', 'عطر بملصق شخصي', 'Personal Label Perfume', 295, { k: 'perfume', c: 2 }, {
    dAr: 'عطر من اختيارك مع زجاجة محفور عليها الاسم.', dEn: 'Your chosen scent in a bottle engraved with their name.',
    occasions: ['birthday', 'anniversary', 'graduation', 'eid'], variants: [V.volume()],
    personalize: { ar: 'الاسم على الزجاجة', en: 'Name on bottle' }, leadHours: 24, badge: 'new',
  }),
  p('custom', 'naqsh', 'محفظة جلد بالأحرف', 'Initials Leather Wallet', 210, { k: 'engraved', c: 0 }, {
    dAr: 'محفظة جلد طبيعي مع الأحرف الأولى محفورة.', dEn: 'Genuine leather wallet with debossed initials.',
    occasions: ['birthday', 'graduation', 'promotion', 'eid'], recipients: ['husband', 'father', 'friend', 'colleague'],
    personalize: { ar: 'الأحرف الأولى', en: 'Initials' }, leadHours: 48,
  }),
  p('custom', 'naqsh', 'كوب مولودنا', 'Baby Name Mug Set', 125, { k: 'mug', c: 3 }, {
    dAr: 'كوبان للأم والأب مع اسم المولود وتاريخ الولادة.', dEn: 'Two mugs for mum and dad with baby\'s name and birth date.',
    occasions: ['newborn'], recipients: ['mother', 'father', 'sister', 'friend'],
    personalize: { ar: 'اسم المولود والتاريخ', en: 'Baby name & date' }, leadHours: 24,
  }),
  p('custom', 'naqsh', 'لوحة خط عربي مخصصة', 'Custom Calligraphy Art', 385, { k: 'frame', c: 0 }, {
    dAr: 'لوحة خط عربي يدوية بالاسم أو بيت شعر تختاره.', dEn: 'A hand-lettered Arabic calligraphy piece with a name or verse you choose.',
    occasions: ['newhome', 'wedding', 'graduation', 'promotion'], personalize: { ar: 'النص المطلوب', en: 'Text' }, leadHours: 72, badge: 'limited',
  }),
  p('custom', 'oudbox', 'صندوق عيدية مخصص', 'Custom Eidiya Box', 155, { k: 'giftbox', c: 2, n: 'e' }, {
    dAr: 'صندوق عيدية باسم الطفل مع حلويات وظروف مزخرفة.', dEn: 'An eidiya box with the child\'s name, sweets and decorated envelopes.',
    occasions: ['eid'], recipients: ['child', 'sister', 'friend'], personalize: { ar: 'اسم الطفل', en: 'Child name' }, badge: 'new',
  }),

  /* ---------------- extra mix ---------------- */
  p('flowers', 'reem', 'باقة شكراً من القلب', 'Heartfelt Thanks Bouquet', 199, { k: 'bouquet', c: 0 }, {
    dAr: 'تنسيق أبيض وأخضر بسيط للتعبير عن الامتنان.', dEn: 'A simple white-and-green arrangement to say thank you.',
    occasions: ['thanks', 'promotion', 'getwell', 'graduation'], recipients: ALL_R, variants: [V.wrap()], badge: 'sameday', leadHours: 2,
  }),
  p('cakes', 'qamariya', 'ميني كيك الفستق', 'Pistachio Mini Cake', 145, { k: 'drip', c: 2 }, {
    dAr: 'كيكة صغيرة لشخصين بالفستق وماء الورد.', dEn: 'A small cake for two with pistachio and rosewater.',
    occasions: ['anniversary', 'birthday', 'thanks'], leadHours: 6, badge: 'new',
  }),
  p('balloons', 'farha', 'بالونات اليوم الوطني', 'National Day Balloons', 110, { k: 'cluster', c: 0, n: 'n' }, {
    dAr: 'بالونات خضراء وبيضاء مع بالون السيف والنخلة.', dEn: 'Green and white balloons with a palm-and-swords foil.',
    occasions: ['national'], variants: [V.balloonCount()], badge: 'limited',
  }),
  p('gifts', 'batla', 'صندوق الأمومة', 'New Mum Box', 315, { k: 'giftbox', c: 3, n: 'm' }, {
    dAr: 'هدايا للأم والمولود: بطانية قطن، شمعة، وكريمات طبيعية.', dEn: 'For mum and baby: cotton blanket, candle and natural creams.',
    occasions: ['newborn'], recipients: ['mother', 'sister', 'friend', 'wife'], badge: 'best',
  }),
  p('desserts', 'haladar', 'صينية المعمول والقهوة', 'Maamoul & Coffee Tray', 210, { k: 'dates', c: 4 }, {
    dAr: 'معمول، تمر، وقهوة سعودية جاهزة للضيافة.', dEn: 'Maamoul, dates and Saudi coffee, ready for guests.',
    occasions: ['eid', 'ramadan', 'newhome', 'newborn'], recipients: ['mother', 'father', 'team'], variants: [V.tray()],
  }),
  p('chocolate', 'najd', 'شوكولاتة التخرج', 'Graduation Chocolates', 175, { k: 'pralines', c: 0 }, {
    dAr: 'برالين بقبعات التخرج الذهبية وكرت تهنئة.', dEn: 'Pralines topped with gold grad caps and a greeting card.',
    occasions: ['graduation', 'promotion'], variants: [V.pieces(16)],
  }),
]

/* ---------- Real photography products (images supplied by LAMMA; merchants & prices fictional) ---------- */
let pseq = 0
function ph(
  cat: CategoryId, merchant: string, ar: string, en: string, price: number, img: string, art: Omit<Art, 'img'>,
  o: Partial<Omit<Product, 'id' | 'cat' | 'merchant' | 'name' | 'price' | 'art'>> & { dAr: string; dEn: string },
): Product {
  pseq++
  const { dAr, dEn, ...rest } = o
  return {
    id: `ph${String(pseq).padStart(2, '0')}`, cat, merchant, name: { ar, en }, price, art: { ...art, img },
    desc: { ar: dAr, en: dEn },
    rating: +(4.6 + ((pseq * 3) % 4) / 10).toFixed(1), reviews: 80 + ((pseq * 131) % 520), stock: 6 + ((pseq * 17) % 30),
    leadHours: 3, occasions: [], recipients: ALL_R, variants: [], created: 200 - pseq, ...rest,
  }
}
const W: 'contain' = 'contain'
const WRAP: VariantGroup = { key: 'wrap', label: { ar: 'التغليف', en: 'Gift wrap' }, options: [
  { id: 'std', label: { ar: 'تغليف لمّة', en: 'Lamma wrap' }, delta: 0 },
  { id: 'box', label: { ar: 'صندوق هدية فاخر', en: 'Premium gift box' }, delta: 30 },
] }
const STRAP: VariantGroup = { key: 'strap', label: { ar: 'السوار', en: 'Strap' }, options: [
  { id: 'brown', label: { ar: 'جلد بني', en: 'Brown leather' }, delta: 0 },
  { id: 'black', label: { ar: 'جلد أسود', en: 'Black leather' }, delta: 0 },
  { id: 'mesh', label: { ar: 'معدن شبكي', en: 'Steel mesh' }, delta: 80 },
] }

export const PHOTO_PRODUCTS: Product[] = [
  ph('flowers', 'reem', 'باقة ربيع الرياض', 'Riyadh Spring Bouquet', 345, 'flowers-spring-pastel', { k: 'bouquet', c: 1 }, {
    dAr: 'جوري وردي وقرنفل بلون الخوخ مع أوكالبتوس فضي، بتغليف كرافت ناعم وشريطة ساتان.', dEn: 'Blush roses and peach carnations with silver eucalyptus, in soft kraft wrap with a satin ribbon.',
    occasions: ['birthday', 'thanks', 'getwell', 'anniversary', 'newborn'], recipients: FEM, variants: [V.flowerSize(), V.wrap()], badge: 'best' }),
  ph('flowers', 'batla', 'باقة الفوشيا الملكية', 'Royal Fuchsia Bouquet', 465, 'flowers-royal-fuchsia', { k: 'bouquet', c: 3 }, {
    dAr: 'باقة وافرة من الجوري الفوشي والقرمزي والأرجواني، ملفوفة بورق لؤلؤي وشريطة ليلكية.', dEn: 'A lavish bouquet of fuchsia, crimson and plum roses in pearl wrap with a lilac ribbon.',
    occasions: ['anniversary', 'engagement', 'birthday', 'wedding'], recipients: ['wife', 'mother', 'sister', 'friend'], variants: [V.flowerSize()], badge: 'new' }),
  ph('flowers', 'reem', 'صندوق الأقحوان الوردي', 'Blush Chrysanthemum Box', 285, 'flowers-pink-chrysanthemum-box', { k: 'rosebox', c: 1 }, {
    dAr: 'أقحوان وجوري وردي في صندوق أبيض أنيق مع غلاف أخضر شفاف.', dEn: 'Pink chrysanthemums and roses in an elegant white box with a sheer green wrap.',
    occasions: ['birthday', 'thanks', 'getwell', 'newborn'], variants: [V.flowerSize()], badge: 'sameday', leadHours: 2 }),
  ph('flowers', 'batla', 'باقة الخوخ والجوري', 'Peach Rose Bouquet', 375, 'flowers-peach-roses', { k: 'bouquet', c: 4 }, {
    dAr: '٣٠ وردة جوري بلون الخوخ مع لمسات لافندر، بتغليف كرافت متدرج.', dEn: 'Thirty peach roses with touches of lavender in layered kraft wrap.',
    occasions: ['anniversary', 'birthday', 'engagement', 'thanks'], recipients: FEM, variants: [V.flowerSize(), V.wrap()], badge: 'best' }),
  ph('flowers', 'reem', 'تنسيق حديقة الربيع', 'Spring Garden Vase', 690, 'flowers-garden-vase', { k: 'vase', c: 2 }, {
    dAr: 'تنسيق كبير من الزنبق والجوري والكاميليا في مزهرية خزفية منقوشة تبقى زينة للبيت.', dEn: 'A grand arrangement of lilies, roses and camellias in a patterned ceramic vase that stays as décor.',
    occasions: ['newhome', 'wedding', 'promotion', 'anniversary', 'thanks'], variants: [V.flowerSize()], badge: 'limited', leadHours: 6, stock: 4 }),
  ph('flowers', 'batla', 'تنسيق الكريستال البنفسجي', 'Violet Crystal Arrangement', 620, 'flowers-crystal-violet', { k: 'vase', c: 1 }, {
    dAr: 'ليسيانثوس بنفسجي وزنبق أبيض وجوري في مزهرية كريستال على قاعدة.', dEn: 'Violet lisianthus, white lilies and roses in a footed crystal vase.',
    occasions: ['wedding', 'newhome', 'promotion', 'thanks'], variants: [V.flowerSize()], leadHours: 6 }),
  ph('flowers', 'reem', 'صندوق الجوري الأحمر', 'Red Rose Box', 285, 'flowers-red-roses-box', { k: 'rosebox', c: 3 }, {
    dAr: 'جوري أحمر مع أوكالبتوس في صندوق أبيض وغلاف أخضر، رسالة حب كلاسيكية.', dEn: 'Red roses with eucalyptus in a white box and green wrap — a classic love note.',
    occasions: ['anniversary', 'engagement', 'birthday'], recipients: ['wife', 'husband', 'mother'], variants: [V.flowerSize()], badge: 'sameday', leadHours: 2 }),
  ph('flowers', 'batla', 'باقة الجوري الوردي', 'Pink Spray Rose Bouquet', 299, 'flowers-pink-spray-roses', { k: 'bouquet', c: 1 }, {
    dAr: 'جوري وردي متعدد الرؤوس مع زهور السوليداجو الذهبية، بغلاف أبيض شفاف وشريطة وردية.', dEn: 'Pink spray roses with golden solidago in sheer white wrap and a pink ribbon.',
    occasions: ['birthday', 'thanks', 'newborn', 'getwell'], recipients: FEM, variants: [V.flowerSize(), V.wrap()], badge: 'new' }),

  ph('cakes', 'qamariya', 'كيكة حديقة الورد', 'Rose Garden Cake', 310, 'cake-floral-macaron', { k: 'drip', c: 1 }, {
    dAr: 'كيكة فانيلا بكريمة الزبدة، متدرجة باللافندر ومزينة بورود كريمية وماكرون.', dEn: 'Vanilla buttercream cake in a lavender ombré, crowned with piped roses and a macaron.',
    occasions: ['birthday', 'engagement', 'newborn', 'anniversary'], variants: [V.cakeSize(), V.flavor()], leadHours: 24, badge: 'best',
    personalize: { ar: 'عبارة على الكيكة', en: 'Message on cake' } }),
  ph('cakes', 'qamariya', 'كيكة القلب المخملي', 'Red Velvet Heart', 245, 'cake-red-velvet-heart', { k: 'drip', c: 3 }, {
    dAr: 'قلب ريد فيلفت بطبقات كريمة الجبن، مغطى بمخمل أحمر على قاعدة خشبية.', dEn: 'A red velvet heart layered with cream cheese, finished in red velvet spray on a wooden board.',
    occasions: ['anniversary', 'engagement', 'birthday'], recipients: ['wife', 'husband', 'friend', 'sister'], leadHours: 12, badge: 'new' }),
  ph('cakes', 'sukkar', 'كيكة الشوكولاتة اللامعة', 'Chocolate Mirror Cake', 260, 'cake-chocolate-glaze', { k: 'drip', c: 4, fit: W }, {
    dAr: 'موس شوكولاتة داكنة بطبقة مرآة لامعة وتاج من لفائف الشوكولاتة.', dEn: 'Dark chocolate mousse with a mirror glaze and a crown of chocolate curls.',
    occasions: ['birthday', 'promotion', 'thanks', 'graduation'], recipients: ['father', 'husband', 'friend', 'colleague', 'team'], variants: [V.cakeSize()], leadHours: 12 }),
  ph('cakes', 'sukkar', 'كيكة موس التوت الأحمر', 'Red Berry Mousse Cake', 255, 'cake-red-mousse', { k: 'drip', c: 3, fit: W }, {
    dAr: 'موس توت أحمر مخملي مزين بقطع شوكولاتة بيضاء وصلصة الفراولة.', dEn: 'Velvety red berry mousse dressed with white chocolate shards and strawberry coulis.',
    occasions: ['birthday', 'anniversary', 'thanks', 'engagement'], variants: [V.cakeSize()], leadHours: 12 }),

  ph('balloons', 'farha', 'باقة بالونات الشامبين الوردي', 'Blush Champagne Balloons', 185, 'balloons-blush-champagne', { k: 'cluster', c: 1, fit: W }, {
    dAr: 'بالونات هيليوم بدرجات الوردي والنود والروز جولد اللامع.', dEn: 'Helium balloons in blush, nude and glossy rose gold.',
    occasions: ['birthday', 'engagement', 'newborn', 'graduation', 'anniversary'], variants: [V.balloonCount()], badge: 'best' }),
  ph('balloons', 'farha', 'باقة بالونات الليلك والكونفيتي', 'Lilac Confetti Balloons', 199, 'balloons-lilac-confetti', { k: 'cluster', c: 3, fit: W }, {
    dAr: 'بالونات ليلكية ونود مع بالونات شفافة مليئة بالكونفيتي الفضي.', dEn: 'Lilac and nude balloons with clear balloons full of silver confetti.',
    occasions: ['birthday', 'newborn', 'graduation'], variants: [V.balloonCount()], badge: 'new' }),

  ph('chocolate', 'najd', 'صندوق الضيافة الملكي', 'Royal Hospitality Chest', 890, 'choc-hospitality-chest', { k: 'pralines', c: 2, fit: W }, {
    dAr: 'صندوق عرض فاخر بإطار ذهبي يضم تشكيلة واسعة من الشوكولاتة المغلفة بألوان متناسقة.', dEn: 'A gold-trimmed display chest holding a wide assortment of individually wrapped chocolates.',
    occasions: ['eid', 'ramadan', 'wedding', 'newhome', 'promotion'], recipients: ['mother', 'father', 'team', 'colleague'], badge: 'limited', stock: 5 }),
  ph('chocolate', 'najd', 'علبة المرجان', 'Coral Signature Box', 245, 'choc-coral-box', { k: 'pralines', c: 1, fit: W }, {
    dAr: 'علبة مرجانية بنقوش منحنية تضم برالين مشكّل بالحليب والداكن.', dEn: 'A coral box with curved motifs, filled with assorted milk and dark pralines.',
    occasions: ['birthday', 'thanks', 'anniversary'], variants: [V.pieces(16)] }),
  ph('chocolate', 'najd', 'علبة الفيروز', 'Turquoise Signature Box', 245, 'choc-teal-box', { k: 'pralines', c: 0, fit: W }, {
    dAr: 'علبة فيروزية أنيقة بتشكيلة برالين محشو بالمكسرات والكراميل.', dEn: 'An elegant turquoise box of nut- and caramel-filled pralines.',
    occasions: ['eid', 'thanks', 'promotion', 'newhome'], variants: [V.pieces(16)], badge: 'best' }),
  ph('chocolate', 'najd', 'علبة النعناع الصغيرة', 'Mint Petite Box', 135, 'choc-green-gift-box', { k: 'pralines', c: 0, fit: W }, {
    dAr: 'علبة هدية صغيرة بلون النعناع، لمسة لطيفة لأي زيارة.', dEn: 'A petite mint-green gift box — a sweet touch for any visit.',
    occasions: ['thanks', 'getwell', 'birthday', 'eid'], badge: 'sameday', leadHours: 2 }),
  ph('chocolate', 'najd', 'كيس البرالين الصغير', 'Praline Mini Pouch', 59, 'choc-mini-pouch', { k: 'pralines', c: 0, fit: W }, {
    dAr: 'كيس صغير من البرالين المغلف، مثالي كتوزيعات وهدايا ضيافة.', dEn: 'A small pouch of wrapped pralines — perfect as favours and hospitality gifts.',
    occasions: ['thanks', 'eid', 'newborn', 'ramadan'], recipients: ['team', 'colleague', 'friend', 'child'], leadHours: 2 }),
  ph('chocolate', 'haladar', 'صندوق التشكيلة البلجيكية', 'Belgian Assortment Box', 215, 'choc-belgian-assorted', { k: 'pralines', c: 4, fit: W }, {
    dAr: 'صندوق أبيض مغناطيسي بتشكيلة شوكولاتة بلجيكية داكنة وبالحليب.', dEn: 'A white magnetic box of Belgian dark and milk chocolates.',
    occasions: ['thanks', 'promotion', 'eid', 'ramadan', 'birthday'], variants: [V.pieces(12)] }),
  ph('chocolate', 'haladar', 'صندوق الورد والشوكولاتة', 'Roses & Chocolate Keepsake', 420, 'choc-roses-black-box', { k: 'pralines', c: 3, fit: W }, {
    dAr: 'صندوق أسود فاخر يجمع ورداً محفوظاً وقطع شوكولاتة، مربوط بشريطة.', dEn: 'A luxe black box pairing preserved roses with chocolates, tied with ribbon.',
    occasions: ['anniversary', 'engagement', 'eid', 'wedding'], recipients: ['wife', 'mother', 'sister', 'husband'], badge: 'best' }),

  ph('gifts', 'batla', 'لمّة عيد الميلاد', 'Birthday Lamma Set', 520, 'bundle-birthday', { k: 'giftbox', c: 1, pos: '66% 55%' }, {
    dAr: 'مجموعة متكاملة: جوري ليلكي في مزهرية «عيد ميلاد سعيد»، دبدوب ناعم، وميني كيكة بتوبر.', dEn: 'A complete set: lilac roses in a "Happy Birthday" vase, a soft teddy and a mini cake with topper.',
    occasions: ['birthday'], recipients: ['wife', 'sister', 'friend', 'child', 'mother'], badge: 'new', leadHours: 6 }),

  /* ---------- Kids & Toys (age-labelled) ---------- */
  ph('kids', 'numu', 'أرنوب القطن الناعم', 'Cotton Soft Bunny', 129, 'kid-plush-bunny', { k: 'giftbox', c: 1 }, {
    dAr: 'أرنب محشو بفرو ناعم جداً وشريطة ساتان، آمن من عمر الولادة ومناسب للنوم.', dEn: 'An ultra-soft plush bunny with a satin bow — safe from birth and perfect for bedtime.',
    occasions: ['newborn', 'birthday', 'getwell'], recipients: ['child', 'baby'], ages: ['baby', 'toddler', 'kids'], interests: ['pretend'], badge: 'best', variants: [WRAP] }),
  ph('kids', 'numu', 'صندوق الأشكال الخشبي', 'Wooden Shape Sorter', 165, 'kid-shape-sorter', { k: 'giftbox', c: 2 }, {
    dAr: 'لعبة مونتيسوري من خشب الزان بألوان هادئة، تنمّي التركيز وتمييز الأشكال (١–٣ سنوات).', dEn: 'A Montessori beech-wood sorter in calm pastels that builds focus and shape recognition (ages 1–3).',
    occasions: ['birthday', 'newborn', 'eid'], recipients: ['child'], ages: ['toddler'], interests: ['building', 'science'], variants: [WRAP] }),
  ph('kids', 'numu', 'مكعبات البناء الملوّنة', 'Colour Building Bricks', 219, 'kid-building-blocks', { k: 'giftbox', c: 0 }, {
    dAr: 'أكثر من ٣٠٠ قطعة بناء مع صندوق تخزين قماشي، تطلق خيال المهندس الصغير (٦+ سنوات).', dEn: '300+ building bricks with a fabric storage box to spark little engineers (ages 6+).',
    occasions: ['birthday', 'eid', 'graduation'], recipients: ['child'], ages: ['kids', 'tween'], interests: ['building'], badge: 'best', variants: [WRAP] }),
  ph('kids', 'numu', 'دمية لين القماشية', 'Leen Fabric Doll', 149, 'kid-fabric-doll', { k: 'giftbox', c: 3 }, {
    dAr: 'دمية مصنوعة يدوياً بشعر صوف وفستان كتان أخضر، رفيقة اللعب التخيلي (٣+ سنوات).', dEn: 'A handmade doll with wool hair and a sage linen dress — a companion for pretend play (ages 3+).',
    occasions: ['birthday', 'eid', 'getwell'], recipients: ['child'], ages: ['toddler', 'kids'], interests: ['pretend'], variants: [WRAP] }),
  ph('kids', 'numu', 'سيارات خشبية مع كراج', 'Wooden Cars & Garage', 179, 'kid-wooden-cars', { k: 'giftbox', c: 2 }, {
    dAr: 'ثلاث سيارات خشبية بألوان هادئة مع كراج بثلاثة أبواب (٢+ سنوات).', dEn: 'Three wooden cars in muted colours with a three-bay garage (ages 2+).',
    occasions: ['birthday', 'eid'], recipients: ['child'], ages: ['toddler', 'kids'], interests: ['cars', 'pretend'], badge: 'new', variants: [WRAP] }),
  ph('kids', 'numu', 'مختبر العلوم الصغير', 'Junior Science Lab', 289, 'kid-science-kit', { k: 'giftbox', c: 0 }, {
    dAr: 'مجهر حقيقي للطلاب مع شرائح وأنابيب اختبار وعدسة مكبرة، لاكتشاف العالم الصغير (٨+ سنوات).', dEn: 'A real student microscope with slides, test tubes and a magnifier to explore the tiny world (ages 8+).',
    occasions: ['birthday', 'graduation', 'promotion', 'eid'], recipients: ['child'], ages: ['tween', 'teen'], interests: ['science'], badge: 'best', variants: [WRAP] }),
  ph('kids', 'numu', 'حقيبة الفنان الصغير', 'Little Artist Case', 159, 'kid-art-kit', { k: 'giftbox', c: 2 }, {
    dAr: 'حقيبة خشبية فيها ألوان شمعية وخشبية ومائية وفرش — كل ما يحتاجه الرسام الصغير (٤+ سنوات).', dEn: 'A wooden case of crayons, pencils, watercolours and brushes — everything a young artist needs (ages 4+).',
    occasions: ['birthday', 'eid', 'getwell'], recipients: ['child'], ages: ['kids', 'tween'], interests: ['art'], variants: [WRAP] }),
  ph('kids', 'numu', 'سيارة الطرق الوعرة بالتحكم', 'Off-road RC Truck', 349, 'kid-rc-truck', { k: 'giftbox', c: 0 }, {
    dAr: 'شاحنة تحكم عن بعد بعجلات وعرة وإضاءة أمامية وبطارية قابلة للشحن (٨+ سنوات).', dEn: 'A remote-control truck with off-road tyres, headlights and a rechargeable battery (ages 8+).',
    occasions: ['birthday', 'eid', 'graduation'], recipients: ['child'], ages: ['tween', 'teen'], interests: ['cars', 'tech'], badge: 'new', variants: [WRAP] }),
  ph('kids', 'numu', 'بزل خريطة العالم الخشبي', 'Wooden World Map Puzzle', 139, 'kid-world-puzzle', { k: 'giftbox', c: 2 }, {
    dAr: 'بزل خشبي للقارات بحيوانات كل منطقة، يعلّم الجغرافيا باللعب (٥+ سنوات).', dEn: 'A wooden continents puzzle with regional animals — geography through play (ages 5+).',
    occasions: ['birthday', 'eid', 'graduation'], recipients: ['child'], ages: ['kids', 'tween'], interests: ['science', 'travel'], variants: [WRAP] }),
  /* Baby */
  ph('kids', 'mahd', 'سلة استقبال المولود', 'Newborn Welcome Basket', 395, 'baby-hamper', { k: 'giftbox', c: 3 }, {
    dAr: 'سلة خوص فيها بطانيات موسلين، كارديغان تريكو، جوارب صغيرة ودمية خروف ناعمة.', dEn: 'A woven basket with muslin swaddles, a knit cardigan, tiny socks and a soft lamb.',
    occasions: ['newborn'], recipients: ['baby', 'mother', 'sister', 'friend'], ages: ['baby'], interests: ['selfcare'], badge: 'best', extraCats: ['gifts'] }),
  ph('kids', 'mahd', 'طقم التريكو الناعم', 'Soft Knit Baby Set', 235, 'baby-knit-set', { k: 'giftbox', c: 2 }, {
    dAr: 'بطانية تريكو بلون الشوفان مع حذاء وطاقية مطابقة، قطن ناعم على البشرة.', dEn: 'An oatmeal knit blanket with matching booties and hat in skin-soft cotton.',
    occasions: ['newborn'], recipients: ['baby', 'mother', 'sister'], ages: ['baby'], variants: [WRAP] }),
  ph('kids', 'mahd', 'طقم الخشخيشة والعضاضة', 'Rattle & Teether Set', 119, 'baby-rattle-set', { k: 'giftbox', c: 0 }, {
    dAr: 'خشخيشة خشبية، عضاضة سيليكون آمنة، وحامل لهاية بخرز طبيعي.', dEn: 'A wooden rattle, a food-safe silicone teether and a beaded pacifier clip.',
    occasions: ['newborn'], recipients: ['baby', 'mother'], ages: ['baby'], badge: 'sameday', leadHours: 2 }),

  /* ---------- Beauty & Skincare ---------- */
  ph('beauty', 'rawnaq', 'طقم العناية الوردي', 'Rose Skincare Ritual', 365, 'beauty-skincare-set', { k: 'giftbox', c: 1 }, {
    dAr: 'سيروم، كريم مرطب، وتونر بخلاصة الورد في صندوق هدية بشريطة ساتان.', dEn: 'A rose-infused serum, moisturiser and toner in a ribboned gift box.',
    occasions: ['birthday', 'anniversary', 'thanks', 'eid', 'getwell'], recipients: ['mother', 'wife', 'sister', 'friend'], ages: ['teen', 'adult'], interests: ['beauty', 'selfcare'], badge: 'best', extraCats: ['gifts'] }),
  ph('beauty', 'rawnaq', 'باليت النود مع الفرش', 'Nude Palette & Brushes', 289, 'beauty-palette', { k: 'giftbox', c: 1 }, {
    dAr: 'باليت ظلال بعشر درجات نود ووردي مع سبع فرش بلون الروز جولد.', dEn: 'A ten-shade nude and rose palette with seven rose-gold brushes.',
    occasions: ['birthday', 'graduation', 'eid'], recipients: ['wife', 'sister', 'friend'], ages: ['teen', 'adult'], interests: ['beauty', 'style'], badge: 'new' }),
  ph('beauty', 'rawnaq', 'صينية السبا المنزلي', 'Home Spa Tray', 245, 'beauty-spa-set', { k: 'giftbox', c: 4 }, {
    dAr: 'أملاح استحمام وردية، زيت جسم بالورد، منشفة قطنية وبتلات ورد مجففة على صينية خشب.', dEn: 'Pink bath salts, rose body oil, a cotton towel and dried petals on a wooden tray.',
    occasions: ['getwell', 'thanks', 'birthday', 'newborn'], recipients: ['mother', 'wife', 'sister', 'friend'], ages: ['adult'], interests: ['selfcare', 'home'], extraCats: ['gifts', 'lifestyle'] }),
  ph('beauty', 'rawnaq', 'طقم الحرير للنوم', 'Silk Sleep Set', 320, 'beauty-silk-sleep', { k: 'giftbox', c: 2 }, {
    dAr: 'غطاء عين وربطتا شعر وكيس مخدة من الحرير بلون الشامبين في صندوق مغناطيسي.', dEn: 'A champagne silk eye mask, two scrunchies and a pillowcase in a magnetic box.',
    occasions: ['birthday', 'anniversary', 'thanks', 'getwell'], recipients: ['mother', 'wife', 'sister', 'friend'], ages: ['teen', 'adult'], interests: ['selfcare', 'beauty'], extraCats: ['lifestyle'] }),
  ph('beauty', 'rawnaq', 'طقم اللؤلؤ الناعم', 'Freshwater Pearl Set', 540, 'beauty-pearls', { k: 'giftbox', c: 2 }, {
    dAr: 'حلق وعقد من لؤلؤ المياه العذبة بطلاء ذهبي في علبة مخمل كريمية.', dEn: 'Freshwater pearl drop earrings and pendant on gold vermeil, in a cream velvet box.',
    occasions: ['anniversary', 'engagement', 'graduation', 'birthday', 'wedding'], recipients: ['wife', 'mother', 'sister'], ages: ['teen', 'adult'], interests: ['style'], badge: 'limited', stock: 5 }),
  ph('beauty', 'rawnaq', 'مجموعة فرش المكياج', 'Pro Brush Collection', 210, 'beauty-brush-set', { k: 'giftbox', c: 1 }, {
    dAr: '١٥ فرشة احترافية بشعر صناعي ناعم في حافظة جلدية وردية.', dEn: 'Fifteen pro brushes with soft synthetic bristles in a blush leather roll.',
    occasions: ['birthday', 'graduation', 'thanks'], recipients: ['sister', 'friend', 'wife'], ages: ['teen', 'adult'], interests: ['beauty'] }),

  /* ---------- Perfumes & Fragrances ---------- */
  ph('perfume', 'misk', 'عطر زهرة الصباح', 'Morning Bloom Eau de Parfum', 385, 'perf-floral', { k: 'perfume', c: 1 }, {
    dAr: 'عطر زهري بالفاوانيا والياسمين والمسك الأبيض في زجاجة كريستال وردية.', dEn: 'A floral blend of peony, jasmine and white musk in a faceted blush bottle.',
    occasions: ['birthday', 'anniversary', 'eid', 'graduation'], recipients: ['wife', 'mother', 'sister', 'friend'], ages: ['teen', 'adult'], interests: ['fragrance'], variants: [V.volume()], badge: 'best',
    personalize: { ar: 'نقش اسم على العلبة (اختياري)', en: 'Name on the box (optional)' } }),
  ph('perfume', 'misk', 'عطر عود الليل', 'Night Oud Eau de Parfum', 460, 'perf-oud', { k: 'perfume', c: 0 }, {
    dAr: 'عود كمبودي مع عنبر وجلد، في زجاجة سوداء ثقيلة وعلبة خشب جوز.', dEn: 'Cambodian oud with amber and leather in a heavy black bottle and walnut box.',
    occasions: ['birthday', 'eid', 'promotion', 'anniversary', 'wedding'], recipients: ['husband', 'father', 'brother', 'friend'], ages: ['adult'], interests: ['fragrance', 'heritage'], variants: [V.volume()], badge: 'best' }),
  ph('perfume', 'misk', 'طقم اكتشاف العطور', 'Fragrance Discovery Set', 225, 'perf-discovery', { k: 'perfume', c: 2 }, {
    dAr: 'ست عينات ١٠ مل من أشهر روائح الدار — مثالية لمن يحتار في الذوق.', dEn: 'Six 10 ml vials of the house signatures — ideal when you are unsure of their taste.',
    occasions: ['birthday', 'thanks', 'graduation', 'eid', 'promotion'], recipients: ['friend', 'colleague', 'sister', 'brother', 'wife', 'husband'], ages: ['teen', 'adult'], interests: ['fragrance'], extraCats: ['gifts'], badge: 'new' }),
  ph('perfume', 'misk', 'طقم المبخرة والبخور', 'Mabkhara & Bakhoor Set', 410, 'perf-bakhoor', { k: 'candle', c: 4 }, {
    dAr: 'مبخرة نحاسية منقوشة، برطمان بخور كمبودي، ودهن عود ٣ مل.', dEn: 'An engraved brass mabkhara, a jar of Cambodian bakhoor and 3 ml oud oil.',
    occasions: ['eid', 'ramadan', 'newhome', 'wedding', 'promotion'], recipients: ['father', 'mother', 'husband', 'team'], ages: ['adult'], interests: ['heritage', 'home', 'fragrance'], extraCats: ['lifestyle', 'gifts'] }),
  ph('perfume', 'misk', 'ثنائي المسك الأبيض', 'White Musk Duo', 295, 'perf-musk', { k: 'perfume', c: 2 }, {
    dAr: 'عطر مسك أبيض نظيف مع بخاخ جسم مطابق — رائحة هادئة تناسب الجميع.', dEn: 'A clean white-musk perfume with a matching body mist — a calm scent anyone can wear.',
    occasions: ['birthday', 'thanks', 'getwell', 'eid'], recipients: ['friend', 'colleague', 'sister', 'brother', 'mother', 'father'], ages: ['teen', 'adult'], interests: ['fragrance', 'selfcare'], badge: 'sameday', leadHours: 2 }),

  /* ---------- Men's Gifts ---------- */
  ph('men', 'samt', 'طقم المحفظة الجلدية', 'Leather Wallet Set', 279, 'men-wallet', { k: 'engraved', c: 0 }, {
    dAr: 'محفظة ثنائية وحافظة بطاقات من الجلد الطبيعي البني في علبة هدية.', dEn: 'A bifold wallet and card holder in full-grain brown leather, gift-boxed.',
    occasions: ['birthday', 'graduation', 'eid', 'promotion', 'anniversary'], recipients: ['husband', 'father', 'brother', 'friend'], ages: ['teen', 'adult'], interests: ['style'], extraCats: ['custom', 'gifts'],
    personalize: { ar: 'حفر الأحرف الأولى (اختياري)', en: 'Initials engraving (optional)' } }),
  ph('men', 'samt', 'ساعة الحد الأدنى', 'Minimal Leather Watch', 690, 'men-watch', { k: 'engraved', c: 4 }, {
    dAr: 'ساعة بمينا كريمي وإطار ذهبي نحيف وسوار جلد بني، مقاومة للماء.', dEn: 'A cream-dial watch with a slim gold case and brown leather strap, water resistant.',
    occasions: ['graduation', 'promotion', 'anniversary', 'birthday', 'wedding'], recipients: ['husband', 'father', 'brother', 'wife', 'friend'], ages: ['teen', 'adult'], interests: ['style'], badge: 'limited', stock: 6, variants: [STRAP] }),
  ph('men', 'samt', 'طقم العناية باللحية', 'Beard Care Kit', 235, 'men-grooming', { k: 'engraved', c: 4 }, {
    dAr: 'زيت لحية، مشط خشبي، فرشاة شعر طبيعي ومقص في صندوق جوز.', dEn: 'Beard oil, a wooden comb, a natural-bristle brush and scissors in a walnut box.',
    occasions: ['birthday', 'eid', 'thanks'], recipients: ['husband', 'brother', 'friend', 'father'], ages: ['adult'], interests: ['selfcare', 'style'], extraCats: ['gifts'] }),
  ph('men', 'samt', 'أزرار الأكمام والدبوس', 'Onyx Cufflinks & Tie Bar', 320, 'men-cufflinks', { k: 'engraved', c: 0 }, {
    dAr: 'أزرار أكمام بحجر الأونكس وإطار ذهبي مع دبوس ربطة مطابق في علبة كحلية.', dEn: 'Gold-framed onyx cufflinks with a matching tie bar in a navy case.',
    occasions: ['wedding', 'graduation', 'promotion', 'engagement'], recipients: ['husband', 'father', 'brother', 'colleague'], ages: ['adult'], interests: ['style'] }),
  ph('men', 'samt', 'مسبحة الكهرمان', 'Amber Misbaha', 450, 'men-misbaha', { k: 'engraved', c: 4 }, {
    dAr: 'مسبحة ٣٣ حبة من الكهرمان مع شرّابة ذهبية، على صينية جلد.', dEn: 'A 33-bead amber misbaha with a gold tassel on a leather tray.',
    occasions: ['eid', 'ramadan', 'promotion', 'thanks'], recipients: ['father', 'husband', 'brother', 'mother'], ages: ['adult'], interests: ['heritage'], badge: 'best' }),
  ph('men', 'samt', 'قلم الحبر والمفكرة', 'Fountain Pen & Notebook', 260, 'men-pen-notebook', { k: 'engraved', c: 0 }, {
    dAr: 'قلم حبر أسود بلمسات ذهبية مع مفكرة جلدية خضراء.', dEn: 'A black lacquer fountain pen with gold trims and a green leather notebook.',
    occasions: ['graduation', 'promotion', 'thanks'], recipients: ['colleague', 'father', 'brother', 'friend', 'sister', 'team'], ages: ['teen', 'adult'], interests: ['reading', 'art'], extraCats: ['custom', 'lifestyle'],
    personalize: { ar: 'حفر الاسم على القلم (اختياري)', en: 'Name engraved on pen (optional)' } }),
  ph('men', 'samt', 'منظّم المكتب والشحن', 'Walnut Desk & Charging Set', 299, 'men-tech-stand', { k: 'engraved', c: 4 }, {
    dAr: 'حامل شحن لاسلكي وصينية تنظيم من خشب الجوز مع رباطات كابلات جلدية.', dEn: 'A walnut wireless charging stand, desk tray and leather cable ties.',
    occasions: ['promotion', 'graduation', 'thanks', 'newhome'], recipients: ['colleague', 'brother', 'friend', 'husband', 'sister', 'team'], ages: ['teen', 'adult'], interests: ['tech', 'home'], extraCats: ['lifestyle'], badge: 'new' }),
  ph('men', 'samt', 'طقم السفر الجلدي', 'Leather Travel Set', 249, 'men-travel', { k: 'engraved', c: 4 }, {
    dAr: 'محفظة سفر بسحاب، حافظة جواز، وبطاقة حقيبة من الجلد الكونياكي.', dEn: 'A zip travel wallet, passport holder and luggage tag in cognac leather.',
    occasions: ['graduation', 'promotion', 'birthday', 'thanks'], recipients: ['husband', 'wife', 'brother', 'sister', 'friend'], ages: ['teen', 'adult'], interests: ['travel'] }),

  /* ---------- Personalized ---------- */
  ph('custom', 'naqsh', 'صندوق الذكريات المحفور', 'Engraved Keepsake Box', 265, 'pers-keepsake-box', { k: 'engraved', c: 4 }, {
    dAr: 'صندوق خشب جوز محفور بأوراق نباتية، مبطّن بالمخمل، ونحفر عليه الاسم والتاريخ.', dEn: 'A walnut box laser-engraved with leaves, velvet-lined, with a name and date of your choice.',
    occasions: ['anniversary', 'wedding', 'newborn', 'engagement', 'graduation'], recipients: ['wife', 'mother', 'husband', 'friend', 'baby'], interests: ['home'], extraCats: ['lifestyle'], badge: 'best',
    personalize: { ar: 'الاسم والتاريخ', en: 'Name & date' }, leadHours: 24 }),
]

/* Illustrated items in photo-covered categories are hidden from the storefront. */
const PHOTO_CATS: CategoryId[] = ['flowers', 'cakes', 'chocolate', 'balloons', 'gifts', 'custom']
ILLUSTRATED.forEach((x) => { if (PHOTO_CATS.includes(x.cat)) x.hidden = true })

// Cross-list existing photographed arrangements in Lifestyle & Home
PHOTO_PRODUCTS.forEach((x) => { if (x.id === 'ph05' || x.id === 'ph06') x.extraCats = ['lifestyle'] })
export const inCategory = (x: Product, c: CategoryId) => x.cat === c || !!x.extraCats?.includes(c)

/** Everything (for order history lookups). */
export const CATALOG: Product[] = [...PHOTO_PRODUCTS, ...ILLUSTRATED]
/** Storefront catalogue: real photography first. */
export const PRODUCTS: Product[] = CATALOG.filter((x) => !x.hidden)

export const productById = (id: string) => CATALOG.find((x) => x.id === id)
/** Stores that are not live (pending / suspended) — used for order history and the admin console only. */
export const MERCHANT_ARCHIVE: Merchant[] = []
export const merchantById = (id: string) => (MERCHANTS.find((x) => x.id === id) ?? MERCHANT_ARCHIVE.find((x) => x.id === id))!
export const productCities = (prod: Product): CityId[] => merchantById(prod.merchant).cities
export const sameDay = (prod: Product) => prod.leadHours <= 4

// Customer reviews (demo) — rotated per product
export const REVIEW_POOL: { name: L; text: L; city: CityId }[] = [
  { name: { ar: 'نورة ع.', en: 'Noura A.' }, text: { ar: 'وصل قبل الموعد والتغليف أجمل من الصور. أمي انبسطت مرة!', en: 'Arrived early and the wrapping was even nicer than the photos. My mum loved it!' }, city: 'riyadh' },
  { name: { ar: 'فهد م.', en: 'Fahad M.' }, text: { ar: 'تعامل راقي والكرت المكتوب كان لمسة حلوة.', en: 'Classy service — the handwritten card was a lovely touch.' }, city: 'jeddah' },
  { name: { ar: 'ريم س.', en: 'Reem S.' }, text: { ar: 'الطعم ممتاز والكمية مناسبة للضيوف. بكرر الطلب أكيد.', en: 'Delicious and plenty for guests. Will definitely reorder.' }, city: 'dammam' },
  { name: { ar: 'عبدالله ق.', en: 'Abdullah Q.' }, text: { ar: 'خدمة التتبع واضحة وعرفت متى بالضبط بيوصل.', en: 'Tracking was clear; I knew exactly when it would arrive.' }, city: 'khobar' },
  { name: { ar: 'سارة ح.', en: 'Sarah H.' }, text: { ar: 'المفاجأة الرقمية خلت صديقتي تبكي من الفرحة 🤍', en: 'The digital surprise made my friend cry happy tears 🤍' }, city: 'makkah' },
]

/* ---------- Recipient collections (curation by who the gift is for — interests stay the shopper's choice) ---------- */
export type CollectionId = 'kids' | 'her' | 'him' | 'baby' | 'personalized'
const HER: RecipientId[] = ['mother', 'wife', 'sister']
const HIM: RecipientId[] = ['father', 'husband', 'brother']
export const COLLECTIONS: { id: CollectionId; name: L; blurb: L; img: string; match: (p: Product) => boolean }[] = [
  { id: 'kids', name: { ar: 'للأطفال', en: 'For Kids' }, blurb: { ar: 'ألعاب مصنّفة حسب العمر، وكيك وبالونات للحفلة', en: 'Age-labelled toys, plus cake and balloons for the party' }, img: 'kid-building-blocks',
    match: (p) => (p.cat === 'kids' && !!p.ages && p.ages.some((a) => a !== 'baby')) || p.cat === 'balloons' },
  { id: 'her', name: { ar: 'لها', en: 'For Her' }, blurb: { ar: 'اختيارات يحبها الوالدة والزوجة والأخت', en: 'Picks loved by mums, wives and sisters' }, img: 'beauty-pearls',
    match: (p) => !p.ages?.every((a) => a === 'baby' || a === 'toddler' || a === 'kids' || a === 'tween') && p.recipients.length < 9 && p.recipients.some((r) => HER.includes(r)) },
  { id: 'him', name: { ar: 'له', en: 'For Him' }, blurb: { ar: 'اختيارات يحبها الوالد والزوج والأخ', en: 'Picks loved by dads, husbands and brothers' }, img: 'men-grooming',
    match: (p) => !p.ages?.every((a) => a === 'baby' || a === 'toddler' || a === 'kids' || a === 'tween') && p.recipients.length < 9 && p.recipients.some((r) => HIM.includes(r)) },
  { id: 'baby', name: { ar: 'للمولود', en: 'For Baby' }, blurb: { ar: 'هدايا استقبال ناعمة وآمنة', en: 'Soft, safe welcome gifts' }, img: 'baby-hamper',
    match: (p) => !!p.ages?.includes('baby') || (p.occasions.includes('newborn') && (p.cat === 'flowers' || p.cat === 'balloons')) },
  { id: 'personalized', name: { ar: 'هدايا مخصصة', en: 'Personalized' }, blurb: { ar: 'باسمه وتاريخه، محفورة بعناية', en: 'Their name and date, carefully engraved' }, img: 'pers-keepsake-box',
    match: (p) => inCategory(p, 'custom') || !!p.personalize },
]
