/* ============================================================
   today.js — 今日計畫：每日 Task、輕重緩急、進度條
   ============================================================ */
window.Lume = window.Lume || {}; window.Lume.modules = window.Lume.modules || {};
(function (L) {
  'use strict';
  const { D, U, icon, Store } = L;
  const col = () => Store.col('todos');
  const PRI = { high: '高', mid: '中', low: '低' };
  const order = { high: 0, mid: 1, low: 2 };

  function todayList() {
    const t = D.today();
    return col().where(x => x.date === t)
      .sort((a, b) => (a.done - b.done) || (order[a.pri] - order[b.pri]) || (a.createdAt < b.createdAt ? 1 : -1));
  }

  /** ★ 昨日（與更早）未完成的事項：日期早於今天、且還沒打勾 → 自動向下累計 */
  function overdueList() {
    const t = D.today();
    return col().all().filter(x => x && !x.done && x.date && x.date < t)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) ||
        (order[a.pri] - order[b.pri]) ||
        (a.createdAt < b.createdAt ? 1 : -1));
  }

  function overdueHTML(x) {
    const late = D.diffDays(D.today(), x.date);
    return '<div class="od-item">' +
      '<div class="ob"><div class="t">' + U.esc(x.text) + '</div>' +
      '<div class="m"><span class="tag ' + x.pri + '">' + PRI[x.pri] + '</span>' +
      '<span>' + D.pretty(x.date) + '</span>' +
      '<span class="od-late">' + (late <= 1 ? '昨天' : '已延 ' + late + ' 天') + '</span>' +
      (x.note ? '<span>' + U.esc(x.note) + '</span>' : '') +
      '</div></div>' +
      '<div class="ac">' +
      '<button class="mini-btn" data-odfin="' + x.id + '">✓ 完成</button>' +
      '<button class="mini-btn" data-odmv="' + x.id + '">移到今天</button>' +
      '<button class="mini-btn" data-tmr="' + x.id + '">明天</button>' +
      '</div></div>';
  }

  function itemHTML(x) {
    return '<div class="item' + (x.done ? ' done' : '') + '">' +
      '<div class="tick' + (x.done ? ' on' : '') + '" data-tog="' + x.id + '">' + icon('check') + '</div>' +
      '<div class="body"><div class="t">' + U.esc(x.text) + '</div>' +
      '<div class="m"><span class="tag ' + x.pri + '">' + PRI[x.pri] + '</span>' +
      (x.date !== D.today() ? '<span>' + x.date + '</span>' : '') +
      (x.note ? '<span>' + U.esc(x.note) + '</span>' : '') +
      (x.doneAt ? '<span>完成於 ' + x.doneAt.slice(11, 16) + '</span>' : '') + '</div></div>' +
      '<div style="display:flex;flex-direction:column;gap:2px;align-items:flex-end">' +
      L.editBtn(x.id) +
      '<button class="mini-btn" data-tmr="' + x.id + '">明天</button>' +
      '<button class="mini-btn" data-del="' + x.id + '">刪除</button></div></div>';
  }

  /** 📅 昨日未完成追蹤 / 補做區 */
  function overdueSection() {
    const od = overdueList();
    if (!od.length) {
      return '<div class="sec-title"><h2>📅 昨日未完成追蹤</h2><span class="muted">0 件</span></div>' +
        '<div class="card od-card">' + L.empty('昨天的事都完成了，你好棒 ♡', 'flower') + '</div>';
    }
    const yCount = od.filter(x => x.date === D.addDays(D.today(), -1)).length;
    return '<div class="sec-title"><h2>📅 昨日未完成追蹤 / 補做區</h2>' +
      '<span class="muted">' + od.length + ' 件' + (yCount ? '（昨天 ' + yCount + '）' : '') + '</span></div>' +
      '<div class="card od-card">' +
      '<div class="row mb8" style="flex-wrap:wrap;gap:6px">' +
      '<button class="btn sm" data-odall>全部移到今天</button>' +
      '<button class="btn ghost sm" data-odallfin>全部標記完成</button>' +
      '</div>' +
      od.map(overdueHTML).join('') +
      '<div class="muted mt8" style="font-size:12px">沒做完的事不會消失，慢慢補上就好 ♡</div>' +
      '</div>';
  }

  L.modules.today = {
    id: 'today', name: '今日計畫', icon: 'list',
    render() {
      const list = todayList();
      const done = list.filter(x => x.done).length;
      const pct = list.length ? Math.round(done / list.length * 100) : 0;
      return '' +
        '<div class="card tinted"><div class="spread"><h3 style="margin:0">' + icon('sparkle') + '今天的完成度</h3>' +
        '<b style="color:var(--lav-700)">' + done + ' / ' + list.length + '</b></div>' +
        '<div class="bar mt8"><i style="width:' + pct + '%"></i></div>' +
        '<div class="muted mt8">' + (pct === 100 && list.length ? '全部完成了，你今天好棒 ♡' : '慢慢來，一件一件就好 ♡') + '</div></div>' +

        '<div class="card"><h3>' + icon('pen') + '新增今日任務</h3>' +
        '<div class="row"><input class="inp" id="q-text" placeholder="今天想完成什麼呢…" style="flex:1;min-width:150px">' +
        '<select class="inp" id="q-pri" style="width:96px;flex:0 0 96px"><option value="high">高</option><option value="mid" selected>中</option><option value="low">低</option></select>' +
        '<button class="btn" id="q-add">加入</button></div></div>' +

        '<div class="sec-title"><h2>📋 今日清單</h2><span class="muted">' + D.pretty(D.today()) + ' · 星期' + D.weekday(D.today()) + '</span></div>' +
        '<div class="card"><div id="list">' +
        (list.length ? list.map(itemHTML).join('') : L.empty('今天還沒有安排，寫下第一件事吧 ♡', 'flower')) +
        '</div></div>' +

        overdueSection();
    },
    mount(root, ctx) {
      const add = () => {
        const el = root.querySelector('#q-text');
        const text = el.value.trim();
        if (!text) return L.toast('先寫點什麼吧 ♡');
        col().add({ text, pri: root.querySelector('#q-pri').value, date: D.today(), done: false });
        el.value = ''; ctx.refresh();
      };
      root.querySelector('#q-add').onclick = add;
      root.querySelector('#q-text').onkeydown = e => { if (e.key === 'Enter') add(); };

      root.querySelectorAll('[data-tog]').forEach(b => b.onclick = () => {
        const it = col().find(b.dataset.tog);
        col().update(it.id, { done: !it.done, doneAt: !it.done ? new Date().toISOString() : null });
        ctx.refresh();
      });
      root.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { col().remove(b.dataset.del); ctx.refresh(); });
      root.querySelectorAll('[data-tmr]').forEach(b => b.onclick = () => {
        col().update(b.dataset.tmr, { date: D.addDays(D.today(), 1) });
        L.toast('已移到明天 ♡'); ctx.refresh();
      });
      root.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => this.form(ctx, col().find(b.dataset.edit)));

      /* ---------- 📅 昨日未完成追蹤 ---------- */
      const now = () => new Date().toISOString();
      root.querySelectorAll('[data-odfin]').forEach(b => b.onclick = () => {
        const it = col().find(b.dataset.odfin); if (!it) return;
        col().update(it.id, { done: true, doneAt: now() });
        L.toast('補起來了，好棒 ♡'); ctx.refresh();
      });
      root.querySelectorAll('[data-odmv]').forEach(b => b.onclick = () => {
        const it = col().find(b.dataset.odmv); if (!it) return;
        col().update(it.id, { date: D.today() });
        L.toast('已移到今天繼續做 ♡'); ctx.refresh();
      });
      const allBtn = root.querySelector('[data-odall]');
      if (allBtn) allBtn.onclick = () => {
        overdueList().forEach(x => col().update(x.id, { date: D.today() }));
        L.toast('全部移到今天了 ♡'); ctx.refresh();
      };
      const allFin = root.querySelector('[data-odallfin]');
      if (allFin) allFin.onclick = () => {
        overdueList().forEach(x => col().update(x.id, { done: true, doneAt: now() }));
        L.toast('全部補起來了，好棒 ♡'); ctx.refresh();
      };
    },

    /* ---------- 新增 / 編輯任務表單 ---------- */
    form(ctx, rec) {
      const x = rec || {};
      L.modal(rec ? '編輯任務' : '新增任務',
        '<div class="field"><label>要做什麼 <span class="req">*</span></label>' +
        '<input class="inp" id="f-t" value="' + U.esc(x.text || '') + '" placeholder="例如：整理本週待辦"></div>' +
        '<div class="grid2">' +
        '<div class="field"><label>日期</label><input class="inp" type="date" id="f-d" value="' + (x.date || D.today()) + '"></div>' +
        '<div class="field"><label>輕重緩急</label><select class="inp" id="f-p">' +
        ['high', 'mid', 'low'].map(p => '<option value="' + p + '"' + ((x.pri || 'mid') === p ? ' selected' : '') + '>' + PRI[p] + '</option>').join('') +
        '</select></div></div>' +
        '<div class="field"><label>備註（可不填）</label><textarea class="inp" id="f-n" placeholder="補充說明…">' + U.esc(x.note || '') + '</textarea></div>' +
        L.formFooter({ isEdit: !!rec }),
        (body, close) => {
          L.bindCancel(body, close);
          body.querySelector('#ok').onclick = () => {
            const t = L.val(body, 'f-t').trim();
            if (!t) return L.toast('請填寫要做什麼 ♡');
            const data = {
              text: t, date: L.val(body, 'f-d') || D.today(),
              pri: L.val(body, 'f-p'), note: L.val(body, 'f-n').trim()
            };
            if (rec) col().update(rec.id, data); else col().add(Object.assign({ done: false }, data));
            close(); L.toast(rec ? '已更新 ♡' : '已加入清單 ♡'); ctx.refresh();
          };
        });
    }
  };
})(window.Lume);
