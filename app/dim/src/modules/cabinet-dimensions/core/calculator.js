/**
 * موتور محاسبه ابعادی — خالص، سریع، بدون وابستگی به UI.
 * ورودی: قالب + پارامترها + ثابتها (+ بازنویسیهای اختصاصی یک کابینت)
 * خروجی: لیست کامل قطعات با ابعاد نهایی + خلاصه آماری.
 */
import { buildVariableMap } from '../config/variables.js'
import { tryEvaluate, evaluate, FormulaError } from './formula-engine.js'
import { MATERIALS, materialLabel, constantValue } from './constants.js'
import { byOrder, round, isNum } from '../utils/math.js'
import { cmToM2, perimeterToM } from '../config/units.js'

export const RULE_TYPES = [
  { key: 'constant', label: 'ثابت', icon: 'pi pi-minus', hint: 'یک عدد مشخص که همیشه همان می‌ماند' },
  { key: 'equal', label: 'مساوی', icon: 'pi pi-equals', hint: 'مساوی یک پارامتر یا متغیر دیگر' },
  { key: 'offset', label: 'کمشونده/افزایشی', icon: 'pi pi-arrows-h', hint: 'یک متغیر منهای/به‌علاوه یک مقدار ثابت' },
  { key: 'divide', label: 'تقسیمی', icon: 'pi pi-percentage', hint: 'یک متغیر تقسیم بر یک مقدار یا فرمول' },
  { key: 'formula', label: 'فرمول آزاد', icon: 'pi pi-code', hint: 'عبارت ریاضی دلخواه با متغیرها' }
]

export function ruleTypeLabel(type) {
  return RULE_TYPES.find((t) => t.key === type)?.label || type
}

/** ساخت context ارزیابی: متغیرهای زنده از پارامترها + ثابتها */
export function createContext(params = {}, constants = {}) {
  return { vars: buildVariableMap(params, constants), params, constants }
}

/** نمایش خوانای یک قاعده برای کاربر (فارسی) */
export function describeRule(rule) {
  if (!rule) return '—'
  switch (rule.type) {
    case 'constant': return `${rule.value}`
    case 'equal': return `${rule.source}`
    case 'offset': return `${rule.source} ${Number(rule.offset) >= 0 ? '+' : '−'} ${Math.abs(Number(rule.offset) || 0)}`
    case 'divide': return `(${rule.numerator}) ÷ (${rule.denominator})`
    case 'formula': return rule.expression || '—'
    default: return '—'
  }
}

/**
 * ارزیابی یک قاعده.
 * @returns {{ok:boolean, value:number|null, error:string|null}}
 */
export function resolveRule(rule, ctx) {
  if (!rule || !rule.type) return { ok: false, value: null, error: 'قاعده‌ای تعریف نشده است.' }
  try {
    let value
    switch (rule.type) {
      case 'constant': {
        value = Number(rule.value)
        if (!Number.isFinite(value)) throw new FormulaError('مقدار ثابت قاعده عدد معتبری نیست.')
        break
      }
      case 'equal': {
        const key = String(rule.source || '').trim()
        if (!(key in ctx.vars)) throw new FormulaError(`متغیر «${key}» در دسترس نیست.`)
        value = ctx.vars[key]
        break
      }
      case 'offset': {
        const key = String(rule.source || '').trim()
        if (!(key in ctx.vars)) throw new FormulaError(`متغیر «${key}» در دسترس نیست.`)
        const off = Number(rule.offset)
        if (!Number.isFinite(off)) throw new FormulaError('مقدار اختلاف قاعده عدد معتبری نیست.')
        value = ctx.vars[key] + off
        break
      }
      case 'divide': {
        const expr = `(${rule.numerator ?? ''}) / (${rule.denominator ?? ''})`
        value = evaluate(expr, ctx.vars)
        break
      }
      case 'formula': {
        value = evaluate(rule.expression, ctx.vars)
        break
      }
      default:
        throw new FormulaError(`نوع قاعده «${rule.type}» پشتیبانی نمی‌شود.`)
    }
    if (!Number.isFinite(value)) throw new FormulaError('نتیجه قاعده عدد معتبری نیست.')
    return { ok: true, value: round(value, 3), error: null }
  } catch (e) {
    return { ok: false, value: null, error: e.fa || e.message || 'خطای ناشناخته در قاعده' }
  }
}

function thicknessOf(material, constants) {
  const meta = MATERIALS[material]
  const key = meta?.thicknessKey || 'mdfThickness'
  return constantValue(constants, key, 0)
}

/**
 * محاسبه ابعاد یک کابینت.
 * هرگز exception پرتاب نمی‌کند؛ خطاهای فرمول در سطح قطعه گزارش می‌شوند.
 *
 * @param {object} template  قالب (باید parts داشته باشد)
 * @param {object} params    { width, height, depth, doors, shelves }
 * @param {object} constants کالکشن ثابتها
 * @param {object} overrides بازنویسی ابعاد این کابینت { partId: { length, width, quantity } }
 */
