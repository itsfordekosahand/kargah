/**
 * Store مرکزی ماژول (Pinia): ثابتها، قالبها، نمونه‌های ذخیره‌شده،
 * نمونه‌های یادگیری، وضعیت بارگذاری و خطا.
 * همه تغییرات بلافاصله روی localStorage ذخیره می‌شوند.
 */
import { defineStore } from 'pinia'
import { defaultConstants, constantList, setConstantValue, addConstant as addConst, removeConstant, validateConstants } from '../core/constants.js'
import { defaultTemplates, uid } from '../config/defaults.js'
import {
  templatesList, createTemplate, duplicateTemplate, updateTemplate as patchTemplate,
  softDeleteTemplate, restoreTemplate, addPart, removePart, movePart, updatePart,
  validateTemplate
} from '../core/templates.js'
import { createInstance, updateInstance, softDeleteInstance, instancesList, setOverride } from '../core/instances.js'
import { extractRules, applyExtractedRules, sampleFromCalculation } from '../core/rule-extractor.js'
import { calculateCabinet, summarize } from '../core/calculator.js'
import * as storage from '../services/storage.js'
import { SK } from './selectors.js'

export const useCabinetStore = defineStore('cabinet-dimensions', {
  state: () => ({
    constants: {},
    templates: {},
    instances: {},
    samples: {},
    activeTemplateId: null,
    loading: false,
    ready: false,
    error: null,
    notice: null,
    storageOk: true,
    lastSavedAt: null,
    /** نتیجه آخرین استخراج قاعده (موقتی، ذخیره نمی‌شود) */
    extraction: null
  }),

  getters: {
    /** قالبهای فعال، مرتب‌شده */
    templateList: (s) => templatesList(s.templates),
    instanceList: (s) => instancesList(s.instances),
    sampleList: (s) => Object.values(s.samples).filter((x) => x && !x.deletedAt).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    constantArray: (s) => constantList(s.constants),

    activeTemplate(s) {
      return s.templates[s.activeTemplateId] && !s.templates[s.activeTemplateId].deletedAt
        ? s.templates[s.activeTemplateId]
        : null
    },

    templateById: (s) => (id) => (s.templates[id] && !s.templates[id].deletedAt ? s.templates[id] : null),

    hasData(s) {
      return Object.keys(s.templates).length > 0 || Object.keys(s.instances).length > 0
    }
  },

  actions: {
    /* ---------------- بارگذاری و ذخیره ---------------- */

    init() {
      if (this.ready) return
      this.loading = true
      this.error = null
      try {
        this.storageOk = storage.storageAvailable()
        const c = storage.loadCollection(storage.STORAGE_KEYS.constants)
        const t = storage.loadCollection(storage.STORAGE_KEYS.templates)
        const i = storage.loadCollection(storage.STORAGE_KEYS.instances)
        const sa = storage.loadCollection(storage.STORAGE_KEYS.samples)

        this.constants = Object.keys(c.items).length ? c.items : defaultConstants()
        this.templates = Object.keys(t.items).length ? t.items : indexById(defaultTemplates())
        this.instances = i.items || {}
        this.samples = sa.items || {}

        const first = templatesList(this.templates)[0]
        this.activeTemplateId = first ? first.id : null

        if (!Object.keys(c.items).length || !Object.keys(t.items).length) this.persist()
      } catch (e) {
        this.error = e?.message || 'خطا در خواندن اطلاعات ذخیره‌شده'
        // در صورت خطا، با مقادیر پیش‌فرض ادامه بده تا UI کرش نکند
        if (!Object.keys(this.constants).length) this.constants = defaultConstants()
        if (!Object.keys(this.templates).length) this.templates = indexById(defaultTemplates())
      } finally {
        this.loading = false
        this.ready = true
      }
    },

    persist() {
      try {
        const ok = [
          storage.saveCollection(storage.STORAGE_KEYS.constants, this.constants),
          storage.saveCollection(storage.STORAGE_KEYS.templates, this.templates),
          storage.saveCollection(storage.STORAGE_KEYS.instances, this.instances),
          storage.saveCollection(storage.STORAGE_KEYS.samples, this.samples)
        ].every(Boolean)
        this.storageOk = ok
        this.lastSavedAt = Date.now()
        if (!ok) this.error = 'ذخیره‌سازی محلی در دسترس نیست (حالت آفلاین بدون حافظه).'
      } catch (e) {
        this.storageOk = false
        this.error = e?.message || 'خطا در ذخیره‌سازی'
      }
    },

    clearError() { this.error = null },
    setNotice(msg) { this.notice = msg },

    setActiveTemplate(id) {
      if (this.templates[id] && !this.templates[id].deletedAt) this.activeTemplateId = id
    },

    /* ---------------- ثابتها ---------------- */

    updateConstant(key, value) {
      const num = Number(value)
      if (!Number.isFinite(num)) {
        this.error = 'مقدار ثابت باید عدد باشد.'
        return false
      }
      this.constants = setConstantValue(this.constants, key, num)
      const errs = validateConstants(this.constants)
      if (errs.length) {
        this.error = errs[0].message
        return false
      }
      this.error = null
      this.persist()
      return true
    },

    addNewConstant(payload) {
      this.constants = addConst(this.constants, payload)
      this.persist()
    },

    deleteConstant(key) {
      this.constants = removeConstant(this.constants, key)
      this.persist()
    },

    /* ---------------- قالبها ---------------- */

    addTemplate(payload) {
      const tpl = createTemplate(payload)
      const check = validateTemplate(tpl, this.constants)
      if (!check.valid) {
        this.error = check.errors[0].message
        return { ok: false, errors: check.errors }
      }
      this.templates = { ...this.templates, [tpl.id]: tpl }
      this.activeTemplateId = tpl.id
      this.persist()
      return { ok: true, template: tpl, errors: [] }
    },

    duplicateTemplate(id) {
      const src = this.templates[id]
      if (!src) return { ok: false }
      const copy = duplicateTemplate(src, this.templates)
      this.templates = { ...this.templates, [copy.id]: copy }
      this.persist()
      return { ok: true, template: copy }
    },

    updateTemplate(id, patch) {
      const tpl = this.templates[id]
      if (!tpl) return { ok: false, errors: [{ message: 'قالب پیدا نشد.' }] }
      const next = patchTemplate(tpl, patch)
      const check = validateTemplate(next, this.constants)
      if (!check.valid) {
        this.error = check.errors[0].message
        return { ok: false, errors: check.errors }
      }
      this.templates = { ...this.templates, [id]: next }
      this.error = null
      this.persist()
      return { ok: true, errors: [] }
    },

    /** ذخیره بدون اعتبارسنجی سخت (برای ویرایش مرحله‌ای در ادیتور) */
    commitTemplate(id, nextTemplate) {
      this.templates = { ...this.templates, [id]: { ...nextTemplate, updatedAt: Date.now() } }
      this.persist()
    },

    deleteTemplate(id) {
      const tpl = this.templates[id]
      if (!tpl) return
      this.templates = { ...this.templates, [id]: softDeleteTemplate(tpl) }
      if (this.activeTemplateId === id) {
        const first = templatesList(this.templates)[0]
        this.activeTemplateId = first ? first.id : null
      }
      this.persist()
    },

    restoreTemplate(id) {
      const tpl = this.templates[id]
      if (!tpl) return
      this.templates = { ...this.templates, [id]: restoreTemplate(tpl) }
      this.persist()
    },

    addPartToTemplate(id, part) {
      const tpl = this.templates[id]
      if (!tpl) return
      this.commitTemplate(id, addPart(tpl, part))
    },

    removePartFromTemplate(id, partId) {
      const tpl = this.templates[id]
      if (!tpl) return
      this.commitTemplate(id, removePart(tpl, partId))
    },

    movePartInTemplate(id, partId, dir) {
      const tpl = this.templates[id]
      if (!tpl) return
      this.commitTemplate(id, movePart(tpl, partId, dir))
    },

    updatePartInTemplate(id, partId, patch) {
      const tpl = this.templates[id]
      if (!tpl) return
      this.commitTemplate(id, updatePart(tpl, partId, patch))
    },

    /* ---------------- نمونه‌ها (کابینتهای ذخیره‌شده) ---------------- */

    saveInstance({ name, templateId, params, overrides = {} }) {
      const tpl = this.templates[templateId]
      if (!tpl) {
        this.error = 'قالب مرجع پیدا نشد.'
        return { ok: false }
      }
      const result = calculateCabinet(tpl, params, this.constants, overrides)
      const inst = createInstance({ name, templateId, templateName: tpl.name, params, result, overrides })
      this.instances = { ...this.instances, [inst.id]: inst }
      this.error = null
      this.persist()
      return { ok: true, instance: inst }
    },

    updateInstanceById(id, patch) {
      const inst = this.instances[id]
      if (!inst) return
      this.instances = { ...this.instances, [id]: updateInstance(inst, patch) }
      this.persist()
    },

    deleteInstance(id) {
      const inst = this.instances[id]
      if (!inst) return
      this.instances = { ...this.instances, [id]: softDeleteInstance(inst) }
      this.persist()
    },

    overrideInstancePart(instanceId, partId, field, value) {
      const inst = this.instances[instanceId]
      if (!inst) return
      this.instances = { ...this.instances, [instanceId]: setOverride(inst, partId, field, value) }
      this.persist()
    },

    /* ---------------- نمونه‌های یادگیری (استخراج قاعده) ---------------- */

    addSample(sample) {
      const s = {
        id: uid('sample'),
        name: sample.name || `نمونه ${Object.keys(this.samples).length + 1}`,
        params: { ...sample.params },
        parts: JSON.parse(JSON.stringify(sample.parts || {})),
        order: Object.keys(this.samples).length,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null
      }
      this.samples = { ...this.samples, [s.id]: s }
      this.persist()
      return s
    },

    updateSample(id, patch) {
      const s = this.samples[id]
      if (!s) return
      this.samples = { ...this.samples, [id]: { ...s, ...patch, params: { ...s.params, ...(patch.params || {}) }, updatedAt: Date.now() } }
      this.persist()
    },

    deleteSample(id) {
      const s = this.samples[id]
      if (!s) return
      this.samples = { ...this.samples, [id]: { ...s, deletedAt: Date.now(), updatedAt: Date.now() } }
      this.persist()
    },

    clearSamples() {
      this.samples = {}
      this.persist()
    },

    /** تبدیل یک کابینت ذخیره‌شده به نمونه یادگیری */
    sampleFromInstance(instanceId) {
      const inst = this.instances[instanceId]
      if (!inst) return null
      const tpl = this.templates[inst.templateId]
      const parts = {}
      const calc = calculateCabinet(tpl || { parts: [] }, inst.params, this.constants, inst.overrides)
      for (const p of calc.parts) parts[p.id] = { length: p.length, width: p.width, name: p.name }
      return this.addSample({ name: inst.name, params: inst.params, parts })
    },

    /**
     * استخراج قواعد از نمونه‌ها برای یک قالب.
     * @returns {{ok, errors, results, sampleCount}}
     */
    extractRulesFromSamples(templateId = this.activeTemplateId) {
      const tpl = this.templates[templateId]
      if (!tpl) {
        this.extraction = { templateId: null, errors: ['قالبی انتخاب نشده است.'], results: [], sampleCount: 0, source: 'samples' }
        return this.extraction
      }
      const out = this.runExtraction(templateId, this.sampleList, 'samples')
      return out
    },

    /** استخراج از کابینتهای ذخیره‌شده (تبدیل به نمونه) */
    extractRulesFromInstances(templateId = this.activeTemplateId) {
      const tpl = this.templates[templateId]
      if (!tpl) {
        this.extraction = { templateId: null, errors: ['قالبی انتخاب نشده است.'], results: [], sampleCount: 0, source: 'instances' }
        return this.extraction
      }
      const samples = this.instanceList
        .filter((i) => i.templateId === templateId)
        .map((i) => sampleFromCalculation(i.name, i.params, (i.result?.parts || []).map((p) => ({ id: p.id, length: p.length, width: p.width }))))
      return this.runExtraction(templateId, samples, 'instances')
    },

    runExtraction(templateId, samples, source = 'samples') {
      const tpl = this.templates[templateId]
      const partMeta = {}
      if (tpl) for (const p of tpl.parts) partMeta[p.id] = { name: p.name, order: p.order }
      const out = extractRules(samples, { partMeta })
      this.extraction = { ...out, templateId, source }
      this.error = out.ok ? null : (out.errors[0] || null)
      return this.extraction
    },

    clearExtraction() { this.extraction = null },

    /** ویرایش یک قاعده پیشنهادی قبل از تأیید */
    updateExtractionRule(partId, dim, rule) {
      if (!this.extraction) return
      this.extraction = {
        ...this.extraction,
        results: this.extraction.results.map((r) =>
          r.partId !== partId ? r : { ...r, dims: { ...r.dims, [dim]: { ...r.dims[dim], rule, edited: true } } }
        )
      }
    },

    /** تأیید و اعمال کل قواعد روی قالب */
    confirmExtraction() {
      if (!this.extraction?.templateId) return { ok: false, errors: ['قالبی برای اعمال انتخاب نشده است.'] }
      const res = this.applyExtraction(this.extraction.templateId, this.extraction.results)
      if (res.ok) this.extraction = null
      return res
    },

    /** اعمال قواعد استخراجشده روی قالب (با اعتبارسنجی کامل) */
    applyExtraction(templateId, results) {
      const tpl = this.templates[templateId]
      if (!tpl) return { ok: false, errors: ['قالب پیدا نشد.'] }
      const next = applyExtractedRules(tpl, results)
      const check = validateTemplate(next, this.constants)
      if (!check.valid) {
        this.error = check.errors[0].message
        return { ok: false, errors: check.errors }
      }
      this.templates = { ...this.templates, [templateId]: next }
      this.error = null
      this.persist()
      return { ok: true, errors: [] }
    },

    /* ---------------- محاسبه ---------------- */

    calculate(params, templateId = this.activeTemplateId, overrides = {}) {
      const tpl = this.templates[templateId]
      if (!tpl) return { parts: [], summary: summarize([]), params: {} }
      return calculateCabinet(tpl, params, this.constants, overrides)
    },

    resetToDefaults() {
      this.constants = defaultConstants()
      this.templates = indexById(defaultTemplates())
      this.activeTemplateId = templatesList(this.templates)[0]?.id || null
      this.persist()
    }
  }
})

function indexById(list) {
  const out = {}
  for (const item of list) out[item.id] = item
  return out
}

export { SK }
