/** Money is stored in halalas (integers). The API speaks SAR numbers, like the web app. */
export const toHalalas = (sar: number) => Math.round(sar * 100)
export const toSar = (h: number) => Math.round(h) / 100
