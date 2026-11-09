/* ============================================================
   wishes.js — 願望清單：統計看板 / 分類進度 / 願望卡片
   ------------------------------------------------------------
   ★ Bug 修復（v8）：「＋ 添加新願望」存不進去 / 按了沒反應
     1. 表單改用真正的 <form> + submit 事件（手機鍵盤的「送出 / Go」也能送出）
     2. 補齊完整資料結構：願望名稱、分類、日期、狀態、備註
     （舊版「新增」時少了「日期」與「狀態」兩個欄位）
     3. 所有 DOM 綁定都做 null 保護 + 逐段 try/catch，
        任何一個按鈕出錯都不會讓整頁按鈕一起失效（舊版會整頁無反應）
     4. 送出後先驗證 → 立即 Store.flush() 落檔 → 觸發雲端推送 → 重繪，
        並保證新的願望卡一定在畫面上看得到
   ============================================================ */
window.Lume = window.Lume || {}; window.Lume.modules = window.Lume.modules || {};
(function (L) {
  'use strict';
  const { D, U, icon, Store } = L;
  const col = () => Store.col('wishes');
  let tab = 'all';
  let hl = '';            // 剛新增/更新的願望 id（畫面會幫它加一圈光）

  function catOf(k) { return L.WISH_CATS.find(c => c.k === k) || L.WISH_CATS[0]; }

  /** 安全綁定：單一綁定出錯也不會讓後面的按鈕全部失效 */
  function safe(label, fn) {
    try { fn(); } catch (e) { console.error('[wishes] ' + label, e); }
  }

  L.modules.wishes = {
    id: 'wishes', name: '願望清單', icon: 'wish',
    render() {
      const all = col().all();
      const done = all.filter(w => w.status === 'done').length;
      const doing = all.length - done;
      const rate = all.length ? Math.round(done / all.length * 100) : 0;
      const list = (tab === 'all' ? all : all.filter(w => w.category === tab))
        .slice().sort((a, b) => (a.status === 'done') - (b.status === 'done') || (a.createdAt < b.createdAt ? 1 : -1));

      return '' +
        '<div class="card tinted"><h3>' + icon('wish') + '願望統計</h3>' +
        '<div class="stats">' + L.stat(all.length, ' 個', '願望總數') + L.stat(done, ' 個', '已完成') +
        L.stat(doing, ' 個', '進行中') + L.stat(rate, '%', '完成率') + '</div>' +
        '<div class="deco-line"></div>' +
        '<div class="muted mb8">分類進度</div>' +
        L.WISH_CATS.map(c => {
          const g = all.filter(w => w.category === c.k);
          const d = g.filter(w => w.status === 'done').length;
          const p = g.length ? Math.round(d / g.length * 100) : 0;
          return '<div style="margin-bottom:10px"><div class="spread" style="font-size:12.5px">' +
            '<span style="display:flex;align-items:center;gap:6px"><span style="width:18px;height:18px;display:inline-block">' + icon(c.icon, 18) + '</span>' + c.t + '</span>' +
            '<span class="muted">' + d + ' / ' + g.length + ' · ' + p + '%</span></div>' +
            '<div class="bar thin mt8"><i style="width:' + p + '%;background:linear-gradient(90deg,' + c.color + '99,' + c.color + ')"></i></div></div>';
        }).join('') + '</div>' +

        '<div class="sec-title"><h2>✨ 我的願望</h2>' +
        '<button class="btn sm" id="add" data-add="1">＋ 添加新願望</button></div>' +
        '<div class="tabs mb8">' + [{ k: 'all', t: '全部' }].concat(L.WISH_CATS).map(c =>
          '<button class="tab' + (tab === c.k ? ' on' : '') + '" data-tab="' + c.k + '">' + c.t + '</button>').join('') + '</div>' +
        '<div id="wlist">' + (list.length ? '<div class="flexlist">' + list.map(w => {
          const c = catOf(w.category);
          const isDone = w.status === 'done';
          return '<div class="item' + (hl === w.id ? ' hl' : '') + '"' + (isDone ? ' style="opacity:.72"' : '') + '>' +
            '<div style="width:30px;height:30px;flex:0 0 30px">' + icon(c.icon, 30) + '</div>' +
            '<div class="body"><div class="t"' + (isDone ? ' style="text-decoration:line-through"' : '') + '>' + U.esc(w.title) + '</div>' +
            '<div class="m"><span class="chip">' + c.t + '</span>' +
            '<span class="chip" style="background:' + (isDone ? '#D6EBE0' : '#EFE7FB') + ';color:' + (isDone ? '#4E7C63' : 'var(--lav-700)') + '">' +
            (isDone ? '已實現' : '進行中') + '</span>' +
            (w.date ? '<span>🎯 ' + U.esc(w.date) + '</span>' : '') +
            (w.note ? '<span>' + U.esc(w.note) + '</span>' : '') +
            '<span>' + (w.createdAt || '').slice(0, 10) + ' 許下</span>' +
            (w.doneAt ? '<span style="color:var(--ok)">' + w.doneAt.slice(0, 10) + ' 實現</span>' : '') + '</div></div>' +
            '<div style="display:flex;flex-direction:column;gap:2px;align-items:flex-end">' +
            L.editBtn(w.id) +
            '<button class="mini-btn" data-tog="' + w.id + '" style="color:' + (isDone ? 'var(--ink-faint)' : 'var(--lav-600)') + '">' +
            (isDone ? '取消完成' : '已實現') + '</button>' +
            '<button class="mini-btn" data-del="' + w.id + '">刪除</button></div></div>';
        }).join('') + '</div>' : '<div class="card">' + L.empty('這裡還沒有願望，寫下第一個吧 ♡', 'wish') + '</div>') + '</div>';
    },
    mount(root, ctx) {
      safe('tabs', () => root.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; ctx.refresh(); }));

      /* 新增鈕：#add 與 [data-add] 都綁，任何一個找得到就能用 */
      safe('add', () => {
        const btns = [];
        const a1 = root.querySelector('#add'); if (a1) btns.push(a1);
        root.querySelectorAll('[data-add]').forEach(b => { if (btns.indexOf(b) < 0) btns.push(b); });
        if (!btns.length) { console.error('[wishes] 找不到新增鈕'); return; }
        btns.forEach(b => b.onclick = (e) => { e.preventDefault(); this.form(ctx, null); });
      });

      safe('edit', () => root.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => this.form(ctx, col().find(b.dataset.edit))));

      safe('toggle', () => root.querySelectorAll('[data-tog]').forEach(b => b.onclick = () => {
        const w = col().find(b.dataset.tog);
        if (!w) { ctx.refresh(); return; }
        const toDone = w.status !== 'done';
        col().update(w.id, {
          status: toDone ? 'done' : 'doing',
          doneAt: toDone ? new Date().toISOString() : null
        });
        hl = w.id;
        L.toast(toDone ? '願望實現了，恭喜妳 ♡' : '已改回進行中 ♡');
        ctx.refresh();
      }));

      safe('del', () => root.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
        if (await L.confirm('刪除願望', '確定刪掉這個願望嗎？')) { col().remove(b.dataset.del); ctx.refresh(); }
      }));

      /* 剛新增的那張卡片捲進畫面 */
      safe('scroll', () => {
        if (!hl) return;
        const el = root.querySelector('.item.hl');
        if (el && el.scrollIntoView) setTimeout(() => { try { el.scrollIntoView({ block: 'center', behavior: 'auto' }); } catch (e) { } }, 120);
        setTimeout(() => { if (hl) { hl = ''; } }, 2600);
      });
    },

    /* ---------- 新增 / 編輯願望 ---------- */
    form(ctx, rec) {
      const w = rec || {};
      const isEdit = !!rec;
      const defCat = w.category || (tab !== 'all' ? tab : (L.WISH_CATS[0] || {}).k || 'short');

      /* ★ 用真正的 <form>：手機鍵盤按「送出 / Go」、桌機按 Enter 都能送出 */
      const html =
        '<form id="wform" novalidate>' +
        '<div class="field"><label>願望 <span class="req">*</span></label>' +
        '<input class="inp" id="f-t" name="title" autocomplete="off" value="' + U.esc(w.title || '') + '" placeholder="例如：去一趟京都看楓葉"></div>' +
        '<div class="grid2">' +
        '<div class="field"><label>分類</label><select class="inp" id="f-c" name="category">' +
        L.WISH_CATS.map(c => '<option value="' + c.k + '"' + (defCat === c.k ? ' selected' : '') + '>' + c.t + '</option>').join('') + '</select></div>' +
        '<div class="field"><label>狀態</label><select class="inp" id="f-s" name="status">' +
        '<option value="doing"' + (w.status !== 'done' ? ' selected' : '') + '>進行中</option>' +
        '<option value="done"' + (w.status === 'done' ? ' selected' : '') + '>已實現</option></select></div>' +
        '</div>' +
        '<div class="field"><label>預計實現日期（可不填）</label>' +
        '<input class="inp" type="date" id="f-d" name="date" value="' + U.esc(w.date || '') + '"></div>' +
        '<div class="field"><label>備註（可不填）</label><textarea class="inp" id="f-n" name="note" placeholder="想實現的時間、原因、小計畫…">' + U.esc(w.note || '') + '</textarea></div>' +
        '<button type="submit" class="btn block mt8" id="ok">' + (isEdit ? '💾 保存修改' : '✨ 許下願望') + '</button>' +
        '<button type="button" class="btn-cancel mt8" id="cancel">取消</button>' +
        '</form>';

      L.modal(isEdit ? '編輯這個願望' : '添加新願望', html, (body, close) => {
        L.bindCancel(body, close);
        const form = body.querySelector('#wform');
        const okBtn = body.querySelector('#ok');
        if (!form || !okBtn) { console.error('[wishes] 表單元素缺失'); return; }

        const submit = (e) => {
          if (e) { e.preventDefault(); e.stopPropagation(); }
          try {
            const t = String((body.querySelector('#f-t') || {}).value || '').trim();
            if (!t) {
              L.toast('請先寫下願望 ♡');
              const el = body.querySelector('#f-t');
              if (el) { try { el.focus(); } catch (_) { } }
              return;
            }
            const status = String((body.querySelector('#f-s') || {}).value || 'doing') === 'done' ? 'done' : 'doing';
            const date = String((body.querySelector('#f-d') || {}).value || '').trim();

            /* ★ 完整資料結構：名稱 / 分類 / 日期 / 狀態 / 備註 */
            const data = {
              title: t,
              category: String((body.querySelector('#f-c') || {}).value || defCat || 'short'),
              date: date,
              status: status,
              note: String((body.querySelector('#f-n') || {}).value || '').trim(),
              doneAt: status === 'done' ? (w.doneAt || new Date().toISOString()) : null
            };

            let id;
            if (isEdit && w.id) {
              col().update(w.id, data); id = w.id;
            } else {
              id = col().add(Object.assign({ status: 'doing', date: '', doneAt: null }, data)).id;
            }
            hl = id;

            /* 新增的願望一定要看得到：分類篩選若擋住它，就切回「全部」 */
            if (tab !== 'all' && data.category !== tab) tab = 'all';

            close();
            L.toast(isEdit ? '已更新 ♡' : '願望已許下，會實現的 ♡');

            /* 立刻落檔 + 觸發雲端推送，再重繪畫面 */
            try { Store.flush(); } catch (_) { }
            try { Store.touch(); } catch (_) { }
            ctx.refresh();
          } catch (err) {
            console.error('[wishes] 送出失敗', err);
            L.toast('送出時出了點小狀況，請再按一次 ♡');
          }
        };

        form.addEventListener('submit', submit);
        /* 保險：若 submit 事件在某些瀏覽器沒被觸發，按鈕的 click 也能送出 */
        okBtn.addEventListener('click', (e) => {
          if (typeof form.requestSubmit === 'function') { try { form.requestSubmit(); return; } catch (_) { } }
          submit(e);
        });
      });
    }
  };
})(window.Lume);
