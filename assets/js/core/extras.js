/* ============================================================
   extras.js — 新版加的小功能
   · 線條圖示（選單、搜尋、月亮…）
   · 淺色 / 月光模式
   · 背景細線插畫（月亮、星座、薰衣草、羽毛）
   · 全站搜尋
   · 快速記一筆
   · 語錄收藏清單
   ============================================================ */
window.Lume = window.Lume || {}; window.Lume.modules = window.Lume.modules || {};
(function (L) {
  'use strict';
  const { D, U, Store } = L;

  /* ---------------- 線條圖示 ---------------- */
  const LI = {
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    chev: '<path d="M6 9l6 6 6-6"/>',
    feather: '<path d="M20.2 3.8a6 6 0 0 0-8.5 0L5 10.5V19h8.5l6.7-6.7a6 6 0 0 0 0-8.5z"/><path d="M16 8L2 22M17.5 15H9"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    flower: '<circle cx="12" cy="12" r="2.4"/><g><path d="M12 9.6C10.4 8.4 9.6 7 9.6 5.6a2.4 2.4 0 0 1 4.8 0c0 1.4-.8 2.8-2.4 4z"/><path transform="rotate(72 12 12)" d="M12 9.6C10.4 8.4 9.6 7 9.6 5.6a2.4 2.4 0 0 1 4.8 0c0 1.4-.8 2.8-2.4 4z"/><path transform="rotate(144 12 12)" d="M12 9.6C10.4 8.4 9.6 7 9.6 5.6a2.4 2.4 0 0 1 4.8 0c0 1.4-.8 2.8-2.4 4z"/><path transform="rotate(216 12 12)" d="M12 9.6C10.4 8.4 9.6 7 9.6 5.6a2.4 2.4 0 0 1 4.8 0c0 1.4-.8 2.8-2.4 4z"/><path transform="rotate(288 12 12)" d="M12 9.6C10.4 8.4 9.6 7 9.6 5.6a2.4 2.4 0 0 1 4.8 0c0 1.4-.8 2.8-2.4 4z"/></g>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>'
  };
  L.lic = (n, s) => '<svg class="lucide" viewBox="0 0 24 24"' + (s ? ' width="' + s + '" height="' + s + '"' : '') + '>' + (LI[n] || LI.star) + '</svg>';

  /* 補兩個彩色圖示（跟舊圖示同一個畫風） */
  if (L.ICONS) {
    L.ICONS.feather = '<svg viewBox="0 0 64 64" fill="none"><path d="M50 12c-14 0-28 10-30 28l-4 12 12-4c18-2 28-16 28-30z" fill="#EEE6F8" stroke="#9A82CF" stroke-width="1.8" stroke-linejoin="round"/><path d="M16 52L44 22M26 40h12M30 32h10" stroke="#9A82CF" stroke-width="1.6" stroke-linecap="round"/></svg>';
    L.ICONS.chart = '<svg viewBox="0 0 64 64" fill="none"><rect x="10" y="10" width="44" height="44" rx="10" fill="#F4F1FD" stroke="#9A82CF" stroke-width="1.8"/><path d="M20 44V34M30 44V22M40 44V30M48 44V26" stroke="#9A82CF" stroke-width="3" stroke-linecap="round"/><path d="M46 14l1.2 2.6 2.6 1.2-2.6 1.2L46 21.6l-1.2-2.6-2.6-1.2 2.6-1.2z" fill="#F6DDE4"/></svg>';
    L.ICONS.calHeart = '<svg viewBox="0 0 64 64" fill="none"><rect x="10" y="14" width="44" height="40" rx="8" fill="#F4F1FD" stroke="#9A82CF" stroke-width="1.8"/><path d="M10 26h44" stroke="#9A82CF" stroke-width="1.6"/><path d="M22 8v10M42 8v10" stroke="#7E68B5" stroke-width="2" stroke-linecap="round"/><path d="M32 47s-8-5-8-10a4.5 4.5 0 0 1 8-2.8 4.5 4.5 0 0 1 8 2.8c0 5-8 10-8 10z" fill="#F6DDE4" stroke="#DE9AB2" stroke-width="1.5"/></svg>';
  }

  /* ---------------- 淺色 / 月光 ---------------- */
  const TH_KEY = 'lume_theme_v2';
  const Theme = {
    mode() { try { return localStorage.getItem(TH_KEY) || 'auto'; } catch (e) { return 'auto'; } },
    setMode(m) { try { localStorage.setItem(TH_KEY, m); } catch (e) { } Theme.apply(); },
    isDark() {
      const m = Theme.mode(), h = new Date().getHours();
      return m === 'dark' || (m === 'auto' && (h >= 19 || h < 6));
    },
    apply() {
      const dark = Theme.isDark();
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
      const mt = document.querySelector('meta[name="theme-color"]');
      if (mt) mt.setAttribute('content', dark ? '#2B2458' : '#E6DCF4');
      const b = document.getElementById('themeBtn');
      if (b) { b.innerHTML = L.lic(dark ? 'sun' : 'moon'); b.title = dark ? '換成淺色' : '換成月光模式'; }
      drawArt();
    },
    /** 頂部按鈕：在淺色 / 月光之間切換（會記住你的選擇） */
    toggle() { Theme.setMode(Theme.isDark() ? 'light' : 'dark'); L.toast(Theme.isDark() ? '月光模式 ♡' : '晨光模式 ♡'); }
  };
  L.Theme = Theme;
  setInterval(() => { if (Theme.mode() === 'auto') Theme.apply(); }, 5 * 60 * 1000);

  /* ---------------- 背景細線插畫 ---------------- */
  function rnd(seed) { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
  function sparkle(x, y, s) {
    return '<path transform="translate(' + x + ' ' + y + ') scale(' + s + ')" d="M0 -6 L1.1 -1.1 L6 0 L1.1 1.1 L0 6 L-1.1 1.1 L-6 0 L-1.1 -1.1Z" fill="var(--art-star)"/>';
  }
  function sprig(x, y, h, rot) {
    let s = '<g transform="translate(' + x + ' ' + y + ') rotate(' + rot + ')"><path d="M0 0 Q4 ' + (-h / 2) + ' 0 ' + (-h) + '" stroke="var(--art-stem)" stroke-width="1" fill="none"/>';
    for (let i = 0; i < 10; i++) {
      const t = 0.4 + i * 0.062, yy = -h * t, side = i % 2 ? 1 : -1, cx = side * 2.8;
      s += '<ellipse cx="' + cx + '" cy="' + yy + '" rx="2.1" ry="3.8" transform="rotate(' + side * 28 + ' ' + cx + ' ' + yy + ')" fill="var(--art-bud)" opacity=".7"/>';
    }
    return s + '<ellipse cx="0" cy="' + (-h - 3) + '" rx="1.7" ry="3.2" fill="var(--art-bud)" opacity=".7"/></g>';
  }
  function drawArt() {
    const el = document.getElementById('bgart');
    if (!el) return;
    const w = window.innerWidth, h = window.innerHeight;
    const r = rnd(7);
    let a = '';
    const n = Math.round((w * h) / 9000);
    for (let i = 0; i < n; i++) {
      const x = r() * w, y = r() * h * 0.75;
      a += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (i % 4 ? 0.9 : 1.4) + '" fill="var(--art-star)" opacity="' + (0.35 + r() * 0.45).toFixed(2) + '"/>';
    }
    /* 月亮 + 星芒（右上） */
    const mx = w - 46, my = 92;
    a += '<path transform="translate(' + mx + ' ' + my + ')" d="M0 -22 A22 22 0 1 0 0 22 A16.5 16.5 0 1 1 0 -22Z" fill="none" stroke="var(--art-moon)" stroke-width="1.2"/>';
    a += sparkle(mx - 32, my - 22, 0.95) + sparkle(mx + 22, my + 36, 0.6) + sparkle(mx - 58, my + 6, 0.5);
    /* 星座（左上） */
    const pts = [[30, 130], [64, 114], [92, 136], [128, 120], [156, 138]];
    a += '<path d="M' + pts.map(p => p.join(' ')).join(' L') + '" stroke="var(--art-gold)" stroke-width=".7" fill="none" opacity=".8"/>';
    pts.forEach(p => { a += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="1.7" fill="var(--art-gold)"/>'; });
    /* 薰衣草（左下） */
    a += sprig(26, h, 130, -12) + sprig(44, h, 104, 6) + sprig(12, h, 86, -24);
    /* 羽毛（右側） */
    a += '<g transform="translate(' + (w - 18) + ' ' + Math.round(h * 0.66) + ') rotate(28)" stroke="var(--art-gold)" stroke-width=".8" fill="none" opacity=".85">' +
      '<path d="M0 0 L0 -92"/><path d="M0 -90 C14 -70 16 -38 3 -8"/><path d="M0 -90 C-12 -70 -14 -38 -3 -8"/>' +
      '<path d="M0 -64 L10 -70 M0 -50 L12 -56 M0 -35 L10 -40 M0 -64 L-9 -69 M0 -50 L-11 -55 M0 -35 L-9 -39"/></g>';
    el.innerHTML = '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' + a + '</svg>';
  }
  let rz = null;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(drawArt, 200); });

  /* ---------------- 全站搜尋 ---------------- */
  const SOURCES = [
    ['diary', 'diary', '日記'], ['murmurs', 'murmurs', '碎碎念'], ['notes', 'notes', '文案'],
    ['tarot', 'tarot', '塔羅'], ['firsts', 'firsts', '初'], ['todos', 'today', '今日計畫'],
    ['futureTodos', 'todo', '待辦'], ['studies', 'study', '學習'], ['dates', 'home', '約會'],
    ['countdowns', 'home', '重要日子'], ['wishes', 'wishes', '願望'], ['books', 'reading', '書'],
    ['dramas', 'reading', '劇'], ['bodyLogs', 'body', '健康'], ['wardrobe', 'outfit', '衣櫃']
  ];
  const SKIP = { id: 1, createdAt: 1, updatedAt: 1, images: 1, cover: 1, img: 1, photo: 1, doneAt: 1,
    date: 1, time: 1, mood: 1, pri: 1, icon: 1, status: 1, planId: 1, planStart: 1, planEnd: 1, dayNo: 1, dayTotal: 1, blocks: 1, gifts: 1, reply: 1 };
  function textOf(o, depth) {
    if (o == null) return '';
    if (typeof o === 'string') return /^(idb:|data:)/.test(o) ? '' : o;
    if (typeof o !== 'object' || depth > 2) return '';
    if (Array.isArray(o)) return o.map(x => textOf(x, depth + 1)).join(' ');
    return Object.keys(o).filter(k => !SKIP[k]).map(k => textOf(o[k], depth + 1)).join(' ');
  }
  function search(q) {
    q = q.trim().toLowerCase();
    if (!q) return [];
    const out = [];
    SOURCES.forEach(([k, mod, name]) => {
      (Store.db[k] || []).forEach(r => {
        const t = textOf(r, 0);
        const i = t.toLowerCase().indexOf(q);
        if (i < 0) return;
        const s = Math.max(0, i - 24);
        out.push({ mod, name, date: r.date || r.start || (r.createdAt || '').slice(0, 10), snip: (s ? '…' : '') + t.slice(s, i + q.length + 50).replace(/\s+/g, ' '), q });
      });
    });
    return out.sort((a, b) => (a.date || '') < (b.date || '') ? 1 : -1).slice(0, 80);
  }
  function hl(s, q) {
    const e = U.esc(s), qe = U.esc(q);
    const i = e.toLowerCase().indexOf(qe.toLowerCase());
    return i < 0 ? e : e.slice(0, i) + '<mark>' + e.slice(i, i + qe.length) + '</mark>' + e.slice(i + qe.length);
  }
  L.openSearch = function () {
    L.modal('搜尋所有紀錄',
      '<input class="inp" id="sq" type="search" placeholder="輸入關鍵字，例如：生乳捲、牙醫、焦慮">' +
      '<div id="sres" class="mt8"><div class="muted center" style="padding:14px">日記、碎碎念、文案、塔羅、待辦、學習…都會一起找 ♡</div></div>',
      (body, close) => {
        const inp = body.querySelector('#sq'), box = body.querySelector('#sres');
        let t = null;
        const run = () => {
          const q = inp.value;
          const res = search(q);
          if (!q.trim()) { box.innerHTML = '<div class="muted center" style="padding:14px">日記、碎碎念、文案、塔羅、待辦、學習…都會一起找 ♡</div>'; return; }
          box.innerHTML = res.length
            ? '<div class="muted mb8">找到 ' + res.length + ' 筆</div>' + res.map((r, i) =>
              '<button class="sr-item" data-i="' + i + '"><div class="w"><span class="chip">' + r.name + '</span>' + U.esc(r.date || '') + '</div>' +
              '<div class="x">' + hl(r.snip, r.q.trim()) + '</div></button>').join('')
            : '<div class="muted center" style="padding:14px">沒有找到「' + U.esc(q) + '」♡</div>';
          box.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { const r = res[+b.dataset.i]; close(); L.go(r.mod); });
        };
        inp.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 180); });
        setTimeout(() => { try { inp.focus(); } catch (e) { } }, 120);
      });
  };

  /* ---------------- 快速記一筆 ---------------- */
  const QA = [
    { k: 'murmur', t: '碎碎念', ic: 'bubble' },
    { k: 'task', t: '今日任務', ic: 'list' },
    { k: 'todo', t: '待辦', ic: 'calendar' },
    { k: 'date', t: '約會', ic: 'heart' },
    { k: 'note', t: '靈感文案', ic: 'quote' },
    { k: 'diary', t: '寫日記', ic: 'pen' }
  ];
  const nowTime = () => { const n = new Date(); return D.pad(n.getHours()) + ':' + D.pad(n.getMinutes()); };
  function qaForm(k) {
    const today = D.today();
    if (k === 'murmur') return '<textarea class="inp" id="qa-t" placeholder="想到什麼就寫下來…"></textarea>' +
      '<div class="row mt8">' + ['小啟發', '小道理', '想通了', '碎念', '感謝', '提醒自己'].map(x => '<button class="tab" data-tag="' + x + '">' + x + '</button>').join('') + '</div>';
    if (k === 'task') return '<input class="inp" id="qa-t" placeholder="今天要做的事">' +
      '<div class="row mt8"><button class="tab" data-pri="high">高</button><button class="tab on" data-pri="mid">中</button><button class="tab" data-pri="low">低</button></div>';
    if (k === 'todo') return '<input class="inp" id="qa-t" placeholder="要做什麼">' +
      '<div class="field mt8"><label>哪一天</label><input class="inp" type="date" id="qa-d" value="' + D.addDays(today, 1) + '"></div>';
    if (k === 'date') return '<input class="inp" id="qa-t" placeholder="例如：和小雨喝下午茶">' +
      '<div class="grid2 mt8"><div class="field"><label>日期</label><input class="inp" type="date" id="qa-d" value="' + today + '"></div>' +
      '<div class="field"><label>時間</label><input class="inp" type="time" id="qa-tm"></div></div>' +
      '<input class="inp" id="qa-n" placeholder="地點或備註（可不填）">';
    if (k === 'note') return '<textarea class="inp" id="qa-t" placeholder="一句好看的話、一段靈感…"></textarea>';
    return '<div class="muted center" style="padding:10px">日記有心情、照片和心態覺察，會帶你到日記頁寫 ♡</div>';
  }
  L.openQuickAdd = function () {
    let cur = 'murmur', tag = '', pri = 'mid';
    L.modal('快速記一筆',
      '<div class="qa-grid">' + QA.map(q => '<button data-qa="' + q.k + '"' + (q.k === cur ? ' class="on"' : '') + '>' + L.icon(q.ic, 26) + q.t + '</button>').join('') + '</div>' +
      '<div id="qa-f"></div>' +
      '<button class="btn block mt14" id="qa-ok">記下來 ♡</button>',
      (body, close) => {
        const f = body.querySelector('#qa-f');
        const draw = () => {
          f.innerHTML = qaForm(cur); tag = ''; pri = 'mid';
          body.querySelector('#qa-ok').textContent = cur === 'diary' ? '去寫日記 →' : '記下來 ♡';
          f.querySelectorAll('[data-tag]').forEach(b => b.onclick = () => {
            tag = tag === b.dataset.tag ? '' : b.dataset.tag;
            f.querySelectorAll('[data-tag]').forEach(x => x.classList.toggle('on', x.dataset.tag === tag));
          });
          f.querySelectorAll('[data-pri]').forEach(b => b.onclick = () => {
            pri = b.dataset.pri;
            f.querySelectorAll('[data-pri]').forEach(x => x.classList.toggle('on', x.dataset.pri === pri));
          });
          const t = f.querySelector('#qa-t'); if (t) setTimeout(() => { try { t.focus(); } catch (e) { } }, 80);
        };
        draw();
        body.querySelectorAll('[data-qa]').forEach(b => b.onclick = () => {
          cur = b.dataset.qa;
          body.querySelectorAll('[data-qa]').forEach(x => x.classList.toggle('on', x === b));
          draw();
        });
        body.querySelector('#qa-ok').onclick = () => {
          if (cur === 'diary') { close(); return L.go('diary'); }
          const v = (f.querySelector('#qa-t') || {}).value || '';
          const t = v.trim();
          if (!t) return L.toast('先寫一點什麼吧 ♡');
          const val = id => ((f.querySelector('#' + id) || {}).value || '').trim();
          if (cur === 'murmur') Store.col('murmurs').add({ text: t, date: D.today(), time: nowTime(), tag: tag, images: [] });
          else if (cur === 'task') Store.col('todos').add({ text: t, pri: pri, date: D.today(), done: false });
          else if (cur === 'todo') Store.col('futureTodos').add({ text: t, date: val('qa-d') || D.today(), pri: 'mid', done: false });
          else if (cur === 'date') Store.col('dates').add({ title: t, date: val('qa-d') || D.today(), time: val('qa-tm'), note: val('qa-n') });
          else if (cur === 'note') Store.col('notes').add({ text: t, tags: [] });
          close();
          L.toast('記下來了 ♡');
          if (L.refresh) L.refresh();
        };
      });
  };

  /* ---------------- 語錄收藏清單 ---------------- */
  L.openFavQuotes = function () {
    const favs = (Store.doc('quotes').get().favorited || []).slice().reverse();
    const Q = L.QUOTES || [];
    L.modal('收藏的語錄',
      favs.length ? favs.map(i => {
        const q = Q[i]; if (!q) return '';
        return '<div class="card q3" style="padding:12px 14px"><div class="zh">「' + U.esc(q.zh) + '」</div>' +
          '<div class="en">' + U.esc(q.en) + '</div><div class="kr">' + U.esc(q.kr) + '</div>' +
          '<div class="qfoot"><span class="chip">' + U.esc(q.c || '') + '</span><span style="flex:1"></span>' +
          '<button class="mini-btn" data-unfav="' + i + '">取消收藏</button></div></div>';
      }).join('') : '<div class="muted center" style="padding:16px">還沒有收藏的語錄，在首頁按愛心就能收藏 ♡</div>',
      (body, close) => {
        body.querySelectorAll('[data-unfav]').forEach(b => b.onclick = () => {
          const i = +b.dataset.unfav;
          const arr = (Store.doc('quotes').get().favorited || []).filter(x => x !== i);
          Store.doc('quotes').set({ favorited: arr });
          close(); L.openFavQuotes(); if (L.refresh) L.refresh();
        });
      });
  };

  /* ---------------- 開機 ---------------- */
  function boot() {
    Theme.apply();
    const set = (id, html, fn) => { const b = document.getElementById(id); if (b) { b.innerHTML = html; b.onclick = fn; } };
    set('menuBtn', L.lic('menu'), () => document.body.classList.add('drawer-open'));
    set('searchBtn', L.lic('search'), () => L.openSearch());
    set('themeBtn', L.lic(Theme.isDark() ? 'sun' : 'moon'), () => Theme.toggle());
    set('fab', L.lic('plus') + '<span>快速記一筆</span>', () => L.openQuickAdd());
    const m = document.getElementById('drawerMask');
    if (m) m.onclick = () => document.body.classList.remove('drawer-open');
    const bt = document.getElementById('brandTop');
    if (bt) bt.onclick = () => L.go && L.go('home');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.Lume);
