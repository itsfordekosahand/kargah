/**
 * اعتبارسنجی قالب‌ها، قواعد و فرمولها — همه پیام‌ها فارسی.
 */
import { evaluate, extractVariables, FormulaError } from './formula-engine.js'
import { createContext, resolveRule, RULE_TYPES } from './calculator.js'
import { buildVariableMap, ALL_VARIABLES } from '../config/variables.js'
import { constantList } from './constants.js'

/** متغیرهای مجاز = پارامترها + همه ثابتها */
export function allowedVariables(constants = {}) {
  const base = buildVariableMap({ width: 1, height: 1, depth: 1, doors: 1, shelves: 1 }, constants)
  return base
}

/** اعتبارسنجی تک‌فرمول */
export function checkFormula(expression, constants = {}) {
  const vars = allowedVariables(constants)
  try {
    evaluate(expression, vars)
    return { valid: true, error: null, usedVariables: extractVariables(expression) }
  } catch (e) {
    return { valid: false, error: e.fa || e.message || 'خطای ناشناخته', usedVariables: extractVariables(expression) }
  }
}

/** بررسی اینکه آیا همه متغیرهای یک فرمول تعریف‌شده‌اند */
export function checkVariables(expression, constants = {}) {
  const vars = allowedVariables(constants)
  return extractVariables(expression).filter((name) => !(name in vars))
}

/** اعتبارسنجی یک قاعده با پارامترهای پیش‌فرض قالب */
export function checkRule(rule, template, constants, fieldLabel) {
  const errors = []
  const types = RULE_TYPES.map((t) => t.key)
  if (!rule || !rule.type) {
    errors.push({ path: fieldLabel, message: 'نوع قاعده انتخاب نشده است.' })
    return errors
  }
  if (!types.includes(rule.type)) {
    errors.push({ path: fieldLabel, message: `نوع قاعده «${rule.type}» نامعتبر است.` })
    return errors
  }
  const ctx = createContext({
    width: Number(template?.defaults?.width ?? 100),
    height: Number(template?.defaults?.height),
    depth: Number(template?.defaults?.depth),
    doors: Number(template?.defaults?.doors),
    shelves: Number(template?.defaults?.shelves)
  }, constants)

  const r = resolveRule(rule, ctx)
  if (!r.ok) errors.push({ path: fieldLabel, message: r.error })
  if (r.ok && (!Number.isFinite(r.value) || r.value <= 0)) {
    errors.push({ path: fieldLabel, message: 'نتیجه قاعده باید عددی بزرگ‌تر از صفر باشد.' })
  }
  return errors
}

/**
 * اعتبارسنجی کامل یک قالب قبل از ذخیره.
 * @returns {{valid:boolean, errors:Array<{path:string,message:string}>}}
 */
export function validateTemplate(template, constants = {}) {
  const errors = []
  if (!template) return { valid: false, errors: [{ path: 'قالب', message: 'قالبی ارسال نشده است.' }] }

  if (!template.name || !String(template.name).trim()) {
    errors.push({ path: 'name', message: 'نام قالب نمی‌تواند خالی باشد.' })
  }
  if (!Array.isArray(template.parts) || template.parts.length === 0) {
    errors.push({ path: 'parts', message: 'قالب باید حداقل یک قطعه داشته باشد.' })
    return { valid: false, errors }
  }

  const orders = template.parts.map((p) => Number(p.order))
  if (orders.some((o) => !Number.isFinite(o))) {
    errors.push({ path: 'parts.order', message: 'ترتیب نمایش قطعات باید عدد باشد.' })
  }
  if (new Set(template.parts.map((p) => p.id)).size !== template.parts.length) {
    errors.push({ path: 'parts.id', message: 'شناسه قطعات تکراری است.' })
  }

  const fields = [
    ['length', 'طول'],
    ['width', 'عرض'],
    ['quantity', 'تعداد']
  ]

  for (const part of template.parts) {
    if (!part.name || !String(part.name).trim()) {
      errors.push({ path: `parts.${part.id}.name`, message: 'نام قطعه نمی‌تواند خالی باشد.' })
    }
    for (const [field, label] of fields) {
      const rule = field === 'quantity' ? (part.quantity || { type: 'constant', value: 1 }) : part[field]
      const path = `parts.${part.id}.${field}`
      const errs = checkRule(rule, template, constants, `${part.name || 'قطعه'} — ${label}`)
      for (const e of errs) errors.push({ path, message: e.message })
    }
    if (part.length?.type === 'formula' && part.length.expression) {
      const c = checkFormula(part.length.expression, constants)
      if (!c.valid) errors.push({ path: `parts.${part.id}.length`, message: c.error })
    }
    if (part.width?.type === 'formula' && part.width.expression) {
      const c = checkFormula(part.width.expression, constants)
      if (!c.valid) errors.push({ path: `parts.${part.id}.width`, message: c.error })
    }
  }

  return { valid: errors.length === 0, errors }
}

/** لیست ثابتها برای نمایش در صفحه اعتبارسنجی */
export { constantList, ALL_VARIABLES }
