/* ============================================================
   murmurs.js — 碎碎念：隨手記下的小啟發、小道理、一閃而過的念頭
   ------------------------------------------------------------
   · 和日記不同：一天可以寫很多則，想到就寫，不用成篇
   · 頁面只顯示「今天」的碎碎念，保持清爽
   · 以前的碎碎念收在下方月曆裡，點日期就跳出那天寫過的
   · 「隨機翻一則」：把以前想通的小道理再翻出來看看
   欄位：text / date / time / tag / images
   ============================================================ */
window.Lume = window.Lume || {}; window.Lume.modules = window.Lume.modules || {};
(function (L) {
  'use strict';
  const { D, U, icon, Store } = L;
  const col = () => Store.col('murmurs');
  const TAGS = ['小啟發', '小道理', '想通了', '碎念', '感謝', '提醒自己'];

  let calY = new Date().getFullYear();
  let calM = new Date().getMonth();
  let draftTag = '';

  const nowTime = () => { const n = new Date(); return D.pad(n.getHours()) + ':' + D.pad(n.getMinutes()); };

  function byDate() {
    const m = {};
    col().all().forEach(r => {
      if (!r || !r.date) return;
      (m[r.date] = m[r.date] || []).push(r);
    });
    Object.keys(m).forEach(k => m[k].sort((a, b) => ((a.time || '') + (a.createdAt || '')) < ((b.time || '') + (b.createdAt || '')) ? -1 : 1));
    return m;
  }

  function itemHTML(r, compact) {
    const imgs = r.images || [];
    return '<div class="murmur' + (compact ? ' compact' : '') + '">' +
      '<div class="murmur-head"><span class="murmur-time">' + U.esc(r.time || '') + '</span>' +
      (r.tag ? '<span class="chip">' + U.esc(r.tag) + '</span>' : '') +
      '<span style="flex:1"></span>' +
      L.editBtn(r.id, 'medit') +
      '<button class="mini-btn" data-mdel="' + U.esc(r.id) + '">刪除</button></div>' +
      '<p class="murmur-text">' + L.nl2br(r.text || '') + '</p>' +
      (imgs.length ? '<div class="thumb-row">' + imgs.map(k => '<div class="thumb">' + L.imgTag(k) + '</div>').join('') + '</div>' : '') +
      '</div>';
  }

  function calHTML() {
    const map = byDate();
    const first = D.firstDow(calY, calM);
    const total = D.daysInMonth(calY, calM);
    const today = D.today();
    let cells = '日一二三四五六'.split('').map(d => '<div class="cal-dow">' + d + '</div>').join('');
    for (let i = 0; i < first; i++) cells += '<div class="cal-cell out"></div>';
    let n = 0;
    for (let d = 1; d <= total; d++) {
      const key = calY + '-' + D.pad(calM + 1) + '-' + D.pad(d);
      const arr = map[key] || [];
      let inner = '<span>' + d + '</span>';
      if (arr.length) {
        n += arr.length;
        inner += '<div class="cal-icos"><span class="cal-ico">' + icon('bubble', 15) + '</span>' +
          (arr.length > 1 ? '<span class="cal-ico tiny">' + arr.length + '</span>' : '') + '</div>' +
          '<i class="cal-dot" style="background:#C7ACE9"></i>';
      }
      cells += '<div class="cal-cell' + (key === today ? ' today' : '') + (arr.length ? ' has' : '') +
        '" data-mdate="' + key + '">' + inner + '</div>';
    }
    return '<div class="cal-head">' +
      '<button class="icon-btn" data-mcal="prev" style="width:32px;height:32px">' +
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M15 5l-7 7 7 7" stroke="#8E6FC8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<b>' + calY + ' 年 ' + (calM + 1) + ' 月 · ' + n + ' 則</b>' +
      '<button class="icon-btn" data-mcal="next" style="width:32px;height:32px">' +
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M9 5l7 7-7 7" stroke="#8E6FC8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>' +
      '<div class="cal-grid">' + cells + '</div>' +
      '<div class="cal-legend mt8"><span class="lg">點日期就能看到那天的碎碎念 ♡</span></div>';
  }

  L.modules.murmurs = {
    id: 'murmurs', name: '碎碎念', icon: 'bubble',

    render() {
      const today = D.today();
      const todays = byDate()[today] || [];
      const total = col().all().length;
      return '' +
        '<div class="card tinted"><h3>' + icon('bubble') + '碎碎念 · 一閃而過的小啟發</h3>' +
        '<div class="muted mb8" style="line-height:1.75">不用寫成一篇日記，想到什麼小道理、小領悟，就先丟進來 ♡</div>' +
        '<textarea class="inp" id="mt" style="min-height:96px;line-height:1.8" placeholder="剛剛突然想通了一件事…"></textarea>' +
        '<div class="row mt8" id="mtags">' + TAGS.map(t =>
          '<button class="tab' + (draftTag === t ? ' on' : '') + '" data-mtag="' + U.esc(t) + '">' + U.esc(t) + '</button>').join('') + '</div>' +
        '<div class="row mt8"><button class="btn" id="msave" style="flex:1">念一下 ♡</button>' +
        '<button class="btn ghost" id="mphoto" style="flex:0 0 auto">📷 附照片</button></div></div>' +

        '<div class="sec-title"><h2>💭 今天的碎碎念</h2><span class="muted">' + todays.length + ' 則' +
        (total ? ' · 累積 ' + total + ' 則' : '') + '</span></div>' +
        '<div class="card" id="mtoday">' + (todays.length
          ? todays.slice().reverse().map(r => itemHTML(r)).join('')
          : L.empty('今天還沒有碎碎念，想到什麼就寫上面吧 ♡', 'bubble')) +
        (total ? '<button class="btn soft block mt8" id="mrand">🎲 隨機翻一則以前的碎碎念</button>' : '') +
        '</div>' +

        '<div class="sec-title"><h2>🗓 碎碎念月曆</h2><span class="muted">以前寫的都收在這裡</span></div>' +
        '<div class="card" id="mcalwrap"><div id="mcal">' + calHTML() + '</div></div>';
    },

    mount(root, ctx) {
      const self = this;
      root.querySelectorAll('[data-mtag]').forEach(b => b.onclick = () => {
        draftTag = draftTag === b.dataset.mtag ? '' : b.dataset.mtag;
        root.querySelectorAll('[data-mtag]').forEach(x => x.classList.toggle('on', x.dataset.mtag === draftTag));
      });

      const quickSave = images => {
        const t = root.querySelector('#mt').value.trim();
        if (!t && !(images && images.length)) return L.toast('寫一句話再念吧 ♡');
        const rec = col().add({ text: t, date: D.today(), time: nowTime(), tag: draftTag, images: [] });
        root.querySelector('#mt').value = '';
        draftTag = '';
        L.toast('收到你的碎碎念了 ♡');
        ctx.refresh();
        if (images && images.length) {
          L.IDB.putMany(images, 5000).then(keys => {
            const r2 = col().find(rec.id);
            if (r2) { col().update(rec.id, { images: keys.filter(Boolean) }); ctx.refresh(); }
          }).catch(() => { });
        }
      };
      root.querySelector('#msave').onclick = () => quickSave(null);
      root.querySelector('#mphoto').onclick = async () => {
        const arr = await U.pickImages(1000, 0.7);
        if (arr.length) quickSave(arr);
      };

      const rnd = root.querySelector('#mrand');
      if (rnd) rnd.onclick = () => {
        const all = col().all().filter(r => r.text);
        if (!all.length) return L.toast('還沒有可以翻的碎碎念 ♡');
        const r = all[Math.floor(Math.random() * all.length)];
        L.modal(D.pretty(r.date) + ' 的碎碎念',
          '<div class="ai-box" style="margin-top:0"><div class="who">' + icon('bubble', 16) + U.esc(r.date + ' ' + (r.time || '')) +
          (r.tag ? ' · ' + U.esc(r.tag) : '') + '</div><p>' + L.nl2br(r.text) + '</p></div>' +
          '<div class="muted center mt8" style="font-size:12px">那時候的你，已經想通了這件事 ♡</div>');
      };

      /* 今日清單 + 月曆：事件委派 */
      const onClick = e => {
        const t = e.target;
        const ed = t.closest && t.closest('[data-medit]');
        if (ed) return self.form(ctx, col().find(ed.dataset.medit));
        const dl = t.closest && t.closest('[data-mdel]');
        if (dl) return self.askDelete(ctx, dl.dataset.mdel);
        const nav = t.closest && t.closest('[data-mcal]');
        if (nav) {
          if (nav.dataset.mcal === 'prev') { calM--; if (calM < 0) { calM = 11; calY--; } }
          else { calM++; if (calM > 11) { calM = 0; calY++; } }
          root.querySelector('#mcal').innerHTML = calHTML();
          return;
        }
        const cell = t.closest && t.closest('[data-mdate]');
        if (cell) self.dayModal(ctx, cell.dataset.mdate);
      };
      root.querySelector('#mtoday').addEventListener('click', onClick);
      root.querySelector('#mcalwrap').addEventListener('click', onClick);
    },

    dayModal(ctx, key) {
      const self = this;
      const arr = byDate()[key] || [];
      L.modal(D.pretty(key) + ' 星期' + D.weekday(key) + ' · 碎碎念',
        (arr.length ? arr.map(r => itemHTML(r, true)).join('')
          : '<div class="muted center" style="padding:16px">這天沒有碎碎念 ♡</div>') +
        '<button class="btn block mt8" id="mnew">＋ 為這天補一則</button>',
        (body, close) => {
          L.hydrateImages(body);
          body.addEventListener('click', e => {
            const ed = e.target.closest && e.target.closest('[data-medit]');
            if (ed) { close(); return self.form(ctx, col().find(ed.dataset.medit)); }
            const dl = e.target.closest && e.target.closest('[data-mdel]');
            if (dl) { close(); return self.askDelete(ctx, dl.dataset.mdel); }
          });
          body.querySelector('#mnew').onclick = () => { close(); self.form(ctx, { date: key }); };
        });
    },

    async askDelete(ctx, id) {
      if (!await L.confirm('刪除碎碎念', '確定刪掉這則碎碎念嗎？')) return;
      const r = col().find(id);
      if (r && r.images) r.images.forEach(k => { try { L.IDB.del(k); } catch (e) { } });
      col().remove(id); ctx.refresh();
    },

    /* ---------- 新增 / 編輯 ---------- */
    form(ctx, rec) {
      const r = rec || {};
      const editing = !!(rec && rec.id);
      const keep = (r.images || []).slice();
      const added = [];
      let tag = r.tag || '';
      L.modal(editing ? '編輯碎碎念' : '補一則碎碎念',
        '<div class="field"><label>內容</label>' +
        '<textarea class="inp" id="f-t" style="min-height:120px;line-height:1.8" placeholder="想到了什麼？">' + U.esc(r.text || '') + '</textarea></div>' +
        '<div class="grid2">' +
        '<div class="field"><label>日期</label><input class="inp" type="date" id="f-d" value="' + U.esc(r.date || D.today()) + '"></div>' +
        '<div class="field"><label>時間</label><input class="inp" type="time" id="f-tm" value="' + U.esc(r.time || nowTime()) + '"></div></div>' +
        '<div class="field"><label>小標籤（可不選）</label><div class="row" id="f-tags">' + TAGS.map(t =>
          '<button class="tab' + (tag === t ? ' on' : '') + '" data-t="' + U.esc(t) + '">' + U.esc(t) + '</button>').join('') + '</div></div>' +
        '<div class="field"><label>照片</label><div class="uploader" id="f-up"><div class="hint">📷 點此上傳照片 / 拍照 ♡</div></div>' +
        '<div class="thumb-row" id="f-th"></div></div>' +
        L.formFooter({ isEdit: editing, okText: editing ? '💾 保存修改' : '收進碎碎念 ♡' }),
        (body, close) => {
          L.bindCancel(body, close);
          body.querySelectorAll('#f-tags [data-t]').forEach(b => b.onclick = () => {
            tag = tag === b.dataset.t ? '' : b.dataset.t;
            body.querySelectorAll('#f-tags [data-t]').forEach(x => x.classList.toggle('on', x.dataset.t === tag));
          });
          const box = body.querySelector('#f-th');
          const paint = () => {
            box.innerHTML = keep.map((k, i) => '<div class="thumb">' + L.imgTag(k) + '<span class="x" data-rmold="' + i + '">×</span></div>').join('') +
              added.map((s, i) => '<div class="thumb"><img src="' + s + '"><span class="x" data-rmnew="' + i + '">×</span></div>').join('');
            box.querySelectorAll('[data-rmold]').forEach(b => b.onclick = () => { keep.splice(+b.dataset.rmold, 1); paint(); });
            box.querySelectorAll('[data-rmnew]').forEach(b => b.onclick = () => { added.splice(+b.dataset.rmnew, 1); paint(); });
            try { L.hydrateImages(box); } catch (e) { }
          };
          paint();
          body.querySelector('#f-up').onclick = async () => { const a = await U.pickImages(1000, 0.7); added.push.apply(added, a); paint(); };

          let saving = false;
          body.querySelector('#ok').onclick = async () => {
            if (saving) return;
            const t = L.val(body, 'f-t').trim();
            if (!t && !keep.length && !added.length) return L.toast('寫一句話吧 ♡');
            saving = true;
            const date = L.val(body, 'f-d') || D.today();
            const data = { text: t, date: date, time: L.val(body, 'f-tm') || nowTime(), tag: tag, images: keep.slice() };
            let id;
            if (editing) { col().update(rec.id, data); id = rec.id; } else { id = col().add(data).id; }
            (r.images || []).forEach(k => { if (keep.indexOf(k) < 0) { try { L.IDB.del(k); } catch (e) { } } });
            const d = D.parse(date); if (d) { calY = d.getFullYear(); calM = d.getMonth(); }
            close(); L.toast(editing ? '已更新 ♡' : '收到你的碎碎念了 ♡'); ctx.refresh();
            if (added.length) {
              try {
                const keys = await L.IDB.putMany(added, 5000);
                const r2 = col().find(id);
                if (r2) { col().update(id, { images: (r2.images || []).concat(keys.filter(Boolean)) }); ctx.refresh(); }
              } catch (e) { }
            }
          };
        });
    }
  };
})(window.Lume);
