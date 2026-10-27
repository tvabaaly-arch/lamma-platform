/*
 * Gift engine endpoints. These run the same transparent rule-based engine as the web app
 * (src/lib/ai.ts) over the live catalog — no external AI model is called. Responses carry
 * `engine: "rules-v1"` so clients can label results honestly.
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { parseBrief, generateBundles, alternativesFor, addSuggestions, suggestMessages } from '../../../src/lib/ai'
import { unitPrice, type Brief } from '../../../src/lib/model'
import { type AppEnv, v, rateLimit } from '../lib/http'
import { zBrief, zOccasion } from '../lib/schemas'
import { E } from '../lib/errors'
import { productFromCache, publicProduct } from '../services/catalog'

const ENGINE = 'rules-v1'
const NO_OV = {}

function enrichBundle(b: ReturnType<typeof generateBundles>['bundles'][number]) {
  const items = b.items.map((it) => {
    const p = productFromCache(it.productId)!
    return { ...it, unit: unitPrice(p, it.variant, NO_OV), product: publicProduct(p) }
  })
  const subtotal = items.reduce((a, it) => a + it.unit * it.qty, 0)
  const merchants = new Set(items.map((it) => it.product.merchant)).size
  return { ...b, items, subtotal, merchants }
}

export const aiRoutes = new Hono<AppEnv>()
  .use(rateLimit('ai', 120, 60e3))
  .post('/parse', v('json', z.object({ text: z.string().trim().min(1).max(1000) })), (c) => {
    return c.json({ engine: ENGINE, brief: parseBrief(c.req.valid('json').text) })
  })
  .post('/bundles', v('json', z.object({ brief: zBrief })), (c) => {
    const brief = c.req.valid('json').brief as Brief
    const { bundles, poolNotes } = generateBundles(brief, NO_OV)
    return c.json({ engine: ENGINE, brief, poolNotes, bundles: bundles.map(enrichBundle) })
  })
  .post('/alternatives', v('json', z.object({ productId: z.string(), brief: zBrief, exclude: z.array(z.string()).max(50).default([]) })), (c) => {
    const { productId, brief, exclude } = c.req.valid('json')
    if (!productFromCache(productId)) throw E.notFound('product')
    return c.json({ engine: ENGINE, items: alternativesFor(productId, brief as Brief, NO_OV, exclude).slice(0, 12).map(publicProduct) })
  })
  .post('/suggestions', v('json', z.object({ brief: zBrief, exclude: z.array(z.string()).max(50).default([]) })), (c) => {
    const { brief, exclude } = c.req.valid('json')
    return c.json({ engine: ENGINE, items: addSuggestions(brief as Brief, NO_OV, exclude).map(publicProduct) })
  })
  .get('/messages', v('query', z.object({ occasion: zOccasion.optional() })), (c) => {
    return c.json({ engine: ENGINE, items: suggestMessages(c.req.valid('query').occasion as never) })
  })
