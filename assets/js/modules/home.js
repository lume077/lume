/* ============================================================
   home.js — 首頁
   順序：問候與日期 → 今日一覽（任務 / 生理期）→ 每日語錄（中英韓）
        → 今明安排 → 學習中 → 去年的今天 → 本月行事曆 · 約會 → 重要日子倒數
   ============================================================ */
window.Lume = window.Lume || {}; window.Lume.modules = window.Lume.modules || {};
(function (L) {
  'use strict';
  const { D, U, icon, Lunar, Store } = L;
  let timer = null, calState = null;
  let cdShowAll = false;
  let syncHookBound = false;
  let qShift = 0;                              // 「換一句」：今天往後翻幾句
  const CD_NEAR_DAYS = 30;

  const cdCol = () => Store.col('countdowns');
  const dtCol = () => Store.col('dates');

  function greet(h) {
    if (h < 5) return '夜深了';
    if (h < 11) return '早安';
    if (h < 18) return '午安';
    if (h < 23) return '晚安';
    return '夜深了';
  }

  function clockHTML(now) {
    const p = n => D.pad(n);
    const t = '<span class="t">' + p(now.getHours()) + ':' + p(now.getMinutes()) + '<em>:' + p(now.getSeconds()) + '</em></span>';
    const wk = '星期' + '日一二三四五六'[now.getDay()];
    const ds = (now.getMonth() + 1) + ' 月 ' + now.getDate() + ' 日 · ' + wk;
    const lu = Lunar.of(D.key(now));
    return t + '<div class="d">' + ds + '<br>農曆 ' + lu.text + ' · ' + lu.ganzhi + lu.shengxiao + '年</div>';
  }

  /* ---------------- 今日一覽 ---------------- */
  function periodInfo() {
    const p = Store.db.period || {};
    const cyc = (p.cycles || []).filter(c => c && c.start).slice().sort((a, b) => a.start < b.start ? -1 : 1);
    const set = p.settings || { cycleLen: 28, periodLen: 5 };
    if (!cyc.length) return { b: '—', s: '還沒有記錄，點這裡開始' };
    const gaps = [];
    for (let i = 1; i < cyc.length; i++) gaps.push(D.diffDays(cyc[i].start, cyc[i - 1].start));
    const okGaps = gaps.filter(g => g >= 18 && g <= 60);
    const avg = okGaps.length ? Math.round(okGaps.reduce((a, b) => a + b, 0) / okGaps.length) : (set.cycleLen || 28);
    const last = cyc[cyc.length - 1], t = D.today();
    const since = D.diffDays(t, last.start);
    const inP = last.end ? (since >= 0 && D.diffDays(last.end, t) >= 0) : (since >= 0 && since < (set.periodLen || 5));
    if (inP) return { b: '第 ' + (since + 1) + ' 天', s: '經期中，記得多休息 ♡' };
    const next = D.addDays(last.start, avg);
    const left = D.diffDays(next, t);
    const md = (+next.slice(5, 7)) + '/' + (+next.slice(8, 10));
    if (left < 0) return { b: '晚了 ' + (-left) + ' 天', s: '原本預計 ' + md };
    return { b: left === 0 ? '可能今天' : '再 ' + left + ' 天', s: '預計 ' + md + ' 開始' };
  }
  function glanceHTML() {
    const t = D.today();
    const todos = (Store.db.todos || []).filter(x => x && x.date === t);
    const done = todos.filter(x => x.done).length;
    const pi = periodInfo();
    return '<div class="glance">' +
      '<div class="g" data-go="today"><div class="l">' + icon('list', 15) + '今日任務</div>' +
      '<b>' + done + ' / ' + todos.length + '</b><div class="s">' +
      (todos.length ? (done === todos.length ? '全部完成了，好棒 ♡' : '還有 ' + (todos.length - done) + ' 件') : '今天還沒有任務') + '</div></div>' +
      '<div class="g" data-go="period"><div class="l">' + icon('flower', 15) + '生理期</div>' +
      '<b>' + pi.b + '</b><div class="s">' + pi.s + '</div></div></div>';
  }

  /* ---------------- 每日語錄（中英韓一起顯示） ---------------- */
  function quoteIndex() {
    const Q = L.QUOTES || [];
    if (!Q.length) return 0;
    const t = D.today();
    const base = (D.dayOfYear(t) - 1 + (+t.slice(0, 4)) * 13) % Q.length;
    return (base + qShift) % Q.length;
  }
  function quoteHTML() {
    const Q = L.QUOTES || [];
    if (!Q.length) return '';
    const i = quoteIndex(), q = Q[i];
    const favs = Store.doc('quotes').get().favorited || [];
    const on = favs.indexOf(i) >= 0;
    return '<div class="q3">' +
      '<div class="qhead"><span>' + icon('sparkle', 15) + ' 今日語錄' + (q.c ? ' · ' + U.esc(q.c) : '') + '</span>' +
      '<span>No. ' + (i + 1) + '</span></div>' +
      '<div class="zh">「' + U.esc(q.zh) + '」</div>' +
      '<div class="en">' + U.esc(q.en) + '</div>' +
      '<div class="kr">' + U.esc(q.kr) + '</div>' +
      '<div class="qfoot"><button class="fav-btn' + (on ? ' on' : '') + '" data-fav="' + i + '" aria-label="收藏">' + L.lic('heart') + '</button>' +
      '<button class="mini-btn edit" data-favlist>收藏的語錄</button><span style="flex:1"></span>' +
      '<button class="mini-btn edit" data-shuffle>換一句 ' + L.lic('refresh', 13) + '</button></div></div>';
  }

  /* ---------------- 今明安排 ---------------- */
  function agendaHTML() {
    const t = D.today(), tm = D.addDays(t, 1);
    const byTime = (a, b) => (a.time || '99') < (b.time || '99') ? -1 : 1;
    const dates = d => dtCol().where(x => x.date === d).slice().sort(byTime);
    const todos = d => (Store.db.futureTodos || []).filter(x => x && x.date === d);
    const soon = cdEntries().filter(x => x.left >= 0 && x.left <= 3);
    const dateRow = (x, tmr) => '<div class="arow date' + (tmr ? ' tmr' : '') + '"><span class="tm">' + U.esc(x.time || '全天') + '</span>' +
      '<div class="tx">' + U.esc(x.title) + (x.note ? '<small>' + U.esc(x.note) + '</small>' : '') + '</div></div>';
    const todoRow = (x, tmr) => '<div class="arow' + (x.done ? ' done' : '') + (tmr ? ' tmr' : '') + '"><span class="tm">待辦</span>' +
      '<div class="tx">' + U.esc(x.text || x.title || '') + '</div>' +
      '<div class="tick' + (x.done ? ' on' : '') + '" data-atodo="' + U.esc(x.id) + '">' + icon('check') + '</div></div>';
    const cdRow = x => '<div class="arow"><span class="tm">倒數</span><div class="tx">' + U.esc(x.rec.title) +
      (x.left === 0 ? ' 就是今天 ♡' : ' 還有 ' + x.left + ' 天') + '</div></div>';

    const td = dates(t), tt = todos(t), md = dates(tm), mt = todos(tm);
    const todayRows = td.map(x => dateRow(x)).join('') + tt.map(x => todoRow(x)).join('');
    const tmrRows = md.map(x => dateRow(x, true)).join('') + mt.map(x => todoRow(x, true)).join('');
    const md2 = d => (+d.slice(5, 7)) + '/' + (+d.slice(8, 10)) + '（' + D.weekday(d) + '）';
    return '<div class="card agenda"><div class="spread" style="margin-bottom:8px"><h3 style="margin:0">' + icon('calHeart') + '今明安排</h3>' +
      '<button class="btn sm soft" data-add-date>＋ 新增</button></div>' +
      '<div class="dhead">今天 · ' + md2(t) + '</div>' +
      (todayRows || '<div class="muted" style="padding:2px 4px 6px">今天沒有約會或待辦，好好照顧自己 ♡</div>') +
      '<div class="split"></div>' +
      '<div class="dhead tmr">明天 · ' + md2(tm) + '</div>' +
      (tmrRows || '<div class="muted" style="padding:2px 4px 6px">明天目前很清爽 ♡</div>') +
      (soon.length ? '<div class="split"></div>' + soon.map(cdRow).join('') : '') +
      '</div>';
  }

  /* ---------------- 學習中 ---------------- */
  function studyCardHTML() {
    const t = D.today();
    const all = (Store.db.studies || []).filter(r => r && r.date);
    /* 進行中的「區間學習」：今天落在開始～結束之間 */
    const plans = {};
    all.forEach(r => {
      if (!r.planId || !r.planStart || !r.planEnd) return;
      if (D.diffDays(t, r.planStart) < 0 || D.diffDays(r.planEnd, t) < 0) return;
      const p = plans[r.planId] = plans[r.planId] || { title: r.planTitle || r.title, start: r.planStart, end: r.planEnd, total: 0, done: 0 };
      p.total++; if (r.done) p.done++;
    });
    const pl = Object.keys(plans).map(k => plans[k]);
    const todays = all.filter(r => r.date === t);
    const todo = todays.filter(r => !r.done);
    const doneN = todays.length - todo.length;
    const over = all.filter(r => !r.done && D.diffDays(r.date, t) < 0 && !(L.studyBackfilled && L.studyBackfilled(r))).length;
    const md = d => (+d.slice(5, 7)) + '/' + (+d.slice(8, 10));
    return '<div class="card" id="homestudy"><div class="spread" style="margin-bottom:6px">' +
      '<h3 style="margin:0">' + icon('bulb') + '學習中</h3>' +
      (todays.length ? '<span class="chip">今天 ' + doneN + ' / ' + todays.length + '</span>' : '') + '</div>' +
      pl.map(p => {
        const day = D.diffDays(t, p.start) + 1, len = D.diffDays(p.end, p.start) + 1;
        return '<div class="plan-prog"><div class="pt"><b style="font-weight:500">' + U.esc(p.title) + '</b>' +
          '<span>' + md(p.start) + ' – ' + md(p.end) + ' · 第 ' + day + ' / ' + len + ' 天</span></div>' +
          '<div class="bar"><i style="width:' + Math.round(p.done / Math.max(1, p.total) * 100) + '%"></i></div>' +
          '<div class="muted" style="margin-top:3px">已完成 ' + p.done + ' / ' + p.total + ' 天</div></div>';
      }).join('') +
      (todo.length ? '<div class="flexlist mt8">' + todo.map(r =>
        '<div class="item study-row" style="padding:8px 12px"><div class="tick" data-hstog="' + U.esc(r.id) + '">' + icon('check') + '</div>' +
        '<div class="body"><div class="t">' + U.esc(r.title || '') + '</div>' +
        '<div class="m">' + (r.topic ? '<span class="chip">' + U.esc(r.topic) + '</span>' : '') +
        (r.planId ? '<span class="range-chip">第 ' + r.dayNo + ' / ' + r.dayTotal + ' 天</span>' : '') + '</div></div></div>').join('') + '</div>'
        : '<div class="muted" style="padding:6px 2px 2px;line-height:1.7">' +
        (todays.length ? '今天要學的都學完了，好棒 ♡' : (pl.length ? '' : '今天還沒安排要學什麼 ♡')) + '</div>') +
      (over ? '<div class="muted mt8">⏳ 之前還有 ' + over + ' 項沒學完</div>' : '') +
      '<button class="btn soft block mt8" data-gostudy>' + (todays.length || pl.length ? '打開學習計畫 →' : '＋ 去安排要學的') + '</button></div>';
  }

  /* ---------------- 去年的今天 ---------------- */
  function lastYearHTML() {
    const t = D.today(), md = t.slice(5), y = +t.slice(0, 4);
    const pick = [];
    const add = (arr, name, mod, fn) => (arr || []).forEach(r => {
      if (!r || !r.date || r.date.slice(5) !== md || +r.date.slice(0, 4) >= y) return;
      const s = fn(r); if (s) pick.push({ y: +r.date.slice(0, 4), name, mod, s });
    });
    add(Store.db.diary, '日記', 'diary', r => (r.title ? r.title + '｜' : '') + (r.text || ''));
    add(Store.db.murmurs, '碎碎念', 'murmurs', r => r.text);
    add(Store.db.firsts, '第一次', 'firsts', r => (r.title || '') + (r.feeling ? '｜' + r.feeling : ''));
    pick.sort((a, b) => b.y - a.y);
    return '<div class="card"><h3>' + icon('moon') + '去年的今天</h3>' +
      (pick.length ? pick.slice(0, 3).map(p =>
        '<div class="ly-item" data-go="' + p.mod + '" style="cursor:pointer"><div class="w">' + (y - p.y) + ' 年前 · ' + p.y + ' · ' + p.name + '</div>' +
        '<div class="x">「' + U.esc(String(p.s).slice(0, 90)) + (String(p.s).length > 90 ? '…' : '') + '」</div></div>').join('')
        : '<div class="muted" style="line-height:1.8">以前的今天還沒有紀錄。今天寫下的，明年的今天會在這裡出現 ♡</div>') +
      '</div>';
  }

  /* ---------------- 重要日子倒數 ---------------- */
  function cdEntries() {
    const today = D.today();
    return cdCol().all().map(c => {
      const target = c.repeat ? D.nextAnnual(c.date, today) : c.date;
      return { rec: c, target: target, left: D.diffDays(target, today) };
    }).sort((a, b) => a.left - b.left);
  }
  function cdCard(x) {
    const c = x.rec, left = x.left, target = x.target;
    const label = left > 0 ? '還剩 <small>天</small>' : left === 0 ? '就是<small>今天</small>' : '已過 <small>天</small>';
    return '<div class="cd" data-id="' + c.id + '">' +
      (c.repeat ? '<span class="rep">每年</span>' : '') +
      '<div style="display:flex;align-items:center;gap:6px">' + icon(c.icon || 'star', 34) + '</div>' +
      '<div class="days">' + Math.abs(left) + '<small>&nbsp;</small></div>' +
      '<div class="muted" style="margin-top:-2px">' + label + '</div>' +
      '<div class="name">' + U.esc(c.title) + '</div>' +
      '<div class="date">' + target + (c.repeat ? ' · 每年 ' + c.date.slice(5) : '') + '</div>' +
      '<span class="del" data-del="' + c.id + '">刪除</span>' +
      '<button class="mini-btn edit" data-editcd="' + c.id + '" style="position:absolute;top:6px;left:8px">✏️</button></div>';
  }
  function countdownHTML() {
    const items = cdEntries();
    if (!items.length) return L.empty('還沒有重要的日子，按「＋ 新增」開始倒數 ♡', 'butterfly');
    const near = items.filter(x => x.left >= 0 && x.left <= CD_NEAR_DAYS);
    const farN = items.filter(x => x.left > CD_NEAR_DAYS).length;
    const pastN = items.filter(x => x.left < 0).length;
    const shown = cdShowAll ? items : near;
    let html = shown.length ? '<div class="cd-grid">' + shown.map(cdCard).join('') + '</div>'
      : L.empty('未來 ' + CD_NEAR_DAYS + ' 天內沒有要到來的日子 ♡', 'flower');
    if (farN + pastN) {
      html += '<div class="center mt8"><button class="btn soft sm" data-cdtoggle>' +
        (cdShowAll ? '收起 ▲（只顯示近 ' + CD_NEAR_DAYS + ' 天）'
          : '顯示全部 ▼（還有 ' + farN + ' 個較遠的日子' + (pastN ? ' · ' + pastN + ' 個已過' : '') + '）') + '</button></div>';
    }
    return html;
  }

  /* ---------------- 本月行事曆 ---------------- */
  function calMarks() {
    const m = {};
    dtCol().all().forEach(d => { (m[d.date] = m[d.date] || []).push('lav'); });
    return m;
  }
  function calHTML() {
    if (!calState) { const n = new Date(); calState = { y: n.getFullYear(), m: n.getMonth(), sel: D.today() }; }
    return L.calendarHTML({ year: calState.y, month: calState.m, marks: calMarks(), selected: calState.sel });
  }
  function dayListHTML() {
    const sel = calState ? calState.sel : D.today();
    const items = dtCol().where(d => d.date === sel);
    if (!items.length) return '<div class="muted center" style="padding:10px">' + D.pretty(sel) + ' 還沒有約會 ♡</div>';
    return '<div class="flexlist mt8">' + items.map(d =>
      '<div class="item"><div style="width:30px;height:30px">' + icon('heart', 30) + '</div>' +
      '<div class="body"><div class="t">' + U.esc(d.title) + '</div>' +
      '<div class="m"><span>' + (d.time || '全天') + '</span>' + (d.note ? '<span>' + U.esc(d.note) + '</span>' : '') + '</div></div>' +
      '<div style="display:flex;flex-direction:column;gap:2px;align-items:flex-end">' +
      L.editBtn(d.id, 'editdt') +
      '<button class="mini-btn" data-deld="' + d.id + '">刪除</button></div></div>').join('') + '</div>';
  }

  /* 首頁最下面的同步狀態小字 */
  function paintSync(root) {
    const box = root.querySelector('#homeSync');
    if (!box || !L.Sync) return;
    const paint = () => {
      if (!document.body.contains(box)) return;
      const s = L.Sync.state();
      if (!s.enabled) {
        box.innerHTML = '☁️ 還沒開啟雲端同步 · <a href="#settings" data-goset style="color:var(--lav-600)">去設定</a>';
        const a = box.querySelector('[data-goset]');
        if (a) a.onclick = e => { e.preventDefault(); L.go('settings'); };
        return;
      }
      const map = { idle: ['待同步', 'var(--ink-faint)'], syncing: ['同步中…', 'var(--lav-600)'], ok: ['已同步', 'var(--ok)'], error: ['同步失敗', 'var(--danger)'] };
      const m = map[s.state] || map.idle;
      box.innerHTML = '☁️ 雲端同步 · <b style="color:' + m[1] + '">' + m[0] + '</b>' +
        (s.state === 'ok' && s.at ? ' · ' + new Date(s.at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }) : '') +
        (s.state === 'error' && s.msg ? '（' + U.esc(s.msg) + '）' : '');
    };
    paint();
    if (L.Sync.onChange && !syncHookBound) { syncHookBound = true; L.Sync.onChange(paint); }
  }

  L.modules.home = {
    id: 'home', name: '首頁', icon: 'home',
    render() {
      const now = new Date();
      return '' +
        (Store.quotaAlert ? '<div class="card" style="border:1px solid #F0C9CE">' +
          '<div class="row" style="align-items:center;gap:10px">' +
          '<div style="flex:1"><b style="font-size:14px">儲存空間有點滿了 ♡</b>' +
          '<div class="muted" style="font-size:12px">資料都還在，到設定的「資料管理」點一下釋放空間就好了</div></div>' +
          '<button class="btn sm" data-datamgr>去處理</button></div></div>' : '') +
        '<div class="hero">' +
        '<div class="hero-greet">' + greet(now.getHours()) + '，Lume' +
        '<small>今天也是屬於你的小日子 ♡</small></div>' +
        '<div class="hero-clock" id="clock">' + clockHTML(now) + '</div>' +
        '</div>' +

        glanceHTML() +
        '<div class="card" id="quote">' + quoteHTML() + '</div>' +
        agendaHTML() +
        studyCardHTML() +
        lastYearHTML() +

        '<div class="sec-title"><h2>🌙 本月行事曆 · 約會</h2><button class="btn sm" data-add-date>＋ 新增約會</button></div>' +
        '<div class="card"><div id="homecal">' + calHTML() + '</div>' +
        '<div class="deco-line"></div><div id="daylist">' + dayListHTML() + '</div></div>' +

        '<div class="sec-title"><h2>💗 重要日子倒數</h2>' +
        '<span class="chip" style="margin-right:auto;margin-left:8px">近 ' + CD_NEAR_DAYS + ' 天</span>' +
        '<button class="btn sm" data-add-cd>＋ 新增</button></div>' +
        '<div class="card"><div id="cdlist">' + countdownHTML() + '</div>' +
        '<div class="muted mt8" style="font-size:11.5px">超過 ' + CD_NEAR_DAYS +
        ' 天的日子一樣會完整保存，只是先收起來不佔畫面 ♡</div></div>' +

        '<div id="homeSync" class="muted center" style="font-size:12px;padding:4px 0 10px"></div>';
    },
    mount(root, ctx) {
      clearInterval(timer);
      const c = root.querySelector('#clock');
      timer = setInterval(() => { if (c && document.body.contains(c)) c.innerHTML = clockHTML(new Date()); }, 1000);

      root.querySelectorAll('[data-go]').forEach(b => b.onclick = () => ctx.go(b.dataset.go));
      root.querySelectorAll('[data-datamgr]').forEach(b => b.onclick = () => ctx.go('settings'));

      /* 語錄 */
      const qbox = root.querySelector('#quote');
      const bindQuote = () => {
        const sh = qbox.querySelector('[data-shuffle]');
        if (sh) sh.onclick = () => { qShift++; qbox.innerHTML = quoteHTML(); bindQuote(); };
        const fv = qbox.querySelector('[data-fav]');
        if (fv) fv.onclick = () => {
          const i = +fv.dataset.fav;
          let arr = (Store.doc('quotes').get().favorited || []).slice();
          if (arr.indexOf(i) >= 0) { arr = arr.filter(x => x !== i); L.toast('取消收藏 ♡'); }
          else { arr.push(i); L.toast('收藏了這句 ♡'); }
          Store.doc('quotes').set({ favorited: arr });
          qbox.innerHTML = quoteHTML(); bindQuote();
        };
        const fl = qbox.querySelector('[data-favlist]');
        if (fl) fl.onclick = () => L.openFavQuotes();
      };
      if (qbox) bindQuote();

      /* 今明安排：待辦打勾 */
      root.querySelectorAll('[data-atodo]').forEach(b => b.onclick = () => {
        const col = Store.col('futureTodos'), r = col.find(b.dataset.atodo);
        if (r) { col.update(r.id, { done: !r.done }); ctx.refresh(); }
      });

      /* 學習中 */
      root.querySelectorAll('[data-gostudy]').forEach(b => b.onclick = () => ctx.go('study'));
      root.querySelectorAll('[data-hstog]').forEach(b => b.onclick = () => {
        const S = L.modules.study;
        const r = Store.col('studies').find(b.dataset.hstog);
        if (S && r) S.finish(ctx, r);
      });

      root.querySelector('[data-add-cd]').onclick = () => addCountdown(ctx);
      root.querySelectorAll('[data-add-date]').forEach(b => b.onclick = () => addDate(ctx, calState ? calState.sel : D.today()));

      const tg = root.querySelector('[data-cdtoggle]');
      if (tg) tg.onclick = () => { cdShowAll = !cdShowAll; ctx.refresh(); };

      paintSync(root);

      root.querySelectorAll('[data-del]').forEach(b => b.onclick = async e => {
        e.stopPropagation();
        if (await L.confirm('刪除倒數', '確定要刪掉這個日子嗎？')) { cdCol().remove(b.dataset.del); ctx.refresh(); }
      });
      root.querySelectorAll('[data-editcd]').forEach(b => b.onclick = e => {
        e.stopPropagation(); addCountdown(ctx, cdCol().find(b.dataset.editcd));
      });

      const calWrap = root.querySelector('#homecal'), dayWrap = root.querySelector('#daylist');
      const repaintCal = () => { calWrap.innerHTML = calHTML(); dayWrap.innerHTML = dayListHTML(); bindCal(); };
      const bindCal = () => {
        calWrap.querySelectorAll('[data-cal]').forEach(b => b.onclick = () => {
          calState.m += b.dataset.cal === 'next' ? 1 : -1;
          if (calState.m > 11) { calState.m = 0; calState.y++; }
          if (calState.m < 0) { calState.m = 11; calState.y--; }
          repaintCal();
        });
        calWrap.querySelectorAll('.cal-cell[data-date]').forEach(cell => cell.onclick = () => { calState.sel = cell.dataset.date; repaintCal(); });
        dayWrap.querySelectorAll('[data-deld]').forEach(b => b.onclick = async () => {
          if (await L.confirm('刪除約會', '確定要刪掉這筆約會嗎？')) { dtCol().remove(b.dataset.deld); ctx.refresh(); }
        });
        dayWrap.querySelectorAll('[data-editdt]').forEach(b => b.onclick = () => {
          addDate(ctx, calState ? calState.sel : D.today(), dtCol().find(b.dataset.editdt));
        });
      };
      bindCal();
    },
    unmount() { clearInterval(timer); },
    addDate: (ctx, date, rec) => addDate(ctx, date, rec)
  };

  /* ---------- 表單 ---------- */
  function addCountdown(ctx, rec) {
    const c = rec || {};
    let ic = c.icon || 'star';
    L.modal(rec ? '編輯重要日子' : '新增重要日子',
      '<div class="field"><label>名稱 <span class="req">*</span></label><input class="inp" id="f-t" value="' + U.esc(c.title || '') + '" placeholder="例如：好友生日 / 紀念日 / 跨年"></div>' +
      '<div class="field"><label>日期 <span class="req">*</span></label><input class="inp" type="date" id="f-d" value="' + (c.date || D.today()) + '"></div>' +
      '<div class="field"><label>圖示</label><div class="row" id="f-icons">' +
      ['star', 'cake', 'heart', 'moon', 'butterfly', 'flower', 'bow', 'wish'].map(n =>
        '<button class="icon-btn" data-ic="' + n + '" style="' + (n === ic ? 'border-color:var(--lav-500);background:var(--lav-100)' : '') + '">' + icon(n, 20) + '</button>').join('') +
      '</div></div>' +
      '<label class="row" style="align-items:center;gap:8px;font-size:13px"><input type="checkbox" id="f-r" style="width:17px;height:17px"' + (c.repeat ? ' checked' : '') + '> 每年重複</label>' +
      L.formFooter({ isEdit: !!rec }),
      (body, close) => {
        L.bindCancel(body, close);
        body.querySelectorAll('[data-ic]').forEach(b => b.onclick = () => {
          ic = b.dataset.ic;
          body.querySelectorAll('[data-ic]').forEach(x => x.style.cssText = '');
          b.style.cssText = 'border-color:var(--lav-500);background:var(--lav-100)';
        });
        body.querySelector('#ok').onclick = () => {
          const t = body.querySelector('#f-t').value.trim();
          const d = body.querySelector('#f-d').value;
          if (!t || !d) return L.toast('請填寫名稱與日期 ♡');
          const data = { title: t, date: d, repeat: body.querySelector('#f-r').checked, icon: ic };
          if (rec) cdCol().update(rec.id, data); else cdCol().add(data);
          close(); L.toast(rec ? '已更新 ♡' : '已加入倒數 ♡'); ctx.refresh();
        };
      });
  }

  function addDate(ctx, date, rec) {
    const d = rec || {};
    L.modal(rec ? '編輯約會 / 聚會' : '新增約會 / 聚會',
      '<div class="field"><label>要做什麼 <span class="req">*</span></label><input class="inp" id="f-t" value="' + U.esc(d.title || '') + '" placeholder="例如：和 ○○ 吃下午茶"></div>' +
      '<div class="grid2">' +
      '<div class="field"><label>日期</label><input class="inp" type="date" id="f-d" value="' + (d.date || date || D.today()) + '"></div>' +
      '<div class="field"><label>時間</label><input class="inp" type="time" id="f-tm" value="' + (d.time || '') + '"></div></div>' +
      '<div class="field"><label>備註</label><textarea class="inp" id="f-n" placeholder="地點、想聊的事…">' + U.esc(d.note || '') + '</textarea></div>' +
      L.formFooter({ isEdit: !!rec }),
      (body, close) => {
        L.bindCancel(body, close);
        body.querySelector('#ok').onclick = () => {
          const t = body.querySelector('#f-t').value.trim();
          if (!t) return L.toast('請填寫要做什麼 ♡');
          const data = {
            title: t, date: body.querySelector('#f-d').value || D.today(),
            time: body.querySelector('#f-tm').value, note: body.querySelector('#f-n').value.trim()
          };
          if (rec) dtCol().update(rec.id, data); else dtCol().add(data);
          close(); L.toast(rec ? '已更新 ♡' : '已排進行事曆 ♡'); ctx.refresh();
        };
      });
  }
})(window.Lume);
