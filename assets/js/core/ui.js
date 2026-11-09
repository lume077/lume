/* ============================================================
   ui.js — 共用 UI 元件：toast / modal / confirm / 月曆 / 空狀態
   ============================================================ */
window.Lume = window.Lume || {};
(function (L) {
  'use strict';
  const { icon, U, D } = L;

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg) {
    let el = document.getElementById('toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); }
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('on'), 2000);
  }

  /* ---------- Modal ---------- */
  function modal(title, html, onMount) {
    const mask = document.createElement('div');
    mask.className = 'mask';
    mask.innerHTML =
      '<div class="modal">' +
      '<h3>' + icon('sparkle', 18) + '<span>' + U.esc(title) + '</span><span class="close">&times;</span></h3>' +
      '<div class="modal-body">' + html + '</div></div>';
    const close = () => { mask.remove(); document.removeEventListener('keydown', esc); };
    function esc(e) { if (e.key === 'Escape') close(); }
    mask.addEventListener('click', e => { if (e.target === mask) close(); });
    mask.querySelector('.close').onclick = close;
    document.addEventListener('keydown', esc);
    document.body.appendChild(mask);
    /* ★ 防「幽靈遮罩」：若 onMount 出錯，遮罩會永遠蓋在畫面上（z-index:100、inset:0），
       讓全站所有輸入框都點不到、鍵盤叫不出來。這裡一錯就把遮罩收掉。 */
    try {
      if (onMount) onMount(mask.querySelector('.modal-body'), close);
    } catch (e) {
      console.error('[ui] modal onMount 失敗，已自動關閉遮罩', e);
      try { close(); } catch (_) { try { mask.remove(); } catch (__) { } }
    }
    return { el: mask, close };
  }

  function confirm(title, msg) {
    return new Promise(res => {
      modal(title, '<p style="margin:0 0 16px;font-size:14px;line-height:1.8">' + U.esc(msg) + '</p>' +
        '<div class="row end"><button class="btn ghost" data-n>取消</button><button class="btn" data-y>確定</button></div>',
        (body, close) => {
          body.querySelector('[data-n]').onclick = () => { close(); res(false); };
          body.querySelector('[data-y]').onclick = () => { close(); res(true); };
        });
    });
  }

  /* ---------- 編輯按鈕（全站統一） ---------- */
  /**
   * editBtn(id, attr, text)
   * attr 預設 'edit'；回傳 <button class="mini-btn edit" data-edit="id">✏️ 編輯</button>
   */
  function editBtn(id, attr, text) {
    return '<button class="mini-btn edit" data-' + (attr || 'edit') + '="' + id + '">' +
      (text || '✏️ 編輯') + '</button>';
  }

  /* ---------- 表單頁尾：送出 + 取消（全站統一） ---------- */
  /**
   * formFooter(opt)
   *   opt.isEdit   true → 按鈕顯示「💾 保存修改」
   *   opt.okText   自訂送出鈕文案
   *   opt.cancel   取消鈕文案（預設「取消」）
   * 回傳 HTML，送出鈕固定 id="ok"，取消鈕固定 id="cancel"
   */
  function formFooter(opt) {
    opt = opt || {};
    const ok = opt.okText || (opt.isEdit ? '💾 保存修改' : '新增');
    return '<button class="btn block mt8" id="ok">' + U.esc(ok) + '</button>' +
      '<button class="btn-cancel mt8" id="cancel">' + U.esc(opt.cancel || '取消') + '</button>';
  }

  /** 綁定取消鈕（放棄修改、直接關閉）；onCancel 可選，回傳 true 才真的關閉 */
  function bindCancel(body, close, onCancel) {
    const b = body.querySelector('#cancel');
    if (!b) return;
    b.onclick = () => {
      if (onCancel && onCancel() === false) return;
      close();
    };
  }

  /* ---------- 圖片上傳器（表單用，支援預設圖） ---------- */
  /**
   * imageField(opt) → { html, mount(body) → { get(), hasChange() } }
   *   opt.id      欄位容器 id（預設 'imgf'）
   *   opt.value   既有圖片（idb: 鍵 或 dataURL）
   *   opt.label   標題（預設 '圖片'）
   */
  function imageField(opt) {
    opt = opt || {};
    const fid = opt.id || 'imgf';
    const html =
      '<div class="field"><label>' + U.esc(opt.label || '圖片') + '</label>' +
      '<div class="uploader" id="' + fid + '-up"><div class="hint">點此上傳／更換圖片 ♡</div></div>' +
      '<div class="thumb-row" id="' + fid + '-th"></div></div>';
    function mount(body) {
      let cur = opt.value || '';       // 目前的值（idb 鍵 或 dataURL）
      let changed = false;
      const box = body.querySelector('#' + fid + '-th');
      const paint = () => {
        box.innerHTML = cur ? '<div class="thumb">' + L.imgTag(cur) + '<span class="x" data-rm="1">×</span></div>' : '';
        const x = box.querySelector('[data-rm]');
        if (x) x.onclick = () => { cur = ''; changed = true; paint(); };
        if (cur) L.hydrateImages(box);
      };
      paint();
      body.querySelector('#' + fid + '-up').onclick = async () => {
        const a = await U.pickImages();               // 800px / 0.65
        if (a[0]) { cur = a[0]; changed = true; paint(); }
      };
      return {
        get: () => cur,
        hasChange: () => changed,
        /** 回傳要存進資料庫的值（新圖會寫入 IndexedDB，舊圖自動刪除） */
        async save(prev) {
          if (!cur) { if (prev) await L.IDB.del(prev); return ''; }
          if (!changed) return cur;                    // 沒動過就維持原值
          const key = await L.IDB.put(cur);
          if (prev && prev !== key && L.IDB.isKey(prev)) await L.IDB.del(prev);
          return key;
        }
      };
    }
    return { html, mount };
  }

  /* ---------- 空狀態 ---------- */
  function empty(text, ico) {
    return '<div class="empty">' + icon(ico || 'flower') + '<div>' + U.esc(text) + '</div></div>';
  }

  /* ---------- 月曆 ---------- */
  /**
   * renderCalendar({year,month,marks,onPick,selected})
   * marks: { 'yyyy-mm-dd': [{type:'lav'|'pink'|'mint'}] }
   */
  function calendarHTML(opt) {
    const y = opt.year, m = opt.month;      // month: 0-11
    const marks = opt.marks || {};
    const today = D.today();
    const first = D.firstDow(y, m);
    const total = D.daysInMonth(y, m);
    const prevTotal = D.daysInMonth(y, m - 1 < 0 ? 11 : m - 1);
    let cells = '';
    const dow = ['日', '一', '二', '三', '四', '五', '六'];
    let head = dow.map(d => '<div class="cal-dow">' + d + '</div>').join('');
    for (let i = 0; i < first; i++) {
      cells += '<div class="cal-cell out">' + (prevTotal - first + i + 1) + '</div>';
    }
    for (let d = 1; d <= total; d++) {
      const key = y + '-' + D.pad(m + 1) + '-' + D.pad(d);
      const mk = marks[key] || [];
      const dots = mk.length ? '<div class="dots">' + mk.slice(0, 3).map(x => '<i class="dot ' + (x === 'lav' ? '' : x) + '" style="width:5px;height:5px;border-radius:50%;display:block;background:' +
        (x === 'pink' ? '#E9A8BC' : x === 'mint' ? '#87BBA0' : '#A98BD9') + '"></i>').join('') + '</div>' : '<div class="dots"></div>';
      cells += '<div class="cal-cell' + (key === today ? ' today' : '') + (key === opt.selected ? ' sel' : '') +
        '" data-date="' + key + '"><span>' + d + '</span>' + dots + '</div>';
    }
    let rest = (7 - ((first + total) % 7)) % 7;
    for (let i = 1; i <= rest; i++) cells += '<div class="cal-cell out">' + i + '</div>';
    return '<div class="cal-head"><button class="icon-btn" data-cal="prev" style="width:32px;height:32px">' +
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M15 5l-7 7 7 7" stroke="#8E6FC8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<b>' + y + ' 年 ' + (m + 1) + ' 月</b>' +
      '<button class="icon-btn" data-cal="next" style="width:32px;height:32px">' +
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M9 5l7 7-7 7" stroke="#8E6FC8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>' +
      '<div class="cal-grid">' + head + cells + '</div>';
  }

  /* ---------- 環形進度 ---------- */
  function ring(percent, main, sub) {
    const R = 58, C = 2 * Math.PI * R;
    const off = C * (1 - U.clamp(percent, 0, 100) / 100);
    return '<div class="ring"><svg width="150" height="150" viewBox="0 0 150 150">' +
      '<circle cx="75" cy="75" r="' + R + '" fill="none" stroke="#EFEAFB" stroke-width="15"/>' +
      '<circle cx="75" cy="75" r="' + R + '" fill="none" stroke="url(#lg1)" stroke-width="15" stroke-linecap="round" ' +
      'stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" style="transition:stroke-dashoffset .7s cubic-bezier(.2,.8,.2,1)"/>' +
      '<defs><linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#C7ACE9"/><stop offset="100%" stop-color="#8E6FC8"/></linearGradient></defs>' +
      '</svg><div class="txt"><b>' + main + '</b><span>' + sub + '</span></div></div>';
  }

  /* ---------- 統計格 ---------- */
  function stat(v, unit, label) {
    return '<div class="stat"><b>' + v + (unit ? '<small>' + unit + '</small>' : '') + '</b><span>' + label + '</span></div>';
  }

  /* ---------- 安全 HTML 文字 ---------- */
  const nl2br = (s) => U.esc(s).replace(/\n/g, '<br>');

  L.toast = toast; L.modal = modal; L.confirm = confirm; L.empty = empty;
  L.calendarHTML = calendarHTML; L.ring = ring; L.stat = stat; L.nl2br = nl2br;
  L.editBtn = editBtn; L.formFooter = formFooter; L.bindCancel = bindCancel; L.imageField = imageField;

  /** 取得表單某個欄位的值（容錯：找不到就回傳空字串） */
  L.val = (body, id) => { const el = body.querySelector('#' + id); return el ? el.value : ''; };
})(window.Lume);
