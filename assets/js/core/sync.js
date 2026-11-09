/* ============================================================
   sync.js — 跨平台資料同步引擎
   ------------------------------------------------------------
   · 本地優先（localStorage + IndexedDB 永遠是離線可用的來源）
   · 雲端可接任何「簡單 REST 儲存池」：JSONBlob（免註冊）/
     Supabase / GitHub Gist / 自訂 API
   · 開機自動拉取、資料一改就自動推送、每 60 秒輪詢、
     回到前景時補同步 → 電腦瀏覽器 / 手機瀏覽器 / 主畫面 PWA 全部一致
   · 合併策略：
       - 有 id 的紀錄：逐筆比對 updatedAt，新的蓋舊的（兩邊新增都保留）
       - 刪除：用墓碑（tombstone）同步，別台裝置也會一起刪掉
       - 喝水 / 飲食等日期型資料：同日期取聯集，只增不刪
       - profile / 週期設定：以最後修改時間較新的一方為準
   · 同裝置不同容器（iOS Safari ↔ 主畫面 PWA）：
       BroadcastChannel + 「同步碼」橋接（#sync= 連結也能一鍵帶入）
   ============================================================ */
window.Lume = window.Lume || {};
(function (L) {
  'use strict';

  const CFG_KEY = 'lume_sync_cfg_v1';
  const DEV_KEY = 'lume_sync_dev_v1';
  /* ★ 新版工作台存在雲端的「lume-v2」位置；舊網站的資料在「lume-world」。
     兩邊分開存放，舊網站完全不受影響；新版第一次連線時會自動把舊資料合併過來。 */
  const APP = 'lume-v2';
  const OLD_APP = 'lume-world';
  const BC_NAME = 'lume-v2-sync';

  const ARR_KEYS = ['countdowns', 'dates', 'todos', 'futureTodos', 'weights', 'books', 'dramas',
    'readingLogs', 'diary', 'murmurs', 'studies', 'firsts', 'bodyLogs', 'tarot', 'tarotWeekly', 'notes', 'outfits', 'wardrobe', 'wishes'];
  const MAP_KEYS = ['water', 'diet'];
  const DOC_KEYS = ['profile', 'quotes', 'readingGoal'];

  /* ---------------- 設定 ---------------- */
  function defaultCfg() { return { type: 'off', key: 'Lume', room: 'main', table: 'lume_sync', auto: true, images: true }; }
  let cfg = defaultCfg();
  try { cfg = Object.assign(defaultCfg(), JSON.parse(localStorage.getItem(CFG_KEY) || '{}')); } catch (e) { }
  function saveCfg(c) {
    cfg = Object.assign(defaultCfg(), c || {});
    try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) { }
    return cfg;
  }

  let devId = '';
  try {
    devId = localStorage.getItem(DEV_KEY);
    if (!devId) { devId = 'd' + Math.random().toString(36).slice(2, 10); localStorage.setItem(DEV_KEY, devId); }
  } catch (e) { devId = 'd' + Math.random().toString(36).slice(2, 10); }

  /* ---------------- 狀態 ---------------- */
  let state = 'off';      // off | idle | syncing | ok | error
  let msg = '';
  let lastAt = 0;
  let busy = false;
  let applying = false;
  let pushTimer = null, pollTimer = null;
  let onUpdate = null;
  let bc = null;

  const listeners = [];
  function setState(s, m) {
    state = s; msg = m || '';
    if (s === 'ok') lastAt = Date.now();
    for (let i = 0; i < listeners.length; i++) { try { listeners[i](Sync.state()); } catch (e) { } }
  }

  /* ---------------- 雲端轉接器 ---------------- */
  function hdr(token) {
    const h = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    if (token) h['Authorization'] = 'Bearer ' + token;
    return h;
  }

  /* ---------- Firebase Realtime Database（免費 Spark 方案，最推薦） ----------
     只要一組 Database URL + 一組自訂「同步金鑰」，所有裝置輸入同一個 Key 就連到同一份資料。
     REST 用法：GET / PUT  https://<db>.firebaseio.com/lume-world/<KEY>.json          */
  function firebaseAdapter(c) {
    const key = (c.key || 'Lume').trim();
    const base = String(c.url || '').trim().replace(/\/+$/, '');
    const encK = k => encodeURIComponent(k).replace(/%2F/g, '_');
    const enc = encK(key);
    // 舊網站可能用的是另一個（較短的）金鑰；搬家時讀那一個
    const oldEnc = encK((c.oldKey || '').trim() || key);
    const path = () => base + '/' + APP + '/' + enc + '.json';
    const oldPath = () => base + '/' + OLD_APP + '/' + oldEnc + '.json';
    return {
      /** 讀舊網站（lume-world）的資料，搬家用 */
      async pullOld() {
        if (!base) throw new Error('還沒填 Firebase Database URL');
        const r = await fetch(oldPath(), { cache: 'no-store' });
        if (!r.ok) throw new Error('讀取舊資料失敗（' + r.status + '）');
        const t = await r.text();
        if (!t || t === 'null') return null;
        try { return JSON.parse(t); } catch (e) { return null; }
      },
      async pull() {
        if (!base) throw new Error('還沒填 Firebase Database URL');
        const r = await fetch(path(), { cache: 'no-store' });
        if (r.status === 401 || r.status === 403)
          throw new Error('沒有權限讀取：請確認同步金鑰至少 12 個字，並照設定教學更新 Firebase 規則');
        if (!r.ok) throw new Error('讀取失敗（' + r.status + '）· 請確認 Database URL 是否正確');
        const t = await r.text();
        if (!t || t === 'null') return null;
        try { return JSON.parse(t); } catch (e) { return null; }
      },
      async push(obj) {
        if (!base) throw new Error('還沒填 Firebase Database URL');
        const r = await fetch(path() + '?print=silent', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(obj)
        });
        if (r.status === 401 || r.status === 403)
          throw new Error('沒有權限寫入：請確認同步金鑰至少 12 個字，並照設定教學更新 Firebase 規則');
        if (!r.ok) throw new Error('寫入失敗（' + r.status + '）');
        return true;
      }
    };
  }

  function jsonBlobAdapter(c) {
    const base = 'https://jsonblob.com/api/jsonBlob';
    let id = c.id || '';
    return {
      async pull() {
        if (!id) return null;
        const r = await fetch(base + '/' + encodeURIComponent(id), { cache: 'no-store' });
        if (!r.ok) return null;
        const t = await r.text();
        try { return JSON.parse(t); } catch (e) { return null; }
      },
      async push(obj) {
        if (!id) {
          const r = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ _init: true }) });
          if (!r.ok) throw new Error('建立儲存空間失敗（' + r.status + '）');
          let loc = r.headers.get('Location') || '';
          if (!loc) { try { const j = await r.json(); loc = j && (j.id || j.Location) ? String(j.id || j.Location) : ''; } catch (e) { } }
          id = String(loc).split('/').filter(Boolean).pop();
          if (!id) throw new Error('建立成功但拿不到 Bin ID，請再到設定填一次');
          c.id = id; saveCfg(c);
        }
        const r = await fetch(base + '/' + encodeURIComponent(id), {
          method: 'PUT', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(obj)
        });
        if (!r.ok) throw new Error('寫入雲端失敗（' + r.status + '）');
        return true;
      }
    };
  }

  function supabaseAdapter(c) {
    const url = String(c.url || '').replace(/\/+$/, '');
    const table = c.table || 'lume_sync';
    const oldRoom = (c.key || c.room || 'Lume').trim() || 'Lume';
    const room = oldRoom + '@v2';
    const ak = c.akey || c.key || '';          // anon key（若舊設定存在 key 裡也相容）
    const H = { apikey: ak, Authorization: 'Bearer ' + ak, 'Content-Type': 'application/json', Accept: 'application/json' };
    return {
      async pullOld() {
        if (!url || !ak) throw new Error('還沒填 Supabase 的 URL / anon key');
        const r = await fetch(url + '/rest/v1/' + table + '?id=eq.' + encodeURIComponent(oldRoom) + '&select=data', { headers: H, cache: 'no-store' });
        if (!r.ok) throw new Error('讀取舊資料失敗（' + r.status + '）');
        const a = await r.json();
        return (a && a[0] && a[0].data) || null;
      },
      async pull() {
        if (!url || !ak) throw new Error('還沒填 Supabase 的 URL / anon key');
        const r = await fetch(url + '/rest/v1/' + table + '?id=eq.' + encodeURIComponent(room) + '&select=data', { headers: H, cache: 'no-store' });
        if (!r.ok) throw new Error('讀取失敗（' + r.status + '）· 請確認資料表已建立');
        const a = await r.json();
        return (a && a[0] && a[0].data) || null;
      },
      async push(obj) {
        if (!url || !ak) throw new Error('還沒填 Supabase 的 URL / anon key');
        const r = await fetch(url + '/rest/v1/' + table, {
          method: 'POST',
          headers: Object.assign({}, H, { Prefer: 'resolution=merge-duplicates,return=minimal' }),
          body: JSON.stringify([{ id: room, data: obj, at: new Date().toISOString() }])
        });
        if (!r.ok) throw new Error('寫入失敗（' + r.status + '）· 請在 Supabase 建表：id text primary key, data jsonb, at timestamptz');
        return true;
      }
    };
  }

  function gistAdapter(c) {
    const FILE = 'lume-v2.json';
    const OLD_FILE = 'lume-world.json';
    const H = () => {
      const h = { Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' };
      if (c.token) h.Authorization = 'Bearer ' + c.token;
      return h;
    };
    let id = c.id || '';
    return {
      async pullOld() {
        if (!id) return null;
        const r = await fetch('https://api.github.com/gists/' + encodeURIComponent(id), { headers: H(), cache: 'no-store' });
        if (!r.ok) return null;
        const g = await r.json();
        const f = g.files && g.files[OLD_FILE];
        if (!f) return null;
        try { return JSON.parse(f.content); } catch (e) { return null; }
      },
      async pull() {
        if (!id) return null;
        const r = await fetch('https://api.github.com/gists/' + encodeURIComponent(id), { headers: H(), cache: 'no-store' });
        if (!r.ok) return null;
        const g = await r.json();
        const f = g.files && g.files[FILE];
        if (!f) return null;
        try { return JSON.parse(f.content); } catch (e) { return null; }
      },
      async push(obj) {
        const body = { files: {} }; body.files[FILE] = { content: JSON.stringify(obj) };
        if (!id) {
          const r = await fetch('https://api.github.com/gists', {
            method: 'POST', headers: H(),
            body: JSON.stringify(Object.assign({ description: 'Lume 的小世界 · 資料同步', public: false }, body))
          });
          if (!r.ok) throw new Error('建立 Gist 失敗（' + r.status + '）');
          const g = await r.json();
          id = g.id; c.id = id; saveCfg(c);
          return true;
        }
        const r = await fetch('https://api.github.com/gists/' + encodeURIComponent(id), { method: 'PATCH', headers: H(), body: JSON.stringify(body) });
        if (!r.ok) throw new Error('寫入 Gist 失敗（' + r.status + '）');
        return true;
      }
    };
  }

  function customAdapter(c) {
    return {
      async pull() {
        if (!c.get) throw new Error('還沒填讀取 URL');
        const r = await fetch(c.get, { headers: hdr(c.token), cache: 'no-store' });
        if (!r.ok) return null;
        const t = await r.text();
        try { return JSON.parse(t); } catch (e) { return null; }
      },
      async push(obj) {
        if (!c.put) throw new Error('還沒填寫入 URL');
        const r = await fetch(c.put, { method: (c.method || 'PUT').toUpperCase(), headers: hdr(c.token), body: JSON.stringify(obj) });
        if (!r.ok) throw new Error('寫入失敗（' + r.status + '）');
        return true;
      }
    };
  }

  function adapter() {
    switch (cfg.type) {
      case 'firebase': return firebaseAdapter(cfg);
      case 'jsonblob': return jsonBlobAdapter(cfg);
      case 'supabase': return supabaseAdapter(cfg);
      case 'gist': return gistAdapter(cfg);
      case 'custom': return customAdapter(cfg);
      default: return null;
    }
  }
  const enabled = () => cfg.type && cfg.type !== 'off';

  /* ---------------- 合併邏輯 ---------------- */
  const tsOf = r => { const t = r && (r.updatedAt || r.createdAt); const n = t ? new Date(t).getTime() : 0; return isNaN(n) ? 0 : n; };
  const dts = s => { const n = s ? new Date(s).getTime() : 0; return isNaN(n) ? 0 : n; };

  function unionDel(a, b) {
    const o = {};
    for (const g in (b || {})) o[g] = Object.assign({}, b[g]);
    for (const g in (a || {})) {
      o[g] = o[g] || {};
      for (const id in a[g]) {
        if (!o[g][id] || String(o[g][id]) < String(a[g][id])) o[g][id] = a[g][id];
      }
    }
    return o;
  }

  function mergeArr(a, b, delA, delB, key) {
    const out = [], idx = {};
    (a || []).forEach(r => { if (r && r.id) { idx[r.id] = r; out.push(r); } });
    (b || []).forEach(r => {
      if (!r || !r.id) return;
      const cur = idx[r.id];
      if (cur) { if (tsOf(r) > tsOf(cur)) { out[out.indexOf(cur)] = r; idx[r.id] = r; } }
      else { out.push(r); idx[r.id] = r; }
    });
    // delA / delB 是「整份墓碑」{ 集合名: { id: 時間 } }，key 才是這次要處理的集合
    const dels = (key && unionDel(delA, delB)[key]) || {};
    return out.filter(r => {
      const t = dels[r.id];
      return !(t && dts(t) >= tsOf(r));
    });
  }

  /** 深層合併：陣列取聯集、物件補缺口、純值衝突保留本地 */
  function mergeDeep(a, b) {
    if (Array.isArray(a) && Array.isArray(b)) {
      const seen = {}, out = a.slice();
      a.forEach(x => { seen[JSON.stringify(x)] = 1; });
      b.forEach(x => { const s = JSON.stringify(x); if (!seen[s]) { seen[s] = 1; out.push(x); } });
      return out;
    }
    if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
      const out = Object.assign({}, a);
      for (const k in b) out[k] = (out[k] === undefined) ? b[k] : mergeDeep(out[k], b[k]);
      return out;
    }
    return a === undefined ? b : a;
  }

  function mergeDoc(name, a, b, aAt, bAt) {
    if (!b || typeof b !== 'object') return a;
    if (!a || typeof a !== 'object') return b;
    const base = Object.assign({}, a);
    for (const k in b) if (base[k] === undefined) base[k] = b[k];
    return dts(bAt[name]) > dts(aAt[name]) ? Object.assign(base, b) : base;
  }

  function mergePeriod(a, b, aAt, bAt) {
    a = a || {}; b = b || {};
    const out = { cycles: [], symptoms: {}, settings: {} };
    out.cycles = mergeArr(a.cycles || [], b.cycles || [], null, null);
    out.symptoms = mergeDeep(a.symptoms || {}, b.symptoms || {});
    out.settings = mergeDoc('period.settings', a.settings || {}, b.settings || {}, aAt, bAt);
    return out;
  }

  /** 把遠端 payload 合進本地；回傳是否有實際變動 */
  async function applyRemote(remote, opts) {
    if (!remote || typeof remote !== 'object' || (remote.app !== APP && remote.app !== OLD_APP) || !remote.data || typeof remote.data !== 'object') return false;
    const local = L.Store.db;
    // 外來資料一律先消毒；noDelete = 不接受對方帶來的「刪除紀錄」（用連結匯入時）
    const r = L.U.sanitize(remote.data);
    const rDel = (opts && opts.noDelete) ? {} : L.U.sanitize(remote.del || {});
    const lDel = L.Store.tombstones() || {};
    const aAt = (local.meta && local.meta.docAt) || {};
    const bAt = (r.meta && r.meta.docAt) || {};

    const before = JSON.stringify(local);
    const out = JSON.parse(JSON.stringify(local || {}));

    ARR_KEYS.forEach(k => { out[k] = mergeArr(local[k], r[k], lDel, rDel, k); });
    MAP_KEYS.forEach(k => { out[k] = mergeDeep(local[k] || {}, r[k] || {}); });
    DOC_KEYS.forEach(k => { out[k] = mergeDoc(k, local[k], r[k], aAt, bAt); });
    out.period = mergePeriod(local.period, r.period, aAt, bAt);

    out._del = unionDel(lDel, rDel);
    /* meta.createdAt 固定取「最早」的那個：
       若讓遠端直接覆蓋，兩台裝置會每次同步互相翻轉 → changed 永遠是 true
       → 畫面被無限重繪 → 輸入框永遠無法輸入。 */
    out.meta = Object.assign({}, local.meta || {}, r.meta || {});
    out.meta.createdAt = (function () {
      const c = [(local.meta || {}).createdAt, (r.meta || {}).createdAt].filter(Boolean).sort();
      return c[0] || (local.meta || {}).createdAt || (r.meta || {}).createdAt || new Date(0).toISOString();
    })();
    out.meta.docAt = (function () {
      const o = Object.assign({}, aAt);
      for (const k in bAt) if (!o[k] || String(o[k]) < String(bAt[k])) o[k] = bAt[k];
      return o;
    })();
    out.version = local.version;

    // 遠端帶來的圖片（dataURL）寫回本機 IndexedDB
    if (L.IDB) { try { await L.IDB.extract(out); } catch (e) { } }

    applying = true;
    await L.Store.adopt(out, 'adopt');
    applying = false;

    /* 用內容指紋比對，避免 key 順序差異被誤判成「有變動」而白白重繪 */
    const changed = canon(L.Store.db) !== canon(local);
    if (changed && onUpdate) { try { onUpdate(); } catch (e) { } }
    return changed;
  }

  /* ---------------- 封裝 / 推送 ---------------- */
  async function buildPayload(withImages) {
    const d = JSON.parse(JSON.stringify(L.Store.db || {}));
    if (withImages && L.IDB) { try { await L.IDB.inline(d); } catch (e) { } }
    return {
      app: APP, v: 1, at: new Date().toISOString(), device: devId,
      data: d, del: L.Store.tombstones() || {}
    };
  }

  async function pushNow() {
    const a = adapter();
    if (!a) throw new Error('尚未設定雲端');
    let p = await buildPayload(cfg.images !== false);
    let s = JSON.stringify(p);
    if (s.length > 3000000) {                       // 圖片太大就退化成純文字，絕不讓同步失敗
      p = await buildPayload(false);
      p.note = 'images-stripped';
      s = JSON.stringify(p);
      setState('syncing', '圖片太多，本次只同步文字內容');
    }
    await a.push(p);
    return s.length;
  }

  function schedulePush() {
    if (!enabled() || !cfg.auto) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => { syncNow('auto').catch(() => { }); }, 1500);
  }

  async function syncNow(reason) {
    const a = adapter();
    if (!a) { setState('off'); return false; }
    if (busy) return false;
    busy = true;
    setState('syncing');
    try {
      const remote = await a.pull();
      if (remote && remote.app === APP) await applyRemote(remote);
      /* 第一次連上雲端：自動把舊網站的資料搬過來（只做一次） */
      if (!(L.Store.db.meta || {}).migratedV1) {
        try { await migrateOldInner(a); } catch (e) { }
      }
      await pushNow();
      setState('ok');
      if (reason === 'manual') L.toast && L.toast('已同步 ♡');
      return true;
    } catch (e) {
      setState('error', (e && e.message) || String(e));
      return false;
    } finally { busy = false; }
  }

  /* ---------------- 舊網站搬家 ---------------- */
  /** 讀取舊網站（lume-world）的資料並合併；回傳搬過來的筆數，沒有舊資料回傳 -1 */
  async function migrateOldInner(a) {
    let old = null;
    if (a.pullOld) old = await a.pullOld();
    else old = await a.pull();                  // JSONBlob / 自訂 API：與舊網站共用同一個位置
    if (!old || old.app !== OLD_APP || !old.data) {
      if (a.pullOld) markMigrated();            // 雲端確定沒有舊資料，就不用每次再找
      return -1;
    }
    const count = d => ARR_KEYS.reduce((n, k) => n + ((d && d[k]) || []).length, 0);
    const before = count(L.Store.db);
    await applyRemote(old);
    markMigrated();
    return Math.max(0, count(L.Store.db) - before);
  }
  function markMigrated() {
    const db = L.Store.db;
    db.meta = db.meta || {};
    db.meta.migratedV1 = new Date().toISOString();
    L.Store.flush();
  }

  /* ---------------- 同裝置多容器橋接 ---------------- */
  function initBridge() {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel(BC_NAME);
        bc.onmessage = () => { if (!applying) syncNow('bc').catch(() => { }); };
      }
    } catch (e) { }
    window.addEventListener('storage', e => {
      // 同一個瀏覽器容器內，另一個分頁改了資料 → 立刻重新載入本機資料
      if (e && e.key === 'lume_world_db_v1' && !applying) reloadLocal();
    });
  }
  /** 內容指紋：只比對真正會影響畫面的資料，忽略 key 順序與雜訊欄位 */
  function canon(o) {
    try {
      if (Array.isArray(o)) return '[' + o.map(canon).join(',') + ']';
      if (o && typeof o === 'object') {
        return '{' + Object.keys(o).sort().map(k => JSON.stringify(k) + ':' + canon(o[k])).join(',') + '}';
      }
      return JSON.stringify(o == null ? null : o);
    } catch (e) { return String(o); }
  }

  function reloadLocal() {
    try {
      const raw = localStorage.getItem('lume_world_db_v1');
      if (!raw) return;
      const next = JSON.parse(raw);
      const before = canon(L.Store.db);
      L.Store.adopt(next, 'adopt');
      const after = canon(L.Store.db);
      /* ★ 只有內容真的變了才重繪。
         否則 A 容器寫入 → B 容器 adopt 後又寫回 → A 再 adopt …
         會形成無限重繪迴圈，輸入框剛聚焦就被刪掉 → 鍵盤彈不出來、打不了字。 */
      if (before !== after && onUpdate) onUpdate();
      setState(state === 'off' ? 'idle' : state);
    } catch (e) { }
  }
  function broadcast() { try { if (bc) bc.postMessage({ t: Date.now() }); } catch (e) { } }

  /* ---------------- 同步碼（跨容器 / 換手機免雲端） ---------------- */
  const B64U = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const fromB64U = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
  function bytesToB64(u8) {
    let bin = '';
    for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64ToBytes(s) {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  }

  /** 產生同步碼（文字資料；圖片因體積過大不包含） */
  async function exportCode() {
    const p = await buildPayload(false);
    const s = JSON.stringify(p);
    try {
      if (typeof CompressionStream !== 'undefined') {
        const cs = new CompressionStream('gzip');
        const w = cs.writable.getWriter();
        w.write(new TextEncoder().encode(s)); w.close();
        const buf = await new Response(cs.readable).arrayBuffer();
        return 'LMZ' + bytesToB64(new Uint8Array(buf));
      }
    } catch (e) { }
    return 'LMR' + B64U(s);
  }

  async function importCode(code, opts) {
    code = String(code || '').trim().replace(/\s+/g, '');
    if (!code) throw new Error('同步碼是空的');
    let s;
    if (code.indexOf('LMZ') === 0) {
      const u8 = b64ToBytes(code.slice(3));
      const ds = new DecompressionStream('gzip');
      const w = ds.writable.getWriter(); w.write(u8); w.close();
      s = await new Response(ds.readable).text();
    } else if (code.indexOf('LMR') === 0) {
      s = fromB64U(code.slice(3));
    } else { throw new Error('同步碼格式不對 ♡'); }
    const obj = JSON.parse(s);
    const changed = await applyRemote(obj, opts);
    await L.Store.flush();
    broadcast();
    setState(state === 'off' ? 'idle' : state);
    return changed;
  }

  /* ---------------- 對外 API ---------------- */
  const Sync = {
    PRESETS: {
      off: { name: '不啟用（只存在這台裝置）', fields: [], note: '資料只留在這個瀏覽器／主畫面 App 裡。' },
      firebase: {
        name: '① Firebase Realtime Database（免費 · 最推薦）',
        note: 'Google 帳號即可免費使用（Spark 方案：1GB 空間）。只要設定一次，所有裝置輸入同一個「同步金鑰」就會連到同一份資料。同步金鑰就像密碼，請用「產生安全金鑰」並且不要給別人看。',
        fields: [
          { k: 'url', label: 'Database URL', ph: 'https://你的專案-default-rtdb.firebaseio.com' },
          { k: 'oldKey', label: '舊網站的同步金鑰（搬家用，沒有舊網站可留空）', ph: '例如 Lume' },
          { k: 'key', label: '同步金鑰 / 帳號名稱', ph: 'Lume' }
        ],
        guide: [
          '1. 到 console.firebase.google.com，用 Google 帳號建立一個免費專案（選 Spark 免費方案）。',
          '2. 左側「建構 → Realtime Database」→「建立資料庫」，地區選 asia-southeast1 或離你最近的。',
          '3. 進到「規則」分頁，把內容整段換成下面這段後按「發布」（別人無法列出整個資料庫，也一定要有 12 字以上的金鑰才能讀寫）：',
          '{\n  "rules": {\n    "lume-v2": {\n      "$key": {\n        ".read": "$key.length >= 12",\n        ".write": "$key.length >= 12"\n      }\n    }\n  }\n}',
          '4. 回到「資料」分頁，最上方顯示的網址就是 Database URL（例如 https://xxx-default-rtdb.firebaseio.com）。',
          '5. 把 URL 貼到上面，按「產生安全金鑰」，再把同一組金鑰填到你每一台裝置 ♡'
        ]
      },
      supabase: {
        name: '② Supabase（Free Tier）',
        note: '免費專案 500MB 資料庫。需先在 SQL Editor 執行一次建表語法，之後一樣靠「同步金鑰」區分。',
        fields: [
          { k: 'url', label: 'Project URL', ph: 'https://xxxx.supabase.co' },
          { k: 'akey', label: 'anon key', ph: 'eyJhbGci...' },
          { k: 'key', label: '同步金鑰 / 帳號名稱', ph: 'Lume' }
        ],
        guide: [
          '1. 到 supabase.com 註冊（GitHub 帳號可登入），建立一個 Free 專案。',
          '2. 左側「SQL Editor」→ 貼上下面整段後按 Run：',
          'create table lume_sync (id text primary key, data jsonb, at timestamptz default now());\n' +
          'alter table lume_sync enable row level security;\n' +
          'create policy "anon rw" on lume_sync for all using (true) with check (true);',
          '3. 到「Project Settings → API」複製 Project URL 與 anon public key。',
          '4. 貼回上面，同步金鑰填一樣的名字（例如 Lume）就完成了 ♡'
        ]
      },
      gist: {
        name: '③ GitHub Gist（私密）',
        note: '到 GitHub → Settings → Developer settings → Personal access tokens 產生一組只勾 gist 的 token。',
        fields: [
          { k: 'token', label: 'Personal token', ph: 'github_pat_...（需 gist 權限）' },
          { k: 'id', label: 'Gist ID', ph: '留空會自動幫你建立（私密）' },
          { k: 'key', label: '同步金鑰 / 帳號名稱', ph: 'Lume' }
        ]
      },
      jsonblob: {
        name: '④ JSONBlob（免註冊）',
        note: '完全不用申請帳號，按下「測試連線」會自動建立專屬空間。若你的網路連不上這個服務，請改用 Firebase。',
        fields: [
          { k: 'id', label: 'Bin ID', ph: '留空會自動幫你建立' },
          { k: 'key', label: '同步金鑰 / 帳號名稱', ph: 'Lume' }
        ]
      },
      custom: {
        name: '⑤ 自訂 REST API',
        note: '任何「GET 回傳 JSON、PUT/POST 存 JSON」的端點都可以（自建 Worker、雲函式、其它雲端 API 儲存池）。',
        fields: [
          { k: 'get', label: '讀取 URL', ph: 'https://.../lume' },
          { k: 'put', label: '寫入 URL', ph: 'https://.../lume' },
          { k: 'token', label: 'Token（可留空）', ph: 'Bearer ...' }
        ]
      }
    },
    /** 取得某種雲端的「一步一步設定教學」 */
    setupGuide: function (type) {
      const p = Sync.PRESETS[type];
      if (!p || !p.guide) return '';
      return '<div class="card soft mt8" style="padding:12px">' +
        '<b style="font-size:13px">📖 ' + p.name.replace(/^[①②③④⑤]\s*/, '') + ' 設定教學</b>' +
        '<ol style="margin:8px 0 0;padding-left:18px;font-size:12px;line-height:1.85;color:var(--ink-soft)">' +
        p.guide.map(s => {
          const isCode = /^[{c-]|\.read|create table|alter table|create policy/.test(s);
          return '<li' + (isCode ? ' style="list-style:none;margin-left:-14px"' : '') + '>' +
            (isCode
              ? '<textarea class="inp" readonly style="min-height:70px;font-size:16px;font-family:ui-monospace,monospace;background:#fff">' + s.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</textarea>'
              : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')) + '</li>';
        }).join('') + '</ol></div>';
    },
    get cfg() { return cfg; },
    setCfg: saveCfg,
    enabled,
    state: () => ({ state: state, msg: msg, at: lastAt, type: cfg.type, enabled: enabled() }),
    onChange(fn) { if (typeof fn === 'function') listeners.push(fn); },
    set onUpdate(fn) { onUpdate = fn; },
    get onUpdate() { return onUpdate; },
    syncNow,
    exportCode,
    importCode,
    /** 手動「從舊網站搬資料」：回傳搬過來的筆數（-1 = 找不到舊資料） */
    async migrateOld() {
      const a = adapter();
      if (!a) throw new Error('先設定雲端同步才能搬資料 ♡');
      if (busy) throw new Error('正在同步中，請稍等一下再試');
      busy = true; setState('syncing', '正在搬舊資料…');
      try {
        const n = await migrateOldInner(a);
        await pushNow();
        setState('ok');
        return n;
      } catch (e) {
        setState('error', (e && e.message) || String(e));
        throw e;
      } finally { busy = false; }
    },
    /** 測試連線 */
    async test() {
      const a = adapter();
      if (!a) throw new Error('尚未設定雲端');
      await a.pull();
      return true;
    },
    /** 開機：自動同步 + 輪詢 */
    start() {
      initBridge();
      if (L.Store.onChange) L.Store.onChange(reason => {
        if (applying || reason === 'adopt') return;
        broadcast();
        schedulePush();
      });
      if (!enabled()) { setState('off'); return; }
      setState('idle');
      setTimeout(() => syncNow('boot').catch(() => { }), 400);
      clearInterval(pollTimer);
      pollTimer = setInterval(() => {
        if (!enabled() || document.hidden) return;
        syncNow('poll').catch(() => { });
      }, 60000);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && enabled()) syncNow('visible').catch(() => { });
      });
      window.addEventListener('online', () => { if (enabled()) syncNow('online').catch(() => { }); });
    },
    stop() {
      clearInterval(pollTimer); clearTimeout(pushTimer);
      try { if (bc) bc.close(); } catch (e) { }
    }
  };

  L.Sync = Sync;
})(window.Lume);
