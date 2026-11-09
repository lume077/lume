/* ============================================================
   todo.js — 待辦計畫：突發與未來規劃（獨立待辦行事曆）
   ============================================================ */
window.Lume = window.Lume || {}; window.Lume.modules = window.Lume.modules || {};
(function (L) {
  'use strict';
  const { D, U, icon, Store } = L;
  const col = () => Store.col('futureTodos');
  const PRI = { high: '高', mid: '中', low: '低' };
  const order = { high: 0, mid: 1, low: 2 };
  let cal = null;

  /** 快速輸入解析：「12 買禮物」「12/5 繳費」「明天 寄包裹」 */
  function parseQuick(s) {
    const t = D.today(), now = new Date();
    s = s.trim();
    let m = s.match(/^(\d{1,2})\s*[\/\-.]\s*(\d{1,2})[\s、,，]+(.*)$/);
    if (m) {
      const y = now.getFullYear();
      let mo = +m[1] - 1, dd = +m[2];
      let key = y + '-' + D.pad(mo + 1) + '-' + D.pad(dd);
      if (D.diffDays(key, t) < 0) key = (y + 1) + '-' + D.pad(mo + 1) + '-' + D.pad(dd);
      return { date: key, text: m[3] };
    }
    m = s.match(/^(\d{1,2})\s*[日號]?[\s、,，]+(.*)$/);
    if (m) {
      let y = now.getFullYear(), mo = now.getMonth();
      let dd = +m[1];
      let key = y + '-' + D.pad(mo + 1) + '-' + D.pad(dd);
      if (D.diffDays(key, t) < 0) {
        mo += 1; if (mo > 11) { mo = 0; y++; }
        key = y + '-' + D.pad(mo + 1) + '-' + D.pad(dd);
      }
      return { date: key, text: m[2] };
    }
    if (/^明天/.test(s)) return { date: D.addDays(t, 1), text: s.replace(/^明天[\s、,，]*/, '') };
    if (/^今天/.test(s)) return { date: t, text: s.replace(/^今天[\s、,，]*/, '') };
    if (/^後天/.test(s)) return { date: D.addDays(t, 2), text: s.replace(/^後天[\s、,，]*/, '') };
    return null;
  }

  function marks() {
    const m = {};
    col().all().forEach(x => { (m[x.date] = m[x.date] || []).push(x.done ? 'mint' : 'pink'); });
    return m;
  }

  function listHTML() {
    const t = D.today();
    const all = col().all().slice().sort((a, b) =>
      (a.done - b.done) || (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) || (order[a.pri] - order[b.pri]));
    const week = all.filter(x => !x.done && D.diffDays(x.date, t) >= 0 && D.diffDays(x.date, t) < 7);
    const future = all.filter(x => !x.done && D.diffDays(x.date, t) >= 7);
    const overdue = all.filter(x => !x.done && D.diffDays(x.date, t) < 0);
    const doneList = all.filter(x => x.done).sort((a, b) => ((b.doneAt || b.date || '') > (a.doneAt || a.date || '') ? 1 : -1)).slice(0, 10);

    const one = (x) => '<div class="item' + (x.done ? ' done' : '') + '">' +
      '<div class="tick' + (x.done ? ' on' : '') + '" data-tog="' + x.id + '">' + icon('check') + '</div>' +
      '<div class="body"><div class="t">' + U.esc(x.text) + '</div>' +
      '<div class="m"><span class="tag ' + x.pri + '">' + PRI[x.pri] + '</span>' +
      '<span>' + x.date + ' 星期' + D.weekday(x.date) + '</span>' +
      (x.note ? '<span>' + U.esc(x.note) + '</span>' : '') +
      (D.diffDays(x.date, t) < 0 && !x.done ? '<span style="color:var(--danger)">已逾期</span>' :
        '<span>' + (D.diffDays(x.date, t) === 0 ? '就是今天' : '還有 ' + D.diffDays(x.date, t) + ' 天') + '</span>') +
      '</div></div><div style="display:flex;flex-direction:column;gap:2px;align-items:flex-end">' +
      L.editBtn(x.id) +
      '<button class="mini-btn" data-del="' + x.id + '">刪除</button></div></div>';

    const sec = (title, arr, emptyTxt) =>
      '<div class="sec-title"><h2>' + title + '</h2><span class="muted">' + arr.length + ' 項</span></div>' +
      (arr.length ? '<div class="flexlist">' + arr.map(one).join('') + '</div>' : '<div class="card">' + L.empty(emptyTxt, 'star') + '</div>');

    return sec('🔥 本週待辦', week, '本週很清爽 ♡') +
      sec('🌙 未來規劃', future, '還沒有未來的安排') +
      (overdue.length ? sec('⏳ 已逾期', overdue, '') : '') +
      (doneList.length ? sec('✅ 已完成', doneList, '') : '');
  }

  L.modules.todo = {
    id: 'todo', name: '待辦計畫', icon: 'calendar',
    render() {
      if (!cal) { const n = new Date(); cal = { y: n.getFullYear(), m: n.getMonth(), sel: D.today() }; }
      return '' +
        '<div class="card tinted"><h3>' + icon('pen') + '快速輸入「幾號要做什麼」</h3>' +
        '<div class="row"><input class="inp" id="q" placeholder="例如：12 買禮物 / 3/8 繳費 / 明天 寄包裹" style="flex:1;min-width:180px">' +
        '<button class="btn" id="q-add">加入</button></div>' +
        '<div class="muted mt8">輸入「日期 + 空格 + 事項」就會自動排進待辦行事曆 ♡</div></div>' +

        '<div class="sec-title"><h2>🗓 待辦行事曆</h2><button class="btn sm" data-add>＋ 手動新增</button></div>' +
        '<div class="card"><div id="tcal">' + L.calendarHTML({ year: cal.y, month: cal.m, marks: marks(), selected: cal.sel }) + '</div>' +
        '<div class="deco-line"></div>' +
        '<div class="muted mb8">' + D.pretty(cal.sel) + ' 的待辦：</div>' +
        '<div id="daylist">' + (col().where(x => x.date === cal.sel).length
          ? '<div class="flexlist">' + col().where(x => x.date === cal.sel).map(x =>
            '<div class="item' + (x.done ? ' done' : '') + '"><div class="tick' + (x.done ? ' on' : '') + '" data-tog="' + x.id + '">' + icon('check') + '</div>' +
            '<div class="body"><div class="t">' + U.esc(x.text) + '</div><div class="m"><span class="tag ' + x.pri + '">' + PRI[x.pri] + '</span>' +
            (x.note ? '<span>' + U.esc(x.note) + '</span>' : '') + '</div></div>' +
            '<div style="display:flex;flex-direction:column;gap:2px;align-items:flex-end">' +
            L.editBtn(x.id) +
            '<button class="mini-btn" data-del="' + x.id + '">刪除</button></div></div>').join('') + '</div>'
          : '<div class="muted center" style="padding:8px">這天還沒有待辦 ♡</div>') + '</div></div>' +

        '<div id="flist">' + listHTML() + '</div>';
    },
    mount(root, ctx) {
      const add = (text, date, pri) => {
        col().add({ text, date: date || D.today(), pri: pri || 'mid', done: false });
        ctx.refresh();
      };
      root.querySelector('#q-add').onclick = () => {
        const v = root.querySelector('#q').value.trim();
        if (!v) return L.toast('寫點什麼吧 ♡');
        const p = parseQuick(v);
        if (!p) return L.toast('試試「12 買禮物」這樣的格式 ♡');
        add(p.text, p.date); L.toast('已排在 ' + p.date + ' ♡');
      };
      root.querySelector('#q').onkeydown = e => { if (e.key === 'Enter') root.querySelector('#q-add').click(); };

      root.querySelector('[data-add]').onclick = () => this.form(ctx, null);

      const rebind = () => {
        root.querySelectorAll('[data-tog]').forEach(b => b.onclick = () => {
          const it = col().find(b.dataset.tog);
          col().update(it.id, { done: !it.done, doneAt: !it.done ? new Date().toISOString() : null });
          ctx.refresh();
        });
        root.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { col().remove(b.dataset.del); ctx.refresh(); });
        root.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => this.form(ctx, col().find(b.dataset.edit)));
      };

      root.querySelectorAll('[data-cal]').forEach(b => b.onclick = () => {
        cal.m += b.dataset.cal === 'next' ? 1 : -1;
        if (cal.m > 11) { cal.m = 0; cal.y++; }
        if (cal.m < 0) { cal.m = 11; cal.y--; }
        ctx.refresh();
      });
      root.querySelectorAll('.cal-cell[data-date]').forEach(c => c.onclick = () => { cal.sel = c.dataset.date; ctx.refresh(); });
      rebind();
    },

    /* ---------- 新增 / 編輯待辦表單 ---------- */
    form(ctx, rec) {
      const x = rec || {};
      L.modal(rec ? '編輯待辦' : '新增待辦',
        '<div class="field"><label>要做什麼 <span class="req">*</span></label>' +
        '<input class="inp" id="f-t" value="' + U.esc(x.text || '') + '" placeholder="例如：預約看牙醫"></div>' +
        '<div class="grid2"><div class="field"><label>日期</label>' +
        '<input class="inp" type="date" id="f-d" value="' + (x.date || (cal ? cal.sel : D.today())) + '"></div>' +
        '<div class="field"><label>輕重緩急</label><select class="inp" id="f-p">' +
        ['high', 'mid', 'low'].map(p => '<option value="' + p + '"' + ((x.pri || 'mid') === p ? ' selected' : '') + '>' + PRI[p] + '</option>').join('') +
        '</select></div></div>' +
        '<div class="field"><label>備註（可不填）</label><textarea class="inp" id="f-n" placeholder="補充說明…">' + U.esc(x.note || '') + '</textarea></div>' +
        L.formFooter({ isEdit: !!rec }),
        (body, close) => {
          L.bindCancel(body, close);
          body.querySelector('#ok').onclick = () => {
            const t = L.val(body, 'f-t').trim();
            if (!t) return L.toast('請填寫內容 ♡');
            const data = {
              text: t, date: L.val(body, 'f-d') || D.today(),
              pri: L.val(body, 'f-p'), note: L.val(body, 'f-n').trim()
            };
            if (rec) col().update(rec.id, data);
            else col().add(Object.assign({ done: false }, data));
            close(); L.toast(rec ? '已更新 ♡' : '已加入待辦 ♡'); ctx.refresh();
          };
        });
    }
  };
})(window.Lume);
