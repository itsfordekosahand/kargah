/**
 * استخراج قواعد از نمونه‌ها — قلب ماژول.
 *
 * ورودی: لیست نمونه‌های کاربر (پارامترها + ابعاد واقعی قطعات)
 * خروجی: پیشنهاد قاعده برای هر بُعد هر قطعه، همراه دلیل فارسی و میزان اطمینان.
 *
 * ترتیب تلاش (از ساده به پیچیده):
 *  ۱) ثابت          ۲) مساوی       ۳) کمشونده/افزایشی
 *  ۴) تقسیمی        ۵) فرمول خطی ساده   ۶) فرمول خطی چندمتغیره   ۷) پیشنهاد احتیاطی
 */
import { round, approxEqual, avg, linearRegression, sum } from '../utils/math.js'

export const PARAM_KEYS = ['width', 'height', 'depth', 'doors', 'shelves']
export const DIM_LABELS = { length: 'طول', width: 'عرض' }
const EPS = 0.01

const spread = (arr) => (arr.length ? Math.max(...arr) - Math.min(...arr) : 0)
const constantWithin = (arr, eps = EPS) => spread(arr) <= eps

function paramsOf(sample) {
  return sample?.params || {}
}

function seriesFor(samples, partId, dim) {
  const out = []
  for (const s of samples) {
    const v = s.parts?.[partId]?.[dim]
    if (v === null || v === undefined || v === '' || !Number.isFinite(Number(v))) return null
    out.push(Number(v))
  }
  return out
}

function paramSeries(samples, key) {
  const out = []
  for (const s of samples) {
    const v = paramsOf(s)[key]
    if (v === null || v === undefined || v === '' || !Number.isFinite(Number(v))) return null
    out.push(Number(v))
  }
  return out
}

function varies(arr, eps = EPS) {
  return spread(arr) > eps
}

function relEqual(arr, eps = 0.001) {
  if (!arr.length) return false
  const ref = arr[0]
  return arr.every((x) => Math.abs(x - ref) <= eps * Math.max(1, Math.abs(ref)))
}

const num = (n) => formatNum(round(n, 4))
function formatNum(n) {
  if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n))
  return String(Number(n.toFixed(4)))
}

/**
 * قاعده را برای یک سری مقادیر پیدا می‌کند.
 * @returns {{rule:object, confidence:string, note:string}}
 */
