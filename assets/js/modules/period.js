/* ============================================================
   period.js — 生理期記錄：週期概覽 / 階段分析 / 症狀 / 統計
   ============================================================ */
window.Lume = window.Lume || {}; window.Lume.modules = window.Lume.modules || window.Lume.modules;
(function (L) {
  'use strict';
  const { D, U, icon, Store } = L;
  const P = () => Store.doc('period').get();
  const cCol = () => {
    const p = P();
    return {
      all: () => p.cycles,
      add: (o) => { p.cycles.push(Object.assign({ id: U.uid() }, o)); Store.doc('period').set({}); },
      remove: (id) => { p.cycles = p.cycles.filter(c => c.id !== id); Store.doc('period').set({}); }
    };
  };
  const symMap = () => Store.map('period_symptoms');

  function sorted() { return P().cycles.slice().sort((a, b) => a.start < b.start ? -1 : 1); }
  function current() {
    const arr = sorted();
    if (!arr.length) return null;
    return arr[arr.length - 1];
  }
  function phaseOf(day) {
    if (day <= 5) return L.PHASES[0];
    if (day <= 12) return L.PHASES[1];
    if (day <= 15) return L.PHASES[2];
    return L.PHASES[3];
  }
  function stats() {
    const arr = sorted();
    if (arr.length < 2) {
      const c = arr[0];
      return {
        count: arr.length, avgCycle: P().settings.cycleLen, avgPeriod: c && c.end ? D.diffDays(c.end, c.start) + 1 : P().settings.periodLen,
        min: null, max: null
      };
    }
    const gaps = [];
    for (let i = 1; i < arr.length; i++) gaps.push(D.diffDays(arr[i].start, arr[i - 1].start));
    const lens = arr.filter(c => c.end).map(c => D.diffDays(c.end, c.start) + 1);
    const avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0;
    return {
      count: arr.length, avgCycle: avg(gaps), avgPeriod: avg(lens) || P().settings.periodLen,
      min: Math.min(...gaps), max: Math.max(...gaps)
    };
  }

  L.modules.period = {
    id: 'period', name: '生理期', icon: 'heart',
    render() {
      const c = current();
      const t = D.today();
      const st = stats();
      const p = P();
      let day = null, phase = null, next = null, pct = 0;
      if (c) {
        day = D.diffDays(t, c.start) + 1;
        if (day > 0) {
          phase = day <= (c.end ? D.diffDays(c.end, c.start) + 1 : p.settings.periodLen) ? L.PHASES[0] : phaseOf(day);
          pct = Math.round(((day - 1) % st.avgCycle) / st.avgCycle * 100);
          next = D.addDays(c.start, st.avgCycle);
          let guard = 0;
          while (D.diffDays(next, t) < 0 && guard++ < 24) next = D.addDays(next, st.avgCycle);
        }
      }
      const syms = symMap().get(t, []) || [];

      return '' +
        '<div class="card tinted"><h3>' + icon('heart') + '週期概覽</h3>' +
        (c ? '<div class="ring-wrap"><div>' + L.ring(pct, (day > 0 ? '第 ' + day : '第 ' + day) + '<i> 天</i>', phase ? phase.t : '週期尚未開始') + '</div>' +
          '<div style="flex:1;min-width:150px">' +
          '<div class="kv"><span>本次開始</span><b>' + c.start + '</b></div>' +
          '<div class="kv"><span>週期天數</span><b>' + st.avgCycle + ' 天</b></div>' +
          '<div class="kv"><span>經期天數</span><b>' + st.avgPeriod + ' 天</b></div>' +
          '<div class="kv"><span>預計下次</span><b style="color:var(--lav-700)">' + (next || '—') + '</b></div>' +
          (next ? '<div class="kv"><span>還有</span><b>' + Math.max(0, D.diffDays(next, t)) + ' 天</b></div>' : '') +
          '<button class="btn block mt8" id="record">' + (day > 0 && day <= st.avgPeriod ? '記錄今天（經期第 ' + day + ' 天）' : '記錄今天：新增一次週期') + '</button>' +
          '</div></div>'
          : '<div class="center" style="padding:10px">' + L.empty('還沒有週期記錄，按下「記錄今天」開始 ♡', 'heart') +
          '<button class="btn block mt8" id="record">記錄今天</button></div>') + '</div>' +

        (phase ? '<div class="card"><h3>' + icon('flower') + '週期階段 · ' + phase.t + '</h3>' +
          '<div class="row mb8">' + L.PHASES.map(ph => '<span class="chip' + (ph.k === phase.k ? ' on' : '') + '" style="' +
            (ph.k === phase.k ? 'background:' + ph.color + ';color:#4B4159;font-weight:700' : '') + '">' + ph.t + ' · ' + ph.range + '</span>').join('') + '</div>' +
          '<div class="ai-box" style="margin-top:0"><div class="who">' + icon('sparkle', 18) + '今日小貼士</div><p>' + phase.tip + '</p></div></div>' : '') +

        '<div class="sec-title"><h2>🌸 今日症狀</h2><span class="muted">' + D.pretty(t) + '</span></div>' +
        '<div class="card"><div class="row">' + L.SYMPTOMS.map(s =>
          '<button class="tab' + (syms.includes(s) ? ' on' : '') + '" data-sym="' + s + '">' + s + '</button>').join('') + '</div>' +
          '<div class="muted mt8">點一下即可記錄 / 取消，每天可複選 ♡</div></div>' +

        '<div class="sec-title"><h2>📊 週期統計</h2></div>' +
        '<div class="card"><div class="stats">' +
        L.stat(st.avgCycle, ' 天', '平均週期') + L.stat(st.avgPeriod, ' 天', '平均經期') +
        L.stat(st.count, ' 次', '累計記錄') + L.stat(st.min == null ? '—' : st.min, st.min == null ? '' : ' 天', '最短週期') +
        L.stat(st.max == null ? '—' : st.max, st.max == null ? '' : ' 天', '最長週期') + '</div>' +
        '<div class="row mt14"><button class="btn ghost sm" data-set>設定預設天數</button>' +
        (P().cycles.length ? '<button class="btn ghost sm" data-end>結束本次經期</button>' : '') + '</div></div>' +

        (P().cycles.length ? '<div class="sec-title"><h2>🗓 歷史記錄</h2></div>' +
          '<div class="card"><div class="flexlist">' + sorted().slice().reverse().slice(0, 8).map(c2 =>
            '<div class="item" style="padding:8px 12px"><div class="body"><div class="t">' + c2.start +
            (c2.end ? ' → ' + c2.end : ' → 進行中') + '</div>' +
            '<div class="m">' + (c2.end ? '<span>' + (D.diffDays(c2.end, c2.start) + 1) + ' 天</span>' : '') +
            (c2.note ? '<span>' + U.esc(c2.note) + '</span>' : '') + '</div></div>' +
            '<div style="display:flex;flex-direction:column;gap:2px;align-items:flex-end">' +
            L.editBtn(c2.id, 'cedit') +
            '<button class="mini-btn" data-del="' + c2.id + '">刪除</button></div></div>').join('') + '</div></div>' : '');
    },
    mount(root, ctx) {
      const t = D.today();
      root.querySelectorAll('[data-sym]').forEach(b => b.onclick = () => {
        const arr = symMap().get(t, []) || [];
        const s = b.dataset.sym;
        const i = arr.indexOf(s);
        if (i >= 0) arr.splice(i, 1); else arr.push(s);
        symMap().set(t, arr); ctx.refresh();
      });
      const rec = root.querySelector('#record');
      if (rec) rec.onclick = () => {
        const c = current();
        const day = c ? D.diffDays(t, c.start) + 1 : 0;
        const st = stats();
        if (c && day > 0 && day <= st.avgPeriod) {
          // 經期中：更新結束日
          c.end = t; Store.doc('period').set({});
          L.toast('已記錄經期第 ' + day + ' 天 ♡'); ctx.refresh();
        } else {
          this.cycleForm(ctx, null);
        }
      };
      root.querySelectorAll('[data-cedit]').forEach(b => b.onclick = () => {
        this.cycleForm(ctx, P().cycles.find(c => c.id === b.dataset.cedit));
      });
      root.querySelector('[data-set]').onclick = () => {
        const s = P().settings;
        L.modal('預設天數', '<div class="grid2">' +
          '<div class="field"><label>週期天數</label><input class="inp" type="number" id="c" value="' + s.cycleLen + '"></div>' +
          '<div class="field"><label>經期天數</label><input class="inp" type="number" id="p" value="' + s.periodLen + '"></div></div>' +
          '<button class="btn block" id="ok">儲存 ♡</button>', (body, close) => {
            body.querySelector('#ok').onclick = () => {
              Store.doc('period').set({ settings: { cycleLen: U.num(body.querySelector('#c').value, 28), periodLen: U.num(body.querySelector('#p').value, 5) } });
              close(); ctx.refresh();
            };
          });
      };
      const endBtn = root.querySelector('[data-end]');
      if (endBtn) endBtn.onclick = () => {
        const c = current();
        if (c) { c.end = c.end || t; Store.doc('period').set({}); L.toast('已結束本次經期 ♡'); ctx.refresh(); }
      };
      root.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
        if (await L.confirm('刪除記錄', '確定刪掉這筆週期記錄嗎？')) {
          const p = P(); p.cycles = p.cycles.filter(c => c.id !== b.dataset.del); Store.doc('period').set({}); ctx.refresh();
        }
      });
    },

    /* ---------- 週期記錄：新增 / 編輯 ---------- */
    cycleForm(ctx, rec) {
      const c = rec || {};
      L.modal(rec ? '編輯這筆週期記錄' : '新增一次週期',
        '<div class="grid2">' +
        '<div class="field"><label>開始日期 <span class="req">*</span></label><input class="inp" type="date" id="f-s" value="' + (c.start || D.today()) + '"></div>' +
        '<div class="field"><label>結束日期（可不填，之後再補）</label><input class="inp" type="date" id="f-e" value="' + (c.end || '') + '"></div></div>' +
        '<div class="field"><label>備註（可不填）</label><input class="inp" id="f-n" value="' + U.esc(c.note || '') + '" placeholder="經量、身體狀況…"></div>' +
        L.formFooter({ isEdit: !!rec }),
        (body, close) => {
          L.bindCancel(body, close);
          body.querySelector('#ok').onclick = () => {
            const s = L.val(body, 'f-s');
            if (!s) return L.toast('請填寫開始日期 ♡');
            const data = { start: s, end: L.val(body, 'f-e'), note: L.val(body, 'f-n').trim() };
            const p = P();
            if (rec) {
              const i = p.cycles.findIndex(z => z.id === rec.id);
              if (i >= 0) p.cycles[i] = Object.assign({}, p.cycles[i], data);
            } else {
              p.cycles.push(Object.assign({ id: U.uid() }, data));
            }
            Store.doc('period').set({});
            close(); L.toast(rec ? '已更新 ♡' : '已新增週期記錄 ♡'); ctx.refresh();
          };
        });
    }
  };
})(window.Lume);
