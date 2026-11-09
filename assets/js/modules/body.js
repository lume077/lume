/* ============================================================
   body.js — 身體狀態日記（位於「日記」與「塔羅」之間）
   ------------------------------------------------------------
   · 專屬症狀快捷標籤：胃部 / 神經與血壓 / 免疫與過敏 / 其他，可多選
   · 每個症狀可選嚴重程度：輕微 / 中度 / 嚴重
   · 「今日身體狀況備忘 / 飲食誘因」自由輸入
   · 身體症狀月曆：有記錄的日期顯示手繪小圖示，點日期可看當天全部紀錄
   ============================================================ */
window.Lume = window.Lume || {}; window.Lume.modules = window.Lume.modules || {};
(function (L) {
  'use strict';
  const { D, U, icon, Store } = L;
  const col = () => Store.col('bodyLogs');

  let curDate = D.today();
  let draft = null;                    // {date, symptoms:[{n,lv}], note}
  let calY = new Date().getFullYear();
  let calM = new Date().getMonth();
  let showAll = false;                 // 是否展開歷史列表

  /* ---------- 症狀 → 專區 對照表 ---------- */
  function groupOf(name) {
    for (const g of L.BODY_GROUPS) if (g.items.indexOf(name) >= 0) return g;
    return L.BODY_GROUPS[L.BODY_GROUPS.length - 1];
  }
  function levelOf(k) { return L.BODY_LEVELS.find(l => l.k === k) || L.BODY_LEVELS[0]; }

  /** 取得某天的紀錄 */
  function recOf(date) { return col().all().find(r => r.date === date) || null; }

  /** 把 draft 初始化成某天的內容（有舊紀錄就帶出來，沒有就空白） */
  function loadDraft(date) {
    const r = recOf(date);
    draft = {
      date: date,
      symptoms: r ? (r.symptoms || []).map(s => ({ n: s.n, lv: s.lv || 'mid' })) : [],
      note: r ? (r.note || '') : ''
    };
  }
  if (!draft) loadDraft(curDate);

  function inDraft(n) { return draft.symptoms.find(s => s.n === n) || null; }

  /* ---------- 統計 ---------- */
  function stats() {
    const all = col().all();
    const mk = D.monthKey(curDate);
    const thisMonth = all.filter(r => (r.date || '').slice(0, 7) === mk);
    const counter = {};
    const gCounter = {};
    all.forEach(r => (r.symptoms || []).forEach(s => {
      counter[s.n] = (counter[s.n] || 0) + 1;
      const g = groupOf(s.n);
      gCounter[g.k] = (gCounter[g.k] || 0) + 1;
    }));
    const top = Object.keys(counter).map(n => ({ n: n, c: counter[n] }))
      .sort((a, b) => b.c - a.c).slice(0, 6);
    const severeCount = all.reduce((n, r) =>
      n + (r.symptoms || []).filter(s => s.lv === 'severe').length, 0);
    return { total: all.length, month: thisMonth.length, top: top, g: gCounter, severe: severeCount };
  }

  /* ---------- 打卡區 HTML ---------- */
  function groupsHTML() {
    return L.BODY_GROUPS.map(g =>
      '<div class="sym-group mb8">' +
      '<div class="sym-title"><span style="width:18px;height:18px;display:inline-block">' + icon(g.icon, 18) + '</span>' +
      '<b>' + g.t + '</b></div>' +
      '<div class="sym-chips">' + g.items.map(n => {
        const on = !!inDraft(n);
        return '<button type="button" class="sym-chip' + (on ? ' on' : '') + '" data-sym="' + U.esc(n) + '"' +
          (on ? ' style="background:' + g.color + '22;border-color:' + g.color + ';color:' + g.color + '"' : '') + '>' +
          (on ? '✓ ' : '') + U.esc(n) + '</button>';
      }).join('') + '</div></div>').join('');
  }

  function selectedHTML() {
    if (!draft.symptoms.length) {
      return '<div class="muted" style="font-size:12.5px">還沒選症狀 ♡ 點上面的標籤就能加入（可以選多個）</div>';
    }
    return draft.symptoms.map(s => {
      const g = groupOf(s.n);
      return '<div class="lv-row">' +
        '<span class="lv-name"><span style="width:15px;height:15px;display:inline-block;vertical-align:-2px">' + icon(g.icon, 15) + '</span> ' +
        U.esc(s.n) + '</span>' +
        '<span class="lv-btns">' + L.BODY_LEVELS.map(l =>
          '<button type="button" class="lv-btn' + (s.lv === l.k ? ' on' : '') + '" data-lv="' + l.k + '" data-for="' + U.esc(s.n) + '"' +
          (s.lv === l.k ? ' style="background:' + l.c + ';border-color:' + l.c + ';color:#fff"' : '') + '>' + l.t + '</button>').join('') +
        '</span></div>';
    }).join('');
  }

  /* ---------- 月曆 ---------- */
  function calHTML() {
    const byDate = {};
    col().all().forEach(r => { if (r.date) byDate[r.date] = r; });
    const first = D.firstDow(calY, calM);
    const total = D.daysInMonth(calY, calM);
    const today = D.today();
    let cells = '<div class="cal-dow">日</div><div class="cal-dow">一</div><div class="cal-dow">二</div>' +
      '<div class="cal-dow">三</div><div class="cal-dow">四</div><div class="cal-dow">五</div><div class="cal-dow">六</div>';
    for (let i = 0; i < first; i++) cells += '<div class="cal-cell out"></div>';
    for (let d = 1; d <= total; d++) {
      const key = calY + '-' + D.pad(calM + 1) + '-' + D.pad(d);
      const r = byDate[key];
      let inner = '<span>' + d + '</span>';
      if (r) {
        /* 有記錄：顯示該天出現過的專區手繪小圖示（最多 3 個）+ 最嚴重的程度小點 */
        const gs = [];
        (r.symptoms || []).forEach(s => { const g = groupOf(s.n); if (gs.indexOf(g.k) < 0) gs.push(g.k); });
        const worst = (r.symptoms || []).reduce((w, s) =>
          L.BODY_LEVELS.findIndex(l => l.k === s.lv) > L.BODY_LEVELS.findIndex(l => l.k === w) ? s.lv : w, 'mild');
        inner += '<div class="cal-icos">' + gs.slice(0, 3).map(k => {
          const g = L.BODY_GROUPS.find(x => x.k === k);
          return '<span class="cal-ico">' + icon(g.icon, 15) + '</span>';
        }).join('') + '</div>' +
          '<i class="cal-dot" style="background:' + levelOf(worst).c + '"></i>';
      }
      cells += '<div class="cal-cell' + (key === today ? ' today' : '') + (key === curDate ? ' sel' : '') +
        (r ? ' has' : '') + '" data-cdate="' + key + '">' + inner + '</div>';
    }
    return '<div class="cal-head">' +
      '<button class="icon-btn" data-cal="prev" style="width:32px;height:32px">' +
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M15 5l-7 7 7 7" stroke="#8E6FC8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<b>' + calY + ' 年 ' + (calM + 1) + ' 月</b>' +
      '<button class="icon-btn" data-cal="next" style="width:32px;height:32px">' +
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M9 5l7 7-7 7" stroke="#8E6FC8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>' +
      '<div class="cal-grid">' + cells + '</div>' +
      '<div class="cal-legend mt8">' + L.BODY_GROUPS.map(g =>
        '<span class="lg"><span style="width:14px;height:14px;display:inline-block">' + icon(g.icon, 14) + '</span>' + g.t + '</span>').join('') +
      '<span class="lg">' + L.BODY_LEVELS.map(l => '<i class="cal-dot" style="background:' + l.c + '"></i>' + l.t).join(' ') + '</span></div>';
  }

  /* ---------- 某天的紀錄卡 ---------- */
  function dayCard(r) {
    return '<div class="card"><div class="spread">' +
      '<div><b style="font-size:14px">' + r.date + ' 星期' + D.weekday(r.date) + '</b>' +
      '<div class="muted">共 ' + (r.symptoms || []).length + ' 個症狀</div></div>' +
      '<div style="display:flex;flex-direction:column;gap:2px;align-items:flex-end">' +
      '<button class="mini-btn" data-bedit="' + U.esc(r.date) + '">✏️ 編輯</button>' +
      '<button class="mini-btn" data-bdel="' + r.id + '">刪除</button></div></div>' +
      '<div class="sym-chips mt8">' + (r.symptoms || []).map(s => {
        const g = groupOf(s.n), lv = levelOf(s.lv);
        return '<span class="chip" style="background:' + lv.bg + ';color:' + lv.c + ';border:1px solid ' + lv.c + '55">' +
          U.esc(s.n) + ' · ' + lv.t + '</span>';
      }).join('') + '</div>' +
      (r.note ? '<p style="white-space:pre-wrap;margin:10px 0 0;font-size:13.5px">' + L.nl2br(r.note) + '</p>' : '') +
      '</div>';
  }

  L.modules.body = {
    id: 'body', name: '健康狀態', icon: 'body',

    render() {
      if (!draft || draft.date !== curDate) loadDraft(curDate);
      const st = stats();
      const exists = !!recOf(curDate);
      const list = col().all().slice().sort((a, b) => a.date < b.date ? 1 : -1);
      const shown = showAll ? list : list.slice(0, 5);

      return '' +
        /* ---------- 今日打卡 ---------- */
        '<div class="card tinted"><h3>' + icon('body') + '今天的身體狀態</h3>' +
        '<div class="grid2">' +
        '<div class="field" style="margin-bottom:0"><label>日期</label>' +
        '<input class="inp" type="date" id="bdate" value="' + U.esc(curDate) + '"></div>' +
        '<div class="field" style="margin-bottom:0"><label>這天的狀態</label>' +
        '<div class="muted" style="font-size:13px;padding-top:6px">' +
        (exists ? '已有紀錄，可以修改 ♡' : '還沒記錄 ♡') + '</div></div></div>' +
        '<div class="deco-line"></div>' +
        '<div class="muted mb8">點選今天有的症狀（可複選）</div>' +
        '<div id="bgroups">' + groupsHTML() + '</div>' +
        '<div class="deco-line"></div>' +
        '<div class="mb8" style="font-size:13px">嚴重程度</div>' +
        '<div id="bsel">' + selectedHTML() + '</div>' +
        '<div class="field mt8"><label>今日身體狀況備忘 / 飲食誘因</label>' +
        '<textarea class="inp" id="bnote" placeholder="例如：午餐吃了麻辣燙後胃脹；血壓 92/58；今天只睡 5 小時…">' + U.esc(draft.note) + '</textarea></div>' +
        '<button class="btn block mt8" id="bsave">' + (exists ? '💾 更新這天的紀錄' : '✨ 儲存今天的狀態') + '</button>' +
        (draft.symptoms.length ? '<button class="btn ghost block mt8" id="bclear">清空勾選</button>' : '') +
        '</div>' +

        /* ---------- 統計 ---------- */
        '<div class="card"><h3>' + icon('sparkle') + '體質小統計</h3>' +
        '<div class="stats">' + L.stat(st.total, ' 天', '累計記錄') + L.stat(st.month, ' 天', '本月記錄') +
        L.stat(st.severe, ' 次', '嚴重症狀') + L.stat((st.top[0] || {}).c || 0, ' 次', (st.top[0] || {}).n || '最常出現') + '</div>' +
        (st.top.length ? '<div class="deco-line"></div><div class="muted mb8">最常出現的症狀</div>' +
          '<div class="sym-chips">' + st.top.map(t =>
            '<span class="chip" style="background:' + groupOf(t.n).color + '22;color:' + groupOf(t.n).color + '">' +
            U.esc(t.n) + ' × ' + t.c + '</span>').join('') + '</div>' : '') +
        '<div class="deco-line"></div><div class="muted mb8">各專區累計次數</div>' +
        L.BODY_GROUPS.map(g => {
          const n = st.g[g.k] || 0;
          const max = Math.max(1, ...L.BODY_GROUPS.map(x => st.g[x.k] || 0));
          return '<div style="margin-bottom:9px"><div class="spread" style="font-size:12.5px">' +
            '<span style="display:flex;align-items:center;gap:6px"><span style="width:16px;height:16px;display:inline-block">' + icon(g.icon, 16) + '</span>' + g.t + '</span>' +
            '<span class="muted">' + n + ' 次</span></div>' +
            '<div class="bar thin mt8"><i style="width:' + Math.round(n / max * 100) + '%;background:linear-gradient(90deg,' + g.color + '99,' + g.color + ')"></i></div></div>';
        }).join('') + '</div>' +

        /* ---------- 月曆 ---------- */
        '<div class="card"><h3>' + icon('calendar') + '身體症狀月曆</h3>' +
        '<div class="muted mb8" style="font-size:12.5px">有記錄的日期會出現小圖示，點一下就能看那天的完整紀錄 ♡</div>' +
        '<div id="bcal">' + calHTML() + '</div>' +
        '<div class="muted mt8" id="bdaybox"></div></div>' +

        /* ---------- 歷史列表 ---------- */
        '<div class="sec-title"><h2>📋 身體紀錄回顧</h2>' +
        (list.length > 5 ? '<button class="btn ghost sm" id="bmore">' + (showAll ? '收起 ▲' : '顯示全部 ▼') + '</button>' : '') + '</div>' +
        (shown.length ? shown.map(dayCard).join('') : '<div class="card">' + L.empty('還沒有身體紀錄，先記錄今天吧 ♡', 'body') + '</div>');
    },

    mount(root, ctx) {
      /* 日期切換 */
      const di = root.querySelector('#bdate');
      if (di) di.onchange = () => {
        curDate = di.value || D.today();
        loadDraft(curDate);
        ctx.refresh();
      };

      /* 症狀標籤：事件委派，點一次加入、再點一次移除 */
      const gb = root.querySelector('#bgroups');
      if (gb) gb.addEventListener('click', e => {
        const b = e.target.closest ? e.target.closest('[data-sym]') : null;
        if (!b) return;
        const n = b.dataset.sym;
        const hit = inDraft(n);
        if (hit) draft.symptoms = draft.symptoms.filter(s => s.n !== n);
        else draft.symptoms.push({ n: n, lv: 'mid' });
        gb.innerHTML = groupsHTML();
        root.querySelector('#bsel').innerHTML = selectedHTML();
        const clr = root.querySelector('#bclear');
        if (clr) clr.style.display = draft.symptoms.length ? '' : 'none';
      });

      /* 嚴重程度：事件委派 */
      const sb = root.querySelector('#bsel');
      if (sb) sb.addEventListener('click', e => {
        const b = e.target.closest ? e.target.closest('[data-lv]') : null;
        if (!b) return;
        const s = inDraft(b.dataset.for);
        if (s) { s.lv = b.dataset.lv; sb.innerHTML = selectedHTML(); }
      });

      /* 清空勾選 */
      const clr = root.querySelector('#bclear');
      if (clr) clr.onclick = () => {
        draft.symptoms = [];
        gb.innerHTML = groupsHTML();
        sb.innerHTML = selectedHTML();
        clr.style.display = 'none';
      };

      /* 儲存 */
      const sv = root.querySelector('#bsave');
      if (sv) sv.onclick = async () => {
        try {
          if (!draft.symptoms.length && !(draft.note || '').trim()) {
            return L.toast('先勾選症狀或寫點備忘 ♡');
          }
          const note = String((root.querySelector('#bnote') || {}).value || '').trim();
          const data = { date: curDate, symptoms: draft.symptoms.slice(), note: note };
          const r = recOf(curDate);
          if (r) col().update(r.id, data); else col().add(data);
          try { Store.flush(); } catch (_) { }
          try { Store.touch(); } catch (_) { }
          L.toast(recOf(curDate) ? '已更新 ♡ 好好照顧自己' : '已記錄下來 ♡ 好好照顧自己');
          loadDraft(curDate);
          ctx.refresh();
        } catch (err) {
          console.error('[body] 儲存失敗', err);
          L.toast('儲存時出了點小狀況，請再按一次 ♡');
        }
      };

      /* 月曆：上下月 */
      const cb = root.querySelector('#bcal');
      if (cb) {
        cb.addEventListener('click', e => {
          const nav = e.target.closest ? e.target.closest('[data-cal]') : null;
          if (nav) {
            if (nav.dataset.cal === 'prev') { calM--; if (calM < 0) { calM = 11; calY--; } }
            else { calM++; if (calM > 11) { calM = 0; calY++; } }
            cb.innerHTML = calHTML();
            return;
          }
          const cell = e.target.closest ? e.target.closest('[data-cdate]') : null;
          if (cell) this.dayModal(ctx, cell.dataset.cdate);
        });
      }

      /* 歷史：編輯 / 刪除 */
      root.querySelectorAll('[data-bedit]').forEach(b => b.onclick = () => {
        curDate = b.dataset.bedit;
        loadDraft(curDate);
        ctx.refresh();
      });
      root.querySelectorAll('[data-bdel]').forEach(b => b.onclick = async () => {
        if (await L.confirm('刪除身體紀錄', '確定刪掉這天的紀錄嗎？')) { col().remove(b.dataset.bdel); ctx.refresh(); }
      });
      const more = root.querySelector('#bmore');
      if (more) more.onclick = () => { showAll = !showAll; ctx.refresh(); };
    },

    /** 點月曆日期 → 看這天的完整紀錄 */
    dayModal(ctx, date) {
      const r = recOf(date);
      const html = r
        ? '<div class="spread mb8"><b>' + date + ' 星期' + D.weekday(date) + '</b>' +
        '<span class="muted">' + (r.symptoms || []).length + ' 個症狀</span></div>' +
        '<div class="sym-chips">' + (r.symptoms || []).map(s => {
          const g = groupOf(s.n), lv = levelOf(s.lv);
          return '<span class="chip" style="background:' + lv.bg + ';color:' + lv.c + ';border:1px solid ' + lv.c + '55">' +
            '<span style="width:13px;height:13px;display:inline-block;vertical-align:-2px">' + icon(g.icon, 13) + '</span> ' +
            U.esc(s.n) + ' · ' + lv.t + '</span>';
        }).join('') + '</div>' +
        (r.note ? '<div class="card soft mt8" style="padding:12px"><div class="muted mb8" style="font-size:12px">備忘 / 飲食誘因</div>' +
          '<div style="white-space:pre-wrap;font-size:13.5px">' + L.nl2br(r.note) + '</div></div>' : '') +
        '<div class="row mt14"><button class="btn" id="bgoedit" style="flex:1">✏️ 編輯這天</button>' +
        '<button class="btn ghost" id="bgodel" style="flex:1;color:var(--danger);border-color:#F0C9CE">刪除</button></div>' +
        '<button class="btn-cancel mt8" id="cancel">關閉</button>'
        : '<div class="muted">' + date + ' 這天還沒有紀錄 ♡</div>' +
        '<button class="btn block mt14" id="bgoedit">✏️ 記錄這一天</button>' +
        '<button class="btn-cancel mt8" id="cancel">關閉</button>';

      L.modal('這天的身體紀錄', html, (body, close) => {
        L.bindCancel(body, close);
        const ed = body.querySelector('#bgoedit');
        if (ed) ed.onclick = () => { close(); curDate = date; loadDraft(date); ctx.refresh(); };
        const dl = body.querySelector('#bgodel');
        if (dl) dl.onclick = async () => {
          if (await L.confirm('刪除身體紀錄', '確定刪掉這天的紀錄嗎？')) { col().remove(r.id); close(); ctx.refresh(); }
        };
      });
    }
  };
})(window.Lume);
