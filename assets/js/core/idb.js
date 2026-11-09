/* ============================================================
   idb.js — 圖片專用 IndexedDB 儲存層
   · 圖片（Blob）存進 IndexedDB，不再佔用 localStorage 的 5MB 配額
   · 圖片鍵格式："idb:<key>"，其餘程式碼只需用 L.imgTag() / L.hydrateImages()
   · 提供：空間估算、孤兒圖清理、批次再壓縮、匯出/匯入時的行內化
   ============================================================ */
window.Lume = window.Lume || {};
(function (L) {
  'use strict';

  const DB_NAME = 'lume_media';
  const STORE = 'images';
  const PREFIX = 'idb:';
  const MAX_EDGE = 800;      // 預設最長邊
  const QUALITY = 0.65;      // 預設 JPEG 品質

  const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 5"><rect width="4" height="5" fill="#F4F1FD"/>' +
    '<circle cx="2" cy="2.1" r="0.75" fill="#E6E6FA"/></svg>');

  let dbp = null;
  const supported = (() => { try { return !!window.indexedDB; } catch (e) { return false; } })();
  const urlCache = new Map();

  function open() {
    if (!supported) return Promise.resolve(null);
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const rq = indexedDB.open(DB_NAME, 1);
      rq.onupgradeneeded = () => {
        const d = rq.result;
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
      };
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => rej(rq.error);
      rq.onblocked = () => rej(new Error('blocked'));
    });
    return dbp;
  }

  /* ---------- 基本工具 ---------- */
  function dataURLToBlob(dataURL) {
    const [head, b64] = String(dataURL).split(',');
    const mime = (head.match(/:(.*?);/) || [, 'image/jpeg'])[1];
    const bin = atob(b64 || '');
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }
  function blobToDataURL(blob) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(blob);
    });
  }
  const isKey = v => typeof v === 'string' && v.indexOf(PREFIX) === 0;
  const isDataURL = v => typeof v === 'string' && v.indexOf('data:image') === 0;

  /* ---------- 原始存取 ---------- */
  function tx(mode, fn) {
    return open().then(d => {
      if (!d) return null;
      return new Promise((res, rej) => {
        const t = d.transaction(STORE, mode);
        let rq;
        try { rq = fn(t.objectStore(STORE)); } catch (e) { rej(e); return; }
        // 回傳值一定是 IDBRequest：取它的 .result（找不到時是 undefined，不能回傳 request 本身）
        t.oncomplete = () => res(rq && typeof rq === 'object' && 'result' in rq ? rq.result : rq);
        t.onerror = () => rej(t.error);
        t.onabort = () => rej(t.error);
      });
    });
  }
  function getBlob(key) {
    return tx('readonly', s => s.get(key)).then(v => (v && typeof v.size === 'number') ? v : null);
  }
  function putBlob(key, blob) {
    return tx('readwrite', s => s.put(blob, key)).then(() => key);
  }
  function delBlob(key) {
    return tx('readwrite', s => s.delete(key));
  }
  function allKeys() {
    return tx('readonly', s => s.getAllKeys()).then(k => Array.isArray(k) ? k : []).catch(() => []);
  }

  /* ---------- 對外 API ---------- */
  const IDB = {
    supported, MAX_EDGE, QUALITY, PLACEHOLDER, isKey, isDataURL,

    /** 存入一張圖片（dataURL 或 Blob），回傳 "idb:<key>"；不支援時原樣回傳 */
    async put(val) {
      if (!val) return val;
      if (isKey(val)) return val;
      if (!supported) return val;
      try {
        const blob = typeof val === 'string' ? dataURLToBlob(val) : val;
        const key = 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        await putBlob(key, blob);
        return PREFIX + key;
      } catch (e) {
        return val;   // 失敗就退回原本的值，不讓流程中斷
      }
    },
    /**
     * 批次存圖：每一張都帶超時保護
     * IndexedDB 在 iOS 私密瀏覽 / 被其他分頁鎖住時，promise 可能永遠不 settle，
     * 若呼叫端 await 它，整段儲存流程就會「卡住不動、看起來像沒反應」。
     * 這裡用 Promise.race 設上限，超時就回傳原值，流程一定走得完。
     * @param {Array} arr 圖片（dataURL / Blob）
     * @param {number} ms 單張逾時毫秒（預設 5000）
     */
    async putMany(arr, ms) {
      const out = [];
      const list = arr || [];
      const limit = ms || 5000;
      for (const v of list) {
        out.push(await new Promise(res => {
          let done = false;
          const timer = setTimeout(() => { if (!done) { done = true; res(v); } }, limit);
          const finish = (val) => { if (!done) { done = true; try { clearTimeout(timer); } catch (e) { } res(val); } };
          Promise.resolve(IDB.put(v)).then(finish, () => finish(v));
        }));
      }
      return out;
    },

    /** 取得可顯示的網址（會快取 objectURL） */
    async url(val) {
      if (!val) return '';
      if (!isKey(val)) return val;
      const k = val.slice(PREFIX.length);
      if (urlCache.has(k)) return urlCache.get(k);
      try {
        const blob = await getBlob(k);
        if (!blob) return PLACEHOLDER;
        let u = '';
        try { if (URL && URL.createObjectURL) u = URL.createObjectURL(blob); } catch (e) { }
        if (!u) u = await blobToDataURL(blob);   // 後備：直接內嵌 dataURL
        urlCache.set(k, u);
        return u;
      } catch (e) { return PLACEHOLDER; }
    },
    async dataURL(val) {
      if (!val) return '';
      if (!isKey(val)) return val;
      const b = await getBlob(val.slice(PREFIX.length));
      return (b && typeof b.size === 'number') ? await blobToDataURL(b) : '';
    },
    async del(val) {
      if (!isKey(val)) return;
      const k = val.slice(PREFIX.length);
      if (urlCache.has(k)) { try { URL.revokeObjectURL(urlCache.get(k)); } catch (e) { } urlCache.delete(k); }
      try { await delBlob(k); } catch (e) { }
    },
    async clear() {
      for (const u of urlCache.values()) { try { URL.revokeObjectURL(u); } catch (e) { } }
      urlCache.clear();
      const keys = await allKeys().catch(() => []);
      for (const k of keys) { try { await delBlob(k); } catch (e) { } }
      return keys.length;
    },

    /** 統計：回傳 {count, bytes} */
    async stats() {
      if (!supported) return { count: 0, bytes: 0 };
      try {
        const d = await open();
        const keys = await allKeys();
        let bytes = 0;
        for (const k of keys) {
          const b = await getBlob(k);
          if (b) bytes += b.size;
        }
        return { count: keys.length, bytes };
      } catch (e) { return { count: 0, bytes: 0 }; }
    },

    /* ---------- 遞迴走訪：行內化 / 轉存 ---------- */
    /** 把物件裡所有 "idb:" 換成實際 dataURL（匯出用） */
    async inline(obj) {
      const jobs = [];
      (function walk(o) {
        if (!o || typeof o !== 'object') return;
        if (Array.isArray(o)) {
          for (let i = 0; i < o.length; i++) {
            if (isKey(o[i])) { const idx = i, arr = o; jobs.push(IDB.dataURL(o[i]).then(v => { arr[idx] = v || ''; })); }
            else walk(o[i]);
          }
        } else {
          for (const k in o) {
            if (isKey(o[k])) { const key = k, host = o; jobs.push(IDB.dataURL(o[k]).then(v => { host[key] = v || ''; })); }
            else walk(o[k]);
          }
        }
      })(obj);
      await Promise.all(jobs);
      return obj;
    },

    /** 把物件裡所有 data:image 轉存進 IDB 並換成 "idb:"（匯入 / 瘦身用） */
    async extract(obj) {
      const jobs = [];
      (function walk(o) {
        if (!o || typeof o !== 'object') return;
        if (Array.isArray(o)) {
          for (let i = 0; i < o.length; i++) {
            if (isDataURL(o[i])) { const idx = i, arr = o; jobs.push(IDB.put(o[i]).then(v => { arr[idx] = v; })); }
            else walk(o[i]);
          }
        } else {
          for (const k in o) {
            if (isDataURL(o[k])) { const key = k, host = o; jobs.push(IDB.put(o[k]).then(v => { host[key] = v; })); }
            else walk(o[k]);
          }
        }
      })(obj);
      await Promise.all(jobs);
      return obj;
    },

    /** 收集物件中所有 idb 鍵 */
    collectKeys(obj, out) {
      out = out || new Set();
      (function walk(o) {
        if (!o || typeof o !== 'object') return;
        if (Array.isArray(o)) { o.forEach(x => { if (isKey(x)) out.add(x); else walk(x); }); }
        else { for (const k in o) { if (isKey(o[k])) out.add(o[k]); else walk(o[k]); } }
      })(obj);
      return out;
    },

    /** 清掉沒有被任何紀錄引用的孤兒圖片 */
    async prune(db) {
      const used = IDB.collectKeys(db);
      const keys = await allKeys().catch(() => []);
      let n = 0;
      for (const k of keys) {
        if (!used.has(PREFIX + k)) { await IDB.del(PREFIX + k); n++; }
      }
      return n;
    },

    /** 批次再壓縮：最長邊 max、品質 q，回傳 {before, after, n} */
    async shrink(max, q) {
      max = max || MAX_EDGE; q = q || QUALITY;
      if (!supported) return { before: 0, after: 0, n: 0 };
      const keys = await allKeys().catch(() => []);
      let before = 0, after = 0, n = 0;
      for (const k of keys) {
        const blob = await getBlob(k);
        if (!blob) continue;
        before += blob.size;
        let out = blob;
        try {
          const img = await loadImage(blob);
          if (Math.max(img.width, img.height) > max || blob.size > 70000) {
            const r = Math.min(1, max / Math.max(img.width, img.height));
            const cv = document.createElement('canvas');
            cv.width = Math.max(1, Math.round(img.width * r));
            cv.height = Math.max(1, Math.round(img.height * r));
            cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
            const nb = await new Promise(res => cv.toBlob(res, 'image/jpeg', q));
            if (nb && nb.size < blob.size) { out = nb; n++; }
          }
        } catch (e) { }
        after += out.size;
        if (out !== blob) {
          await putBlob(k, out);
          if (urlCache.has(k)) { try { URL.revokeObjectURL(urlCache.get(k)); } catch (e) { } urlCache.delete(k); }
        }
      }
      return { before, after, n };
    }
  };

  function loadImage(blob) {
    return new Promise((res, rej) => {
      const u = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(u); res(img); };
      img.onerror = () => { URL.revokeObjectURL(u); rej(new Error('decode fail')); };
      img.src = u;
    });
  }

  /* ---------- DOM 輔助 ---------- */
  /** 產生 <img>：idb 鍵會先放佔位圖，再由 hydrateImages 非同步補上 */
  L.imgTag = function (val, cls, style) {
    if (!val) return '';
    const c = cls ? ' class="' + cls + '"' : '';
    const s = style ? ' style="' + style + '"' : '';
    const v = String(val);
    if (isKey(v)) return '<img' + c + s + ' data-img="' + v + '" src="' + PLACEHOLDER + '" alt="">';
    return '<img' + c + s + ' src="' + v + '" alt="">';
  };

  /** 把畫面內所有佔位圖換成真正的圖片 */
  L.hydrateImages = async function (root) {
    const els = (root || document).querySelectorAll('img[data-img]');
    for (const el of els) {
      const v = el.getAttribute('data-img');
      if (!v) continue;
      try {
        const u = await IDB.url(v);
        if (u) el.src = u;
      } catch (e) { }
    }
  };

  L.IDB = IDB;
})(window.Lume);
