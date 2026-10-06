/**
 * مقایسه قاعده‌ها و نتایج — برای اعتبارسنجی و نمایش تفاوت.
 */
import { approxEqual } from './math.js'

/** آیا دو قاعده از نظر ساختاری یکسانند؟ */
export function sameRule(a, b) {
  if (!a || !b) return false
  if (a.type !== b.type) return false
  switch (a.type) {
    case 'constant':
      return approxEqual(Number(a.value), Number(b.value))
    case 'equal':
      return String(a.source) === String(b.source)
    case 'offset':
      return String(a.source) === String(b.source) && approxEqual(Number(a.offset), Number(b.offset))
    case 'divide':
      return String(a.numerator) === String(b.numerator) && String(a.denominator) === String(b.denominator)
    case 'formula':
      return String(a.expression || '').trim() === String(b.expression || '').trim()
    default:
      return false
  }
}

/** مقایسه دو لیست نتیجه محاسبه (برای اعتبارسنجی استخراج قواعد) */
export function diffResults(expected, actual) {
  const problems = []
  for (const key of Object.keys(expected || {})) {
    if (!approxEqual(expected[key], actual?.[key])) {
      problems.push({ key, expected: expected[key], actual: actual?.[key] })
    }
  }
  return problems
}