export function findRule(values, paramsBySample, eps = EPS) {
  const n = values.length
  if (!n) return null

  // ۱) ثابت
  if (constantWithin(values, eps)) {
    return {
      rule: { type: 'constant', value: round(avg(values), 3) },
      confidence: 'exact',
      note: 'در همه نمونه‌ها یک مقدار ثابت بود.'
    }
  }

  const varyingParams = []
  for (const key of PARAM_KEYS) {
    const arr = paramsBySample.map((p) => Number(p[key]))
    if (arr.some((v) => !Number.isFinite(v))) continue
    if (!varies(arr, eps)) continue
    varyingParams.push({ key, arr })
  }

  // ۲) مساوی یک پارامتر
  for (const { key, arr } of varyingParams) {
    if (values.every((v, i) => approxEqual(v, arr[i], eps))) {
      return {
        rule: { type: 'equal', source: key },
        confidence: 'exact',
        note: `با پارامتر «${key}» برابر بود.`
      }
    }
  }

  // ۳) کمشونده/افزایشی نسبت به یک پارامتر
  for (const { key, arr } of varyingParams) {
    const diffs = values.map((v, i) => v - arr[i])
    if (constantWithin(diffs, eps)) {
      const d = round(avg(diffs), 3)
      return {
        rule: { type: 'offset', source: key, offset: d },
        confidence: 'exact',
        note: `همیشه ${Math.abs(d)} سانت ${d >= 0 ? 'بیشتر' : 'کمتر'} از «${key}» بود.`
      }
    }
  }

  // ۴) تقسیمی: (A + c) / B  با B یک پارامتر
  for (const a of varyingParams) {
    for (const b of varyingParams) {
      if (a.key === b.key) continue
      if (b.arr.some((v) => Math.abs(v) < 1e-9)) continue
      const s = values.map((v, i) => v * b.arr[i] - a.arr[i])
      if (constantWithin(s, eps)) {
        const c = round(avg(s), 3)
        const numerator = Math.abs(c) < eps ? a.key : `${a.key} ${c >= 0 ? '+' : '-'} ${num(Math.abs(c))}`
        return {
          rule: { type: 'divide', numerator, denominator: b.key },
          confidence: 'exact',
          note: `برابر «(${numerator}) تقسیم بر ${b.key}» بود.`
        }
      }
    }
  }

  // ۴ب) تقسیمی با مخرج عددی: A / k
  for (const a of varyingParams) {
    const ks = values.map((v, i) => (Math.abs(v) < 1e-9 ? NaN : a.arr[i] / v))
    if (ks.some((k) => !Number.isFinite(k))) continue
    if (relEqual(ks)) {
      const k = round(avg(ks), 4)
      return {
        rule: { type: 'divide', numerator: a.key, denominator: formatNum(k) },
        confidence: 'exact',
        note: `برابر «${a.key} تقسیم بر ${formatNum(k)}» بود.`
      }
    }
  }

  // ۵) ضریب ساده: k * P → فرمول
  for (const { key, arr } of varyingParams) {
    if (arr.some((v) => Math.abs(v) < 1e-9)) continue
    const ks = values.map((v, i) => v / arr[i])
    if (relEqual(ks)) {
      const k = round(avg(ks), 4)
      return {
        rule: { type: 'formula', expression: `${formatNum(k)} * ${key}` },
        confidence: 'good',
        note: `ضریب ثابت ${formatNum(k)} نسبت به «${key}» داشت.`
      }
    }
  }

  // ۶) رگرسیون خطی تک‌متغیره (حداقل ۳ نمونه)
  if (n >= 3) {
    let best = null
    for (const { key, arr } of varyingParams) {
      const fit = linearRegression(arr, values)
      if (!fit) continue
      const residuals = values.map((v, i) => Math.abs(v - (fit.a * arr[i] + fit.b)))
      const maxRes = Math.max(...residuals)
      if (maxRes <= eps && (!best || maxRes < best.maxRes)) {
        best = { key, ...fit, maxRes }
      }
    }
    if (best) {
      const a = round(best.a, 4)
      const b = round(best.b, 3)
      const expr = `${formatNum(a)} * ${best.key} ${b >= 0 ? '+' : '-'} ${num(Math.abs(b))}`
      return {
        rule: { type: 'formula', expression: expr },
        confidence: 'good',
        note: `روابط خطی با «${best.key}» پیدا شد (خطا کمتر از ${eps} سانت).`
      }
    }
  }

  // ۶ب) رگرسیون دو متغیره (حداقل ۵ نمونه)
  if (n >= 5 && varyingParams.length >= 2) {
    for (let i = 0; i < varyingParams.length; i++) {
      for (let j = i + 1; j < varyingParams.length; j++) {
        const A = varyingParams[i], B = varyingParams[j]
        const fit2 = solve2(A.arr, B.arr, values)
        if (!fit2) continue
        const residuals = values.map((v, k) => Math.abs(v - (fit2.a * A.arr[k] + fit2.b * B.arr[k] + fit2.c)))
        if (Math.max(...residuals) <= eps) {
          const expr = `${formatNum(round(fit2.a, 4))} * ${A.key} ${fit2.b >= 0 ? '+' : '-'} ${num(Math.abs(round(fit2.b, 4)))} * ${B.key} ${fit2.c >= 0 ? '+' : '-'} ${num(Math.abs(round(fit2.c, 3)))}`
          return {
            rule: { type: 'formula', expression: expr },
            confidence: 'approx',
            note: `فرمول دو متغیره پیشنهاد شده؛ لطفاً با دقت بررسی کنید.`
          }
        }
      }
    }
  }

  // ۷) پیشنهاد احتیاطی
  return {
    rule: { type: 'constant', value: round(avg(values), 3) },
    confidence: 'low',
    note: 'الگوی مشخصی پیدا نشد؛ میانگین نمونه‌ها پیشنهاد شده — حتماً ویرایش کنید.'
  }
}

