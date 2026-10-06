/* ============================================================
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
/* ============================================================
   Decor Sahand — login & roles (admin / user)
   ------------------------------------------------------------
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
  'use strict';

  /* Caller MUST set before init():
       window.DECOR_LOCK_API_BASE  (module's own API)
       window.DECOR_LOCK_API_KEY   (real X-API-Key)
       window.DECOR_LOCK_MODULE    ('anbar' | 'fin')            */

  /* MIN_LEN → core/lock-crypto.js */
  var ADMIN_NAME = 'admin';
  var ADMIN_DEFAULT_PASSWORD = '1111';
  /* RECORD_VERSION → core/lock-crypto.js */
  var LOCK_PATH = 'lock';
  if (typeof window !== 'undefined' && window.DECOR_LOCK_PATH) LOCK_PATH = String(window.DECOR_LOCK_PATH).replace(/^\/api\//, '');

  var MODULE = (function () {
    if (typeof window !== 'undefined' && window.DECOR_LOCK_MODULE) return String(window.DECOR_LOCK_MODULE);
    var base = (typeof window !== 'undefined' && window.DECOR_LOCK_API_BASE) || '';
    if (base.indexOf('ktd') !== -1) return 'fin';
    if (base.indexOf('anbar') !== -1) return 'anbar';
    return 'default';
  })();
  var SESSION_KEY = 'decor_session_' + MODULE;

  var root = null;
  var users = [];          // [{id:'u_name', alg, iter, salt, hash, updated_at}]
  var legacyRec = null;    // legacy id:'lock' row — bridges admin until u_admin exists
  var currentUser = null;  // username
  var unlocked = false;
  var SERVER_MSG = '';
  var QUOTA_MSG = 'سرور موقتاً محدود است (سهمیه روزانه نوشتن). کمی بعد دوباره تلاش کنید.';

  /* ---------- session (username only — role is derived) ---------- */

  function sessionUser() {
    try { return sessionStorage.getItem(SESSION_KEY) || null; } catch (e) { return null; }
  }
  function setSessionUser(name) {
    try { name ? sessionStorage.setItem(SESSION_KEY, name) : sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
  }
  function isAdmin() { return currentUser === ADMIN_NAME; }

  function userId(name) { return 'u_' + name; }
  function userByName(name) {
    if (!name) return null;
    var want = userId(String(name).trim());
    for (var i = 0; i < users.length; i++) if (users[i] && users[i].id === want) return users[i];
    // the legacy single-password row acts as the admin account until a real
    // u_admin row has been written (server seed may be temporarily blocked)
    if (want === userId(ADMIN_NAME) && legacyRec && legacyRec.hash) return legacyRec;
    return null;
  }
  function hasRealAdmin() {
    for (var i = 0; i < users.length; i++) if (users[i] && users[i].id === userId(ADMIN_NAME)) return true;
    return false;
  }
  function adoptRows(rows) {
    legacyRec = null;
    for (var i = 0; i < rows.length; i++) if (rows[i] && rows[i].id === 'lock') legacyRec = rows[i];
    users = rows.filter(function (r) { return r && r.id && r.id !== 'lock'; });
    return users;
  }

  /* crypto helpers → core/lock-crypto.js (import شده در بالای فایل) */

  /* ---------- server API (multi-user) ----------
     fetch واقعی در core/api.js متمرکز شده؛ رفتار/پیام‌ها عیناً حفظ شده‌اند. */
  function fetchUsers() { return lockFetchRows(); }
  function saveUser(rec) {
    return lockPut(rec).then(function (r) { SERVER_MSG = r.msg; return r.ok; });
  }
  function deleteRow(id) {
    return lockDelete(id).then(function (r) { SERVER_MSG = r.msg; return r.ok; });
  }

  function makeUserRecord(name, plain) {
    var alg = pickAlg(), iter = pickIter(alg), salt = randomSalt();
    return hashPassword(plain, salt, iter, alg).then(function (h) {
      return { id: userId(name), v: RECORD_VERSION, alg: alg, iter: iter, salt: salt, hash: h, updated_at: new Date().toISOString() };
    });
  }

  /* First boot: make sure the built-in admin account exists. */
  function ensureAdmin() {
    if (hasRealAdmin()) return Promise.resolve(true);
    return makeUserRecord(ADMIN_NAME, ADMIN_DEFAULT_PASSWORD).then(function (rec) {
      return saveUser(rec).then(function (ok) { if (ok) users.push(rec); return ok; });
    });
  }

  /* ---------- overlay DOM ---------- */

  var CSS =
    '#decor-lock{position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;' +
    'padding:20px;background:radial-gradient(900px 500px at 70% -10%,rgba(255,153,0,.16),transparent 60%),#0b1220;' +
    "font-family:'Vazirmatn','Segoe UI',Tahoma,system-ui,sans-serif;color:#e7edf7;direction:rtl}" +
    '#decor-lock *{box-sizing:border-box}' +
    '#decor-lock .lk-card{width:100%;max-width:360px;background:#121a2b;border:1px solid #22304a;border-radius:20px;' +
    'padding:26px 22px 22px;box-shadow:0 24px 60px rgba(0,0,0,.55)}' +
    '#decor-lock .lk-brand{text-align:center;font-weight:800;font-size:26px;line-height:1;letter-spacing:-.5px;margin-bottom:4px}' +
    '#decor-lock .lk-brand b{color:#fff;font-weight:800}' +
    '#decor-lock .lk-brand i{color:#FF9900;font-style:normal;text-shadow:0 4px 18px rgba(255,153,0,.45)}' +
    '#decor-lock .lk-rule{width:96px;height:4px;border-radius:99px;margin:9px auto 18px;' +
    'background:linear-gradient(90deg,#d97706,#FF9900)}' +
    '#decor-lock h1{font-size:17px;margin:0 0 6px;text-align:center;font-weight:800}' +
    '#decor-lock p.lk-sub{font-size:12.8px;color:#93a3bf;text-align:center;margin:0 0 16px;line-height:1.9}' +
    '#decor-lock label{display:block;font-size:12.5px;color:#93a3bf;margin:0 0 6px}' +
    '#decor-lock .lk-field{position:relative;margin-bottom:12px}' +
    '#decor-lock input{width:100%;padding:12px 14px;padding-left:44px;background:#0e1626;border:1px solid #26344f;' +
    'border-radius:12px;color:#e7edf7;font-size:15px;font-family:inherit;outline:none;transition:border-color .18s,box-shadow .18s}' +
    '#decor-lock input:focus{border-color:#FF9900;box-shadow:0 0 0 3px rgba(255,153,0,.16)}' +
    '#decor-lock .lk-eye{position:absolute;left:8px;top:50%;transform:translateY(-50%);background:none;border:0;' +
    'color:#93a3bf;cursor:pointer;padding:6px;font-size:14px;font-family:inherit}' +
    '#decor-lock .lk-eye:hover{color:#FF9900}' +
    '#decor-lock .lk-btn{width:100%;padding:13px;border:0;border-radius:12px;background:linear-gradient(180deg,#ff9900,#e07f00);' +
    'color:#1a1206;font-weight:800;font-size:15px;font-family:inherit;cursor:pointer;margin-top:6px;transition:transform .12s,filter .18s}' +
    '#decor-lock .lk-btn:hover{filter:brightness(1.06)}' +
    '#decor-lock .lk-btn:active{transform:scale(.985)}' +
    '#decor-lock .lk-btn:disabled{opacity:.55;cursor:default}' +
    '#decor-lock .lk-err{min-height:19px;font-size:12.6px;color:#fca5a5;text-align:center;margin-top:10px;line-height:1.7}' +
    '#decor-lock .lk-note{font-size:11.6px;color:#6f819e;text-align:center;margin-top:14px;line-height:1.9;' +
    'border-top:1px solid #1c2740;padding-top:12px}' +
    '#decor-lock .lk-shake{animation:lkshake .32s}' +
    '@keyframes lkshake{0%,100%{transform:translateX(0)}25%{transform:translateX(-7px)}75%{transform:translateX(7px)}}';

  var ADMIN_CSS =
    '#decor-lock-admin{position:fixed;inset:0;z-index:1000001;display:flex;align-items:center;justify-content:center;' +
    'padding:20px;background:rgba(4,8,16,.78);backdrop-filter:blur(3px);' +
    "font-family:'Vazirmatn','Segoe UI',Tahoma,system-ui,sans-serif;color:#e7edf7;direction:rtl}" +
    '#decor-lock-admin *{box-sizing:border-box}' +
    '#decor-lock-admin .la-card{width:100%;max-width:440px;max-height:88vh;overflow-y:auto;background:#121a2b;' +
    'border:1px solid #22304a;border-radius:20px;padding:22px 20px;box-shadow:0 24px 60px rgba(0,0,0,.6)}' +
    '#decor-lock-admin h1{font-size:16.5px;margin:0 0 4px;font-weight:800}' +
    '#decor-lock-admin .la-sub{font-size:12px;color:#93a3bf;margin-bottom:14px}' +
    '#decor-lock-admin h2{font-size:13.5px;margin:18px 0 8px;color:#FF9900;font-weight:800;' +
    'border-top:1px solid #1c2740;padding-top:14px}' +
    '#decor-lock-admin input{width:100%;padding:10px 12px;background:#0e1626;border:1px solid #26344f;border-radius:10px;' +
    'color:#e7edf7;font-size:14px;font-family:inherit;outline:none;margin-bottom:8px}' +
    '#decor-lock-admin input:focus{border-color:#FF9900;box-shadow:0 0 0 3px rgba(255,153,0,.16)}' +
    '#decor-lock-admin button{font-family:inherit;cursor:pointer;border-radius:9px;transition:filter .15s,background .15s}' +
    '#decor-lock-admin .la-users{display:flex;flex-direction:column;gap:6px;margin-bottom:6px}' +
    '#decor-lock-admin .la-user{display:flex;align-items:center;gap:8px;background:#0e1626;border:1px solid #26344f;' +
    'border-radius:10px;padding:8px 10px;font-size:13.5px}' +
    '#decor-lock-admin .la-user .name{flex:1;font-weight:700;overflow:hidden;text-overflow:ellipsis}' +
    '#decor-lock-admin .la-badge{font-size:10.5px;background:rgba(255,153,0,.16);color:#FF9900;border:1px solid rgba(255,153,0,.4);' +
    'border-radius:99px;padding:2px 8px;font-weight:800}' +
    '#decor-lock-admin .la-mini{background:#16203456;border:1px solid #26344f;color:#93a3bf;font-size:12px;padding:5px 9px}' +
    '#decor-lock-admin .la-mini:hover{border-color:#FF9900;color:#e7edf7}' +
    '#decor-lock-admin .la-mini.danger:hover{border-color:#ef4444;color:#fca5a5}' +
    '#decor-lock-admin .la-mini:disabled{opacity:.4;cursor:default}' +
    '#decor-lock-admin .la-primary{width:100%;padding:11px;background:linear-gradient(180deg,#ff9900,#e07f00);border:0;' +
    'color:#1a1206;font-weight:800;font-size:14px}' +
    '#decor-lock-admin .la-primary:disabled{opacity:.55;cursor:default}' +
    '#decor-lock-admin .la-ghost{width:100%;padding:10px;background:transparent;border:1px dashed #26344f;color:#93a3bf;font-size:13px}' +
    '#decor-lock-admin .la-ghost:hover{border-color:#FF9900;color:#e7edf7}' +
    '#decor-lock-admin .la-err{min-height:17px;font-size:12.4px;color:#fca5a5;text-align:center;margin-top:6px}' +
    '#decor-lock-admin .la-ok{font-size:12.4px;color:#86efac;text-align:center;margin-top:6px;min-height:16px}' +
    '#decor-lock-admin .la-row{display:flex;gap:8px}' +
    '#decor-lock-admin .la-row>*{flex:1}' +
    '#decor-lock-admin .la-empty{font-size:12.5px;color:#6f819e;text-align:center;padding:8px}' +
    '#decor-lock-admin .la-inline{background:#0b1220;border:1px dashed #2b3b58;border-radius:10px;padding:10px;margin-bottom:8px}' +
    '#decor-lock-admin .la-inline label{display:block;font-size:11.5px;color:#93a3bf;margin-bottom:4px}' +
    '#decor-lock-admin .la-shake{animation:lkshake .32s}' +
    '@keyframes lkshake{0%,100%{transform:translateX(0)}25%{transform:translateX(-7px)}75%{transform:translateX(7px)}}';

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'text') node.textContent = attrs[k];
      else if (k === 'html') node.innerHTML = attrs[k];
      else node.setAttribute(k, attrs[k]);
    }
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }
  function ensureStyle(id, css) {
    if (document.getElementById(id)) return;
    var s = document.createElement('style'); s.id = id; s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }
  function passwordField(id, placeholder) {
    var wrap = el('div', { 'class': 'lk-field' });
    var inp = el('input', { type: 'password', placeholder: placeholder, autocomplete: 'off', spellcheck: 'false', id: id });
    var eye = el('button', { type: 'button', 'class': 'lk-eye', 'aria-label': 'نمایش رمز', text: '👁' });
    eye.addEventListener('click', function () {
      inp.type = inp.type === 'password' ? 'text' : 'password';
      eye.textContent = inp.type === 'password' ? '👁' : '🙈';
    });
    wrap.appendChild(inp); wrap.appendChild(eye); return wrap;
  }
  function plainInput(placeholder) {
    return el('input', { type: 'text', placeholder: placeholder, autocomplete: 'off', spellcheck: 'false' });
  }
  function card(children) { var c = el('div', { 'class': 'lk-card' }); (children || []).forEach(function (n) { c.appendChild(n); }); return c; }
  function brand() {
    var b = el('div', { 'class': 'lk-brand' });
    b.appendChild(el('b', { text: 'Deco' }));
    b.appendChild(document.createTextNode(' '));
    b.appendChild(el('i', { text: 'Sahand' }));
    return b;
  }
  function ensureRoot() {
    if (root && root.isConnected) return root;
    ensureStyle('decor-lock-style', CSS);
    root = document.getElementById('decor-lock');
    if (!root) { root = el('div', { id: 'decor-lock' }); (document.body || document.documentElement).appendChild(root); }
    root.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    return root;
  }
  function hideRoot() { if (root) { root.remove(); root = null; } document.documentElement.style.overflow = ''; }
  function show(node) { var r = ensureRoot(); r.innerHTML = ''; r.appendChild(node); return r; }
  function shake(r) {
    var c = (r || document).querySelector('.lk-card, .la-card');
    if (!c) return;
    c.classList.remove('lk-shake', 'la-shake'); void c.offsetWidth; c.classList.add('lk-shake');
  }
  function toast(msg) {
    try {
      var t = el('div', { text: msg, role: 'status' });
      t.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:1000002;' +
        'background:#1A1A1A;color:#fff;border:1px solid #3A3A3A;border-radius:11px;padding:10px 16px;' +
        'font-size:13px;font-family:Vazirmatn,sans-serif;box-shadow:0 8px 26px rgba(0,0,0,.5);opacity:0;transition:opacity .3s';
      document.body.appendChild(t);
      requestAnimationFrame(function () { t.style.opacity = '1'; });
      setTimeout(function () { t.style.opacity = '0'; setTimeout(function () { if (t.parentNode) t.parentNode.remove(); }, 400); }, 2400);
    } catch (e) {}
  }

  /* ---------------- screens ---------------- */

  function renderLogin() {
    var err = el('div', { 'class': 'lk-err' });
    var user = plainInput('نام کاربری');
    user.id = 'lk-user';
    var pass = passwordField('lk-pass', 'رمز عبور');
    var btn = el('button', { type: 'submit', 'class': 'lk-btn', text: 'ورود' });
    var form = el('form', { 'class': 'lk-form' }, [
      brand(), el('div', { 'class': 'lk-rule' }),
      el('h1', { text: 'ورود به حساب' }),
      el('p', { 'class': 'lk-sub', text: 'نام کاربری و رمز عبور خود را وارد کنید.' }),
      user, pass, btn, err,
      el('div', { 'class': 'lk-note', text: 'کاربران و رمزها فقط توسط ادمین ساخته و مدیریت می‌شوند.' })
    ]);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = user.value.trim();
      var pw = pass.querySelector('input').value;
      if (!name) { err.textContent = 'نام کاربری را وارد کنید'; return; }
      if (!pw) { err.textContent = 'رمز عبور را وارد کنید'; return; }
      btn.disabled = true; btn.textContent = 'در حال بررسی...';
      err.textContent = '';
      fetchUsers().then(function (rows) {
        adoptRows(rows);
        var rec = userByName(name);
        if (!rec || !rec.hash) return Promise.reject({ code: 'nouser' });
        return hashPassword(pw, rec.salt, rec.iter || 120000, rec.alg || 'pbkdf2').then(function (h) {
          return hashEquals(h, rec.hash) ? rec : Promise.reject({ code: 'badpass' });
        });
      }).then(function () {
        finishUnlock(name);
      }).catch(function (ex) {
        btn.disabled = false; btn.textContent = 'ورود';
        if (ex && ex.code === 'nouser') err.textContent = 'نام کاربری یافت نشد';
        else if (ex && ex.code === 'badpass') { err.textContent = 'رمز عبور اشتباه است'; pass.querySelector('input').value = ''; pass.querySelector('input').focus(); }
        else err.textContent = 'خطا در اتصال به سرور';
        shake(root);
      });
    });
    show(form);
    setTimeout(function () { var i = document.getElementById('lk-user'); if (i) i.focus(); }, 60);
  }

  function renderSeedPending(needSeed) {
    var retry = el('button', { type: 'button', 'class': 'lk-btn', text: 'تلاش دوباره' });
    retry.addEventListener('click', function () { boot(); });
    var box = card([brand(), el('div', { 'class': 'lk-rule' }),
      el('h1', { text: 'در حال آماده‌سازی حساب ادمین…' }),
      el('p', { 'class': 'lk-sub', text: (needSeed
        ? 'حساب ادمین (admin با رمز پیش‌فرض 1111) هنوز در ساخته نشده است. '
        : 'حساب ادمین هنوز ثبت نشده است. ')
        + 'سرور ابری موقتاً محدود است؛ بعد از فعال شدن، دوباره تلاش کنید.' }),
      retry,
      el('div', { 'class': 'lk-err', text: QUOTA_MSG })]);
    show(box);
  }

  function renderOffline() {
    var retry = el('button', { type: 'button', 'class': 'lk-btn', text: 'تلاش دوباره' });
    retry.addEventListener('click', function () { boot(); });
    var box = card([brand(), el('div', { 'class': 'lk-rule' }),
      el('h1', { text: 'اتصال برقرار نشد' }),
      el('p', { 'class': 'lk-sub', text: 'برای ورود به اینترنت نیاز است؛ حساب‌ها روی سرور (دیتابیس) نگهداری می‌شوند.' }),
      retry,
      el('div', { 'class': 'lk-err', text: 'سرور در دسترس نیست. اتصال اینترنت را بررسی کنید.' })]);
    show(box);
  }

  function finishUnlock(name) {
    currentUser = name;
    unlocked = true;
    setSessionUser(name);
    try { document.body.classList.toggle('is-admin', isAdmin()); } catch (e) {}
    hideRoot();
    publishApi();
    try { window.dispatchEvent(new CustomEvent('decor:unlocked', { detail: { username: name, admin: isAdmin(), via: 'login' } })); } catch (e) {}
  }

  /* ---------------- admin console ---------------- */

  function closeAdmin() {
    var w = document.getElementById('decor-lock-admin');
    if (w) w.remove();
  }

  function openAdmin() {
    if (!unlocked) return;
    if (!isAdmin()) { toast('فقط ادمین می‌تواند کاربران و رمزها را مدیریت کند'); return; }
    ensureStyle('decor-lock-admin-style', ADMIN_CSS);
    closeAdmin();

    var wrap = el('div', { id: 'decor-lock-admin', role: 'dialog', 'aria-modal': 'true' });
    var errLine = el('div', { 'class': 'la-err' });
    var okLine = el('div', { 'class': 'la-ok' });
    function say(msg, isErr) {
      if (isErr) { errLine.textContent = msg; okLine.textContent = ''; }
      else { okLine.textContent = msg; errLine.textContent = ''; }
    }
    function clearSay() { errLine.textContent = ''; okLine.textContent = ''; }

    var head = [
      el('h1', { text: 'مدیریت کاربران و رمزها' }),
      el('div', { 'class': 'la-sub', html: 'کاربر فعلی: <b style="color:#FF9900">' + currentUser + '</b> <span class="la-badge">ادمین</span>' })
    ];

    /* --- users list --- */
    var listEl = el('div', { 'class': 'la-users' });
    var inlineBox = null; // active inline editor (change password of a user)

    function renderList() {
      listEl.innerHTML = '';
      var list = users.slice();
      if (legacyRec && !hasRealAdmin()) list.push({ id: userId(ADMIN_NAME) });
      if (!list.length) { listEl.appendChild(el('div', { 'class': 'la-empty', text: 'کاربری ثبت نشده است' })); return; }
      list.sort(function (a, b) {
        var aa = a.id === userId(ADMIN_NAME) ? 0 : 1, bb = b.id === userId(ADMIN_NAME) ? 0 : 1;
        return aa - bb || String(a.id).localeCompare(String(b.id));
      }).forEach(function (u) {
        var name = u.id.slice(2);
        var row = el('div', { 'class': 'la-user' }, [
          el('span', { 'class': 'name', text: name }),
          name === ADMIN_NAME ? el('span', { 'class': 'la-badge', text: 'ادمین' }) : null
        ]);
        var changeBtn = el('button', { type: 'button', 'class': 'la-mini', text: 'تغییر رمز' });
        changeBtn.addEventListener('click', function () { openInlineEditor(name); });
        row.appendChild(changeBtn);
        if (name !== ADMIN_NAME) {
          var delBtn = el('button', { type: 'button', 'class': 'la-mini danger', text: 'حذف' });
          delBtn.addEventListener('click', function () {
            if (!confirm('کاربر «' + name + '» حذف شود؟')) return;
            delBtn.disabled = true;
            deleteRow(userId(name)).then(function (ok) {
              if (!ok) { delBtn.disabled = false; say(SERVER_MSG || 'حذف ناموفق بود — ارتباط با سرور', true); return; }
              users = users.filter(function (x) { return x.id !== userId(name); });
              if (inlineBox && inlineBox.dataset.user === name) { inlineBox.remove(); inlineBox = null; }
              renderList();
              say('کاربر «' + name + '» حذف شد');
            });
          });
          row.appendChild(delBtn);
        }
        listEl.appendChild(row);
      });
    }

    /* --- inline: set a new password for `name` (admin reset) --- */
    function openInlineEditor(name) {
      if (inlineBox) inlineBox.remove();
      clearSay();
      var p1 = el('input', { type: 'password', placeholder: 'رمز جدید برای ' + name, autocomplete: 'off', spellcheck: 'false' });
      var p2 = el('input', { type: 'password', placeholder: 'تکرار رمز جدید', autocomplete: 'off', spellcheck: 'false' });
      var save = el('button', { type: 'button', 'class': 'la-primary', text: 'ذخیره رمز' });
      var cancel = el('button', { type: 'button', 'class': 'la-ghost', text: 'انصراف' });
      inlineBox = el('div', { 'class': 'la-inline' });
      inlineBox.dataset.user = name;
      inlineBox.appendChild(el('label', { text: 'رمز جدید برای «' + name + '»' }));
      inlineBox.appendChild(p1); inlineBox.appendChild(p2);
      inlineBox.appendChild(el('div', { 'class': 'la-row' }, [save, cancel]));
      var parent = listEl.parentNode || (wrap && wrap.querySelector('.la-card'));
      if (parent) parent.insertBefore(inlineBox, listEl.nextSibling);
      save.addEventListener('click', function () {
        if (p1.value.length < MIN_LEN) { shake(inlineBox); p1.focus(); return; }
        if (p1.value !== p2.value) { shake(inlineBox); p2.focus(); return; }
        save.disabled = true; save.textContent = 'در حال ذخیره...';
        makeUserRecord(name, p1.value).then(function (rec) {
          return saveUser(rec).then(function (ok) { return { ok: ok, rec: rec }; });
        }).then(function (res) {
          save.disabled = false; save.textContent = 'ذخیره رمز';
          if (!res || !res.ok) { say(SERVER_MSG || 'ارسال به سرور ناموفق بود', true); return; }
          users = users.filter(function (x) { return x.id !== res.rec.id; });
          users.push(res.rec);
          if (res.rec.id === userId(ADMIN_NAME) && legacyRec) { legacyRec = null; deleteRow('lock'); }
          inlineBox.remove(); inlineBox = null;
          renderList();
          say('رمز کاربر «' + name + '» عوض شد');
        });
      });
      cancel.addEventListener('click', function () { inlineBox.remove(); inlineBox = null; });
      setTimeout(function () { p1.focus(); }, 50);
    }

    /* --- create user --- */
    var newName = plainInput('نام کاربری (حروف انگلیسی، عدد، - و _)');
    var newPass = el('input', { type: 'password', placeholder: 'رمز عبور (حداقل ' + MIN_LEN + ' نویسه)', autocomplete: 'off', spellcheck: 'false' });
    var newPass2 = el('input', { type: 'password', placeholder: 'تکرار رمز عبور', autocomplete: 'off', spellcheck: 'false' });
    var createBtn = el('button', { type: 'button', 'class': 'la-primary', text: 'ساخت کاربر' });
    createBtn.addEventListener('click', function () {
      clearSay();
      var name = newName.value.trim();
      if (!/^[A-Za-z0-9_\-.]{2,32}$/.test(name)) { say('نام کاربری: ۲ تا ۳۲ نویسه، فقط حروف انگلیسی/عدد/-/_/.', true); return; }
      if (name.toLowerCase() === ADMIN_NAME) { say('نام کاربری admin مخصوص ادمین است', true); return; }
      if (userByName(name)) { say('این کاربر قبلاً ساخته شده', true); return; }
      if (newPass.value.length < MIN_LEN) { say('رمز باید حداقل ' + MIN_LEN + ' نویسه باشد', true); return; }
      if (newPass.value !== newPass2.value) { say('رمزهای واردشده یکسان نیستند', true); return; }
      createBtn.disabled = true; createBtn.textContent = 'در حال ساخت...';
      makeUserRecord(name, newPass.value).then(function (rec) {
        return saveUser(rec).then(function (ok) { return { ok: ok, rec: rec }; });
      }).then(function (res) {
        createBtn.disabled = false; createBtn.textContent = 'ساخت کاربر';
        if (!res || !res.ok) { say(SERVER_MSG || 'ارسال به سرور ناموفق بود', true); return; }
        users.push(res.rec);
        newName.value = ''; newPass.value = ''; newPass2.value = '';
        renderList();
        say('کاربر «' + name + '» ساخته شد');
      });
    });

    /* --- change MY password (requires current) --- */
    var curP = el('input', { type: 'password', placeholder: 'رمز فعلی خودتان', autocomplete: 'off', spellcheck: 'false' });
    var myP1 = el('input', { type: 'password', placeholder: 'رمز جدید', autocomplete: 'off', spellcheck: 'false' });
    var myP2 = el('input', { type: 'password', placeholder: 'تکرار رمز جدید', autocomplete: 'off', spellcheck: 'false' });
    var myBtn = el('button', { type: 'button', 'class': 'la-primary', text: 'تغییر رمز من' });
    myBtn.addEventListener('click', function () {
      clearSay();
      var me = userByName(currentUser);
      if (!me) { say('کاربر فعلی یافت نشد', true); return; }
      if (myP1.value.length < MIN_LEN) { say('رمز جدید باید حداقل ' + MIN_LEN + ' نویسه باشد', true); return; }
      if (myP1.value !== myP2.value) { say('رمزهای جدید یکسان نیستند', true); return; }
      myBtn.disabled = true; myBtn.textContent = 'در حال بررسی...';
      hashPassword(curP.value, me.salt, me.iter || 120000, me.alg || 'pbkdf2').then(function (h) {
        if (!hashEquals(h, me.hash)) return { ok: false, why: 'pass' };
        return makeUserRecord(currentUser, myP1.value).then(function (rec) {
          return saveUser(rec).then(function (ok) { return { ok: ok, rec: rec, why: ok ? '' : 'net' }; });
        });
      }).then(function (res) {
        myBtn.disabled = false; myBtn.textContent = 'تغییر رمز من';
        if (!res) { say('خطا در بررسی', true); return; }
        if (res.why === 'pass') { say('رمز فعلی اشتباه است', true); curP.value = ''; curP.focus(); return; }
        if (!res.ok) { say(SERVER_MSG || 'ارسال به سرور ناموفق بود', true); return; }
        users = users.filter(function (x) { return x.id !== res.rec.id; });
        users.push(res.rec);
        if (res.rec.id === userId(ADMIN_NAME) && legacyRec) { legacyRec = null; deleteRow('lock'); }
        curP.value = ''; myP1.value = ''; myP2.value = '';
        say('رمز شما تغییر کرد');
      });
    });

    /* --- footer --- */
    var closeBtn = el('button', { type: 'button', 'class': 'la-ghost', text: 'بستن' });
    closeBtn.addEventListener('click', closeAdmin);
    var outBtn = el('button', { type: 'button', 'class': 'la-ghost', text: 'خروج از حساب' });
    outBtn.addEventListener('click', function () { closeAdmin(); logout(); });

    var box = el('div', { 'class': 'la-card' }, head.concat([
      el('h2', { text: 'کاربران' }), listEl,
      el('h2', { text: 'ساخت کاربر جدید' }),
      newName, newPass, newPass2, createBtn,
      el('h2', { text: 'تغییر رمز خودم' }),
      curP, myP1, myP2, myBtn,
      errLine, okLine,
      el('div', { 'class': 'la-row', style: 'margin-top:12px' }, [closeBtn, outBtn])
    ]));
    wrap.appendChild(box);
    document.body.appendChild(wrap);
    renderList();
    setTimeout(function () { newName.focus(); }, 60);
  }

  /* ---------------- change / logout ---------------- */

  function change() {
    if (!unlocked) return;
    if (isAdmin()) { openAdmin(); return; }
    toast('فقط ادمین می‌تواند رمز و کاربران را مدیریت کند');
  }

  function logout() {
    setSessionUser(null);
    currentUser = null;
    unlocked = false;
    try { document.body.classList.remove('is-admin'); } catch (e) {}
    closeAdmin();
    try { window.dispatchEvent(new CustomEvent('decor:locked', { detail: { via: 'logout' } })); } catch (e) {}
    renderLogin();
  }

  /* ---------------- boot ---------------- */

  function purgeLegacy() {
    try {
      ['decor_lock_v1', 'decor_lock_v2', 'decor_lock_v3', 'decor_lock_v4', 'decor_lock_admin_device'].forEach(function (k) {
        localStorage.removeItem(k);
      });
      sessionStorage.removeItem('decor_lock_session_v1');
    } catch (e) {}
  }

  function boot() {
    purgeLegacy();
    fetchUsers().then(function (rows) {
      adoptRows(rows);
      var needSeed = !hasRealAdmin();
      var seed = needSeed ? ensureAdmin() : Promise.resolve(true);
      return seed.then(function (ok) {
        // drop the legacy row ONLY after a real u_admin row exists
        if (ok && legacyRec && hasRealAdmin()) {
          legacyRec = null;
          deleteRow('lock'); // best effort
        }
        var su = sessionUser();
        if (su && userByName(su)) { finishUnlock(su); return; }
        setSessionUser(null);
        if (!users.length && !userByName(ADMIN_NAME)) {
          renderSeedPending(needSeed); // server reachable but admin not created yet
          return;
        }
        renderLogin();
      });
    }).catch(function () {
      var su = sessionUser();
      if (su) { finishUnlock(su); return; } // offline but already logged in this session
      renderOffline();
    });
  }

  /* ---------------- public API ---------------- */

  function publishApi() {
    window.DecorLock = {
      change: change,
      lock: logout,
      logout: logout,
      isUnlocked: function () { return unlocked; },
      isAdmin: isAdmin,
      username: function () { return currentUser; },
      openAdmin: openAdmin,
      hasUsers: function () { return users.length > 0; },
      fetchFromServer: fetchUsers,   // exposed for tests
      version: RECORD_VERSION
    };
    window.DecorAuth = {
      get username() { return currentUser; },
      get admin() { return isAdmin(); },
      isAdmin: isAdmin,
      openAdmin: openAdmin,
      logout: logout,
      refresh: function () {
        return fetchUsers().then(function (rows) { return adoptRows(rows); });
      }
    };
  }

  /* Delegated wiring so drawer/menu entries work even when lock.js runs
     before the rest of the page has been parsed. */
  if (typeof document !== 'undefined') document.addEventListener('click', function (e) {
    var n = e.target && e.target.closest ? e.target.closest('[data-decor-lock],[data-decor-logout],[data-decor-admin]') : null;
    if (!n) return;
    e.preventDefault();
    if (n.hasAttribute('data-decor-logout')) { logout(); return; }
    if (n.hasAttribute('data-decor-admin')) {
      if (isAdmin()) openAdmin();
      else toast('فقط ادمین به این بخش دسترسی دارد');
      return;
    }
    change();
  });

  function init() {
    unlocked = false;
    currentUser = null;
    publishApi();
    boot();
  }

  if (typeof document !== 'undefined') {
    if (document.body) init();
    else document.addEventListener('DOMContentLoaded', init);
  }

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
