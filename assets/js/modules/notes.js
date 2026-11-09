/* ============================================================
   notes.js — 文案：靈感收集箱（標籤分類 / 一鍵複製）
   ============================================================ */
window.Lume = window.Lume || {}; window.Lume.modules = window.Lume.modules || window.Lume.modules;
(function (L) {
  'use strict';
  const { D, U, icon, Store } = L;
  const col = () => Store.col('notes');
  let filter = '全部';
  let kw = '';

  function tagsOf(n) { return n.tags || []; }

  L.modules.notes = {
    id: 'notes', name: '文案', icon: 'quote',
    render() {
      const all = col().all();
      const cats = ['全部'].concat(L.NOTE_TAGS);
      let list = all.filter(n => filter === '全部' || tagsOf(n).includes(filter));
      if (kw) list = list.filter(n => (n.text || '').toLowerCase().includes(kw.toLowerCase()));
      return '' +
        '<div class="card tinted"><h3>' + icon('quote') + '隨手記下靈感</h3>' +
        '<textarea class="inp" id="nt" placeholder="突然想到的文案、金句、靈感片段或文章摘錄…"></textarea>' +
        '<div class="row mt8" id="tagpick">' + L.NOTE_TAGS.map(t =>
          '<button class="tab" data-tag="' + t + '">' + t + '</button>').join('') + '</div>' +
        '<div class="row mt8"><button class="btn block" id="save">收藏這段靈感 ♡</button></div></div>' +

        '<div class="sec-title"><h2>🗂 靈感收集箱</h2><span class="muted">' + list.length + ' 則</span></div>' +
        '<div class="row mb8"><input class="inp" id="kw" placeholder="搜尋關鍵字…" value="' + U.esc(kw) + '" style="flex:1;min-width:150px"></div>' +
        '<div class="tabs mb8">' + cats.map(c => '<button class="tab' + (filter === c ? ' on' : '') + '" data-f="' + c + '">' + c + '</button>').join('') + '</div>' +
        '<div id="nlist">' + (list.length ? list.map(n =>
          '<div class="card" style="padding:14px"><p style="white-space:pre-wrap;margin:0 0 8px;font-size:14.5px;line-height:1.8">' + L.nl2br(n.text) + '</p>' +
          '<div class="row" style="align-items:center">' + tagsOf(n).map(t => '<span class="chip">' + U.esc(t) + '</span>').join('') +
          '<span class="muted">' + (n.createdAt || '').slice(0, 10) + '</span>' +
          '<span style="flex:1"></span>' +
          '<button class="btn soft sm" data-copy="' + n.id + '">一鍵複製</button>' +
          L.editBtn(n.id) +
          '<button class="mini-btn" data-del="' + n.id + '">刪除</button></div></div>').join('')
          : '<div class="card">' + L.empty('還沒有靈感，想到什麼就寫下來 ♡', 'quote') + '</div>') + '</div>';
    },
    mount(root, ctx) {
      let picked = [];
      const active = new Set();
      root.querySelectorAll('#tagpick [data-tag]').forEach(b => b.onclick = () => {
        const t = b.dataset.tag;
        if (active.has(t)) { active.delete(t); b.classList.remove('on'); }
        else { active.add(t); b.classList.add('on'); }
        picked = [...active];
      });
      root.querySelector('#save').onclick = () => {
        const t = root.querySelector('#nt').value.trim();
        if (!t) return L.toast('寫點什麼再收藏吧 ♡');
        col().add({ text: t, tags: picked.slice() });
        L.toast('已收進靈感箱 ♡'); ctx.refresh();
      };
      root.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f; ctx.refresh(); });
      const kwEl = root.querySelector('#kw');
      kwEl.oninput = () => { kw = kwEl.value; };
      kwEl.onkeydown = e => { if (e.key === 'Enter') ctx.refresh(); };
      root.querySelectorAll('[data-copy]').forEach(b => b.onclick = () => {
        const n = col().find(b.dataset.copy);
        U.copy(n.text); L.toast('已複製到剪貼簿 ♡');
      });
      root.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
        if (await L.confirm('刪除靈感', '確定刪掉這段文案嗎？')) { col().remove(b.dataset.del); ctx.refresh(); }
      });
      root.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => this.form(ctx, col().find(b.dataset.edit)));
    },

    /* ---------- 新增 / 編輯靈感 ---------- */
    form(ctx, rec) {
      const n = rec || {};
      const init = n.tags || [];
      L.modal(rec ? '編輯這段靈感' : '新增靈感',
        '<div class="field"><label>內容 <span class="req">*</span></label>' +
        '<textarea class="inp" id="f-t" style="min-height:150px;line-height:1.8" placeholder="突然想到的文案、金句、靈感片段…">' + U.esc(n.text || '') + '</textarea></div>' +
        '<div class="field"><label>標籤（可複選）</label><div class="row" id="f-tags">' +
        L.NOTE_TAGS.map(t => '<button class="tab' + (init.indexOf(t) >= 0 ? ' on' : '') + '" data-t="' + U.esc(t) + '">' + U.esc(t) + '</button>').join('') +
        '</div></div>' +
        '<div class="field"><label>新增自訂標籤（可不填，用逗號分隔）</label>' +
        '<input class="inp" id="f-ct" placeholder="例如：客戶提案、IG 貼文"></div>' +
        L.formFooter({ isEdit: !!rec }),
        (body, close) => {
          L.bindCancel(body, close);
          const active = new Set(init);
          body.querySelectorAll('#f-tags [data-t]').forEach(b => b.onclick = () => {
            const t = b.dataset.t;
            if (active.has(t)) { active.delete(t); b.classList.remove('on'); }
            else { active.add(t); b.classList.add('on'); }
          });
          body.querySelector('#ok').onclick = () => {
            const t = L.val(body, 'f-t').trim();
            if (!t) return L.toast('寫點什麼吧 ♡');
            const custom = L.val(body, 'f-ct').split(/[,，、]/).map(s => s.trim()).filter(Boolean);
            const tags = Array.from(new Set(Array.from(active).concat(custom)));
            const data = { text: t, tags };
            if (rec) col().update(rec.id, data); else col().add(data);
            close(); L.toast(rec ? '已更新 ♡' : '已收進靈感箱 ♡'); ctx.refresh();
          };
        });
    }
  };
})(window.Lume);
