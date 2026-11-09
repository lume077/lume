/* ============================================================
   app.js — 路由器 / 導覽 / 設定頁 / PWA 安裝引導
   ============================================================ */
(function (L) {
  'use strict';
  const { D, U, icon, Store } = L;

  /* 全域錯誤防護：任何單一錯誤都不會讓整頁變空白 */
  window.addEventListener('error', e => {
    console.error('[Lume]', e.message);
    const main = document.getElementById('main');
    if (main && !main.innerHTML.trim()) {
      main.innerHTML = '<div class="card"><h3>頁面載入時出了點小狀況 ♡</h3>' +
        '<div class="muted">' + String(e.message || '') + '</div>' +
        '<button class="btn block mt14" onclick="location.reload()">重新載入</button></div>';
    }
  });

  /* ★ 導覽順序（嚴格依 Lume 指定的排版）：
     首頁 → 今日計劃 → 待辦事項 → 學習計畫 → 日記 → 塔羅 → 初 → 文案 → 健康狀態
     → 飲食喝水 → 生理期 → 閱讀記錄 → 穿搭助手 → 願望清單 →（設定固定在最後） */
  /* ★ 側欄分組（依 Lume 常用程度排）：
     拾光·每日 → 心羽·心事 → 星痕·收藏 → 花徑·小角落（預設收起）
     「計畫」是一個入口，裡面用分頁切換 今日計畫 / 待辦計畫 / 學習計畫 */
  const GROUPS = [
    { id: 'shiguang', name: '拾光', sub: '每日', lic: 'moon', items: ['home', 'plan'] },
    { id: 'xinyu', name: '心羽', sub: '心事', lic: 'feather', items: ['diary', 'murmurs', 'tarot', 'body'] },
    { id: 'xinghen', name: '星痕', sub: '收藏', lic: 'star', items: ['firsts', 'notes', 'review'] },
    { id: 'huajing', name: '花徑', sub: '小角落', lic: 'flower', items: ['water', 'period', 'reading', 'outfit', 'wishes'], closed: true }
  ];
  const PLAN_IDS = ['today', 'todo', 'study'];
  const NAV = ['home', 'today', 'todo', 'study', 'diary', 'murmurs', 'tarot', 'firsts', 'notes', 'review',
    'body', 'water', 'period', 'reading', 'outfit', 'wishes'];
  let cur = 'home';
  let lastPlan = 'today';
  let deferredPrompt = null;

  const navName = id => id === 'plan' ? '計畫' : (L.modules[id] ? L.modules[id].name : id);
  const navIcon = id => id === 'plan' ? 'list' : (L.modules[id] ? L.modules[id].icon : 'star');

  /** 目前的側欄排列（可在設定裡自訂，會跟著雲端同步） */
  function layout() {
    const saved = ((Store.db.profile || {}).navLayout) || {};
    const all = []; GROUPS.forEach(g => g.items.forEach(i => all.push(i)));
    const used = {};
    const out = GROUPS.map(g => {
      const arr = (saved[g.id] || g.items).filter(i => all.indexOf(i) >= 0 && !used[i] && (used[i] = 1));
      return { id: g.id, name: g.name, sub: g.sub, lic: g.lic, closed: g.closed, items: arr };
    });
    GROUPS.forEach((g, gi) => g.items.forEach(i => { if (!used[i]) { out[gi].items.push(i); used[i] = 1; } }));
    return out;
  }
  const CLOSED_KEY = 'lume_nav_closed_v2';
  function closedMap() {
    try { const v = JSON.parse(localStorage.getItem(CLOSED_KEY) || 'null'); if (v) return v; } catch (e) { }
    const o = {}; GROUPS.forEach(g => { o[g.id] = !!g.closed; }); return o;
  }
  function setClosed(id, v) {
    const m = closedMap(); m[id] = v;
    try { localStorage.setItem(CLOSED_KEY, JSON.stringify(m)); } catch (e) { }
  }

  /* ---------- 設定頁 ---------- */
  const settings = {
    id: 'settings', name: '設定', icon: 'gear',
    render() {
      return '' +
        '<div class="card tinted"><h3>' + icon('cloudSun') + '☁️ 雲端同步（跨裝置）</h3>' +
        '<div id="syncbox"><div class="muted">正在讀取同步狀態…</div></div>' +
        '<div class="row mt14"><button class="btn" id="synccfg" style="flex:1">⚙️ 設定雲端</button>' +
        '<button class="btn ghost" id="syncnow" style="flex:1">🔄 立即同步</button></div>' +
        '<div class="row mt8"><button class="btn soft sm" id="syncexp" style="flex:1">🔑 產生同步碼</button>' +
        '<button class="btn soft sm" id="syncimp" style="flex:1">📥 貼上同步碼</button></div>' +
        '<div class="muted mt8" style="line-height:1.75">所有裝置（電腦瀏覽器 / 手機瀏覽器 / 主畫面捷徑）只要填入' +
        '<b>同一組同步金鑰</b>，就會自動雙向同步同一份資料 ♡<br>' +
        '第一次連上雲端時，會自動把舊網站（Lume 的小世界）的資料和照片搬過來；舊網站的資料不會被動到。</div>' +
        '<button class="btn ghost block mt8" id="syncold">🌙 從舊網站搬資料過來</button></div>' +

        '<div class="card"><h3>' + icon('moon') + '外觀</h3>' +
        '<div class="field"><label>淺色 / 月光模式</label><select class="inp" id="thm">' +
        [['auto', '自動（晚上 7 點到早上 6 點是月光）'], ['light', '一直是晨光淺色'], ['dark', '一直是月光深色']].map(o =>
          '<option value="' + o[0] + '"' + (L.Theme && L.Theme.mode() === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') +
        '</select></div>' +
        '<button class="btn soft block" id="navcfg">🗂 調整側欄的順序與分組</button>' +
        '<div class="muted mt8">哪一頁變常用了，就把它往上移；頁面也可以換到別的分組 ♡</div></div>' +

        '<div class="card tinted"><h3>' + icon('gear') + '💾 資料管理與備份</h3>' +
        '<div id="storage"><div class="muted">正在計算儲存空間…</div></div>' +
        '<div class="row mt14"><button class="btn" id="exp" style="flex:1">⬇ 匯出備份</button>' +
        '<button class="btn ghost" id="imp" style="flex:1">⬆ 匯入備份</button></div>' +
        '<div class="deco-line"></div>' +
        '<div class="muted mb8">釋放空間</div>' +
        '<div class="row"><button class="btn soft sm" id="shrink">🖼 壓縮圖片</button>' +
        '<button class="btn soft sm" id="prune">🧹 清孤兒圖</button>' +
        '<button class="btn soft sm" id="clearcache">🗑 清快取</button></div>' +
        '<div class="row mt8"><button class="btn ghost sm" id="clearpics" style="color:var(--danger);border-color:#F0C9CE">清除所有圖片（保留文字）</button></div>' +
        '<div class="muted mt8">圖片存在 IndexedDB（可達數百 MB），文字資料存在 localStorage；換手機或清快取前請先匯出備份 ♡</div>' +
        '<div class="kv mt8"><span>資料版本</span><b>v' + Store.db.version + '</b></div></div>' +

        '<div class="card"><h3>' + icon('home') + '加到手機主螢幕</h3>' +
        '<div id="inst"><div class="muted" style="line-height:1.9">' +
        '<b>iPhone（Safari）</b>：開啟本頁 → 點下方「分享」按鈕 → 選擇「加入主畫面」→ 完成 ♡<br>' +
        '<b>Android（Chrome）</b>：點右上角選單 → 「安裝應用程式」或「加到主畫面」' +
        '</div></div>' +
        '<button class="btn block mt14" id="doinst">📱 一鍵安裝到主螢幕</button></div>' +

        '<div class="card"><h3>' + icon('sparkle') + '各模組資料筆數</h3>' +
        NAV.map(id => {
          const k = {
            home: 'countdowns', today: 'todos', todo: 'futureTodos', study: 'studies', water: 'weights', reading: 'books',
            diary: 'diary', murmurs: 'murmurs', tarot: 'tarot', firsts: 'firsts', notes: 'notes', body: 'bodyLogs',
            outfit: 'outfits', period: null, wishes: 'wishes', review: null
          }[id];
          if (id === 'review') return '';
          const n = k ? (Store.db[k] || []).length : (id === 'period' ? (Store.db.period.cycles || []).length : 0);
          const dn = (id === 'reading') ? ((Store.db.dramas || []).length || 0) : 0;
          return '<div class="kv"><span>' + L.modules[id].name + '</span><b>' + n + ' 筆' +
            (dn ? '　🎬 ' + dn + ' 部' : '') + '</b></div>';
        }).join('') + '</div>' +

        '<div class="card"><h3>' + icon('moon') + '關於</h3>' +
        '<div class="muted" style="line-height:1.9">Lume · 我的光 ♡<br>' +
        'Lume 在希臘文裡帶著「光」的意思 · 離線可用 · 資料存在你的裝置與你自己的雲端</div>' +
        '<button class="btn ghost block mt14" id="reset" style="color:var(--danger);border-color:#F0C9CE">清空全部資料</button></div>';
    },
    mount(root, ctx) {
      const $ = s => root.querySelector(s);

      /* ---------- 雲端同步 ---------- */
      const paintSync = () => {
        const box = $('#syncbox'); if (!box || !L.Sync) return;
        const s = L.Sync.state();
        const map = {
          off: ['尚未開啟', 'var(--ink-faint)', '資料只存在這台裝置'],
          idle: ['待同步', 'var(--lav-600)', '開啟後會自動同步'],
          syncing: ['同步中…', 'var(--lav-600)', '正在和雲端交換資料'],
          ok: ['已同步 ♡', 'var(--ok)', s.at ? '上次同步 ' + new Date(s.at).toLocaleString('zh-TW', { hour12: false }) : ''],
          error: ['同步失敗', 'var(--danger)', s.msg || '請檢查網路或雲端設定']
        };
        const m = map[s.state] || map.off;
        const preset = L.Sync.PRESETS[s.type] || L.Sync.PRESETS.off;
        box.innerHTML =
          '<div class="row" style="justify-content:space-between;align-items:baseline">' +
          '<b style="font-size:17px;color:' + m[1] + '">' + m[0] + '</b>' +
          '<span class="muted">' + U.esc(preset.name.replace(/^[①②③④⑤]\s*/, '')) + '</span></div>' +
          '<div class="muted mt8" style="font-size:12px">' + U.esc(m[2]) + '</div>' +
          (s.enabled ? '<div class="kv mt8"><span>🔑 同步金鑰</span><b>' + U.esc((L.Sync.cfg.key || 'Lume')) + '</b></div>' : '');
      };
      paintSync();
      if (L.Sync.onChange) L.Sync.onChange(() => { if (document.body.contains($('#syncbox'))) paintSync(); });

      $('#synccfg').onclick = () => syncConfigModal(paintSync, ctx);
      $('#syncnow').onclick = async () => {
        if (!L.Sync.enabled()) { L.toast('先設定雲端才能同步 ♡'); return syncConfigModal(paintSync, ctx); }
        const b = $('#syncnow'); const old = b.textContent; b.textContent = '同步中…'; b.disabled = true;
        const ok = await L.Sync.syncNow('manual');
        b.textContent = old; b.disabled = false;
        if (!ok) L.toast('同步失敗，請檢查設定 ♡');
        paintSync(); ctx.refresh();
      };
      $('#syncexp').onclick = async () => {
        const b = $('#syncexp'); const old = b.textContent; b.textContent = '產生中…'; b.disabled = true;
        try {
          const code = await L.Sync.exportCode();
          L.modal('同步碼（複製到另一台裝置）',
            '<div class="muted mb8" style="font-size:12.5px">在另一台裝置（或主畫面 App）開啟本頁 → 設定 → 「貼上同步碼」，貼上下面這串就會自動合併 ♡</div>' +
            '<textarea class="inp" id="code" style="min-height:120px;font-size:16px;word-break:break-all" readonly>' + U.esc(code) + '</textarea>' +
            '<button class="btn block mt8" id="cp">📋 複製同步碼</button>' +
            '<button class="btn-cancel mt8" id="cancel">關閉</button>',
            (body, close) => {
              L.bindCancel(body, close);
              body.querySelector('#cp').onclick = () => {
                const ta = body.querySelector('#code');
                ta.removeAttribute('readonly'); ta.select(); ta.setSelectionRange(0, 999999);
                let done = false;
                try { done = document.execCommand('copy'); } catch (e) { }
                ta.setAttribute('readonly', 'readonly');
                if (!done && navigator.clipboard) navigator.clipboard.writeText(code).then(() => L.toast('已複製 ♡')).catch(() => L.toast('請手動長按選取複製 ♡'));
                else L.toast(done ? '已複製 ♡' : '請手動長按選取複製 ♡');
              };
            });
        } catch (e) { L.toast('產生失敗 ♡'); }
        finally { b.textContent = old; b.disabled = false; }
      };
      $('#syncimp').onclick = () => {
        L.modal('貼上同步碼',
          '<div class="muted mb8" style="font-size:12.5px">貼上另一台裝置產生的同步碼，資料會與現有內容「合併」（重複的以較新的版本為準）♡</div>' +
          '<textarea class="inp" id="code" style="min-height:120px;font-size:16px;word-break:break-all" placeholder="在這裡貼上 LMZ 開頭的同步碼…"></textarea>' +
          '<button class="btn block mt8" id="ok">合併資料</button>' +
          '<button class="btn-cancel mt8" id="cancel">取消</button>',
          (body, close) => {
            L.bindCancel(body, close);
            body.querySelector('#ok').onclick = async () => {
              const v = body.querySelector('#code').value.trim();
              if (!v) return L.toast('還沒貼上同步碼 ♡');
              try {
                await L.Sync.importCode(v);
                close(); L.toast('資料已合併 ♡'); paintSync(); ctx.refresh();
              } catch (e) { L.toast('同步碼讀不出來，請確認有複製完整 ♡'); }
            };
          });
      };

      /* ---------- 從舊網站搬資料 ---------- */
      $('#syncold').onclick = async () => {
        if (!L.Sync.enabled()) { L.toast('先設定雲端（填一樣的網址和同步金鑰）才能搬 ♡'); return syncConfigModal(paintSync, ctx); }
        if (!await L.confirm('從舊網站搬資料', '會把舊網站雲端上的資料和照片合併進來，舊網站本身不會被改動。要開始嗎？')) return;
        const b = $('#syncold'); const old = b.textContent; b.textContent = '搬家中…'; b.disabled = true;
        try {
          const n = await L.Sync.migrateOld();
          L.toast(n < 0 ? '雲端上找不到舊網站的資料，請確認同步金鑰和舊網站一樣 ♡' : (n ? '搬過來 ' + n + ' 筆紀錄了 ♡' : '舊資料都已經在這裡了 ♡'));
        } catch (e) { L.toast('搬家失敗：' + ((e && e.message) || '請檢查網路')); }
        finally { b.textContent = old; b.disabled = false; paintSync(); ctx.refresh(); }
      };

      /* ---------- 外觀 ---------- */
      $('#thm').onchange = e => { L.Theme.setMode(e.target.value); L.toast('已套用 ♡'); };
      $('#navcfg').onclick = () => navConfigModal(ctx);

      /* 空間用量（含百分比條） */
      const paintStorage = async () => {
        const box = $('#storage'); if (!box) return;
        try {
          const u = await Store.usage();
          const warn = u.pct >= 80;
          box.innerHTML =
            '<div class="row" style="justify-content:space-between;align-items:baseline">' +
            '<b style="font-size:20px;color:' + (warn ? 'var(--danger)' : 'var(--lav-600)') + '">' + u.pct + '%</b>' +
            '<span class="muted">已用 ' + u.usedMB + ' MB' + (u.quotaMB !== '—' ? ' / 約 ' + u.quotaMB + ' MB' : '') + '</span></div>' +
            '<div class="bar mt8"><i style="width:' + Math.max(2, u.pct) + '%;background:' +
            (warn ? 'var(--danger)' : 'linear-gradient(90deg,var(--lav-300),var(--lav-500))') + '"></i></div>' +
            '<div class="kv mt8"><span>文字資料（localStorage）</span><b>' + u.lsKB + ' KB</b></div>' +
            '<div class="kv"><span>圖片（IndexedDB）</span><b>' + u.imgCount + ' 張 · ' + u.imgMB + ' MB</b></div>' +
            (warn ? '<div class="muted mt8" style="color:var(--danger)">空間快滿囉 ♡ 點下面的「壓縮圖片」或「清孤兒圖」釋放一下</div>' : '');
        } catch (e) {
          box.innerHTML = '<div class="muted">無法讀取空間資訊 ♡</div>';
        }
      };
      paintStorage();

      /* 匯出：把 IndexedDB 圖片行內化後下載 */
      $('#exp').onclick = async () => {
        const btn = $('#exp'); const old = btn.textContent;
        btn.textContent = '正在準備備份…'; btn.disabled = true;
        try {
          const txt = await Store.exportJSON();
          const blob = new Blob([txt], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'lume-world-backup-' + D.today() + '.json';
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 4000);
          L.toast('備份已下載 ♡（含圖片）');
        } catch (e) {
          L.toast('匯出失敗，請再試一次 ♡');
        } finally { btn.textContent = old; btn.disabled = false; }
      };

      /* 匯入：圖片自動寫回 IndexedDB */
      $('#imp').onclick = () => {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = '.json,application/json';
        inp.onchange = async () => {
          const f = inp.files[0]; if (!f) return;
          const txt = await f.text();
          const merge = await L.confirm('匯入備份', '要「合併」現有資料嗎？\n選擇「確定」= 合併；選擇「取消」= 覆蓋全部。');
          try {
            await Store.importJSON(txt, merge);
            L.toast('匯入成功 ♡');
            paintStorage(); ctx.refresh();
          } catch (e) { L.toast('檔案格式錯誤 ♡'); }
        };
        inp.click();
      };

      /* 釋放空間：批次再壓縮 */
      $('#shrink').onclick = async () => {
        if (!await L.confirm('壓縮圖片', '會把所有圖片重新壓到最長邊 800px，畫質稍微下降但省很多空間。要繼續嗎？')) return;
        L.toast('正在壓縮… ♡');
        const r = await L.IDB.shrink(800, 0.65);
        L.toast(r.n ? '已壓縮 ' + r.n + ' 張，省下 ' + Math.max(0, (r.before - r.after) / 1024).toFixed(0) + ' KB ♡' : '圖片已經很輕了 ♡');
        paintStorage();
      };

      /* 釋放空間：清孤兒圖 */
      $('#prune').onclick = async () => {
        const n = await L.IDB.prune(Store.db);
        L.toast(n ? '清掉 ' + n + ' 張沒用到的圖片 ♡' : '沒有多餘的圖片 ♡');
        paintStorage();
      };

      /* 清 Service Worker 快取 */
      $('#clearcache').onclick = async () => {
        if (!await L.confirm('清除快取', '只會清掉離線快取的程式檔，不會動到你的資料。要繼續嗎？')) return;
        try {
          if (window.caches) { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); }
          if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
            const rs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(rs.map(r => r.unregister()));
          }
          L.toast('快取已清除，正在重新載入 ♡');
          setTimeout(() => location.reload(), 800);
        } catch (e) { L.toast('清除失敗 ♡'); }
      };

      /* 清除所有圖片（保留文字） */
      $('#clearpics').onclick = async () => {
        if (!await L.confirm('清除所有圖片', '穿搭照、書封、日記照片都會被移除，文字紀錄會完整保留。建議先匯出備份。確定嗎？')) return;
        const d = Store.db;
        const walk = o => {
          if (!o || typeof o !== 'object') return;
          if (Array.isArray(o)) o.forEach((x, i) => { if (L.IDB.isKey(x)) o[i] = ''; else walk(x); });
          else for (const k in o) { if (L.IDB.isKey(o[k])) o[k] = ''; else walk(o[k]); }
        };
        walk(d);
        await L.IDB.clear();
        await Store.flush();
        L.toast('圖片已清除，文字都還在 ♡');
        paintStorage(); ctx.refresh();
      };

      $('#doinst').onclick = () => {
        if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; }
        else if (navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) L.toast('已經在主螢幕裡囉 ♡');
        else L.toast('請用 Safari / Chrome 的選單加到主畫面 ♡');
      };
      $('#reset').onclick = async () => {
        if (!await L.confirm('清空資料', '所有紀錄都會消失且無法復原，建議先匯出備份。確定嗎？')) return;
        if (!await L.confirm('再確認一次', '真的要清空嗎？這一步無法復原。')) return;
        Store.reset(); L.toast('已清空 ♡'); ctx.refresh();
      };
    }
  };
  L.modules.settings = settings;

  /* ---------- 雲端設定彈窗 ---------- */
  function syncConfigModal(done, ctx) {
    const S = L.Sync;
    if (!S) return;
    const cfg = S.cfg;
    const types = Object.keys(S.PRESETS);
    const KEY_FIELD = { k: 'key', label: '🔑 專屬同步金鑰 / 帳號名稱', ph: 'Lume' };
    const fieldHTML = type => {
      const p = S.PRESETS[type] || S.PRESETS.off;
      const fs = (p.fields || []).filter(f => f.k !== 'key');
      let html = '<div class="muted mb8" style="font-size:11.5px;line-height:1.7">' + U.esc(p.note || '') + '</div>';
      html += fs.map(f =>
        '<div class="field"><label>' + U.esc(f.label) + '</label>' +
        '<input class="inp" data-f="' + f.k + '" value="' + U.esc(cfg[f.k] || '') + '" placeholder="' + U.esc(f.ph || '') + '"></div>'
      ).join('');
      if (type !== 'off') {
        html += '<div class="field"><label>' + U.esc(KEY_FIELD.label) + '</label>' +
          '<input class="inp" id="skey" value="' + U.esc(cfg.key || 'Lume') + '" placeholder="' + U.esc(KEY_FIELD.ph) + '">' +
          '<div class="muted mt8" style="font-size:11.5px">所有裝置都填同一個金鑰，就會共用同一份雲端資料 ♡' +
          '（換一個金鑰 = 另一份獨立的資料）</div></div>';
      }
      html += '<div id="sguide">' + (S.setupGuide ? S.setupGuide(type) : '') + '</div>';
      return html;
    };

    L.modal('設定雲端同步',
      '<div class="field"><label>雲端類型</label><select class="inp" id="stype">' +
      types.map(t => '<option value="' + t + '"' + (cfg.type === t ? ' selected' : '') + '>' + U.esc(S.PRESETS[t].name) + '</option>').join('') +
      '</select></div>' +
      '<div id="sfields">' + fieldHTML(cfg.type) + '</div>' +
      '<label class="row mt8" style="align-items:center;gap:8px;font-size:13px"><input type="checkbox" id="sauto" style="width:17px;height:17px"' + (cfg.auto !== false ? ' checked' : '') + '> 自動同步（新增 / 修改 / 刪除就上傳）</label>' +
      '<label class="row mt8" style="align-items:center;gap:8px;font-size:13px"><input type="checkbox" id="simg" style="width:17px;height:17px"' + (cfg.images !== false ? ' checked' : '') + '> 同步時包含圖片（檔案較大）</label>' +
      '<button class="btn block mt14" id="ok">💾 儲存並立刻同步</button>' +
      '<button class="btn ghost block mt8" id="test">🔌 測試連線</button>' +
      '<button class="btn-cancel mt8" id="cancel">取消</button>',
      (body, close) => {
        L.bindCancel(body, close);
        const sel = body.querySelector('#stype');
        sel.onchange = () => { body.querySelector('#sfields').innerHTML = fieldHTML(sel.value); };
        const collect = () => {
          const o = { type: sel.value, auto: body.querySelector('#sauto').checked, images: body.querySelector('#simg').checked };
          body.querySelectorAll('[data-f]').forEach(i => { o[i.dataset.f] = i.value.trim(); });
          const kb = body.querySelector('#skey');
          if (kb) o.key = (kb.value.trim() || 'Lume');
          // 保留其它類型填過的值，避免切來切去要重打
          Object.keys(S.cfg || {}).forEach(k => { if (o[k] === undefined) o[k] = S.cfg[k]; });
          return o;
        };
        body.querySelector('#test').onclick = async () => {
          const b = body.querySelector('#test'); const old = b.textContent;
          b.textContent = '連線中…'; b.disabled = true;
          S.setCfg(collect());
          try { await S.test(); L.toast('連線成功 ♡'); }
          catch (e) { L.toast('連不上：' + ((e && e.message) || '未知錯誤')); }
          finally { b.textContent = old; b.disabled = false; }
        };
        body.querySelector('#ok').onclick = async () => {
          const o = collect();
          S.setCfg(o);
          close();
          if (o.type === 'off') { L.toast('已關閉雲端同步 ♡'); S.stop(); S.start(); if (done) done(); return; }
          L.toast('設定已儲存，正在同步… ♡');
          S.stop(); S.start();
          const ok = await S.syncNow('manual');
          if (!ok) L.toast('同步失敗，請檢查填的內容 ♡');
          if (done) done();
          if (ctx) ctx.refresh();
        };
      });
  }

  /* ---------- 自訂側欄 ---------- */
  function navConfigModal(ctx) {
    let lay = layout().map(g => ({ id: g.id, name: g.name, sub: g.sub, items: g.items.slice() }));
    const draw = body => {
      body.querySelector('#nl').innerHTML = lay.map((g, gi) =>
        '<div class="mt8"><b style="font-size:14px">' + g.name + ' <span class="muted">' + g.sub + '</span></b>' +
        (g.items.length ? g.items.map((id, ii) =>
          '<div class="nl-row"><span class="n">' + U.esc(navName(id)) + '</span>' +
          '<button class="mini-btn" data-up="' + gi + ',' + ii + '" aria-label="往上">↑</button>' +
          '<button class="mini-btn" data-dn="' + gi + ',' + ii + '" aria-label="往下">↓</button>' +
          '<select class="inp" data-mv="' + gi + ',' + ii + '">' + lay.map((x, xi) =>
            '<option value="' + xi + '"' + (xi === gi ? ' selected' : '') + '>' + x.name + '</option>').join('') + '</select></div>').join('')
          : '<div class="muted" style="padding:6px 0">這組目前是空的</div>') + '</div>').join('');
      body.querySelectorAll('[data-up],[data-dn]').forEach(b => b.onclick = () => {
        const up = !!b.dataset.up;
        const [gi, ii] = (b.dataset.up || b.dataset.dn).split(',').map(Number);
        const arr = lay[gi].items, j = up ? ii - 1 : ii + 1;
        if (j < 0 || j >= arr.length) return;
        const t = arr[ii]; arr[ii] = arr[j]; arr[j] = t; draw(body);
      });
      body.querySelectorAll('[data-mv]').forEach(s => s.onchange = () => {
        const [gi, ii] = s.dataset.mv.split(',').map(Number);
        const to = +s.value; if (to === gi) return;
        const id = lay[gi].items.splice(ii, 1)[0]; lay[to].items.push(id); draw(body);
      });
    };
    L.modal('調整側欄',
      '<div class="muted mb8">用 ↑ ↓ 調整順序，右邊選單可以把頁面換到別的分組 ♡</div><div id="nl"></div>' +
      '<button class="btn block mt14" id="ok">💾 儲存</button>' +
      '<button class="btn ghost block mt8" id="rs">恢復預設排列</button>' +
      '<button class="btn-cancel mt8" id="cancel">取消</button>',
      (body, close) => {
        L.bindCancel(body, close);
        draw(body);
        body.querySelector('#ok').onclick = () => {
          const o = {}; lay.forEach(g => { o[g.id] = g.items; });
          Store.doc('profile').set({ navLayout: o });
          close(); paintNav(); L.toast('側欄已更新 ♡');
        };
        body.querySelector('#rs').onclick = () => {
          Store.doc('profile').set({ navLayout: null });
          close(); paintNav(); L.toast('已恢復預設 ♡');
        };
      });
  }

  /* ---------- 路由 ---------- */
  function isOn(id) { return id === 'plan' ? PLAN_IDS.indexOf(cur) >= 0 : cur === id; }
  function navItem(id) {
    return '<button class="navitem' + (isOn(id) ? ' on' : '') + '" data-nav="' + id + '">' +
      icon(navIcon(id)) + '<i>' + U.esc(navName(id)) + '</i></button>';
  }
  function navHTML() {
    const closed = closedMap();
    return '<div class="s-brand">' + icon('moon', 28) + '<b>Lume</b></div>' +
      '<div class="s-sub">φῶς · 我的光</div>' +
      layout().map(g =>
        '<div class="nav-group' + (closed[g.id] ? ' closed' : '') + '" data-g="' + g.id + '">' +
        '<button class="nav-gh" data-gtoggle="' + g.id + '">' + L.lic(g.lic).replace('class="lucide"', 'class="lucide gi"') +
        '<span>' + g.name + ' <small>' + g.sub + '</small></span>' + L.lic('chev').replace('class="lucide"', 'class="lucide chev"') + '</button>' +
        '<div class="nav-items">' + g.items.map(navItem).join('') + '</div></div>').join('') +
      '<div class="nav-foot">' + navItem('settings') + '</div>';
  }
  function paintNav() {
    const sn = document.getElementById('sidenav');
    if (!sn) return;
    sn.innerHTML = navHTML();
    sn.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => {
      const id = b.dataset.nav;
      document.body.classList.remove('drawer-open');
      go(id === 'plan' ? lastPlan : id);
    });
    sn.querySelectorAll('[data-gtoggle]').forEach(b => b.onclick = () => {
      const g = b.closest('.nav-group');
      const c = !g.classList.contains('closed');
      g.classList.toggle('closed', c); setClosed(b.dataset.gtoggle, c);
    });
  }
  function planTabs() {
    return '<div class="plan-tabs">' + PLAN_IDS.map(id =>
      '<button data-plantab="' + id + '"' + (cur === id ? ' class="on"' : '') + '>' +
      ({ today: '今日計畫', todo: '待辦計畫', study: '學習計畫' }[id]) + '</button>').join('') + '</div>';
  }

  /* ============================================================
     ★ 輸入守衛（Input Guard）
     背景：雲端同步 / 跨分頁同步會呼叫 render() 重繪 #main，
     而重繪會直接把 <input>/<textarea> 刪掉 —— 使用者正在打字時
     被重繪，就會出現「鍵盤彈不出來、文字打不進去」的狀況。
     這裡做三件事：
       1. 有輸入框取得焦點時，延後重繪（等 blur 再補一次）
       2. 真的需要重繪時，先把焦點與游標位置記下來
       3. 重繪後把焦點、已輸入的內容與游標位置還原回去
     ============================================================ */
  function isTyping() {
    const a = document.activeElement;
    if (!a || !a.tagName) return false;
    const t = a.tagName.toUpperCase();
    if (t === 'TEXTAREA' || t === 'SELECT') return true;
    if (t !== 'INPUT') return !!a.isContentEditable;
    const ty = String(a.type || 'text').toLowerCase();
    return ['text', 'search', 'email', 'url', 'tel', 'number', 'password', 'date', 'time', 'datetime-local', 'month'].indexOf(ty) >= 0;
  }

  /* ★ 整頁已改為 App Shell（html/body/.app 不捲動），唯一捲動容器是 #main。
     所有「捲動」都必須作用在 #main 上，不能用 window.scrollTo。 */
  function mainEl() { return document.getElementById('main'); }
  function mainScroll() { const el = mainEl(); return el ? (el.scrollTop || 0) : 0; }
  function setMainScroll(y) {
    const el = mainEl();
    if (!el) return;
    try { el.scrollTop = y || 0; } catch (e) { }
  }
  L.scrollMain = setMainScroll;

  /** 記下某個輸入框的「身分」與游標，重繪後才能還原（預設取目前聚焦的那個） */
  function snapshotFocus(el) {
    try {
      const a = el || document.activeElement;
      if (!a || !a.tagName) return null;
      const t = a.tagName.toUpperCase();
      if (t !== 'INPUT' && t !== 'TEXTAREA' && t !== 'SELECT') return null;
      const main = document.getElementById('main');
      if (!main || !main.contains(a)) return null;          // 彈窗裡的輸入框交給彈窗自己管
      const tag = t.toLowerCase();
      const sel = tag === 'textarea' ? 'textarea' : ('input' + (a.type ? '[type="' + a.type + '"]' : ''));
      const same = Array.prototype.slice.call(main.querySelectorAll(sel));
      return {
        tag: tag, type: a.type || '', id: a.id || '', placeholder: a.placeholder || '',
        index: same.indexOf(a), value: a.value, start: a.selectionStart, end: a.selectionEnd,
        hasSel: (typeof a.selectionStart === 'number'),
        focus: true
      };
    } catch (e) { return null; }
  }

  /** 重繪後把焦點 / 內容 / 游標還原（keepFocus=false 時只補內容、不把鍵盤叫回來） */
  function restoreFocus(snap, keepFocus) {
    if (!snap) return;
    try {
      const main = document.getElementById('main');
      if (!main) return;
      let el = snap.id ? main.querySelector('#' + snap.id) : null;
      if (!el) {
        const sel = snap.tag === 'textarea' ? 'textarea' : ('input' + (snap.type ? '[type="' + snap.type + '"]' : ''));
        const list = main.querySelectorAll(sel);
        el = list[snap.index] || (snap.placeholder ? main.querySelector('[placeholder="' + snap.placeholder.replace(/"/g, '') + '"]') : null);
      }
      if (!el) return;
      if (snap.value && String(el.value) !== String(snap.value) && el.type !== 'date' && el.type !== 'time' && el.type !== 'number') {
        el.value = snap.value;                              // 把使用者已輸入的文字補回去
      }
      if (snap.hasSel) { try { el.setSelectionRange(snap.start, snap.end); } catch (e) { } }
      /* 只有使用者「還在這個輸入框裡」時才把鍵盤叫回來；
         若他已經離開（blur 觸發的補繪），就只補內容、不抢焦點（否則鍵盤會莫名彈回來） */
      if (keepFocus === false) return;
      try { el.focus({ preventScroll: true }); } catch (e) { try { el.focus(); } catch (_) { } }
    } catch (e) { }
  }

  let pendingRender = false;
  let deferredEl = null;      // 被延後重繪時，使用者正在輸入的那個輸入框
  let deferredSnap = null;

  function render(opts) {
    opts = opts || {};
    /* 使用者正在輸入 → 先不重繪，等他離開輸入框再補一次（絕不吃掉鍵盤） */
    if (!opts.force && isTyping()) {
      pendingRender = true;
      deferredEl = document.activeElement;              // 先記起來，補繪時才拿得到最新的文字
      deferredSnap = snapshotFocus() || deferredSnap;
      return;
    }
    pendingRender = false;

    /* ★ 只有「換頁」才把畫面捲回頂端。
       單純的 refresh（打勾、增刪、雲端同步）一律保留原本捲動位置，
       否則手機上每同步一次畫面就跳回頂端，輸入到一半會整個跑掉。 */
    const keepY = opts.top ? 0 : mainScroll();

    /* 補繪時優先從「原本那個輸入框」重新取快照，才會拿到使用者最後輸入的內容 */
    let snap = null;
    if (deferredEl && document.body.contains(deferredEl)) snap = snapshotFocus(deferredEl);
    if (!snap) snap = deferredSnap || snapshotFocus();
    deferredSnap = null; deferredEl = null;
    const main = document.getElementById('main');
    const m = L.modules[cur];
    if (!m) { cur = 'home'; return render({ force: true }); }
    if (m.unmount) { try { m.unmount(); } catch (e) { } }
    const inPlan = PLAN_IDS.indexOf(cur) >= 0;
    if (inPlan) lastPlan = cur;
    try {
      main.innerHTML = (inPlan ? planTabs() : '') + m.render();
      main.querySelectorAll('[data-plantab]').forEach(b => b.onclick = () => go(b.dataset.plantab));
    } catch (e) {
      main.innerHTML = '<div class="card"><h3>這個頁面出了點小狀況 ♡</h3>' +
        '<div class="muted">' + String(e && e.message || e) + '</div>' +
        '<button class="btn block mt14" onclick="location.href=\'#home\'">回到首頁</button></div>';
      console.error(e);
      return;
    }
    const ctx = { refresh: render, go };
    try { if (m.mount) m.mount(main, ctx); } catch (e) { console.error(e); }
    restoreFocus(snap, opts.keepFocus !== false);
    document.querySelectorAll('[data-nav]').forEach(b => b.classList.toggle('on', isOn(b.dataset.nav)));
    /* 鍵盤升起時絕對不捲動畫面（會讓輸入框亂跳） */
    const kb = document.body.classList.contains('kb-open');
    if (!kb) setMainScroll(keepY);
    document.title = (inPlan ? '計畫' : m.name) + ' · Lume';
    // 圖片存在 IndexedDB，渲染後非同步把佔位圖換成真正的圖片
    try { L.hydrateImages && L.hydrateImages(main); } catch (e) { }
  }

  /* 離開輸入框 → 若剛剛有被延後的重繪，立刻補上（但不抢回焦點） */
  function flushPending() {
    if (!pendingRender) return;
    setTimeout(() => {
      if (pendingRender && !isTyping()) render({ force: true, keepFocus: false });
    }, 60);
  }
  document.addEventListener('focusout', flushPending);
  window.addEventListener('focus', flushPending);

  function go(id) {
    if (id === 'plan') id = lastPlan;
    if (!L.modules[id]) return;
    document.body.classList.remove('drawer-open');
    cur = id;
    location.hash = '#' + id;
    render({ force: true, top: true });   // 使用者主動切頁：一定重繪並回到頂端
  }
  L.go = go;

  /* ---------- 啟動 ---------- */
  function boot() {
    Store.init();
    L.refresh = () => render();
    paintNav();

    const h = (location.hash || '').replace('#', '');
    if (L.modules[h] && h !== 'settings') cur = h;

    window.addEventListener('hashchange', () => {
      const id = (location.hash || '').replace('#', '');
      if (L.modules[id] && id !== cur) { cur = id; render({ force: true, top: true }); }
    });

    render({ force: true });

    /* 雲端同步：畫面更新後自動重繪，讓同步來的資料立刻出現 */
    if (L.Sync) {
      L.Sync.onUpdate = () => { try { paintNav(); render(); } catch (e) { } };
      try { L.Sync.start(); } catch (e) { console.error(e); }
      /* 支援「同步連結」：#sync=LMZ... 開頁就自動合併（拿來搬資料到主畫面 App 很好用） */
      const m = /sync=([A-Za-z0-9\-_]+)/.exec(location.hash || '');
      if (m) {
        L.Sync.importCode(m[1]).then(() => {
          L.toast('同步碼已合併 ♡');
          location.hash = '#home'; cur = 'home'; render({ force: true, top: true });
        }).catch(() => L.toast('同步碼讀不出來 ♡'));
      }
    }

    /* 開機背景任務：把舊的 dataURL 圖片搬到 IndexedDB，釋放 localStorage */
    try {
      if (Store.migrateImages) setTimeout(() => Store.migrateImages().catch(() => { }), 600);
    } catch (e) { }

    // PWA 安裝提示
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; });
    window.addEventListener('appinstalled', () => L.toast('已加到主螢幕 ♡'));

    // Service Worker（版本號更新的版本會自動清掉舊快取）
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('sw.js?v=20').catch(() => { });
    }
  }

  /* 兜底：若 3 秒後主區塊仍是空的，顯示可操作的提示畫面 */
  window.addEventListener('load', () => {
    setTimeout(() => {
      const main = document.getElementById('main');
      if (main && !main.innerHTML.trim()) {
        main.innerHTML = '<div class="card"><h3>內容沒有載入 ♡</h3>' +
          '<div class="muted">可能是舊的快取造成的，點下方按鈕重新載入一次就會好了。</div>' +
          '<button class="btn block mt14" onclick="location.reload()">重新載入</button>' +
          '<button class="btn ghost block mt8" onclick="if(window.caches){caches.keys().then(k=>k.forEach(x=>caches.delete(x))).then(()=>location.reload())}">清除快取並重載</button></div>';
      }
    }, 3000);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.Lume);
