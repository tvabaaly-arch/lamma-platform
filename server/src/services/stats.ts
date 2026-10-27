import { sql } from 'drizzle-orm'
import { db } from '../db/client'
import { toSar } from '../lib/money'

const rows = <T>(r: unknown) => r as T[]

/** Sales figures for paid, non-cancelled sub-orders. `merchantId` omitted = whole marketplace. */
export async function salesStats(days: number, merchantId?: string) {
  const since = new Date(Date.now() - days * 86400e3).toISOString()
  const m = merchantId ? sql`and s.merchant_id = ${merchantId}` : sql``
  const [totals] = rows<{ orders: number; gross: number; commission: number; delivery: number }>(await db.execute(sql`
    select count(distinct s.order_id)::int as orders, coalesce(sum(s.subtotal),0)::int as gross,
           coalesce(sum(s.commission),0)::int as commission, coalesce(sum(s.delivery_fee),0)::int as delivery
    from sub_orders s join orders o on o.id = s.order_id
    where o.payment_status = 'paid' and s.status not in ('rejected','cancelled') and o.created_at >= ${since}::timestamptz ${m}`))
  const daily = rows<{ day: string; orders: number; gross: number }>(await db.execute(sql`
    select to_char(date_trunc('day', o.created_at at time zone 'Asia/Riyadh'), 'YYYY-MM-DD') as day,
           count(distinct s.order_id)::int as orders, coalesce(sum(s.subtotal),0)::int as gross
    from sub_orders s join orders o on o.id = s.order_id
    where o.payment_status = 'paid' and s.status not in ('rejected','cancelled') and o.created_at >= ${since}::timestamptz ${m}
    group by 1 order by 1`))
  const statusCounts = rows<{ status: string; n: number }>(await db.execute(sql`
    select s.status::text as status, count(*)::int as n from sub_orders s join orders o on o.id = s.order_id
    where o.payment_status in ('paid','refunded') ${m} group by 1`))
  const mi = merchantId ? sql`and i.merchant_id = ${merchantId}` : sql``
  const top = rows<{ product_id: string; name_ar: string; name_en: string; qty: number; gross: number }>(await db.execute(sql`
    select i.product_id, i.name_ar, i.name_en, sum(i.qty)::int as qty, sum(i.qty * i.unit_price)::int as gross
    from order_items i join orders o on o.id = i.order_id
    join sub_orders s on s.order_id = i.order_id and s.merchant_id = i.merchant_id
    where o.payment_status = 'paid' and s.status not in ('rejected','cancelled') and o.created_at >= ${since}::timestamptz ${mi}
    group by 1,2,3 order by gross desc limit 8`))
  const byCategory = rows<{ category: string; gross: number }>(await db.execute(sql`
    select i.category, sum(i.qty * i.unit_price)::int as gross
    from order_items i join orders o on o.id = i.order_id
    join sub_orders s on s.order_id = i.order_id and s.merchant_id = i.merchant_id
    where o.payment_status = 'paid' and s.status not in ('rejected','cancelled') and o.created_at >= ${since}::timestamptz ${mi}
    group by 1 order by 2 desc`))
  const t = totals ?? { orders: 0, gross: 0, commission: 0, delivery: 0 }
  return {
    days,
    orders: t.orders,
    gross: toSar(t.gross),
    commission: toSar(t.commission),
    deliveryFees: toSar(t.delivery),
    payout: toSar(t.gross + t.delivery - t.commission),
    averageOrder: t.orders ? toSar(Math.round(t.gross / t.orders)) : 0,
    statusCounts: Object.fromEntries(statusCounts.map((r) => [r.status, r.n])),
    daily: daily.map((d) => ({ day: d.day, orders: d.orders, gross: toSar(d.gross) })),
    topProducts: top.map((r) => ({ productId: r.product_id, name: { ar: r.name_ar, en: r.name_en }, qty: r.qty, gross: toSar(r.gross) })),
    byCategory: byCategory.map((r) => ({ category: r.category, gross: toSar(r.gross) })),
  }
}

/** Marketplace-wide figures for the admin console. */
export async function adminStats(days: number) {
  const since = new Date(Date.now() - days * 86400e3).toISOString()
  const base = await salesStats(days)
  const [gmv] = rows<{ gmv: number; discounts: number; orders: number; customers: number }>(await db.execute(sql`
    select coalesce(sum(total),0)::int as gmv, coalesce(sum(discount),0)::int as discounts, count(*)::int as orders, count(distinct user_id)::int as customers
    from orders where payment_status = 'paid' and created_at >= ${since}::timestamptz`))
  const byCity = rows<{ city: string; orders: number; gmv: number }>(await db.execute(sql`
    select city, count(*)::int as orders, coalesce(sum(total),0)::int as gmv from orders
    where payment_status = 'paid' and created_at >= ${since}::timestamptz group by 1 order by 3 desc`))
  const byMerchant = rows<{ merchant_id: string; orders: number; gross: number; commission: number }>(await db.execute(sql`
    select s.merchant_id, count(*)::int as orders, coalesce(sum(s.subtotal),0)::int as gross, coalesce(sum(s.commission),0)::int as commission
    from sub_orders s join orders o on o.id = s.order_id
    where o.payment_status = 'paid' and s.status not in ('rejected','cancelled') and o.created_at >= ${since}::timestamptz
    group by 1 order by 3 desc`))
  const [counts] = rows<{ users: number; merchants_active: number; merchants_pending: number; applications_pending: number }>(await db.execute(sql`
    select (select count(*) from users where role = 'customer')::int as users,
           (select count(*) from merchants where status = 'active')::int as merchants_active,
           (select count(*) from merchants where status = 'pending')::int as merchants_pending,
           (select count(*) from merchant_applications where status = 'pending')::int as applications_pending`))
  const g = gmv ?? { gmv: 0, discounts: 0, orders: 0, customers: 0 }
  return {
    ...base,
    gmv: toSar(g.gmv),
    discounts: toSar(g.discounts),
    paidOrders: g.orders,
    customers: g.customers,
    takeRate: base.gross ? Math.round((base.commission / base.gross) * 1000) / 1000 : 0,
    byCity: byCity.map((r) => ({ city: r.city, orders: r.orders, gmv: toSar(r.gmv) })),
    byMerchant: byMerchant.map((r) => ({ merchantId: r.merchant_id, orders: r.orders, gross: toSar(r.gross), commission: toSar(r.commission) })),
    counts,
  }
}
