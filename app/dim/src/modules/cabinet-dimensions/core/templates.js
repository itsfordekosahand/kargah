/**
 * منطق قالبها: ساخت، ویرایش، کپی، حذف نرم و اعتبارسنجی.
 */
import { uid, defaultParamsFor, standardParts, TEMPLATE_TYPES } from '../config/defaults.js'
import { validateTemplate } from './validator.js'

export { validateTemplate, TEMPLATE_TYPES }

/** لیست قالبهای فعال (حذف‌شده‌ها کنار گذاشته می‌شوند) */
export function templatesList(templates = {}) {
  return Object.values(templates)
    .filter((t) => t && !t.deletedAt)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export function getTemplate(templates = {}, id) {
  return templates[id] && !templates[id].deletedAt ? templates[id] : null
}

export function createTemplate({ name, type = 'base', icon = 'pi pi-folder', description = '', defaults, parts }) {
  const now = Date.now()
  return {
    id: uid('tpl'),
    name: name || 'قالب جدید',
    icon: icon || TEMPLATE_TYPES.find((t) => t.key === type)?.icon || 'pi pi-folder',
    description: description || '',
    system: false,
    type,
    defaults: { ...defaultParamsFor(type), ...(defaults || {}) },
    parts: parts ? parts.map((p) => ({ ...p })) : standardParts(),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    order: 99
  }
}

export function duplicateTemplate(template, templates = {}) {
  const now = Date.now()
  return {
    ...JSON.parse(JSON.stringify(template)),
    id: uid('tpl'),
    name: `${template.name} (کپی)`,
    system: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    order: Object.keys(templates).length
  }
}

export function updateTemplate(template, patch = {}) {
  return { ...template, ...patch, updatedAt: Date.now() }
}

export function softDeleteTemplate(template) {
  return { ...template, deletedAt: Date.now(), updatedAt: Date.now() }
}

export function restoreTemplate(template) {
  return { ...template, deletedAt: null, updatedAt: Date.now() }
}

/** افزودن قطعه به قالب */
export function addPart(template, part) {
  const parts = [...template.parts, { ...part, order: template.parts.length }]
  return updateTemplate(template, { parts })
}

export function removePart(template, partId) {
  const parts = template.parts
    .filter((p) => p.id !== partId)
    .map((p, i) => ({ ...p, order: i }))
  return updateTemplate(template, { parts })
}

/** جابجایی قطعه بالا/پایین */
export function movePart(template, partId, direction) {
  const parts = [...template.parts].sort((a, b) => a.order - b.order)
  const idx = parts.findIndex((p) => p.id === partId)
  const target = idx + direction
  if (idx < 0 || target < 0 || target >= parts.length) return template
  ;[parts[idx], parts[target]] = [parts[target], parts[idx]]
  return updateTemplate(template, { parts: parts.map((p, i) => ({ ...p, order: i })) })
}

export function updatePart(template, partId, patch) {
  const parts = template.parts.map((p) => (p.id === partId ? { ...p, ...patch } : p))
  return updateTemplate(template, { parts })
}
