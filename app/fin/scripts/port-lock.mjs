/**
 * پورت lock.js (کلاسیک/مبدأ) به ماژول ES — بدون تغییر در هیچ‌یک از جزئیات رفتاری.
 * کارهای این اسکریپت:
 *   1) حذف IIFE بیرونی
 *   2) انتقال توابع کریپتو به core/lock-crypto.js (خالص، بدون DOM — قابل تست با node --test)
 *   3) جایگزینی بخش «server API» (fetchUsers/saveUser/deleteRow) با فراخوانی
 *      از core/api.js تا لایه دسترسی به داده متمرکز بماند (رفتار یکسان)
 *   4) گارد typeof document (قابل import شدن در تست — رفتار مرورگر دست‌نخورده)
 *   5) افزودن import ها و export ها
 */
import fs from 'node:fs'

const SRC = '/tmp/kargah/x/kargah-super-main/public/fin/lock.js'
const OUT = '/data/.hermes/cache/scratch/kargah-migrate/fin-app/src/modules/maldi/core/lock.js'

let lines = fs.readFileSync(SRC, 'utf8').split('\n')

// 1) حذف IIFE
if (lines[17].trim() !== '(function () {') throw new Error('unexpected line 18: ' + lines[17])
const endIdx = lines.lastIndexOf('})();')
if (endIdx < 0) throw new Error('IIFE close not found')
lines.splice(endIdx, 1)
lines.splice(17, 1)
let text = lines.join('\n')

// حذف ثابت‌هایی که اکنون از lock-crypto.js import می‌شوند (جلوگیری از اعلان تکراری)
text = text.replace(/\n {2}var MIN_LEN = 4;/, '\n  /* MIN_LEN → core/lock-crypto.js */')
text = text.replace(/\n {2}var RECORD_VERSION = 3;/, '\n  /* RECORD_VERSION → core/lock-crypto.js */')
if (text.includes('var MIN_LEN') || text.includes('var RECORD_VERSION')) {
  throw new Error('MIN_LEN/RECORD_VERSION were not removed')
}

// 2) حذف بخش crypto (به lock-crypto.js منتقل شده)
const cryptoMarker = '  /* ---------- crypto helpers ---------- */'
const cryptoStart = text.indexOf(cryptoMarker)
if (cryptoStart < 0) throw new Error('crypto marker not found')
const serverMarker = '  /* ---------- server API (multi-user) ---------- */'
const serverStart = text.indexOf(serverMarker)
if (serverStart < 0 || serverStart < cryptoStart) throw new Error('server API marker not found')
text = text.slice(0, cryptoStart) +
  '  /* crypto helpers → core/lock-crypto.js (import شده در بالای فایل) */\n\n' +
  text.slice(serverStart)

// 3) جایگزینی بخش transport
const startIdx = text.indexOf(serverMarker)
const endMarker = '  function makeUserRecord(name, plain) {'
const stopIdx = text.indexOf(endMarker)
if (stopIdx < 0 || stopIdx < startIdx) throw new Error('makeUserRecord not found')

const replacement = `  /* ---------- server API (multi-user) ----------
     fetch واقعی در core/api.js متمرکز شده؛ رفتار/پیام‌ها عیناً حفظ شده‌اند. */
  function fetchUsers() { return lockFetchRows(); }
  function saveUser(rec) {
    return lockPut(rec).then(function (r) { SERVER_MSG = r.msg; return r.ok; });
  }
  function deleteRow(id) {
    return lockDelete(id).then(function (r) { SERVER_MSG = r.msg; return r.ok; });
  }

`
text = text.slice(0, startIdx) + replacement + text.slice(stopIdx)

// 4) گارد document برای delegated wiring
const clickWire = `  document.addEventListener('click', function (e) {`
const clickWireStart = text.indexOf(clickWire)
if (clickWireStart < 0) throw new Error('click wiring not found')
const clickWireEnd = text.indexOf('  });', clickWireStart)
if (clickWireEnd < 0) throw new Error('click wiring end not found')
const clickBlock = text.slice(clickWireStart, clickWireEnd + '  });'.length)
text = text.slice(0, clickWireStart) +
  "  if (typeof document !== 'undefined') " + clickBlock.replace(/^ {2}/, '') +
  text.slice(clickWireEnd + '  });'.length)

// 5) گارد init
const initBlock = `  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init);`
if (text.indexOf(initBlock) < 0) throw new Error('init block not found: ' + JSON.stringify(text.slice(-260)))
text = text.replace(initBlock,
  `  if (typeof document !== 'undefined') {
    if (document.body) init();
    else document.addEventListener('DOMContentLoaded', init);
  }`)

// 6) هدر + import ها
const header = `/* ============================================================
   Decor Sahand — login & roles (admin / user)
   ------------------------------------------------------------
   پورت ماژولی lock.js مبدأ (کلاسیک) به ES module — متن و رفتار
   عیناً حفظ شده؛ فقط لایه fetch به core/api.js و کریپتو به
   core/lock-crypto.js منتقل شده است.

   Every module section (anbar / fin) has its OWN user store in
   its own Cloudflare D1 database (GET/PUT/DELETE /api/lock).
   Rows: id = 'u_<username>'  (+ legacy id 'lock' which is migrated
   to the built-in admin account on first boot).

   Flow:
     boot -> fetch users -> seed 'admin' with default '1111'
           -> LOGIN screen (username + password)
           -> admin  : full access + user management console
           -> user   : app only (no password management)

   Nothing about the password is kept on the device — only the
   username + role live in sessionStorage for the tab session.
   ============================================================ */
import { lockFetchRows, lockPut, lockDelete } from './api.js'
import {
  MIN_LEN, RECORD_VERSION, toHex, randomSalt, hasWebCrypto, hexToBytes,
  pickAlg, pickIter, sha256hex, hashPassword, hashEquals
} from './lock-crypto.js'
`
text = header + text

// 7) export ها
const exports = `
/* ---------------- exports (برای تست واحد و استفاده از ماژول) ---------------- */
export {
  MIN_LEN, ADMIN_NAME, ADMIN_DEFAULT_PASSWORD, RECORD_VERSION, MODULE, SESSION_KEY,
  sha256hex, pickAlg, pickIter, randomSalt, toHex, hexToBytes, hasWebCrypto,
  hashPassword, hashEquals,
  makeUserRecord, adoptRows, userByName, hasRealAdmin, isAdmin, sessionUser,
  fetchUsers, saveUser, deleteRow, ensureAdmin, boot, init, openAdmin, logout, change
}

/** دسترسی فقط-خواندنی به وضعیت داخلی برای تست‌ها */
export function lockInternals() {
  return {
    get users() { return users },
    get legacyRec() { return legacyRec },
    get currentUser() { return currentUser },
    get unlocked() { return unlocked },
    get serverMsg() { return SERVER_MSG }
  }
}

export default { boot: boot, init: init, lockInternals: lockInternals }
`
text = text + exports

fs.writeFileSync(OUT, text)
console.log('lock.js written:', text.length, 'bytes')
