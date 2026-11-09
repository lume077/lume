/* ============================================================
   review.js — 每月回顧
   一個月的心情、日記、碎碎念、第一次、學習、任務、塔羅、約會、身體…
   整理成一頁小卡片，可以切換上個月 / 下個月
   ============================================================ */
window.Lume = window.Lume || {}; window.Lume.modules = window.Lume.modules || {};
(function (L) {
  'use strict';
  const { D, U, icon, Store } = L;
  let y = new Date().getFullYear(), m = new Date().getMonth();

  const inMonth = (s, ym) => !!s && String(s).slice(0, 7) === ym;
  const arr = k => (Store.db[k] || []).filter(Boolean);

  function stat(n, label) { return '<div class="stat"><b>' + n + '</b><span>' + label + '</span></div>'; }

  L.modules.review = {
    id: 'review', name: '每月回顧', icon: 'chart',
    render() {
      const ym = y + '-' + D.pad(m + 1);
      const diary = arr('diary').filter(r => inMonth(r.date, ym));
      const murmurs = arr('murmurs').filter(r => inMonth(r.date, ym));
      const firsts = arr('firsts').filter(r => inMonth(r.date, ym));
      const studies = arr('studies').filter(r => inMonth(r.date, ym));
      const todos = arr('todos').filter(r => inMonth(r.date, ym));
      const tarot = arr('tarot').filter(r => inMonth(r.date, ym));
      const dates = arr('dates').filter(r => inMonth(r.date, ym));
      const body = arr('bodyLogs').filter(r => inMonth(r.date, ym));
      const books = arr('books').filter(r => inMonth(r.finishDate, ym));
      const notes = arr('notes').filter(r => inMonth(r.createdAt, ym));

      const sDone = studies.filter(r => r.done);
      const sMin = sDone.reduce((n, r) => n + (+r.minutes || 0), 0);
      const tDone = todos.filter(r => r.done).length;

      /* 心情分布 */
      const moods = {};
      diary.forEach(r => { moods[r.mood || 'calm'] = (moods[r.mood || 'calm'] || 0) + 1; });
      const moodList = (L.MOODS || []).map(x => ({ t: x.t, n: moods[x.k] || 0 })).filter(x => x.n).sort((a, b) => b.n - a.n);
      const maxM = moodList.length ? moodList[0].n : 1;

      /* 常出現的卡點 / 收穫 */
      const cnt = (list, key) => { const o = {}; list.forEach(r => (r[key] || []).forEach(k => { o[k] = (o[k] || 0) + 1; })); return Object.keys(o).sort((a, b) => o[b] - o[a]).slice(0, 3).map(k => ({ k, n: o[k] })); };
      const title = (list, k) => { const f = (list || []).find(x => x.k === k); return f ? f.t : k; };
      const blocks = cnt(diary, 'blocks'), gifts = cnt(diary, 'gifts');

      /* 這個月寫日記 / 碎碎念的天數 */
      const days = {};
      diary.concat(murmurs).forEach(r => { days[r.date] = 1; });
      const nDays = Object.keys(days).length;

      const isNow = ym === D.today().slice(0, 7);
      const arrow = dir => '<button class="icon-btn" data-rv="' + dir + '" style="width:34px;height:34px" aria-label="' + (dir === 'prev' ? '上個月' : '下個月') + '">' +
        L.lic('chev').replace('<svg', '<svg style="width:16px;height:16px;transform:rotate(' + (dir === 'prev' ? 90 : -90) + 'deg)"') + '</button>';

      return '' +
        '<div class="card tinted"><div class="cal-head" style="margin:0">' + arrow('prev') +
        '<b style="font-size:17px">' + y + ' 年 ' + (m + 1) + ' 月' + (isNow ? ' · 這個月' : '') + '</b>' + arrow('next') + '</div>' +
        '<div class="muted center mt8">這個月有 ' + nDays + ' 天，你留下了文字給自己 ♡</div></div>' +

        '<div class="stats" style="margin-bottom:14px">' +
        stat(diary.length, '篇日記') + stat(murmurs.length, '則碎碎念') + stat(firsts.length, '個第一次') +
        stat(sDone.length, '項學完') + stat(todos.length ? Math.round(tDone / todos.length * 100) + '<small>%</small>' : '—', '任務完成') +
        stat(tarot.length, '次塔羅') + '</div>' +

        '<div class="card"><h3>' + icon('heart') + '這個月的心情</h3>' +
        (moodList.length ? '<div class="rv-bars">' + moodList.map(x =>
          '<div class="r"><span>' + U.esc(x.t) + '</span><div class="bar"><i style="width:' + Math.round(x.n / maxM * 100) + '%"></i></div><b>' + x.n + '</b></div>').join('') + '</div>'
          : '<div class="muted">這個月還沒有寫日記 ♡</div>') +
        (blocks.length ? '<div class="muted mt14 mb8">比較常卡住的地方</div><div class="sym-chips">' +
          blocks.map(b => '<span class="chip" style="background:var(--lav-100)">' + U.esc(title(L.MIND_BLOCKS, b.k)) + ' × ' + b.n + '</span>').join('') + '</div>' : '') +
        (gifts.length ? '<div class="muted mt14 mb8">🌱 收到最多的溫暖</div><div class="sym-chips">' +
          gifts.map(b => '<span class="chip mint">' + U.esc(title(L.MIND_GIFTS, b.k)) + ' × ' + b.n + '</span>').join('') + '</div>' : '') +
        '</div>' +

        (firsts.length ? '<div class="card"><h3>' + icon('sprout') + '這個月解鎖的第一次</h3><ul class="rv-list" style="margin:0;padding-left:18px">' +
          firsts.slice().sort((a, b) => a.date < b.date ? -1 : 1).map(f => '<li>' + U.esc(f.title || '') + ' <span class="muted">' + md(f.date) + '</span></li>').join('') + '</ul></div>' : '') +

        '<div class="card"><h3>' + icon('bulb') + '學習</h3>' +
        '<div class="kv"><span>排了幾項</span><b>' + studies.length + '</b></div>' +
        '<div class="kv"><span>學完</span><b>' + sDone.length + '</b></div>' +
        '<div class="kv"><span>累積時間</span><b>' + (sMin >= 60 ? Math.floor(sMin / 60) + ' 小時 ' + (sMin % 60) + ' 分' : sMin + ' 分鐘') + '</b></div>' +
        '<div class="kv"><span>寫了心得</span><b>' + sDone.filter(r => r.note).length + '</b></div></div>' +

        '<div class="card"><h3>' + icon('sparkle') + '其他小紀錄</h3>' +
        '<div class="kv"><span>約會 / 聚會</span><b>' + dates.length + ' 次</b></div>' +
        '<div class="kv"><span>收藏的靈感文案</span><b>' + notes.length + ' 則</b></div>' +
        '<div class="kv"><span>記錄身體狀態</span><b>' + body.length + ' 天</b></div>' +
        '<div class="kv"><span>讀完的書</span><b>' + books.length + ' 本</b></div></div>' +

        (murmurs.length ? '<div class="card"><h3>' + icon('bubble') + '隨手翻一則這個月的碎碎念</h3>' +
          (function () { const r = murmurs[Math.floor(Math.random() * murmurs.length)]; return '<div class="muted">' + md(r.date) + (r.tag ? ' · ' + U.esc(r.tag) : '') + '</div><div style="margin-top:4px;line-height:1.8">' + L.nl2br(r.text || '') + '</div>'; })() +
          '</div>' : '');
    },
    mount(root, ctx) {
      root.querySelectorAll('[data-rv]').forEach(b => b.onclick = () => {
        if (b.dataset.rv === 'prev') { m--; if (m < 0) { m = 11; y--; } }
        else { m++; if (m > 11) { m = 0; y++; } }
        ctx.refresh();
      });
    }
  };
  function md(k) { return k ? (+String(k).slice(5, 7)) + '/' + (+String(k).slice(8, 10)) : ''; }
})(window.Lume);
