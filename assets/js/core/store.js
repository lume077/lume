/* ============================================================
   store.js — 資料儲存層（Repository Pattern）
   · 本地優先持久化（localStorage），離線可用
   · 統一 schema 版本管理 + 自動 migrate
   · 提供 集合/單值 兩類 repository API
   · 支援 JSON 匯出 / 匯入（跨裝置搬遷、備份）
   ============================================================ */
window.Lume = window.Lume || {};
(function (L) {
  'use strict';
  const KEY = 'lume_world_db_v1';
  const VERSION = 1;

  const defaults = () => ({
    version: VERSION,
    profile: { name: 'Lume', waterGoal: 2000, kcalGoal: 1600, weightGoal: null, city: '' },
    quotes: { lang: 'zh', favorited: [] },        // lang: zh | en | kr | all
    countdowns: [],                                // 首頁倒計時
    dates: [],                                     // 本月行事曆（約會專用）
    todos: [],                                     // 今日計畫
    futureTodos: [],                               // 待辦計畫（突發 / 未來）
    studies: [],                                   // 學習計畫：[{title, topic, date, done, note, question, solved}]
    water: {},                                     // { 'yyyy-mm-dd': {logs:[{t,ml}], goal} }
    diet: {},                                      // { date: {meals:{breakfast:[{name,kcal}]}} }
    weights: [],                                   // [{date, kg}]
    books: [],
    dramas: [],                                    // 劇單：[{title,platform,status,totalEp,currentEp,rating,note,cover}]
    readingGoal: { year: new Date().getFullYear(), target: 24 },
    readingLogs: [],                               // [{date, minutes, bookId}]
    diary: [],
    murmurs: [],                                   // 碎碎念：[{text, date, tags, images}]
    firsts: [],                                    // 「初」成就記錄：[{title,date,cat,feeling,images}]
    bodyLogs: [],                                  // 身體狀態日記：[{date, symptoms:[{n,lv}], note}]
    tarot: [],
    tarotWeekly: [],
    notes: [],
    outfits: [],
    wardrobe: [],
    period: { cycles: [], symptoms: {}, settings: { cycleLen: 28, periodLen: 5 } },
    wishes: [],
    _del: {},                                      // 刪除墓碑：{ 集合名: { id: ISO時間 } }（讓刪除也能同步到其他裝置）
    meta: { createdAt: new Date().toISOString(), docAt: {} }
  });

  let db = null;
  let saveTimer = null;
  let quotaAlert = false;      // 空間不足旗標，供設定頁顯示提示
  const listeners = [];        // 資料變動監聽器（雲端同步用）

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      db = raw ? L.U.sanitize(JSON.parse(raw)) : defaults();
      if (!db || typeof db !== 'object' || Array.isArray(db)) db = defaults();
    } catch (e) { db = defaults(); }
    // schema 補全 / migrate
    const d = defaults();
    for (const k in d) if (db[k] === undefined) db[k] = d[k];
    for (const k in d.profile) if (db.profile[k] === undefined) db.profile[k] = d.profile[k];
    if (!db.period.settings) db.period.settings = d.period.settings;
    if (!db._del || typeof db._del !== 'object') db._del = {};
    if (!db.meta || typeof db.meta !== 'object') db.meta = d.meta;
    if (!db.meta.docAt || typeof db.meta.docAt !== 'object') db.meta.docAt = {};
    db.version = VERSION;
    return db;
  }

  /** 通知所有監聽者「資料變了」（雲端同步會在這裡被喚醒） */
  function emit(reason) {
    for (let i = 0; i < listeners.length; i++) {
      try { listeners[i](reason || 'change'); } catch (e) { }
    }
  }

  /** 記憶一筆刪除，讓其他裝置同步時知道這筆已經被刪掉了 */
  function tombstone(name, id) {
    if (!db._del) db._del = {};
    if (!db._del[name]) db._del[name] = {};
    db._del[name][id] = new Date().toISOString();
  }

  /* ------------------------------------------------------------
     寫入：多層防護，絕不讓「儲存失敗」打斷使用
     第 1 次：直接寫
     第 2 次：把還留在資料庫裡的 dataURL 圖片搬去 IndexedDB，再寫
     第 3 次：清掉沒有引用的孤兒圖 + 移除快取副本，再寫
     仍失敗：資料完整留在記憶體中，只給一個溫和提示，不丟資料
     ------------------------------------------------------------ */
  /** 寫入前先確保沒有 dataURL 圖片殘留在資料庫裡（一律搬到 IndexedDB） */
  async function writeNow() {
    let s = JSON.stringify(db);
    if (L.IDB && s.indexOf('data:image') >= 0) {
      await L.IDB.extract(db);
      s = JSON.stringify(db);
    }
    localStorage.setItem(KEY, s);
    quotaAlert = false;
    return true;
  }

  function persist(reason) {
    emit(reason || 'change');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => flush(), 80);
  }

  /* 用一條 promise 鏈把所有寫入串起來，避免同時寫入互相踩踏 */
  let chain = Promise.resolve(true);
  function flush() {
    chain = chain.then(() => writeGuarded()).catch(() => false);
    return chain;
  }

  async function writeGuarded() {
    try { await writeNow(); return true; }
    catch (e1) {
      // 第 2 次：砍掉可重建的舊快照，再寫
      try {
        try { localStorage.removeItem(KEY + '_snap'); } catch (e) { }
        await writeNow();
        quotaAlert = false;
        return true;
      } catch (e2) {
        // 第 3 次：清孤兒圖 + 把圖片再壓小一點，再寫
        try {
          if (L.IDB) { await L.IDB.prune(db); await L.IDB.shrink(600, 0.55); }
          await writeNow();
          quotaAlert = false;
          return true;
        } catch (e3) {
          // 真的寫不進去：資料完整留在記憶體裡，只給溫和提示，不彈「儲存失敗」
          quotaAlert = true;
          try { L.toast && L.toast('資料已存在這台裝置 ♡ 空間有點滿，到「資料管理」點一下釋放空間'); }
          catch (_) { }
          return false;
        }
      }
    }
  }

  const Store = {
    get db() { return db || load(); },
    get quotaAlert() { return quotaAlert; },
    init() { load(); return db; },
    save: persist,
    /** 立即寫入並回傳是否成功 */
    flush,

    /** 集合型 repository */
    col(name) {
      const root = Store.db;
      const getArr = () => {
        if (!Array.isArray(root[name])) root[name] = [];
        return root[name];
      };
      return {
        name,
        all() { return getArr(); },
        find(id) { return getArr().find(x => x.id === id) || null; },
        where(fn) { return getArr().filter(fn); },
        add(obj) {
          const o = Object.assign({ id: L.U.uid(), createdAt: new Date().toISOString() }, obj);
          getArr().unshift(o); persist(); return o;
        },
        update(id, patch) {
          const it = this.find(id);
          if (it) { Object.assign(it, patch, { updatedAt: new Date().toISOString() }); persist(); }
          return it;
        },
        remove(id) {
          const a = getArr(), i = a.findIndex(x => x.id === id);
          if (i >= 0) { a.splice(i, 1); tombstone(name, id); persist('delete'); return true; }
          return false;
        },
        clear() {
          getArr().forEach(x => tombstone(name, x.id));
          root[name] = []; persist('delete');
        }
      };
    },

    /** 鍵值型 repository（依日期的資料，如 water / diet / symptoms） */
    map(name) {
      const root = Store.db;
      if (typeof root[name] !== 'object' || !root[name]) root[name] = {};
      return {
        all() { return root[name]; },
        get(k, fallback) {
          if (root[name][k] === undefined) root[name][k] = (fallback === undefined ? {} : JSON.parse(JSON.stringify(fallback)));
          return root[name][k];
        },
        set(k, v) { root[name][k] = v; persist(); return v; },
        remove(k) { delete root[name][k]; persist(); }
      };
    },

    /** 單一物件（profile / period / readingGoal / quotes） */
    doc(name) {
      const root = Store.db;
      return {
        get() { return root[name]; },
        set(patch) {
          Object.assign(root[name], patch);
          if (!db.meta.docAt) db.meta.docAt = {};
          db.meta.docAt[name] = new Date().toISOString();   // 讓雲端同步知道誰比較新
          persist();
          return root[name];
        }
      };
    },

    /* ---- 匯出 / 匯入（跨裝置搬遷 + 備份） ---- */
    /** 匯出：會把 IndexedDB 裡的圖片行內化成 dataURL，讓備份檔自帶圖片 */
    async exportJSON() {
      const copy = JSON.parse(JSON.stringify(Store.db));
      if (L.IDB) await L.IDB.inline(copy);
      return JSON.stringify(copy, null, 2);
    },
    /** 匯入：會把備份檔裡的圖片重新寫進 IndexedDB，只留 idb 鍵在 localStorage */
    async importJSON(text, merge) {
      let inc = JSON.parse(text);
      if (!inc || typeof inc !== 'object' || Array.isArray(inc)) throw new Error('格式錯誤');
      inc = L.U.sanitize(inc);   // 備份檔也可能被動過手腳，先消毒
      if (merge) {
        const d = defaults();
        for (const k in d) {
          if (Array.isArray(d[k])) {
            const seen = new Set((db[k] || []).map(x => x.id));
            (inc[k] || []).forEach(x => { if (!seen.has(x.id)) db[k].push(x); });
          } else if (typeof d[k] === 'object' && d[k]) {
            Object.assign(db[k], inc[k] || {});
          }
        }
        if (L.IDB) await L.IDB.extract(db);
      } else {
        db = Object.assign(defaults(), inc);
        if (L.IDB) await L.IDB.extract(db);
      }
      db.version = VERSION;
      await flush();
      return true;
    },

    /** 空間統計：localStorage 用量 + IndexedDB 圖片用量 + 瀏覽器配額 */
    async usage() {
      let lsBytes = 0;
      try { lsBytes = (localStorage.getItem(KEY) || '').length * 2; } catch (e) { }
      const idb = (L.IDB && await L.IDB.stats()) || { count: 0, bytes: 0 };
      let est = null;
      try { if (navigator.storage && navigator.storage.estimate) est = await navigator.storage.estimate(); } catch (e) { }
      const quota = est && est.quota ? est.quota : 0;
      const used = est && est.usage ? est.usage : (lsBytes + idb.bytes);
      return {
        lsKB: (lsBytes / 1024).toFixed(1),
        imgCount: idb.count,
        imgMB: (idb.bytes / 1048576).toFixed(2),
        usedMB: (used / 1048576).toFixed(2),
        quotaMB: quota ? (quota / 1048576).toFixed(0) : '—',
        pct: quota ? Math.min(100, Math.round(used / quota * 100)) : 0
      };
    },
    reset() {
      db = defaults();
      persist();
      if (L.IDB) L.IDB.clear();
    },
    /** 開機時把舊的 dataURL 圖片搬到 IndexedDB（背景執行、不阻塞） */
    migrateImages() {
      if (!L.IDB) return Promise.resolve(0);
      return L.IDB.extract(Store.db).then(() => flush());
    },

    /* ---- 雲端同步支援 ---- */
    /** 註冊資料變動監聽器 */
    onChange(fn) { if (typeof fn === 'function') listeners.push(fn); },
    /** 取得刪除墓碑（同步時一併送到雲端，讓別台裝置也刪掉） */
    tombstones() { return Store.db._del || {}; },
    /** 整包替換資料（雲端同步合併後寫回），並立即落檔 */
    async adopt(next, reason) {
      if (!next || typeof next !== 'object') return false;
      db = Object.assign(defaults(), L.U.sanitize(next));
      for (const k in defaults()) if (db[k] === undefined) db[k] = defaults()[k];
      if (!db._del) db._del = {};
      if (!db.meta) db.meta = {};
      if (!db.meta.docAt) db.meta.docAt = {};
      db.version = VERSION;
      await flush();
      emit(reason || 'adopt');
      return true;
    },
    /** 清掉超過 90 天的墓碑，避免無限長大 */
    pruneTombstones() {
      const cut = Date.now() - 90 * 864e5, d = Store.db._del || {};
      let n = 0;
      for (const g in d) for (const id in d[g]) {
        if (new Date(d[g][id]).getTime() < cut) { delete d[g][id]; n++; }
      }
      return n;
    },
    /** 手動觸發一次「資料變了」（供直接改 db 的程式碼呼叫） */
    touch() { persist('manual'); }
  };

  L.Store = Store;
})(window.Lume);
