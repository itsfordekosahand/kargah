/**
 * مترجم کلیک‌های data-act — پورت handleAction (لاین 2286-2426 اسکریپت قدیمی).
 * کامپوننت‌ها همان data-act/data-* های قدیمی را می‌گذارند تا ساختار DOM عین نسخه قدیمی بماند.
 */
import { exportBackup, exportHTML } from '../management/backup.js'
import { installPwa } from '../management/pwa.js'

export function handleAction(store, act, d = {}) {
  const ui = store.ui
  switch (act) {
    /* navigation */
    case 'nav-tools': store.setTab('tools'); break
    case 'nav-jobs': store.setTab('jobs'); break
    case 'nav-sheets': store.setTab('sheets'); break
    case 'nav-hardware': store.setTab('hardware'); break
    case 'nav-calc': store.setTab('calc'); break
    case 'nav-dash': store.setTab('dash'); break
    case 'nav-settings': store.setTab('settings'); break

    /* tools */
    case 'pick-tool-cat': ui.toolCat = d.val; break
    case 'back-tools': ui.toolCat = null; break
    case 'tool-edit': store.openModal('tool', { editId: d.id }); break
    case 'new-tool-in-cat': store.openModal('tool', { presetCat: d.cat }); break

    /* sheets */
    case 'pick-sheets-cat': ui.sheetsCat = d.val; ui.sheetsSub = null; break
    case 'back-sheets-cat': ui.sheetsCat = null; ui.sheetsSub = null; break
    case 'pick-sheets-sub': ui.sheetsSub = d.val; break
    case 'back-sheets-sub': ui.sheetsSub = null; break
    case 'sheet-edit': store.openWizard('sheet', d.id); break
    case 'new-sheet-in-sub': store.openWizard('sheet', null, d.cat, d.sub); break
    case 'toggle-sheet-search': ui.showSheetSearch = !ui.showSheetSearch; break
    case 'clear-sheet-search': ui.sq = null; break

    /* hardware */
    case 'pick-hardware-cat': ui.hardwareCat = d.val; ui.hardwareSub = null; break
    case 'back-hardware-cat': ui.hardwareCat = null; ui.hardwareSub = null; break
    case 'pick-hardware-sub': ui.hardwareSub = d.val; break
    case 'back-hardware-sub': ui.hardwareSub = null; break
    case 'hw-edit': store.openWizard('hardware', d.id); break
    case 'new-hw-in-sub': store.openWizard('hardware', null, d.cat, d.sub); break

    /* category / sub editing */
    case 'new-cat': store.createNewCategory(d.type); break
    case 'new-sub': store.createNewSub(d.type); break
    case 'rename-cat': {
      const name = prompt('نام جدید دسته:', d.val)
      if (name) store.renameCategory(d.type, d.val, name)
      break
    }
    case 'del-cat': store.deleteCategory(d.type, d.val); break
    case 'rename-sub': {
      const name = prompt('نام جدید زیردسته:', d.val)
      if (name) store.renameSub(d.type, d.cat, d.val, name)
      break
    }
    case 'del-sub': store.deleteSub(d.type, d.cat, d.val); break

    /* jobs */
    case 'start-job': store.openStartJob(); break
    case 'open-job': ui.openJob = d.id; break
    case 'close-job-view': ui.openJob = null; break
    case 'job-filter': ui.jobFilter = d.val; break
    case 'return-all': store.returnAll(d.id); break
    case 'job-close': store.closeJob(d.id); break
    case 'job-reopen': store.reopenJob(d.id); break

    /* templates / invoice */
    case 'toggle-inv-theme': {
      const t = store.templateOf(d.id); if (!t) break
      t.invTheme = t.invTheme === 'dark' ? 'light' : 'dark'
      store.save()
      break
    }
    case 'new-template': store.newTemplate(); break
    case 'open-template': ui.openTemplate = d.id; break
    case 'close-template': ui.openTemplate = null; break
    case 'dup-template': store.duplicateTemplate(d.id); break
    case 'add-item': store.openModal('item', { item: { tplId: d.tpl, itemId: null } }); break
    case 'edit-item': store.openModal('item', { item: { tplId: d.tpl, itemId: d.item } }); break
    case 'del-item': store.deleteItem(d.tpl, d.item); break
    case 'print-invoice': store.printInvoice(d.id); break

    /* delete */
    case 'del': {
      const names = { tool: 'ابزار', sheet: 'ورق', hardware: 'یراق', template: 'قالب', job: 'کار' }
      if (!confirm(`حذف این ${names[d.type] || 'مورد'}؟`)) break
      store.deleteRow(d.type, d.id)
      break
    }

    /* settings */
    case 'export': exportBackup(store); break
    case 'export-html': exportHTML(store); break
    case 'install-pwa': { const msg = installPwa(); if (msg) store.toast(msg, 'warn'); break }
    case 'import': { const f = document.getElementById('fileIn'); if (f) f.click(); break }
    case 'wipe': store.wipe(); break
    case 'demo': store.loadDemo(); break
    default: break
  }
}
