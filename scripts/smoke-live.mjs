// Post-deploy smoke test: opens the live site in Chromium (desktop + mobile)
// and checks routes, images, navigation, horizontal overflow and JS errors.
// Usage: node scripts/smoke-live.mjs https://tvabaaly-arch.github.io/lamma-platform/
import { chromium } from 'playwright'

const base = process.argv[2]
const routes = ['/', '/shop', '/shop/flowers', '/shop/kids', '/shop/beauty', '/shop/perfume', '/shop/men',
  '/shop/lifestyle', '/shop?for=kids', '/shop?for=her', '/shop?for=him', '/shop?for=baby', '/shop?for=personalized',
  '/occasions', '/finder', '/studio', '/merchants', '/merchant/numu', '/product/ph01', '/product/ph23', '/product/ph48',
  '/checkout', '/track', '/account', '/favorites', '/dashboard/merchant', '/dashboard/admin']
const problems = []
const note = (m) => console.log('::notice::' + m)
const fail = (m) => { problems.push(m); console.log('::error::' + m) }

const browser = await chromium.launch()
for (const [label, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport: vp, isMobile: label === 'mobile', hasTouch: label === 'mobile' })
  const errors = [], bad = new Set()
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('fonts.g')) bad.add(r.status() + ' ' + r.url()) })
  page.on('requestfailed', (r) => { if (!r.url().includes('fonts.g')) bad.add('failed ' + r.url()) })
  let imgs = 0, broken = 0, overflow = []
  for (const r of routes) {
    await page.goto(base + '#' + r, { waitUntil: 'networkidle' })
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo({ top: y, behavior: 'instant' }); await new Promise((s) => setTimeout(s, 60)) } })
    await page.waitForTimeout(900)
    const s = await page.evaluate(() => {
      const list = [...document.querySelectorAll('img')]
      return { n: list.length, broken: list.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src')),
        over: document.documentElement.scrollWidth > innerWidth + 1, h1: !!document.querySelector('main') }
    })
    imgs += s.n; broken += s.broken.length
    if (s.broken.length) fail(`${label} ${r}: broken images ${s.broken.join(', ')}`)
    if (s.over) overflow.push(r)
    if (!s.h1) fail(`${label} ${r}: page did not render`)
  }
  // product photo pages
  let photos = 0
  for (let i = 1; i <= 54; i++) {
    const id = 'ph' + String(i).padStart(2, '0')
    await page.goto(base + '#/product/' + id, { waitUntil: 'networkidle' })
    const ok = await page.waitForFunction(() => { const i = document.querySelector('main img'); return !!i && i.complete && i.naturalWidth > 0 }, null, { timeout: 15000 }).then(() => true, () => false)
    if (ok) photos++; else fail(`${label} product ${id}: photo missing`)
  }
  // in-app navigation: click a header/nav link and a product card
  await page.goto(base + '#/', { waitUntil: 'networkidle' })
  const before = page.url()
  const link = page.locator('a[href*="#/shop"]:visible').first()
  if (await link.count()) { await link.click({ timeout: 5000 }); await page.waitForTimeout(800) }
  const navOk = page.url() !== before
  if (!navOk) fail(`${label}: clicking shop link did not navigate`)
  const card = page.locator('a[href*="#/product/"]:visible').first()
  let cardOk = false
  if (await card.count()) { await card.click({ timeout: 5000 }); await page.waitForTimeout(800); cardOk = page.url().includes('/product/') }
  if (!cardOk) fail(`${label}: product card did not open`)
  // add to cart
  const add = page.locator('main button').filter({ hasText: /أضف|Add/ }).first()
  if (await add.count()) await add.click({ timeout: 5000 })
  await page.waitForTimeout(400)

  if (overflow.length) fail(`${label}: horizontal overflow on ${overflow.join(', ')}`)
  if (errors.length) fail(`${label}: JS errors ${errors.slice(0, 3).join(' | ')}`)
  if (bad.size) fail(`${label}: failed requests ${[...bad].slice(0, 5).join(' | ')}`)
  note(`${label} ${vp.width}px — routes ${routes.length}, images ${imgs} (broken ${broken}), product photos ${photos}/54, nav ${navOk && cardOk ? 'ok' : 'FAIL'}, overflow ${overflow.length}, js errors ${errors.length}, failed requests ${bad.size}`)
  await page.screenshot({ path: `smoke-${label}.png` })
  await page.close()
}
await browser.close()
if (problems.length) { console.log('::error::' + problems.length + ' problem(s)'); process.exit(1) }
note('LIVE SITE OK')
