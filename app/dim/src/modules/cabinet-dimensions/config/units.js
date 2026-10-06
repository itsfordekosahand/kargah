/**
 * واحدها و توابع تبدیل. همه محاسبات داخلی بر حسب سانتی‌متر انجام می‌شود.
 */
export const UNITS = {
  cm: 'سانتی‌متر',
  mm: 'میلی‌متر',
  m: 'متر',
  m2: 'متر مربع',
  count: 'عدد'
}

export const MM_PER_CM = 10
export const CM_PER_M = 100
export const CM2_PER_M2 = 10000

export const mmToCm = (v) => v / MM_PER_CM
export const cmToMm = (v) => v * MM_PER_CM
export const cmToM = (v) => v / CM_PER_M
export const cmToM2 = (l, w) => (l * w) / CM2_PER_M2

/** طول یک قطعه به متر (برای نوار PVC و شیار) */
export const perimeterToM = (l, w) => (2 * (l + w)) / CM_PER_M

export function unitLabel(key) {
  return UNITS[key] || key
}
