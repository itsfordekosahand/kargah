/**
 * Getterهای مشتقشده — توابع خالص روی state (بدون وابستگی به UI).
 */
import { calculateCabinet, summarize, quickSummary } from '../core/calculator.js'
import { templatesList, getTemplate } from '../core/templates.js'
import { instancesList } from '../core/instances.js'
import { constantList } from '../core/constants.js'

export const SK = {
  templates: 'templates',
  instances: 'instances',
  constants: 'constants'
}

export function selectTemplates(state) {
  return templatesList(state.templates)
}

export function selectTemplate(state, id) {
  return getTemplate(state.templates, id)
}

export function selectActiveTemplate(state) {
  return selectTemplate(state, state.activeTemplateId)
}

export function selectInstances(state, templateId = null) {
  const list = instancesList(state.instances)
  return templateId ? list.filter((i) => i.templateId === templateId) : list
}

export function selectConstants(state) {
  return constantList(state.constants)
}

/** محاسبه کامل قطعات برای پارامترهای جاری */
export function selectParts(state, params, templateId = state.activeTemplateId, overrides = {}) {
  const tpl = selectTemplate(state, templateId)
  if (!tpl) return { parts: [], summary: summarize([]), params: {} }
  return calculateCabinet(tpl, params, state.constants, overrides)
}

/** فقط خلاصه آماری (سریع‌تر) */
export function selectSummary(state, params, templateId = state.activeTemplateId, overrides = {}) {
  const tpl = selectTemplate(state, templateId)
  if (!tpl) return summarize([])
  return quickSummary(tpl, params, state.constants, overrides)
}

/** پارامترهای پیش‌فرض فعال برای فرم */
export function selectDefaultParams(state) {
  const tpl = selectActiveTemplate(state)
  return tpl ? { width: 100, ...tpl.defaults } : { width: 100, height: 71, depth: 58, doors: 2, shelves: 1 }
}

export function selectHasErrors(result) {
  return (result?.parts || []).some((p) => p.errors && p.errors.length)
}
