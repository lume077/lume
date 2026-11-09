/* ============================================================
   study.js — 學習計畫：每天要學什麼、學完的心得、卡住的問題
   ------------------------------------------------------------
   · 上面：快速安排（「明天 RAG 入門」「11/12 看 Claude 文件」）
   · 中間：今天要學的 + 接下來 7 天的安排（只列標題，不攤開心得）
   · 學完打勾 → 跳出小視窗寫心得 / 遇到的問題（可略過）
   · 心得與問題都收起來，點項目才看得到
   · 「還沒解決的問題」收成一顆按鈕，點開再看
   · 最下面：學習月曆，可切上個月 / 下個月，點日期看那天的安排與心得
   欄位：title / topic / date / minutes / done / doneAt / note / question / solved / link
   ============================================================ */
window.Lume = window.Lume || {}; window.Lume.modules = window.Lume.modules || {};
(function (L) {
  'use strict';
  const { D, U, icon, Store } = L;
  const col = () => Store.col('studies');
  const BASE_TOPICS = ['AI', '英文', '設計', '剪片', '其他'];

  let calY = new Date().getFullYear();
  let calM = new Date().getMonth();
  let draftTopic = 'AI';

  /** 所有用過的主題（預設主題在前，自訂的接在後面） */
  function topics() {
    const s = BASE_TOPICS.slice();
    col().all().forEach(r => { if (r.topic && s.indexOf(r.topic) < 0) s.push(r.topic); });
    return s;
  }

  /** 快速輸入：「今天 xxx」「明天 xxx」「後天 xxx」「12 xxx」「12/5 xxx」，沒寫日期就排今天 */
  function parseQuick(s) {
    const t = D.today(), now = new Date();
    s = s.trim();
    const fix = key => (D.diffDays(key, t) < -60 ? (now.getFullYear() + 1) + key.slice(4) : key);
    /* 區間：「11/1-11/12 剪片練習」「11/1~12 剪片」 */
    let m = s.match(/^(\d{1,2})\/(\d{1,2})\s*(?:-|~|～|到|至)\s*(?:(\d{1,2})\/)?(\d{1,2})[\s、,，]+(.+)$/);
    if (m) {
      const y = now.getFullYear();
      const a = fix(y + '-' + D.pad(+m[1]) + '-' + D.pad(+m[2]));
      let b = (+a.slice(0, 4)) + '-' + D.pad(+(m[3] || m[1])) + '-' + D.pad(+m[4]);
      if (D.diffDays(b, a) < 0) b = (+b.slice(0, 4) + 1) + b.slice(4);
      return { date: a, end: b, title: m[5] };
    }
    /* 區間：「1到12 剪片」「1號到12號 剪片」（這個月；已經過了就排下個月） */
    m = s.match(/^(\d{1,2})\s*[日號]?\s*(?:~|～|到|至)\s*(\d{1,2})\s*[日號]?[\s、,，]+(.+)$/);
    if (m && +m[1] >= 1 && +m[2] <= 31 && +m[2] >= +m[1]) {
      let y = now.getFullYear(), mo = now.getMonth();
      let b = y + '-' + D.pad(mo + 1) + '-' + D.pad(+m[2]);
      if (D.diffDays(b, t) < 0) { mo++; if (mo > 11) { mo = 0; y++; } b = y + '-' + D.pad(mo + 1) + '-' + D.pad(+m[2]); }
      return { date: y + '-' + D.pad(mo + 1) + '-' + D.pad(+m[1]), end: b, title: m[3] };
    }
    m = s.match(/^(\d{1,2})\s*[\/\-.]\s*(\d{1,2})[\s、,，]+(.+)$/);
    if (m) {
      const y = now.getFullYear();
      let key = y + '-' + D.pad(+m[1]) + '-' + D.pad(+m[2]);
      if (D.diffDays(key, t) < -60) key = (y + 1) + '-' + D.pad(+m[1]) + '-' + D.pad(+m[2]);
      return { date: key, title: m[3] };
    }
    m = s.match(/^(\d{1,2})\s*[日號][\s、,，]*(.+)$/) || s.match(/^(\d{1,2})[\s、,，]+(.+)$/);
    if (m && +m[1] >= 1 && +m[1] <= 31) {
      let y = now.getFullYear(), mo = now.getMonth();
      let key = y + '-' + D.pad(mo + 1) + '-' + D.pad(+m[1]);
      if (D.diffDays(key, t) < 0) { mo++; if (mo > 11) { mo = 0; y++; } key = y + '-' + D.pad(mo + 1) + '-' + D.pad(+m[1]); }
      return { date: key, title: m[2] };
    }
    if (/^明天/.test(s)) return { date: D.addDays(t, 1), title: s.replace(/^明天[\s、,，]*/, '') };
    if (/^後天/.test(s)) return { date: D.addDays(t, 2), title: s.replace(/^後天[\s、,，]*/, '') };
    if (/^今天/.test(s)) return { date: t, title: s.replace(/^今天[\s、,，]*/, '') };
    return { date: t, title: s };
  }

  /* ---------------- 區間學習（連續好幾天學同一件事） ----------------
     每一天各存一筆（共用 planId），所以打勾、心得、月曆都跟單日的一樣好用 */
  const MAX_RANGE = 180;
  /** 區間學習裡「排的當下就已經過去」的日子，不算沒學完 */
  const backfilled = r => !!(r && r.planId && r.createdAt && r.date < D.key(new Date(r.createdAt)));
  L.studyBackfilled = backfilled;
  function createRange(d) {
    const len = D.diffDays(d.end, d.date) + 1;
    if (len < 1) { L.toast('結束日要在開始日之後喔 ♡'); return 0; }
    if (len > MAX_RANGE) { L.toast('一次最多排 ' + MAX_RANGE + ' 天 ♡'); return 0; }
    const pid = 'p' + U.uid();
    for (let i = len - 1; i >= 0; i--) {
      col().add({
        title: d.title, topic: d.topic, date: D.addDays(d.date, i), done: false,
        note: '', question: '', solved: false, minutes: d.minutes || 0, link: d.link || '',
        planId: pid, planTitle: d.title, planStart: d.date, planEnd: d.end, dayNo: i + 1, dayTotal: len
      });
    }
    return len;
  }
  function plans() {
    const m = {};
    col().all().forEach(r => {
      if (!r || !r.planId) return;
      const p = m[r.planId] = m[r.planId] || { id: r.planId, title: r.planTitle || r.title, topic: r.topic, start: r.planStart, end: r.planEnd, total: 0, done: 0 };
      p.total++; if (r.done) p.done++;
    });
    return Object.keys(m).map(k => m[k]).sort((a, b) => (a.start || '') < (b.start || '') ? -1 : 1);
  }
  const md = k => (+k.slice(5, 7)) + '/' + (+k.slice(8, 10));
  function planHTML(p) {
    const t = D.today();
    const len = D.diffDays(p.end, p.start) + 1;
    const day = D.diffDays(t, p.start) + 1;
    const state = day < 1 ? '還有 ' + (1 - day) + ' 天開始' : day > len ? '已結束' : '第 ' + day + ' / ' + len + ' 天';
    return '<div class="plan-prog"><div class="pt"><b style="font-weight:500">' + U.esc(p.title) +
      (p.topic ? ' <span class="chip">' + U.esc(p.topic) + '</span>' : '') + '</b>' +
      '<span>' + md(p.start) + ' – ' + md(p.end) + ' · ' + state + '</span></div>' +
      '<div class="bar"><i style="width:' + Math.round(p.done / Math.max(1, p.total) * 100) + '%"></i></div>' +
      '<div class="spread" style="margin-top:4px"><span class="muted">已完成 ' + p.done + ' / ' + p.total + ' 天</span>' +
      '<button class="mini-btn" data-pdel="' + U.esc(p.id) + '">刪除整段</button></div></div>';
  }

  function byDate() {
    const m = {};
    col().all().forEach(r => { if (r && r.date) (m[r.date] = m[r.date] || []).push(r); });
    Object.keys(m).forEach(k => m[k].sort((a, b) => (a.done - b.done) || ((a.createdAt || '') < (b.createdAt || '') ? -1 : 1)));
    return m;
  }

  const dayLabel = key => {
    const n = D.diffDays(key, D.today());
    const md = (+key.slice(5, 7)) + '/' + (+key.slice(8, 10));
    const near = n === 0 ? '今天' : n === 1 ? '明天' : n === 2 ? '後天' : n === -1 ? '昨天' : '';
    return (near ? near + ' · ' : '') + md + ' 星期' + D.weekday(key);
  };

  /** 精簡項目：只有標題、主題、時長；有心得 / 問題時只給小圖示，不攤開內容 */
  function rowHTML(r) {
    const marks = (r.note ? '<span title="有心得">📝</span>' : '') +
      (r.question ? '<span title="有問題">' + (r.solved ? '✅' : '❓') + '</span>' : '');
    return '<div class="item study-row' + (r.done ? ' done' : '') + '">' +
      '<div class="tick' + (r.done ? ' on' : '') + '" data-stog="' + U.esc(r.id) + '">' + icon('check') + '</div>' +
      '<div class="body" data-sopen="' + U.esc(r.id) + '" style="cursor:pointer"><div class="t">' + U.esc(r.title || '') + '</div>' +
      '<div class="m">' + (r.topic ? '<span class="chip">' + U.esc(r.topic) + '</span>' : '') +
      (r.planId ? '<span class="range-chip">第 ' + r.dayNo + ' / ' + r.dayTotal + ' 天</span>' : '') +
      (r.minutes ? '<span>⏱ ' + U.num(r.minutes, 0) + ' 分</span>' : '') + marks + '</div></div>' +
      '<button class="mini-btn" data-sopen="' + U.esc(r.id) + '">看 / 寫心得</button></div>';
  }

  /** 完整內容（只在彈窗裡出現） */
  function detailHTML(r) {
    return '<div class="study-detail">' +
      '<div class="row" style="align-items:center;gap:6px;flex-wrap:wrap">' +
      '<b style="font-size:15.5px;flex:1;min-width:120px">' + (r.done ? '✅ ' : '') + U.esc(r.title || '') + '</b>' +
      (r.topic ? '<span class="chip">' + U.esc(r.topic) + '</span>' : '') + '</div>' +
      (r.planId ? '<div class="muted" style="font-size:12px;margin-top:4px">🌈 連續學習 ' + md(r.planStart) + ' – ' + md(r.planEnd) +
        ' 的第 ' + r.dayNo + ' / ' + r.dayTotal + ' 天</div>' : '') +
      '<div class="muted" style="font-size:12px;margin-top:4px">' + U.esc(dayLabel(r.date)) +
      (r.minutes ? ' · 學了 ' + U.num(r.minutes, 0) + ' 分鐘' : '') + '</div>' +
      (r.link ? '<div class="muted" style="font-size:12px;margin-top:4px;word-break:break-all">🔗 ' +
        (/^https?:\/\//i.test(String(r.link).trim())     // 只有 http(s) 網址才做成可以點的連結
          ? '<a href="' + U.esc(String(r.link).trim()) + '" target="_blank" rel="noopener noreferrer">' + U.esc(r.link) + '</a>'
          : U.esc(r.link)) + '</div>' : '') +
      (r.note ? '<div class="study-box"><div class="lb">📝 學習心得</div><p>' + L.nl2br(r.note) + '</p></div>' : '') +
      (r.question ? '<div class="study-box q' + (r.solved ? ' solved' : '') + '"><div class="lb">' + (r.solved ? '✅ 已解決的問題' : '❓ 遇到的問題') +
        '</div><p>' + L.nl2br(r.question) + '</p>' +
        (r.answer ? '<div class="lb" style="margin-top:6px">💡 後來的解法</div><p>' + L.nl2br(r.answer) + '</p>' : '') + '</div>' : '') +
      (!r.note && !r.question ? '<div class="muted" style="font-size:12px;margin-top:8px">還沒寫心得 ♡</div>' : '') +
      '</div>';
  }

  function calHTML() {
    const map = byDate();
    const first = D.firstDow(calY, calM);
    const total = D.daysInMonth(calY, calM);
    const today = D.today();
    let cells = '日一二三四五六'.split('').map(d => '<div class="cal-dow">' + d + '</div>').join('');
    for (let i = 0; i < first; i++) cells += '<div class="cal-cell out"></div>';
    let plan = 0, fin = 0;
    for (let d = 1; d <= total; d++) {
      const key = calY + '-' + D.pad(calM + 1) + '-' + D.pad(d);
      const arr = map[key] || [];
      let inner = '<span>' + d + '</span>';
      if (arr.length) {
        const done = arr.filter(r => r.done).length;
        plan += arr.length; fin += done;
        const all = done === arr.length;
        inner += '<div class="cal-icos"><span class="cal-ico tiny">' + (all ? '✓' : done + '/' + arr.length) + '</span></div>' +
          '<i class="cal-dot" style="background:' + (all ? '#87BBA0' : D.diffDays(key, today) < 0 ? '#E9A8BC' : '#C7ACE9') + '"></i>';
      }
      cells += '<div class="cal-cell' + (key === today ? ' today' : '') + (arr.length ? ' has' : '') +
        '" data-sdate="' + key + '">' + inner + '</div>';
    }
    const arrow = dir => '<button class="icon-btn" data-scal="' + dir + '" style="width:32px;height:32px">' +
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="' + (dir === 'prev' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7') +
      '" stroke="#8E6FC8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
    return '<div class="cal-head">' + arrow('prev') +
      '<b>' + calY + ' 年 ' + (calM + 1) + ' 月 · 完成 ' + fin + ' / ' + plan + '</b>' + arrow('next') + '</div>' +
      '<div class="cal-grid">' + cells + '</div>' +
      '<div class="cal-legend mt8"><span class="lg"><i style="background:#87BBA0"></i>全部學完</span>' +
      '<span class="lg"><i style="background:#C7ACE9"></i>安排中</span>' +
      '<span class="lg"><i style="background:#E9A8BC"></i>沒學完</span></div>' +
      '<div class="muted center mt8" style="font-size:12px">點日期看那天的安排、心得和問題 ♡</div>';
  }

  L.modules.study = {
    id: 'study', name: '學習計畫', icon: 'bulb',

    render() {
      const t = D.today();
      const map = byDate();
      const todays = map[t] || [];
      const todo = todays.filter(r => !r.done), doneT = todays.filter(r => r.done);
      const upcoming = Object.keys(map).filter(k => D.diffDays(k, t) > 0 && D.diffDays(k, t) <= 7).sort();
      const overdue = col().where(r => !r.done && D.diffDays(r.date, t) < 0 && !backfilled(r));
      const openQ = col().where(r => r.question && !r.solved);
      const tps = topics();
      if (tps.indexOf(draftTopic) < 0) draftTopic = tps[0];

      return '' +
        '<div class="card tinted"><h3>' + icon('bulb') + '學習計畫 · 今天要學什麼</h3>' +
        '<div class="row"><input class="inp" id="sq" placeholder="例如：明天 RAG 入門 / 11/12 看 Claude 文件" style="flex:1;min-width:170px">' +
        '<button class="btn" id="sq-add">排進去</button></div>' +
        '<div class="row mt8" id="stopics">' + tps.map(x =>
          '<button class="tab' + (draftTopic === x ? ' on' : '') + '" data-stopic="' + U.esc(x) + '">' + U.esc(x) + '</button>').join('') +
        '<button class="tab" id="snewtopic">＋ 主題</button></div>' +
        '<div class="muted mt8" style="line-height:1.7">沒寫日期就排今天；寫「明天」「12」「11/12」就排到那天；' +
        '寫「11/1-11/12 剪片練習」或「1到12 剪片」就會排成連續好幾天 ♡ ' +
        '<a href="#" role="button" id="sform" style="color:var(--lav-600)">詳細安排</a></div></div>' +

        (function () {
          const t = D.today();
          const ps = plans();
          const live = ps.filter(p => D.diffDays(p.end, t) >= 0);
          const past = ps.filter(p => D.diffDays(p.end, t) < 0);
          if (!ps.length) return '';
          return '<div class="sec-title"><h2>🌈 連續學習</h2><span class="muted">' + live.length + ' 段進行中</span></div>' +
            '<div class="card" id="splans">' + (live.length ? live.map(planHTML).join('') : '<div class="muted center" style="padding:8px">目前沒有進行中的連續學習 ♡</div>') +
            (past.length ? '<details class="study-fold mt8"><summary>📦 已結束的 ' + past.length + ' 段（點開看）</summary>' +
              past.slice().reverse().map(planHTML).join('') + '</details>' : '') + '</div>';
        })() +

        '<div class="sec-title"><h2>📌 今天要學</h2><span class="muted">' +
        (todays.length ? '完成 ' + doneT.length + ' / ' + todays.length : D.pretty(t)) + '</span></div>' +
        '<div class="card" id="stoday">' +
        (todo.length ? '<div class="flexlist">' + todo.map(rowHTML).join('') + '</div>'
          : L.empty(todays.length ? '今天的都學完了，好棒 ♡' : '今天還沒安排要學什麼，上面寫一個吧 ♡', 'bulb')) +
        (doneT.length ? '<details class="study-fold mt8"><summary>✅ 今天已學完 ' + doneT.length + ' 項（點開看）</summary>' +
          '<div class="flexlist mt8">' + doneT.map(rowHTML).join('') + '</div></details>' : '') +
        (overdue.length ? '<div class="study-over mt8"><span>⏳ 之前還有 <b>' + overdue.length + '</b> 項沒學完</span>' +
          '<button class="mini-btn" id="sover">看看</button><button class="mini-btn edit" id="smove">全部移到今天</button></div>' : '') +
        '</div>' +

        '<div class="sec-title"><h2>🌱 接下來 7 天</h2><span class="muted">' +
        upcoming.reduce((n, k) => n + map[k].length, 0) + ' 項</span></div>' +
        '<div class="card" id="snext">' + (upcoming.length ? upcoming.map(k =>
          '<div class="study-day"><div class="dl">' + U.esc(dayLabel(k)) + '</div>' +
          '<div class="flexlist">' + map[k].map(rowHTML).join('') + '</div></div>').join('')
          : '<div class="muted center" style="padding:10px">還沒有之後的安排，可以先排明天要學的 ♡</div>') + '</div>' +

        (openQ.length ? '<button class="btn soft block" id="sq-open" style="margin-top:14px">❓ 還沒解決的問題 ' + openQ.length + ' 個（點開看）</button>' : '') +

        '<div class="sec-title"><h2>🗓 學習月曆</h2><span class="muted">以前的、以後的都收在這裡</span></div>' +
        '<div class="card" id="scalwrap"><div id="scal">' + calHTML() + '</div></div>';
    },

    mount(root, ctx) {
      const self = this;
      root.querySelectorAll('[data-stopic]').forEach(b => b.onclick = () => {
        draftTopic = b.dataset.stopic;
        root.querySelectorAll('[data-stopic]').forEach(x => x.classList.toggle('on', x.dataset.stopic === draftTopic));
      });
      root.querySelector('#snewtopic').onclick = () => {
        L.modal('新增學習主題',
          '<div class="field"><label>主題名稱</label><input class="inp" id="f-tp" placeholder="例如：Python、日文、理財"></div>' +
          L.formFooter({ okText: '加入主題' }),
          (body, close) => {
            L.bindCancel(body, close);
            body.querySelector('#ok').onclick = () => {
              const v = L.val(body, 'f-tp').trim();
              if (!v) return L.toast('取個名字吧 ♡');
              draftTopic = v.slice(0, 12);
              close();
              self.form(ctx, { topic: draftTopic, date: D.today() });
            };
          });
      };
      const add = () => {
        const v = root.querySelector('#sq').value.trim();
        if (!v) return L.toast('寫下要學的東西吧 ♡');
        const p = parseQuick(v);
        if (!p.title) return L.toast('日期後面要寫學什麼喔 ♡');
        if (p.end) {
          const n = createRange({ title: p.title, date: p.date, end: p.end, topic: draftTopic });
          if (!n) return;
          root.querySelector('#sq').value = '';
          root.querySelector('#sq').blur();
          L.toast('已排好 ' + md(p.date) + ' – ' + md(p.end) + '，共 ' + n + ' 天 ♡');
          return ctx.refresh({ force: true });
        }
        col().add({ title: p.title, date: p.date, topic: draftTopic, done: false, note: '', question: '', solved: false });
        root.querySelector('#sq').value = '';
        root.querySelector('#sq').blur();
        L.toast(p.date === D.today() ? '已排進今天 ♡' : '已排在 ' + dayLabel(p.date) + ' ♡');
        ctx.refresh();
      };
      root.querySelector('#sq-add').onclick = add;
      root.querySelector('#sq').onkeydown = e => { if (e.key === 'Enter' && !e.isComposing) add(); };
      root.querySelector('#sform').onclick = (e) => { e.preventDefault(); self.form(ctx, { topic: draftTopic, date: D.today() }); };

      const mv = root.querySelector('#smove');
      if (mv) mv.onclick = () => {
        const t = D.today();
        col().where(r => !r.done && D.diffDays(r.date, t) < 0 && !backfilled(r)).forEach(r => col().update(r.id, { date: t, movedFrom: r.movedFrom || r.date }));
        L.toast('都搬到今天了，慢慢來 ♡'); ctx.refresh();
      };
      const ov = root.querySelector('#sover');
      if (ov) ov.onclick = () => self.listModal(ctx, '之前沒學完的', col().where(r => !r.done && D.diffDays(r.date, D.today()) < 0 && !backfilled(r))
        .sort((a, b) => a.date < b.date ? -1 : 1));
      const qo = root.querySelector('#sq-open');
      if (qo) qo.onclick = () => self.questionsModal(ctx);

      const onClick = e => {
        const tg = e.target;
        const tog = tg.closest && tg.closest('[data-stog]');
        if (tog) {
          const r = col().find(tog.dataset.stog); if (!r) return;
          if (r.done) { col().update(r.id, { done: false, doneAt: null }); return ctx.refresh(); }
          return self.finish(ctx, r);
        }
        const op = tg.closest && tg.closest('[data-sopen]');
        if (op) return self.detail(ctx, op.dataset.sopen);
        const nav = tg.closest && tg.closest('[data-scal]');
        if (nav) {
          if (nav.dataset.scal === 'prev') { calM--; if (calM < 0) { calM = 11; calY--; } }
          else { calM++; if (calM > 11) { calM = 0; calY++; } }
          root.querySelector('#scal').innerHTML = calHTML();
          return;
        }
        const cell = tg.closest && tg.closest('[data-sdate]');
        if (cell) self.dayModal(ctx, cell.dataset.sdate);
      };
      ['#stoday', '#snext', '#scalwrap'].forEach(s => root.querySelector(s).addEventListener('click', onClick));
      const sp = root.querySelector('#splans');
      if (sp) sp.addEventListener('click', e => {
        const b = e.target.closest && e.target.closest('[data-pdel]');
        if (b) self.deletePlan(ctx, b.dataset.pdel);
      });
    },

    /** 刪除整段連續學習（連同每天的心得） */
    async deletePlan(ctx, pid) {
      const arr = col().where(r => r.planId === pid);
      if (!arr.length) return;
      const doneN = arr.filter(r => r.done || r.note).length;
      if (!await L.confirm('刪除整段學習', '「' + (arr[0].planTitle || arr[0].title) + '」共 ' + arr.length + ' 天會一起刪掉' +
        (doneN ? '（其中 ' + doneN + ' 天有打勾或心得）' : '') + '，確定嗎？')) return;
      arr.forEach(r => col().remove(r.id));
      L.toast('已刪除 ♡'); ctx.refresh();
    },

    /* ---------- 學完了：寫心得（可略過） ---------- */
    finish(ctx, r) {
      L.modal('學完「' + (r.title || '') + '」♡',
        '<div class="muted mb8" style="font-size:12.5px">記一下學到什麼、卡在哪裡，以後回來看會很有用（都可以不填）</div>' +
        '<div class="field"><label>📝 學習心得 / 重點</label><textarea class="inp" id="f-n" style="min-height:96px;line-height:1.8" placeholder="今天學到…">' + U.esc(r.note || '') + '</textarea></div>' +
        '<div class="field"><label>❓ 遇到的問題（還沒搞懂的）</label><textarea class="inp" id="f-q" style="min-height:70px;line-height:1.8" placeholder="這裡還不太懂…">' + U.esc(r.question || '') + '</textarea></div>' +
        '<div class="field"><label>⏱ 大概學了幾分鐘</label><input class="inp" type="number" inputmode="numeric" id="f-m" value="' + U.esc(r.minutes || '') + '" placeholder="例如 30"></div>' +
        L.formFooter({ okText: '✅ 學完了，收起來', cancel: '還沒學完' }),
        (body, close) => {
          L.bindCancel(body, close);
          body.querySelector('#ok').onclick = () => {
            const q = L.val(body, 'f-q').trim();
            col().update(r.id, {
              done: true, doneAt: new Date().toISOString(),
              note: L.val(body, 'f-n').trim(), question: q,
              solved: q ? (q === r.question ? !!r.solved : false) : false,
              minutes: +L.val(body, 'f-m') || 0
            });
            close(); L.toast(q ? '學完了 ♡ 問題先收在「還沒解決的問題」' : '學完了，好棒 ♡'); ctx.refresh();
          };
        });
    },

    /* ---------- 單項詳情 ---------- */
    detail(ctx, id) {
      const self = this;
      const r = col().find(id); if (!r) return;
      L.modal('學習紀錄',
        detailHTML(r) +
        '<div class="row mt14">' +
        (r.done ? '<button class="btn soft sm" id="d-undo" style="flex:1">改回沒學完</button>'
          : '<button class="btn sm" id="d-fin" style="flex:1">✅ 學完了</button>') +
        (r.question && !r.solved ? '<button class="btn soft sm" id="d-solve" style="flex:1">💡 問題解決了</button>' : '') + '</div>' +
        '<div class="row mt8"><button class="btn ghost sm" id="d-edit" style="flex:1">✏️ 編輯</button>' +
        '<button class="btn ghost sm" id="d-del" style="flex:1;color:var(--danger);border-color:#F0C9CE">刪除</button></div>',
        (body, close) => {
          const fin = body.querySelector('#d-fin'); if (fin) fin.onclick = () => { close(); self.finish(ctx, r); };
          const un = body.querySelector('#d-undo'); if (un) un.onclick = () => { col().update(r.id, { done: false, doneAt: null }); close(); ctx.refresh(); };
          const sv = body.querySelector('#d-solve'); if (sv) sv.onclick = () => { close(); self.solve(ctx, r); };
          body.querySelector('#d-edit').onclick = () => { close(); self.form(ctx, r); };
          body.querySelector('#d-del').onclick = async () => {
            close();
            if (!await L.confirm('刪除學習項目', '確定刪掉「' + (r.title || '') + '」和它的心得嗎？')) return;
            col().remove(r.id); ctx.refresh();
          };
        });
    },

    solve(ctx, r) {
      L.modal('問題解決了 ♡',
        '<div class="study-box q" style="margin-top:0"><div class="lb">❓ 當時的問題</div><p>' + L.nl2br(r.question || '') + '</p></div>' +
        '<div class="field mt8"><label>💡 怎麼解決的（可不填）</label><textarea class="inp" id="f-a" style="min-height:80px;line-height:1.8" placeholder="原來是…">' + U.esc(r.answer || '') + '</textarea></div>' +
        L.formFooter({ okText: '✅ 標記為已解決' }),
        (body, close) => {
          L.bindCancel(body, close);
          body.querySelector('#ok').onclick = () => {
            col().update(r.id, { solved: true, answer: L.val(body, 'f-a').trim() });
            close(); L.toast('又搞懂一件事了 ♡'); ctx.refresh();
          };
        });
    },

    questionsModal(ctx) {
      const self = this;
      const arr = col().where(r => r.question && !r.solved).sort((a, b) => a.date < b.date ? 1 : -1);
      L.modal('還沒解決的問題',
        (arr.length ? arr.map(r =>
          '<div class="study-box q"><div class="lb">' + U.esc(dayLabel(r.date)) + ' · ' + U.esc(r.title || '') + '</div>' +
          '<p>' + L.nl2br(r.question) + '</p>' +
          '<button class="mini-btn edit" data-solve="' + U.esc(r.id) + '">💡 解決了</button></div>').join('')
          : '<div class="muted center" style="padding:16px">問題都解決了 ♡</div>'),
        (body, close) => {
          body.querySelectorAll('[data-solve]').forEach(b => b.onclick = () => { close(); self.solve(ctx, col().find(b.dataset.solve)); });
        });
    },

    listModal(ctx, title, arr) {
      const self = this;
      L.modal(title,
        arr.map(r => '<div class="study-day"><div class="dl">' + U.esc(dayLabel(r.date)) + '</div>' +
          '<div class="flexlist">' + rowHTML(r) + '</div></div>').join(''),
        (body, close) => {
          body.addEventListener('click', e => {
            const tog = e.target.closest && e.target.closest('[data-stog]');
            if (tog) { close(); return self.finish(ctx, col().find(tog.dataset.stog)); }
            const op = e.target.closest && e.target.closest('[data-sopen]');
            if (op) { close(); self.detail(ctx, op.dataset.sopen); }
          });
        });
    },

    /* ---------- 月曆點日期：那天的完整紀錄 ---------- */
    dayModal(ctx, key) {
      const self = this;
      const arr = byDate()[key] || [];
      L.modal(D.pretty(key) + ' 星期' + D.weekday(key) + ' · 學習',
        (arr.length ? arr.map(r => '<div class="study-card">' + detailHTML(r) +
          '<div class="row mt8" style="justify-content:flex-end;gap:4px">' +
          (r.done ? '' : '<button class="mini-btn edit" data-dfin="' + U.esc(r.id) + '">✅ 學完了</button>') +
          L.editBtn(r.id, 'dedit') + '<button class="mini-btn" data-ddel="' + U.esc(r.id) + '">刪除</button></div></div>').join('')
          : '<div class="muted center" style="padding:16px">這天沒有學習安排 ♡</div>') +
        '<button class="btn block mt8" id="snew">＋ 為這天安排學習</button>',
        (body, close) => {
          body.addEventListener('click', async e => {
            const g = s => e.target.closest && e.target.closest(s);
            let b;
            if ((b = g('[data-dfin]'))) { close(); return self.finish(ctx, col().find(b.dataset.dfin)); }
            if ((b = g('[data-dedit]'))) { close(); return self.form(ctx, col().find(b.dataset.dedit)); }
            if ((b = g('[data-ddel]'))) {
              close();
              if (!await L.confirm('刪除學習項目', '確定刪掉這項和它的心得嗎？')) return;
              col().remove(b.dataset.ddel); ctx.refresh();
            }
          });
          body.querySelector('#snew').onclick = () => { close(); self.form(ctx, { date: key, topic: draftTopic }); };
        });
    },

    /* ---------- 新增 / 編輯 ---------- */
    form(ctx, rec) {
      const r = rec || {};
      const editing = !!(rec && rec.id);
      const tps = topics(); if (r.topic && tps.indexOf(r.topic) < 0) tps.push(r.topic);
      let tp = r.topic || draftTopic;
      let mode = 'one';
      L.modal(editing ? '編輯學習項目' : '安排學習',
        (editing ? (r.planId ? '<div class="muted mb8">🌈 這是「' + U.esc(r.planTitle || r.title) + '」的第 ' + r.dayNo + ' / ' + r.dayTotal + ' 天，這裡只會改這一天 ♡</div>' : '')
          : '<div class="seg"><button data-mode="one" class="on">單日</button><button data-mode="range">連續多天</button></div>') +
        '<div class="field"><label>要學什麼 <span class="req">*</span></label>' +
        '<input class="inp" id="f-t" value="' + U.esc(r.title || '') + '" placeholder="例如：看完 Claude 的 Prompt 教學"></div>' +
        '<div class="grid2"><div class="field"><label id="f-dl">哪一天</label><input class="inp" type="date" id="f-d" value="' + U.esc(r.date || D.today()) + '"></div>' +
        '<div class="field" id="f-endw" style="display:none"><label>結束日</label><input class="inp" type="date" id="f-e" value="' + U.esc(D.addDays(r.date || D.today(), 6)) + '"></div>' +
        '<div class="field" id="f-minw"><label>預計 / 實際分鐘</label><input class="inp" type="number" inputmode="numeric" id="f-m" value="' + U.esc(r.minutes || '') + '" placeholder="30"></div></div>' +
        '<div class="muted mb8" id="f-rhint" style="display:none">每天都會出現在「今天要學」，學完可以各自打勾、寫心得 ♡</div>' +
        '<div class="field"><label>主題</label><div class="row" id="f-tps">' + tps.map(x =>
          '<button class="tab' + (tp === x ? ' on' : '') + '" data-t="' + U.esc(x) + '">' + U.esc(x) + '</button>').join('') + '</div></div>' +
        '<div class="field"><label>資料連結（可不填）</label><input class="inp" id="f-l" value="' + U.esc(r.link || '') + '" placeholder="https://…"></div>' +
        '<div class="field"><label>📝 學習心得（可不填）</label><textarea class="inp" id="f-n" style="min-height:80px;line-height:1.8">' + U.esc(r.note || '') + '</textarea></div>' +
        '<div class="field"><label>❓ 遇到的問題（可不填）</label><textarea class="inp" id="f-q" style="min-height:64px;line-height:1.8">' + U.esc(r.question || '') + '</textarea></div>' +
        L.formFooter({ isEdit: editing, okText: editing ? '💾 保存修改' : '排進學習計畫 ♡' }),
        (body, close) => {
          L.bindCancel(body, close);
          body.querySelectorAll('#f-tps [data-t]').forEach(b => b.onclick = () => {
            tp = b.dataset.t;
            body.querySelectorAll('#f-tps [data-t]').forEach(x => x.classList.toggle('on', x.dataset.t === tp));
          });
          body.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => {
            mode = b.dataset.mode;
            body.querySelectorAll('[data-mode]').forEach(x => x.classList.toggle('on', x === b));
            const rg = mode === 'range';
            body.querySelector('#f-endw').style.display = rg ? '' : 'none';
            body.querySelector('#f-minw').style.display = rg ? 'none' : '';
            body.querySelector('#f-rhint').style.display = rg ? '' : 'none';
            body.querySelector('#f-dl').textContent = rg ? '開始日' : '哪一天';
          });
          body.querySelector('#ok').onclick = () => {
            const t = L.val(body, 'f-t').trim();
            if (!t) return L.toast('寫下要學什麼吧 ♡');
            if (!editing && mode === 'range') {
              const a = L.val(body, 'f-d') || D.today(), e = L.val(body, 'f-e');
              const n = createRange({ title: t, date: a, end: e, topic: tp, link: L.val(body, 'f-l').trim() });
              if (!n) return;
              draftTopic = tp;
              const d0 = D.parse(a); if (d0) { calY = d0.getFullYear(); calM = d0.getMonth(); }
              close(); L.toast('已排好 ' + md(a) + ' – ' + md(e) + '，共 ' + n + ' 天 ♡'); return ctx.refresh();
            }
            const q = L.val(body, 'f-q').trim();
            const data = {
              title: t, date: L.val(body, 'f-d') || D.today(), topic: tp,
              minutes: +L.val(body, 'f-m') || 0, link: L.val(body, 'f-l').trim(),
              note: L.val(body, 'f-n').trim(), question: q,
              solved: q && q === r.question ? !!r.solved : false
            };
            if (editing) col().update(rec.id, data);
            else col().add(Object.assign({ done: false }, data));
            draftTopic = tp;
            const d = D.parse(data.date); if (d) { calY = d.getFullYear(); calM = d.getMonth(); }
            close(); L.toast(editing ? '已更新 ♡' : '已排進 ' + dayLabel(data.date) + ' ♡'); ctx.refresh();
          };
        });
    }
  };
})(window.Lume);
