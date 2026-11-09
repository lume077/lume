/* ============================================================
   input.js — 手機（尤其是 iOS / Android PWA 全螢幕）輸入體驗優化
   ------------------------------------------------------------
   解決「加入主畫面後點輸入框沒反應 / 叫不出鍵盤 / 頁面卡住」：
   1. 絕對不在 touchstart / touchend 上 preventDefault（會吃掉 focus）
   2. 輸入框點擊時主動 focus()，繞開 iOS standalone 的合成點擊延遲
   3. 鍵盤升起後把輸入框捲進可視範圍（彈窗內也適用）
   4. 收鍵盤時把 iOS 被頂走的捲軸位置還原，避免畫面「卡住」
   5. 版面高度一律由 --app-vh（凍結值／dvh）控制，絕不使用 vh 單位，避免鍵盤遮住內容
   ============================================================ */
window.Lume = window.Lume || {};
(function (L) {
  'use strict';

  function mm(q) {
    try { return !!(window.matchMedia && window.matchMedia(q) && window.matchMedia(q).matches); }
    catch (e) { return false; }
  }
  var isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isStandalone = window.navigator.standalone === true ||
    mm('(display-mode: standalone)') || mm('(display-mode: fullscreen)');

  var scrollLockY = 0;
  var activeEl = null;
  var focusTimer = null;

  function isField(el) {
    if (!el || !el.tagName) return false;
    var t = el.tagName.toUpperCase();
    if (t === 'TEXTAREA' || t === 'SELECT') return true;
    if (t !== 'INPUT') return false;
    var ty = (el.type || 'text').toLowerCase();
    // checkbox / radio / button 不需要叫鍵盤
    return ['text', 'search', 'email', 'url', 'tel', 'number', 'password', 'date', 'time', 'datetime-local', 'month'].indexOf(ty) >= 0;
  }

  /* ---- 1. 攔截：任何在輸入框上的 touch 事件都不允許被別人 preventDefault ---- */
  // 用 capture 階段監聽，若發現有其它程式碼在輸入框上 preventDefault，就復原 defaultPrevented 的副作用：
  // 直接在 touchend 後補一次 focus()，確保鍵盤一定會起來。
  document.addEventListener('touchstart', function (e) {
    if (isField(e.target)) activeEl = e.target;
  }, { passive: true, capture: false });

  document.addEventListener('touchend', function (e) {
    var el = isField(e.target) ? e.target : (isField(activeEl) ? activeEl : null);
    activeEl = null;
    if (!el) return;
    // 只有當這個事件的預設行為被取消（= 瀏覽器不會幫我們 focus）時才手動介入。
    // ★ 一定要「同步」呼叫 focus()：放進 setTimeout 會丟掉 iOS 的 user activation，
    //   鍵盤就不會彈出來 —— 這正是以前「要點兩次才能輸入」的原因。
    if (e.defaultPrevented) { e.stopPropagation(); focusNow(el); }
  }, { passive: true, capture: false });

  /* ---- 2. click 時主動 focus（iOS standalone 的關鍵） ---- */
  document.addEventListener('click', function (e) {
    var el = e.target;
    if (!isField(el)) return;
    // 不要阻止預設行為；只是同步「補一刀」，讓 standalone 模式也一定能拿到焦點
    if (document.activeElement !== el) focusNow(el);
  }, true);

  /** 同步 focus：絕對不包 setTimeout，才能保住 user activation、一次就叫出鍵盤 */
  function focusNow(el) {
    if (!el) return;
    try {
      if (document.activeElement === el) return;
      try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
    } catch (e) { }
  }

  /** 事後補救（非同步）：只有同步那次真的失敗時才走這條路 */
  function safeFocus(el) {
    try {
      if (!document.body.contains(el)) return;
      if (document.activeElement !== el) {
        try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
      }
      // 若點了還是沒焦點（iOS standalone + user-scalable=no 的已知狀況），放行縮放再試一次
      if (document.activeElement !== el) ensureFocus(el);
    } catch (e) { }
  }

  /** 兜底：把任何計算後小於 16px 的輸入框強制拉回 16px（iOS 就不會自動放大） */
  function enforceFontSize(root) {
    try {
      var nodes = (root || document).querySelectorAll('input,textarea,select');
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (n.type === 'checkbox' || n.type === 'radio' || n.type === 'button' || n.type === 'submit') continue;
        var fs = parseFloat(window.getComputedStyle(n).fontSize);
        if (!isNaN(fs) && fs < 16) { n.style.fontSize = '16px'; n.style.touchAction = 'manipulation'; }
      }
    } catch (e) { }
  }

  /* ---- 3. 鍵盤升起：把輸入框捲進可視範圍 ---- */
  document.addEventListener('focusin', function (e) {
    var el = e.target;
    if (!isField(el)) return;
    kbOpen = true;
    lastFocusAt = Date.now();
    document.body.classList.add('kb-open');
    scrollLockY = window.scrollY || window.pageYOffset || 0;
    clearTimeout(focusTimer);
    clearTimeout(kbTimer);
    /* 記住鍵盤升起前的基準高度，之後 --app-vh 就被凍結在這個值 */
    if (!baseH) baseH = window.innerHeight || 0;
    /* 等鍵盤動畫（約 250~300ms）結束，再判斷「有沒有被擋住」，有才捲 */
    focusTimer = setTimeout(function () {
      onKbUp();
      scrollFieldIntoView(el);
    }, 320);
    /* 保險：若 visualViewport 沒事件（舊機型），用時間差自己量一次鍵盤高度 */
    kbTimer = setTimeout(onKbUp, 400);
  });
  var kbTimer = null;

  document.addEventListener('focusout', function () {
    // ★ 不再強制把畫面捲回原處：那會在「打完字點別處」時讓畫面突然跳一下。
    //   只做狀態復原（鍵盤收起 → 解凍版面高度）。
    setTimeout(function () {
      var a = document.activeElement;
      if (a && isField(a)) return;            // 還在下一個輸入框：鍵盤沒收，什麼都不做
      lastScrollEl = null;                    // 換下一個輸入框時才允許再調整一次
      kbOpen = false;
      document.body.classList.remove('kb-open');
      syncBase();                             // 鍵盤收起後才重新量測基準高度
    }, 60);
  });

  /**
   * ★ 最後手段：只有輸入框「完全被鍵盤遮住」時，才捲動「捲動容器」本身。
   *   · 絕不捲 window（整頁已 overflow:hidden，捲了也沒用）
   *   · 絕不用 behavior:'smooth'（動畫 + 鍵盤動畫同時播 = 畫面亂跳閃爍）
   *   · 已經看得到就完全不動 —— 這是「輸入框不亂跳」的關鍵
   */
  var lastScrollEl = null;
  function scrollFieldIntoView(el) {
    if (!el || !document.body.contains(el)) return;
    try {
      /* ★ 同一個輸入框只調整一次：否則打字過程會一直微調 → 畫面看起來在抖 */
      if (lastScrollEl === el) return;
      var modal = el.closest ? el.closest('.modal') : null;
      var box = (modal && modal.scrollHeight > modal.clientHeight + 2) ? modal
        : (document.getElementById('main') || null);
      if (!box || box.scrollHeight <= box.clientHeight + 2) return;

      /* 可視範圍以 visualViewport 為準（iOS 鍵盤升起時 height 會縮、offsetTop 會位移） */
      var vvH = 0, vvTop = 0;
      if (window.visualViewport) { vvH = window.visualViewport.height || 0; vvTop = window.visualViewport.offsetTop || 0; }
      if (!vvH) { vvH = window.innerHeight || 0; vvTop = 0; }
      var rect = el.getBoundingClientRect();
      if (!rect.height || !vvH) return;
      var br = box.getBoundingClientRect();
      var top = Math.max(br.top, vvTop, 0);
      var bottom = Math.min(br.bottom, vvTop + vvH);
      if (bottom - top < 40) return;                 // 幾乎看不到可視區：放棄捲動，避免亂跳

      /* 只有「真的被鍵盤 / 頂欄擋住」才捲，而且捲到「剛剛好露出一整行」就停 */
      var need = 0;
      if (rect.bottom > bottom - 12) need = Math.ceil(rect.bottom - bottom + 26);
      else if (rect.top < top + 8) need = -Math.ceil(top + 8 - rect.top + 14);
      if (!need) return;
      lastScrollEl = el;
      box.scrollTop += need;
    } catch (e) { }
  }

  /* ---- 3.5 viewport 動態放行（只在真的需要時） ----
     需求：meta 固定 maximum-scale=1,user-scalable=no → 不會被自動放大。
     但 iOS 的 PWA 全螢幕模式在「禁止縮放」時，某些版本會讓輸入框叫不出鍵盤。
     折衷：平時維持 user-scalable=no；只有當偵測到「點了卻沒拿到焦點」時，
     才在該次輸入期間暫時放行縮放，輸入結束立刻還原。縮放值仍停在 1.0，畫面不會變。 */
  var vpEl = document.querySelector('meta[name=viewport]');
  var VP_LOCK = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
  var VP_OPEN = 'width=device-width, initial-scale=1.0, viewport-fit=cover';
  var vpTimer = null;
  function setViewport(v) { if (vpEl) vpEl.setAttribute('content', v); }
  function openViewport() {
    if (!isIOS || !isStandalone) return;         // 一般瀏覽器不需要
    clearTimeout(vpTimer); setViewport(VP_OPEN);
  }
  function closeViewport() {
    if (!isIOS || !isStandalone) return;
    vpTimer = setTimeout(function () { setViewport(VP_LOCK); }, 400);
  }

  /** 點了輸入框卻沒拿到焦點 → 判定為 iOS standalone 的 focus bug，放行縮放重試 */
  function ensureFocus(el) {
    if (!el) return;
    if (document.activeElement === el) return;
    openViewport();
    setTimeout(function () {
      try { el.focus({ preventScroll: true }); } catch (e) { try { el.focus(); } catch (_) { } }
      if (document.activeElement === el) setTimeout(closeViewport, 500);
      else setTimeout(closeViewport, 1500);
    }, 30);
  }

  /* ---- 4. 動態視窗高度（鍵盤安全版） ----------------------------------
     ★ 核心原則：鍵盤升起的瞬間「不要」更新 --app-vh。
     手機鍵盤會觸發 resize / visualViewport.resize，若在這裡跟著改 --app-vh，
     整頁高度會瞬間縮小 → 所有元素重排 → 輸入框被頂上去、看起來像焦點跑掉。
     做法：--app-vh 只在「鍵盤沒升起」時量測並凍結；鍵盤期間完全不動。      */
  var vv = window.visualViewport || null;
  var baseH = 0;      // 鍵盤未升起時的視窗高度（凍結基準）
  var kbOpen = false;
  var kbH = 0;        // 目前鍵盤高度（px）

  function curH() { return vv ? Math.round(vv.height) : (window.innerHeight || 0); }

  function setAppVh() {
    try {
      var h = baseH || window.innerHeight || 0;
      if (!h) return;
      document.documentElement.style.setProperty('--app-vh', h + 'px');
      document.documentElement.style.setProperty('--kb-h', (kbOpen ? kbH : 0) + 'px');
    } catch (e) { }
  }

  /** 鍵盤沒升起時才重新量測基準高度（鍵盤期間呼叫會被忽略） */
  function syncBase() {
    if (kbOpen) return;                       // ★ 鍵盤還在：凍結，不重排
    /* Android 的 resize 可能早於 focusin 觸發 → 那 900ms 內一律不重測，
       否則基準高度會被鍵盤「縮小後的」高度污染 */
    if (Date.now() - lastFocusAt < 900) return;
    var h = window.innerHeight || 0;
    if (h && Math.abs(h - baseH) > 1) { baseH = h; setAppVh(); }
    else if (!baseH) { baseH = h; setAppVh(); }
  }
  var lastFocusAt = 0;

  /** 鍵盤升起：只更新 --kb-h（供需要時微調），絕不改 --app-vh */
  function onKbUp() {
    kbOpen = true;
    var h = curH();
    kbH = Math.max(0, (baseH || window.innerHeight || 0) - h);
    try { document.documentElement.style.setProperty('--kb-h', kbH + 'px'); } catch (e) { }
    document.body.classList.add('kb-open');
  }

  window.addEventListener('resize', function () {
    if (kbOpen) return;                       // 鍵盤造成的 resize 直接忽略
    clearTimeout(baseTimer);
    baseTimer = setTimeout(syncBase, 120);
  });
  var baseTimer = null;
  window.addEventListener('orientationchange', function () {
    kbOpen = false; baseH = 0;
    setTimeout(syncBase, 320);
  });
  if (vv) vv.addEventListener('resize', function () {
    if (isField(document.activeElement)) onKbUp(); else { kbOpen = false; syncBase(); }
  });
  if (vv) vv.addEventListener('scroll', function () { /* 不做事：避免鍵盤滑動時重排 */ });
  syncBase();
  window.addEventListener('load', syncBase);

  /* ---- 5. 視覺回饋：讓輸入框在手機上有明確的按壓感（不會像「點了沒反應」） ---- */
  var css = document.createElement('style');
  css.textContent = [
    'html,body{-webkit-text-size-adjust:100%;text-size-adjust:100%;}',
    /* 去掉 iOS 自動加的圓角與內陰影；日期/時間/勾選框保持原生外觀，才叫得出原生選擇器 */
    'input:not([type=date]):not([type=time]):not([type=datetime-local]):not([type=checkbox]):not([type=radio]),textarea,select{-webkit-appearance:none;appearance:none;border-radius:12px;}',
    'input:active,textarea:active{background:#fff;}',
    'body.kb-open .bottomnav{opacity:.3;pointer-events:none;}' /* 鍵盤升起時底部導航淡出（不改 position，避免重排） */,
    /* 鍵盤升起時，底部彈窗會被鍵盤整片蓋住 → 改成靠上對齊
       （高度用凍結的 --app-vh，不要用 vh 單位，否則鍵盤一動彈窗就跟著縮） */
    '@media(max-width:719px){',
    '  body.kb-open .mask{align-items:flex-start;padding-top:calc(10px + env(safe-area-inset-top,0px));}',
    /* 鍵盤升起：彈窗縮到鍵盤上方（--app-vh 凍結值 - 鍵盤高度），彈窗內部自己捲 */
    '  body.kb-open .modal{max-height:calc(var(--app-vh) - var(--kb-h,0px) - 20px);border-radius:20px;}',
    '  body.kb-open .modal-body{max-height:none;}',
    '}'
  ].join('\n');
  document.head.appendChild(css);

  /* ---- 6. 保險：若彈窗開啟後 400ms 還沒抓到焦點，自動聚焦第一個輸入框 ---- */
  var mo = new MutationObserver(function (list) {
    for (var i = 0; i < list.length; i++) {
      var nodes = list[i].addedNodes;
      for (var j = 0; j < nodes.length; j++) {
        var n = nodes[j];
        if (n.nodeType !== 1) continue;
        if (!n.classList || !n.classList.contains('mask')) continue;
        /* ★ 防幽靈遮罩堆疊：本 App 一次只會開一個彈窗。
           若有舊遮罩還留著（.mask 是 inset:0 / z-index:100），
           整頁的輸入框都會被它吃掉點擊 → 鍵盤永遠叫不出來。
           新遮罩出現時，一律清掉舊的。 */
        try {
          var olds = document.querySelectorAll('.mask');
          for (var oi = 0; oi < olds.length; oi++) {
            if (olds[oi] !== n) olds[oi].remove();
          }
        } catch (e) { }
        var box = n.querySelector('.modal');
        if (!box) { try { n.remove(); } catch (e) { } continue; }   // 沒有內容的空遮罩：直接清掉
        // 讓彈窗可捲，鍵盤蓋住時才捲得動
        box.style.webkitOverflowScrolling = 'touch';
        box.style.overscrollBehavior = 'contain';
        enforceFontSize(box);
      }
    }
  });
  try { mo.observe(document.body, { childList: true }); } catch (e) { }

  /* 每頁渲染後也掃一次（SPA 換頁不會觸發上面的 MutationObserver） */
  var enforceTimer = null;
  function scheduleEnforce() {
    clearTimeout(enforceTimer);
    enforceTimer = setTimeout(function () {
      var m = document.getElementById('main');
      if (m) enforceFontSize(m);
      enforceFontSize(document.body);
    }, 60);
  }
  window.addEventListener('hashchange', scheduleEnforce);
  window.addEventListener('load', scheduleEnforce);
  scheduleEnforce();

  L.input = {
    isIOS: isIOS,
    isStandalone: isStandalone,
    focus: safeFocus,
    scrollIntoView: scrollFieldIntoView,
    enforceFontSize: enforceFontSize
  };
})(window.Lume);