export function calculateCabinet(template, params = {}, constants = {}, overrides = {}) {
  const defaults = template?.defaults || {}
  const merged = {
    width: Number(params.width),
    height: Number(params.height ?? defaults.height),
    depth: Number(params.depth ?? defaults.depth),
    doors: Number(params.doors ?? defaults.doors),
    shelves: Number(params.shelves ?? defaults.shelves)
  }
  const ctx = createContext(merged, constants)
  const parts = []

  for (const part of byOrder(template?.parts || [])) {
    const errors = []
    const lengthRule = resolveRule(part.length, ctx)
    const widthRule = resolveRule(part.width, ctx)
    const qtyRule = resolveRule(part.quantity || { type: 'constant', value: 1 }, ctx)

    if (!lengthRule.ok) errors.push(`طول: ${lengthRule.error}`)
    if (!widthRule.ok) errors.push(`عرض: ${widthRule.error}`)
    if (!qtyRule.ok) errors.push(`تعداد: ${qtyRule.error}`)

    const ov = overrides?.[part.id] || {}
    const length = isNum(ov.length) ? round(ov.length, 3) : lengthRule.value
    const width = isNum(ov.width) ? round(ov.width, 3) : widthRule.value
    const quantity = isNum(ov.quantity) ? Math.round(ov.quantity) : Math.round(qtyRule.value ?? 0)

    const usable = isNum(length) && isNum(width) && quantity > 0
    const area = usable ? cmToM2(length, width) * quantity : 0
    const perimeterM = usable ? perimeterToM(length, width) * quantity : 0

    parts.push({
      id: part.id,
      name: part.name,
      order: part.order ?? 0,
      material: part.material || 'mdf',
      materialLabel: materialLabel(part.material),
      thickness: thicknessOf(part.material, constants),
      pvc: !!part.pvc,
      groove: !!part.groove,
      quantity: quantity > 0 ? quantity : 0,
      length,
      width,
      area: round(area, 4),
      pvcMeters: part.pvc ? round(perimeterM, 3) : 0,
      grooveMeters: part.groove ? round(perimeterM, 3) : 0,
      overridden: {
        length: isNum(ov.length),
        width: isNum(ov.width),
        quantity: isNum(ov.quantity)
      },
      errors
    })
  }

  return { parts, summary: summarize(parts), params: merged }
}

/**
 * گروه‌بندی قطعات برای چک‌باکسهای گزینه‌های محاسبه
 * PVC روی در / روی بدنه / روی طبقه و شیار پشت
 */
export const OPTION_GROUPS = {
  pvcDoor: ['door'],
  pvcBody: ['bottom', 'side', 'rail'],
  pvcShelf: ['shelf'],
  grooveBack: ['back']
}

/** اعمال گزینه‌های محاسبه روی قالب (قالب جدید برمی‌گرداند) */
export function applyCalculationOptions(template, options = {}) {
  if (!template) return template
  const parts = template.parts.map((p) => {
    const next = { ...p }
    if (options.pvcDoor !== undefined && OPTION_GROUPS.pvcDoor.includes(p.id)) next.pvc = !!options.pvcDoor
    if (options.pvcBody !== undefined && OPTION_GROUPS.pvcBody.includes(p.id)) next.pvc = !!options.pvcBody
    if (options.pvcShelf !== undefined && OPTION_GROUPS.pvcShelf.includes(p.id)) next.pvc = !!options.pvcShelf
    if (options.grooveBack !== undefined && OPTION_GROUPS.grooveBack.includes(p.id)) next.groove = !!options.grooveBack
    return next
  })
  return { ...template, parts }
}

/** خلاصه آماری زیر جدول قطعات */
export function summarize(parts = []) {
  const totalPieces = parts.reduce((s, p) => s + (p.quantity || 0), 0)
  const pvcMeters = parts.reduce((s, p) => s + (p.pvcMeters || 0), 0)
  const grooveMeters = parts.reduce((s, p) => s + (p.grooveMeters || 0), 0)
  const mdfArea = parts.filter((p) => p.material === 'mdf').reduce((s, p) => s + (p.area || 0), 0)
  const backArea = parts.filter((p) => p.material === 'back').reduce((s, p) => s + (p.area || 0), 0)
  const errorCount = parts.reduce((s, p) => s + (p.errors?.length || 0), 0)
  return {
    totalPieces: round(totalPieces, 0),
    pvcMeters: round(pvcMeters, 3),
    grooveMeters: round(grooveMeters, 3),
    mdfArea: round(mdfArea, 4),
    backArea: round(backArea, 4),
    errorCount
  }
}

/** محاسبه سریع خلاصه (بدون ساخت لیست کامل) */
export function quickSummary(template, params, constants, overrides) {
  return summarize(calculateCabinet(template, params, constants, overrides).parts)
}
