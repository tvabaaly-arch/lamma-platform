/** Normalise Saudi mobile numbers to E.164 (+9665XXXXXXXX). Returns null when invalid. */
export function normalizeSaudiPhone(input: string): string | null {
  const digits = input.replace(/[\s\-()]/g, '').replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
  const m = digits.match(/^(?:\+?966|00966|0)?(5\d{8})$/)
  return m ? `+966${m[1]}` : null
}
/** 05XXXXXXXX form used by the web app. */
export const localPhone = (e164: string) => '0' + e164.slice(4)
export const maskPhone = (e164: string) => localPhone(e164).replace(/^(\d{3})\d{4}(\d{3})$/, '$1••••$2')
