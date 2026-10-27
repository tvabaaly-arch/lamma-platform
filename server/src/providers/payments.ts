import { config } from '../config'
import { randomToken } from '../lib/crypto'

/**
 * Payment gateway abstraction. The demo provider never charges anything: an order is marked
 * paid when the client calls POST /orders/:id/pay. A real gateway (Moyasar, HyperPay, Tap…)
 * would return a redirect / SDK token from `start` and confirm through a webhook instead.
 */
export type PaymentStart =
  | { kind: 'confirm'; method: 'POST'; path: string; note: string }
  | { kind: 'redirect'; url: string }

export interface PaymentProvider {
  readonly name: string
  readonly isDemo: boolean
  start(order: { id: string; total: number; method: string }): Promise<PaymentStart>
  /** Returns a provider reference when the payment is confirmed. */
  confirm(order: { id: string; total: number }): Promise<{ ok: true; ref: string } | { ok: false; reason: string }>
  refund(order: { id: string; paymentRef: string | null }, amount: number): Promise<{ ok: boolean; ref?: string }>
}

const demo: PaymentProvider = {
  name: 'demo',
  isDemo: true,
  async start(o) {
    return { kind: 'confirm', method: 'POST', path: `/api/v1/orders/${o.id}/pay`, note: 'Demo payment — nothing is charged.' }
  },
  async confirm() {
    return { ok: true, ref: `demo_${randomToken(9)}` }
  },
  async refund() {
    return { ok: true, ref: `demo_refund_${randomToken(6)}` }
  },
}

export const payments: PaymentProvider = { demo }[config.PAYMENT_PROVIDER]
