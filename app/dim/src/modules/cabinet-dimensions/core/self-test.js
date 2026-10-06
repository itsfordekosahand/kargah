/**
 * تست فرمولها: تابع جداگانه که چند نمونه معروف را اجرا و نتیجه را گزارش می‌کند.
 * در UI قابل فراخوانی است و در تست خودکار هم استفاده می‌شود.
 */
import { tryEvaluate } from './formula-engine.js'

export function famousFormulaCases() {
  return [
    {
      name: 'عرض در (عرض ۱۰۰ برای دو در)',
      formula: '(width - 2 * doorSideGap) / doors',
      vars: { width: 100, doorSideGap: 0.2, doors: 2 },
      expected: 49.8
    },
    {
      name: 'طول قید (عرض منهای ۳٫۲)',
      formula: 'width - 3.2',
      vars: { width: 100 },
      expected: 96.8
    },
    {
      name: 'ارتفاع پنل پشت (ارتفاع منهای دو برابر عمق شیار)',
      formula: 'height - 2 * backGrooveDepth',
      vars: { height: 71, backGrooveDepth: 1 },
      expected: 69
    },
    {
      name: 'عرض طبقه (عمق منهای عقبرفتگی)',
      formula: 'depth - shelfSetback',
      vars: { depth: 58, shelfSetback: 3 },
      expected: 55
    },
    {
      name: 'متغیر با برچسب فارسی',
      formula: 'عرض کابینت - 3.2',
      vars: { 'عرض کابینت': 100 },
      expected: 96.8
    },
    {
      name: 'ارقام فارسی در عبارت',
      formula: '۱۰۰ / ۴ + ۲',
      vars: {},
      expected: 27
    },
    {
      name: 'توابع ریاضی',
      formula: 'max(round(width / 3, 1), 10)',
      vars: { width: 100 },
      expected: 33.3
    },
    {
      name: 'اولویت عملگرها و توان',
      formula: '2 + 3 * 4 ^ 2',
      vars: {},
      expected: 50
    }
  ]
}

export function famousErrorCases() {
  return [
    { name: 'متغیر تعریف‌نشده', formula: 'width + foo', vars: { width: 100 }, errorIncludes: 'متغیر' },
    { name: 'تقسیم بر صفر', formula: 'width / 0', vars: { width: 100 }, errorIncludes: 'تقسیم بر صفر' },
    { name: 'عبارت خالی', formula: '   ', vars: {}, errorIncludes: 'خالی' },
    { name: 'کاراکتر نامعتبر', formula: 'width # 2', vars: { width: 100 }, errorIncludes: 'نامعتبر' },
    { name: 'پرانتز باز', formula: '(width + 1', vars: { width: 1 }, errorIncludes: 'ناقص' }
  ]
}

/** اجرای همه نمونه‌های معروف — خروجی آماده نمایش */
export function runSelfTests() {
  const results = []

  for (const c of famousFormulaCases()) {
    const r = tryEvaluate(c.formula, c.vars)
    const pass = r.ok && Math.abs(r.value - c.expected) < 1e-9
    results.push({
      name: c.name,
      kind: 'formula',
      formula: c.formula,
      expected: c.expected,
      actual: r.ok ? r.value : null,
      error: r.error,
      pass
    })
  }

  for (const c of famousErrorCases()) {
    const r = tryEvaluate(c.formula, c.vars)
    const pass = !r.ok && String(r.error || '').includes(c.errorIncludes)
    results.push({
      name: c.name,
      kind: 'error',
      formula: c.formula,
      expected: `خطای حاوی «${c.errorIncludes}»`,
      actual: r.error || `مقدار ${r.value}`,
      error: r.error,
      pass
    })
  }

  return {
    total: results.length,
    passed: results.filter((r) => r.pass).length,
    failed: results.filter((r) => !r.pass).length,
    results
  }
}