/** حل رگرسیون y = a.x1 + b.x2 + کمترین مربعات */
function solve2(x1, x2, y) {
  const n = y.length
  if (n < 3) return null
  // سیستم معادلات normal equations
  const s = (arr) => sum(arr)
  const mul = (a, b) => a.map((v, i) => v * b[i])
  const Sx1 = s(x1), Sx2 = s(x2), Sy = s(y)
  const Sx1x1 = s(mul(x1, x1)), Sx2x2 = s(mul(x2, x2)), Sx1x2 = s(mul(x1, x2))
  const Sx1y = s(mul(x1, y)), Sx2y = s(mul(x2, y))
  // Cramer
  const D = Sx1x1 * Sx2x2 - Sx1x2 * Sx1x2
  if (Math.abs(D) < 1e-9) return null
  const D1 = Sx1y * Sx2x2 - Sx2y * Sx1x2
  const D2 = Sx1x1 * Sx2y - Sx1x2 * Sx1y
  const a = D1 / D
  const b = D2 / D
  const c = (Sy - a * Sx1 - b * Sx2) / n
  return { a, b, c }
}

/**
 * استخراج قواعد برای همه قطعات از روی نمونه‌ها.
 *
 * @param {Array} samples [{ name, params:{width,height,depth,doors,shelves}, parts:{partId:{length,width}} }]
 * @param {object} options { partMeta: { partId: { name, order } }, eps }
 */
export function extractRules(samples = [], options = {}) {
  const eps = options.eps ?? EPS
  const partMeta = options.partMeta || {}
  const errors = []

  const clean = (samples || []).filter((s) => s && s.params && s.parts)
  if (clean.length < 2) {
    return { ok: false, errors: ['برای استخراج قاعده حداقل دو نمونه لازم است.'], results: [], sampleCount: clean.length }
  }

  const distinct = new Set(clean.map((s) => JSON.stringify(s.params)))
  if (distinct.size < 2) {
    errors.push('پارامترهای نمونه‌ها با هم فرقی ندارند؛ حداقل دو نمونه با عرض متفاوت وارد کنید.')
  }

  const partIds = []
  for (const s of clean) {
    for (const pid of Object.keys(s.parts || {})) if (!partIds.includes(pid)) partIds.push(pid)
  }
  if (!partIds.length) {
    return { ok: false, errors: ['هیچ ابعادی در نمونه‌ها وارد نشده است.'], results: [], sampleCount: clean.length }
  }

  const results = []
  for (const partId of partIds) {
    const dims = {}
    for (const dim of ['length', 'width']) {
      const values = seriesFor(clean, partId, dim)
      const paramsBySample = clean.map((s) => s.params)
      if (!values) {
        dims[dim] = {
          partId, dim, dimLabel: DIM_LABELS[dim],
          rule: null, confidence: 'none',
          note: 'این بُعد در همه نمونه‌ها وارد نشده است.',
          values: []
        }
        continue
      }
      const found = findRule(values, paramsBySample, eps)
      dims[dim] = {
        partId,
        dim,
        dimLabel: DIM_LABELS[dim],
        rule: found.rule,
        confidence: found.confidence,
        note: found.note,
        values
      }
    }
    results.push({
      partId,
      partName: partMeta[partId]?.name || clean[0].parts[partId]?.name || partId,
      order: partMeta[partId]?.order ?? 0,
      dims
    })
  }

  results.sort((a, b) => a.order - b.order)
  return { ok: errors.length === 0, errors, results, sampleCount: clean.length }
}

/** اعمال قواعد استخراجشده روی یک قالب (بازگرداندن قالب جدید) */
export function applyExtractedRules(template, results = []) {
  const byId = new Map(results.map((r) => [r.partId, r]))
  const parts = template.parts.map((p) => {
    const r = byId.get(p.id)
    if (!r) return p
    const next = { ...p }
    if (r.dims.length?.rule) next.length = { ...r.dims.length.rule }
    if (r.dims.width?.rule) next.width = { ...r.dims.width.rule }
    return next
  })
  return { ...template, parts, updatedAt: Date.now() }
}

/** ساخت نمونه از یک نتیجه محاسبه (کمکی برای دمو/تست) */
export function sampleFromCalculation(name, params, calculatedParts) {
  const parts = {}
  for (const p of calculatedParts) {
    parts[p.id] = { length: p.length, width: p.width, name: p.name }
  }
  return { name, params: { ...params }, parts }
}
