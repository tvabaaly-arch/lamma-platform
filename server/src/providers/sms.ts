import { config } from '../config'
import { maskPhone } from '../lib/phone'

/** SMS delivery. Only the console provider exists for now; add Unifonic/Twilio here later. */
export interface SmsProvider {
  readonly name: string
  sendOtp(phone: string, code: string): Promise<void>
}

const consoleProvider: SmsProvider = {
  name: 'console',
  async sendOtp(phone, code) {
    if (config.NODE_ENV !== 'test') console.log(`[sms:console] OTP for ${maskPhone(phone)}: ${code}`)
  },
}

export const sms: SmsProvider = { console: consoleProvider }[config.SMS_PROVIDER]
