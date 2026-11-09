/* ============================================================
   reading.js — 閱讀記錄：數據看板 / 書架三分頁 / 錄入新書
                 ＋ 🎬 劇單（影集 / 連續劇追蹤）
   ============================================================ */
window.Lume = window.Lume || {}; window.Lume.modules = window.Lume.modules || {};
(function (L) {
  'use strict';
  const { D, U, icon, Store } = L;
  const col = () => Store.col('books');
  const dcol = () => Store.col('dramas');
  const logs = () => Store.col('readingLogs');
  const goal = () => Store.doc('readingGoal').get();

  let view = 'book';                 // 'book' | 'drama'
  let tab = 'reading';               // 書架分頁
  let dtab = 'watching';             // 劇單分頁

  const TABS = [{ k: 'wish', t: '待讀' }, { k: 'reading', t: '在讀' }, { k: 'done', t: '讀完' }];
  const DTABS = L.DRAMA_STATUS;
  const DT = L.DRAMA_T || { wish: '想看清單', watching: '追劇中', done: '已追完' };

  /* ======================= 書籍 ======================= */
  function stats() {
    const y = String(new Date().getFullYear());
    const mk = D.monthKey(D.today());
    const all = col().all().filter(b => b && typeof b === 'object');
    const doneYear = all.filter(b => b.status === 'done' && (b.finishDate || '').slice(0, 4) === y).length;
    const doneMonth = all.filter(b => b.status === 'done' && (b.finishDate || '').slice(0, 7) === mk).length;
    const g = goal() || {};
    const pct = g.target ? Math.min(100, Math.round(doneYear / g.target * 100)) : 0;
    let minutes = 0;
    logs().all().forEach(l => { if (l && (l.date || '').slice(0, 4) === y) minutes += U.num(l.minutes); });
    return { doneYear, doneMonth, pct, minutes, target: g.target, reading: all.filter(b => b.status === 'reading').length };
  }

  function bookCard(b) {
    const pct = U.num(b.totalPages) ? Math.round(U.num(b.currentPage) / U.num(b.totalPages) * 100) : 0;
    return '<div class="book" data-id="' + b.id + '">' +
      '<div class="cover">' + (b.cover ? L.imgTag(b.cover) : '<div class="ph">' + U.esc(b.title) + '</div>') + '</div>' +
      '<div class="info"><b>' + U.esc(b.title) + '</b><span>' + U.esc(b.author || '未署名') + '</span>' +
      (b.category ? '<span class="chip" style="display:inline-block;margin-top:4px">' + U.esc(b.category) + '</span>' : '') +
      (b.totalPages ? '<div class="pg">' + U.num(b.currentPage) + ' / ' + b.totalPages + ' 頁 · ' + pct + '%</div>' +
        '<div class="bar thin" style="margin-top:5px"><i style="width:' + pct + '%"></i></div>' : '') +
      (b.note ? '<div class="muted" style="font-size:12px;margin-top:6px;line-height:1.6">' + U.esc(b.note) + '</div>' : '') +
      '<div class="row mt8">' +
      (b.status !== 'reading' ? '<button class="btn soft sm" data-to="reading" data-id="' + b.id + '">開始讀</button>' : '') +
      (b.status !== 'done' ? '<button class="btn sm" data-to="done" data-id="' + b.id + '">讀完了</button>' : '') +
      '</div>' +
      '<div class="row mt8"><button class="mini-btn" data-pg="' + b.id + '">更新頁數</button>' +
      L.editBtn(b.id) +
      '<button class="mini-btn" data-del="' + b.id + '">刪除</button></div>' +
      '</div></div>';
  }

  function shelfHTML() {
    const list = col().where(b => b.status === tab);
    return '<div class="sec-title"><h2>📚 我的書架</h2><button class="btn sm" data-add>＋ 錄入新書</button></div>' +
      '<div class="tabs mb8">' + TABS.map(t => '<button class="tab' + (tab === t.k ? ' on' : '') + '" data-tab="' + t.k + '">' +
        t.t + ' <span style="opacity:.7">' + col().where(b => b.status === t.k).length + '</span></button>').join('') + '</div>' +
      '<div id="shelf">' + (list.length ? '<div class="books">' + list.map(bookCard).join('') + '</div>'
        : '<div class="card">' + L.empty('這個書架還空空的 ♡', 'book') + '</div>') + '</div>' +

      '<div class="card mt14"><h3>' + icon('clock') + '閱讀計時</h3>' +
      '<div class="row"><input class="inp" type="number" id="mins" placeholder="分鐘" style="width:110px;flex:0 0 110px">' +
      '<select class="inp" id="bk" style="flex:1;min-width:130px">' +
      col().where(b => b.status === 'reading').map(b => '<option value="' + b.id + '">' + U.esc(b.title) + '</option>').join('') + '</select>' +
      '<button class="btn" id="logmin">記錄</button></div>' +
      '<div class="muted mt8">累計時長會顯示在看板，今年共 ' + stats().minutes + ' 分鐘 ♡</div></div>';
  }

  /* ======================= 劇單 ======================= */
  function dramaStats() {
    const all = dcol().all().filter(d => d && typeof d === 'object');
    const c = { wish: 0, watching: 0, done: 0 };
    let eps = 0;
    all.forEach(d => {
      if (c[d.status] != null) c[d.status]++;
      eps += U.num(d.currentEp);
    });
    return { c: c, eps: eps, total: all.length };
  }

  function starsHTML(r) {
    r = U.clamp(U.num(r), 0, 5);
    if (!r) return '';
    return '<div class="stars">' + '★'.repeat(r) + '<span class="off">' + '★'.repeat(5 - r) + '</span></div>';
  }

  function dramaCard(d) {
    const total = U.num(d.totalEp);
    const cur = U.num(d.currentEp);
    const pct = total ? Math.min(100, Math.round(cur / total * 100)) : 0;
    const st = DT[d.status] || '想看清單';
    return '<div class="book drama" data-id="' + d.id + '">' +
      '<div class="cover">' + (d.cover ? L.imgTag(d.cover) : '<div class="ph">' + U.esc(d.title) + '</div>') +
      '<span class="badge">' + st + '</span></div>' +
      '<div class="info"><b>' + U.esc(d.title) + '</b>' +
      '<span>' + U.esc(d.platform || '未填平台') + '</span>' +
      (total
        ? '<div class="ep"><span>第 <b>' + cur + '</b> / ' + total + ' 集</span><b>' + pct + '%</b></div>' +
        '<div class="bar thin" style="margin-top:5px"><i style="width:' + pct + '%"></i></div>'
        : '<div class="ep"><span>已看 <b>' + cur + '</b> 集</span></div>') +
      starsHTML(d.rating) +
      (d.note ? '<div class="note">' + U.esc(d.note) + '</div>' : '') +
      '<div class="row">' +
      (d.status !== 'done' ? '<button class="epchip hot" data-ep="' + d.id + '">＋1 集</button>' : '') +
      (d.status === 'wish'
        ? '<button class="epchip" data-dto="watching" data-id="' + d.id + '">開始追</button>'
        : (d.status === 'watching' ? '<button class="epchip" data-dto="done" data-id="' + d.id + '">追完了</button>' : '')) +
      '</div>' +
      '<div class="row"><button class="mini-btn" data-dep="' + d.id + '">改集數</button>' +
      L.editBtn(d.id) +
      '<button class="mini-btn" data-del="' + d.id + '">刪除</button></div>' +
      '</div></div>';
  }

  function dramaHTML() {
    const s = dramaStats();
    const list = dcol().where(d => d.status === dtab);
    return '<div class="card tinted"><h3>' + icon('sparkle') + '劇單小統計</h3>' +
      '<div class="stats">' + L.stat(s.c.watching, ' 部', '追劇中') + L.stat(s.c.wish, ' 部', '想看清單') +
      L.stat(s.c.done, ' 部', '已追完') + L.stat(s.eps, ' 集', '累計已看') + '</div></div>' +

      '<div class="sec-title"><h2>🎬 我的劇單</h2><button class="btn sm" data-dadd>＋ 錄入新劇</button></div>' +
      '<div class="tabs mb8">' + DTABS.map(t => '<button class="tab' + (dtab === t.k ? ' on' : '') + '" data-dtab="' + t.k + '">' +
        t.t + ' <span style="opacity:.7">' + s.c[t.k] + '</span></button>').join('') + '</div>' +
      '<div id="dlist">' + (list.length ? '<div class="books">' + list.map(dramaCard).join('') + '</div>'
        : '<div class="card">' + L.empty('這張清單還空空的 ♡', 'flower') + '</div>') + '</div>';
  }

  /* ======================= 模組 ======================= */
  L.modules.reading = {
    id: 'reading', name: '閱讀記錄', icon: 'book',
    render() {
      const s = stats();
      return '' +
        '<div class="card tinted"><h3>' + icon('book') + '閱讀數據看板 · ' + new Date().getFullYear() + '</h3>' +
        '<div class="stats">' + L.stat(s.doneYear, ' 本', '今年讀完') + L.stat(s.doneMonth, ' 本', '本月讀完') +
        L.stat(s.pct, '%', '目標進度') + L.stat(s.minutes, ' min', '累計時長') + L.stat(s.reading, ' 本', '正在讀') + '</div>' +
        '<div class="mt14 spread"><span class="muted">年度目標 ' + s.doneYear + ' / ' + s.target + ' 本</span>' +
        '<button class="btn ghost sm" data-goal>設定目標</button></div>' +
        '<div class="bar mt8"><i style="width:' + s.pct + '%"></i></div></div>' +

        '<div class="dswitch">' +
        '<button class="dtab' + (view === 'book' ? ' on' : '') + '" data-view="book">📚 我的書架</button>' +
        '<button class="dtab' + (view === 'drama' ? ' on' : '') + '" data-view="drama">🎬 劇單</button>' +
        '</div>' +

        (view === 'drama' ? dramaHTML() : shelfHTML());
    },

    mount(root, ctx) {
      /* ---- 書架 / 劇單 切換 ---- */
      root.querySelectorAll('[data-view]').forEach(b => b.onclick = () => { view = b.dataset.view; ctx.refresh(); });
      root.querySelector('[data-goal]').onclick = () => this.goalForm(ctx);

      if (view === 'drama') { this.mountDrama(root, ctx); return; }
      this.mountBook(root, ctx);
    },

    /* ---------------- 書架 ---------------- */
    mountBook(root, ctx) {
      root.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; ctx.refresh(); });
      root.querySelector('[data-add]').onclick = () => this.form(ctx, null);
      root.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => this.form(ctx, col().find(b.dataset.edit)));
      root.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
        if (await L.confirm('刪除書籍', '確定要從書架移除嗎？')) {
          const bk = col().find(b.dataset.del);
          if (bk && bk.cover) L.IDB.del(bk.cover);
          col().remove(b.dataset.del); ctx.refresh();
        }
      });
      root.querySelectorAll('[data-to]').forEach(b => b.onclick = () => {
        const bk = col().find(b.dataset.id);
        if (!bk) return;
        const patch = { status: b.dataset.to };
        if (b.dataset.to === 'reading' && !bk.startDate) patch.startDate = D.today();
        if (b.dataset.to === 'done') {
          patch.finishDate = D.today();
          patch.currentPage = bk.totalPages || bk.currentPage;
        }
        col().update(bk.id, patch);
        tab = b.dataset.to; L.toast('書架已更新 ♡'); ctx.refresh();
      });
      root.querySelectorAll('[data-pg]').forEach(b => b.onclick = () => {
        const bk = col().find(b.dataset.pg); if (!bk) return;
        L.modal('更新閱讀進度', '<div class="field"><label>目前頁數（共 ' + (bk.totalPages || '?') + ' 頁）</label>' +
          '<input class="inp" type="number" id="p" value="' + U.num(bk.currentPage) + '"></div>' +
          '<button class="btn block" id="ok">更新 ♡</button>', (body, close) => {
            body.querySelector('#ok').onclick = () => {
              col().update(bk.id, { currentPage: U.num(body.querySelector('#p').value) });
              close(); ctx.refresh();
            };
          });
      });
      const lm = root.querySelector('#logmin');
      if (lm) lm.onclick = () => {
        const m = U.num(root.querySelector('#mins').value);
        if (!m) return L.toast('請填寫分鐘數 ♡');
        logs().add({ date: D.today(), minutes: m, bookId: root.querySelector('#bk').value });
        L.toast('已記錄 ' + m + ' 分鐘 ♡'); ctx.refresh();
      };
    },

    /* ---------------- 劇單 ---------------- */
    mountDrama(root, ctx) {
      root.querySelectorAll('[data-dtab]').forEach(b => b.onclick = () => { dtab = b.dataset.dtab; ctx.refresh(); });
      root.querySelector('[data-dadd]').onclick = () => this.dramaForm(ctx, null);
      root.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => this.dramaForm(ctx, dcol().find(b.dataset.edit)));
      root.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
        if (await L.confirm('刪除劇集', '確定要從劇單移除嗎？')) {
          const d = dcol().find(b.dataset.del);
          if (d && d.cover) L.IDB.del(d.cover);
          dcol().remove(b.dataset.del); ctx.refresh();
        }
      });
      /* ★ 快速更新進度：＋1 集 */
      root.querySelectorAll('[data-ep]').forEach(b => b.onclick = () => {
        const d = dcol().find(b.dataset.ep); if (!d) return;
        const total = U.num(d.totalEp);
        const next = U.num(d.currentEp) + 1;
        dcol().update(d.id, { currentEp: total ? Math.min(next, total) : next });
        if (d.status === 'wish') dcol().update(d.id, { status: 'watching', startDate: d.startDate || D.today() });
        L.toast(total && next >= total ? '已經看到最後一集了 ♡ 記得標記追完' : '第 ' + next + ' 集，打卡成功 ♡');
        ctx.refresh();
      });
      /* 狀態切換：開始追 / 追完了 */
      root.querySelectorAll('[data-dto]').forEach(b => b.onclick = () => {
        const d = dcol().find(b.dataset.id); if (!d) return;
        const to = b.dataset.dto;
        const patch = { status: to };
        if (to === 'watching' && !d.startDate) patch.startDate = D.today();
        if (to === 'done') { patch.finishDate = D.today(); if (U.num(d.totalEp)) patch.currentEp = d.totalEp; }
        dcol().update(d.id, patch);
        dtab = to; L.toast('劇單已更新 ♡'); ctx.refresh();
      });
      /* 手動改集數 */
      root.querySelectorAll('[data-dep]').forEach(b => b.onclick = () => {
        const d = dcol().find(b.dataset.dep); if (!d) return;
        L.modal('更新集數', '<div class="field"><label>目前看到第幾集（共 ' + (d.totalEp || '?') + ' 集）</label>' +
          '<input class="inp" type="number" id="e" value="' + U.num(d.currentEp) + '"></div>' +
          '<button class="btn block" id="ok">更新 ♡</button>', (body, close) => {
            body.querySelector('#ok').onclick = () => {
              dcol().update(d.id, { currentEp: U.num(body.querySelector('#e').value) });
              close(); ctx.refresh();
            };
          });
      });
    },

    /* ---------------- 表單 ---------------- */
    goalForm(ctx) {
      const g = goal() || {};
      L.modal('年度閱讀目標', '<div class="field"><label>今年想讀完幾本？</label>' +
        '<input class="inp" type="number" id="t" value="' + U.num(g.target) + '"></div>' +
        '<button class="btn block" id="ok">儲存 ♡</button>', (body, close) => {
          body.querySelector('#ok').onclick = () => {
            Store.doc('readingGoal').set({ target: U.num(body.querySelector('#t').value, 12) });
            close(); ctx.refresh();
          };
        });
    },

    dramaForm(ctx, d) {
      const x = d || {};
      const img = L.imageField({ id: 'dcv', value: x.cover || '', label: '封面圖片' });
      const plat = x.platform || '';
      L.modal(d ? '編輯劇集' : '錄入新劇',
        '<div class="field"><label>劇名 <span class="req">*</span></label><input class="inp" id="t" value="' + U.esc(x.title || '') + '" placeholder="例如：我的出走日記"></div>' +
        '<div class="grid2"><div class="field"><label>平台</label><select class="inp" id="pf">' +
        L.DRAMA_PLATFORMS.map(p => '<option' + (plat === p ? ' selected' : '') + '>' + p + '</option>').join('') + '</select></div>' +
        '<div class="field"><label>狀態</label><select class="inp" id="s">' +
        DTABS.map(t => '<option value="' + t.k + '"' + ((x.status || 'wish') === t.k ? ' selected' : '') + '>' + t.t + '</option>').join('') +
        '</select></div></div>' +
        '<div class="grid2"><div class="field"><label>總集數</label><input class="inp" type="number" id="te" value="' + (x.totalEp || '') + '" placeholder="16"></div>' +
        '<div class="field"><label>目前第幾集</label><input class="inp" type="number" id="ce" value="' + U.num(x.currentEp) + '"></div></div>' +
        '<div class="field"><label>評分</label><select class="inp" id="rt">' +
        [0, 1, 2, 3, 4, 5].map(n => '<option value="' + n + '"' + (U.num(x.rating) === n ? ' selected' : '') + '>' +
          (n === 0 ? '尚未評分' : '★'.repeat(n)) + '</option>').join('') + '</select></div>' +
        img.html +
        '<div class="field"><label>心得 / 備註（可不填）</label><textarea class="inp" id="n" placeholder="追到哪、想記下什麼…">' + U.esc(x.note || '') + '</textarea></div>' +
        L.formFooter({ isEdit: !!d }),
        (body, close) => {
          L.bindCancel(body, close);
          const up = img.mount(body);
          body.querySelector('#ok').onclick = async () => {
            const t = L.val(body, 't').trim();
            if (!t) return L.toast('劇名必填 ♡');
            const status = L.val(body, 's');
            const total = U.num(L.val(body, 'te'));
            let cur = U.num(L.val(body, 'ce'));
            if (total && cur > total) cur = total;
            if (status === 'done' && total) cur = total;
            const data = {
              title: t, platform: L.val(body, 'pf'), status: status,
              totalEp: total, currentEp: cur, rating: U.num(L.val(body, 'rt')),
              note: L.val(body, 'n').trim(),
              cover: await up.save(d ? d.cover : '')
            };
            if (d) dcol().update(d.id, data);
            else dcol().add(Object.assign({ startDate: status === 'watching' ? D.today() : '', finishDate: status === 'done' ? D.today() : '' }, data));
            dtab = status;
            close(); L.toast(d ? '已更新 ♡' : '已加入劇單 ♡'); ctx.refresh();
          };
        });
    },

    form(ctx, bk) {
      const b = bk || {};
      const img = L.imageField({ id: 'cv', value: b.cover || '', label: '封面圖片' });
      L.modal(bk ? '編輯書籍' : '錄入新書',
        '<div class="field"><label>書名 <span class="req">*</span></label><input class="inp" id="t" value="' + U.esc(b.title || '') + '"></div>' +
        '<div class="field"><label>作者 <span class="req">*</span></label><input class="inp" id="a" value="' + U.esc(b.author || '') + '"></div>' +
        '<div class="grid2"><div class="field"><label>分類</label><select class="inp" id="c">' +
        L.BOOK_CATS.map(c => '<option' + (b.category === c ? ' selected' : '') + '>' + c + '</option>').join('') + '</select></div>' +
        '<div class="field"><label>總頁數</label><input class="inp" type="number" id="p" value="' + (b.totalPages || '') + '"></div></div>' +
        '<div class="grid2"><div class="field"><label>目前頁數</label><input class="inp" type="number" id="cp" value="' + U.num(b.currentPage) + '"></div>' +
        '<div class="field"><label>狀態</label><select class="inp" id="s">' +
        TABS.map(t => '<option value="' + t.k + '"' + (b.status === t.k ? ' selected' : '') + '>' + t.t + '</option>').join('') + '</select></div></div>' +
        img.html +
        '<div class="field"><label>心得 / 備註（可不填）</label><textarea class="inp" id="n" placeholder="讀到哪、想記下什麼…">' + U.esc(b.note || '') + '</textarea></div>' +
        L.formFooter({ isEdit: !!bk }),
        (body, close) => {
          L.bindCancel(body, close);
          const up = img.mount(body);
          body.querySelector('#ok').onclick = async () => {
            const t = L.val(body, 't').trim();
            const a = L.val(body, 'a').trim();
            if (!t || !a) return L.toast('書名與作者必填 ♡');
            const status = L.val(body, 's');
            const total = U.num(L.val(body, 'p'));
            let cur = U.num(L.val(body, 'cp'));
            if (status === 'done' && total) cur = total;
            const data = {
              title: t, author: a, category: L.val(body, 'c'),
              totalPages: total, currentPage: cur, status,
              note: L.val(body, 'n').trim(),
              cover: await up.save(bk ? bk.cover : '')
            };
            if (bk) col().update(bk.id, data);
            else col().add(Object.assign({ startDate: status === 'reading' ? D.today() : '' }, data));
            tab = status;
            close(); L.toast(bk ? '已更新 ♡' : '已存入書架 ♡'); ctx.refresh();
          };
        });
    }
  };
})(window.Lume);
