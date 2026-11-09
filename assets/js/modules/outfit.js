/* ============================================================
   outfit.js — 穿搭助手：天氣建議 / OOTD / 我的衣櫃 / 穿搭歷史
   ============================================================ */
window.Lume = window.Lume || {}; window.Lume.modules = window.Lume.modules || window.Lume.modules;
(function (L) {
  'use strict';
  const { D, U, icon, Store } = L;
  const oCol = () => Store.col('outfits');
  const wCol = () => Store.col('wardrobe');
  let cal = null, wcat = 'top', weatherCache = null;

  function seasonOf(m) {
    if (m >= 5 && m <= 8) return 'hot';
    if (m >= 3 && m <= 4 || m === 9 || m === 10) return m === 9 || m === 10 ? 'warm' : 'warm';
    if (m === 11 || m === 2) return 'cool';
    return 'cold';
  }
  const SEASON_LABEL = { hot: '夏季 · 炎熱', warm: '春秋 · 舒適', cool: '微涼 · 轉季', cold: '冬季 · 寒冷' };

  async function fetchWeather() {
    if (weatherCache) return weatherCache;
    const prof = Store.doc('profile').get();
    let lat = 25.033, lon = 121.565;   // 預設：台北
    const city = prof.city || '';
    const CITY = { '台北': [25.033, 121.565], '台中': [24.147, 120.673], '高雄': [22.627, 120.301], '北京': [39.904, 116.407], '上海': [31.23, 121.473], '广州': [23.129, 113.264], '深圳': [22.543, 114.057], '香港': [22.319, 114.169], '首尔': [37.566, 126.978] };
    if (CITY[city]) { lat = CITY[city][0]; lon = CITY[city][1]; }
    try {
      const r = await Promise.race([
        fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&current=temperature_2m,weather_code&timezone=auto'),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 6000))
      ]);
      const j = await r.json();
      weatherCache = { temp: j.current.temperature_2m, code: j.current.weather_code, ok: true };
    } catch (e) {
      weatherCache = { temp: null, ok: false };
    }
    return weatherCache;
  }
  function codeText(c) {
    if (c == null) return '';
    if (c === 0) return '晴朗';
    if (c <= 2) return '多雲';
    if (c === 3) return '陰天';
    if (c <= 48) return '有霧';
    if (c <= 57) return '毛毛雨';
    if (c <= 67) return '有雨';
    if (c <= 77) return '雨雪';
    if (c <= 82) return '陣雨';
    if (c <= 86) return '陣雪';
    return '雷雨';
  }

  function marks() {
    const m = {};
    oCol().all().forEach(o => { (m[o.date] = m[o.date] || []).push('pink'); });
    return m;
  }

  L.modules.outfit = {
    id: 'outfit', name: '穿搭助手', icon: 'shirt',
    render() {
      if (!cal) { const n = new Date(); cal = { y: n.getFullYear(), m: n.getMonth(), sel: D.today() }; }
      const w = weatherCache;
      const m = new Date().getMonth();
      const season = seasonOf(m);
      const tips = L.OUTFIT_TIPS[season];
      const todayOOTD = oCol().where(o => o.date === D.today());
      return '' +
        '<div class="card tinted"><h3>' + icon('cloudSun') + '天氣與穿搭建議</h3>' +
        '<div id="wbox">' + (w ?
          '<div class="spread"><div><b style="font-size:26px;color:var(--lav-700)">' +
          (w.ok ? Math.round(w.temp) + '°' : '--') + '</b>' +
          '<div class="muted">' + (w.ok ? codeText(w.code) : '目前無法取得即時天氣') + ' · ' + (Store.doc('profile').get().city || '預設地區') + '</div></div>' +
          '<span class="chip sun">' + SEASON_LABEL[season] + '</span></div>'
          : '<div class="muted">正在取得天氣…</div>') + '</div>' +
        '<div class="deco-line"></div>' +
        '<div class="muted mb8">今日穿搭建議</div>' +
        '<div class="row">' + tips.map(t => '<span class="chip" style="padding:6px 11px;line-height:1.6">' + t + '</span>').join('') + '</div>' +
        '<div class="row mt8"><button class="btn ghost sm" data-city>設定城市</button></div></div>' +

        '<div class="sec-title"><h2>📸 今日穿搭 OOTD</h2><button class="btn sm" data-add>＋ 上傳</button></div>' +
        '<div class="card">' + (todayOOTD.length
          ? '<div class="row">' + todayOOTD.map(o => '<div style="position:relative;width:120px">' +
            L.imgTag(o.image, '', 'width:120px;height:160px;object-fit:cover;border-radius:14px;border:1px solid var(--lav-200)') +
            '<div class="row mt8" style="gap:4px;justify-content:center">' + L.editBtn(o.id, 'oedit') +
            '<button class="mini-btn" data-del="' + o.id + '">刪除</button></div>' +
            (o.note ? '<div class="muted" style="font-size:11px;margin-top:3px">' + U.esc(o.note) + '</div>' : '') + '</div>').join('') + '</div>'
          : '<div class="muted center" style="padding:14px">今天還沒上傳穿搭 ♡</div>') + '</div>' +

        '<div class="sec-title"><h2>👗 我的衣櫃</h2><button class="btn sm" data-addw>＋ 新增單品</button></div>' +
        '<div class="tabs mb8">' + L.WARDROBE_CATS.map(c =>
          '<button class="tab' + (wcat === c.k ? ' on' : '') + '" data-wc="' + c.k + '">' + c.t + ' ' +
          wCol().where(x => x.category === c.k).length + '</button>').join('') + '</div>' +
        '<div class="card">' + (() => {
          const arr = wCol().where(x => x.category === wcat);
          return arr.length ? '<div class="books">' + arr.map(x =>
            '<div class="book"><div class="cover">' + (x.image ? L.imgTag(x.image) : '<div class="ph">' + U.esc(x.name) + '</div>') + '</div>' +
            '<div class="info"><b>' + U.esc(x.name) + '</b>' +
            (x.tags ? '<span>' + U.esc(x.tags) + '</span>' : '') +
            '<div class="row mt8">' + L.editBtn(x.id, 'wedit') +
            '<button class="mini-btn" data-delw="' + x.id + '">移除</button></div></div></div>').join('') + '</div>'
            : L.empty('這個分類還沒有單品 ♡', 'shirt');
        })() + '</div>' +

        '<div class="sec-title"><h2>🗓 穿搭歷史</h2></div>' +
        '<div class="card"><div id="ocal">' + L.calendarHTML({ year: cal.y, month: cal.m, marks: marks(), selected: cal.sel }) + '</div>' +
        '<div class="deco-line"></div><div class="muted mb8">' + D.pretty(cal.sel) + ' 的穿搭</div>' +
        '<div class="row">' + (oCol().where(o => o.date === cal.sel).length
          ? oCol().where(o => o.date === cal.sel).map(o => L.imgTag(o.image, '', 'width:96px;height:128px;object-fit:cover;border-radius:12px;border:1px solid var(--lav-200)')).join('')
          : '<div class="muted">這天沒有記錄 ♡</div>') + '</div></div>';
    },
    async mount(root, ctx) {
      if (!weatherCache) {
        await fetchWeather();
        // 等天氣的這段時間若已經切到別頁，就不要再動畫面（避免操作到被換掉的 DOM）
        if (!root.querySelector('#wbox')) return;
        ctx.refresh();     // 重新 render 一次，這次 weatherCache 已有值，會走下面的同步流程
        return;
      }
      root.querySelector('[data-city]').onclick = () => {
        const p = Store.doc('profile').get();
        L.modal('設定城市', '<div class="field"><label>城市（台北 / 台中 / 高雄 / 北京 / 上海 / 广州 / 深圳 / 香港 / 首尔）</label>' +
          '<input class="inp" id="c" value="' + U.esc(p.city || '') + '"></div>' +
          '<button class="btn block" id="ok">儲存 ♡</button>', (body, close) => {
            body.querySelector('#ok').onclick = () => {
              Store.doc('profile').set({ city: body.querySelector('#c').value.trim() });
              weatherCache = null; close(); ctx.refresh();
            };
          });
      };
      root.querySelector('[data-add]').onclick = () => this.ootdForm(ctx, null);
      root.querySelectorAll('[data-oedit]').forEach(b => b.onclick = () => this.ootdForm(ctx, oCol().find(b.dataset.oedit)));
      root.querySelector('[data-addw]').onclick = () => this.itemForm(ctx, null);
      root.querySelectorAll('[data-wedit]').forEach(b => b.onclick = () => this.itemForm(ctx, wCol().find(b.dataset.wedit)));
      root.querySelectorAll('[data-wc]').forEach(b => b.onclick = () => { wcat = b.dataset.wc; ctx.refresh(); });
      root.querySelectorAll('[data-delw]').forEach(b => b.onclick = () => {
        const it = wCol().find(b.dataset.delw);
        if (it && it.image) L.IDB.del(it.image);
        wCol().remove(b.dataset.delw); ctx.refresh();
      });
      root.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
        if (await L.confirm('刪除穿搭', '確定刪掉這張穿搭嗎？')) {
          const it = oCol().find(b.dataset.del);
          if (it && it.image) L.IDB.del(it.image);
          oCol().remove(b.dataset.del); ctx.refresh();
        }
      });
      root.querySelectorAll('[data-cal]').forEach(b => b.onclick = () => {
        cal.m += b.dataset.cal === 'next' ? 1 : -1;
        if (cal.m > 11) { cal.m = 0; cal.y++; }
        if (cal.m < 0) { cal.m = 11; cal.y--; }
        ctx.refresh();
      });
      root.querySelectorAll('.cal-cell[data-date]').forEach(c => c.onclick = () => { cal.sel = c.dataset.date; ctx.refresh(); });
    },

    /* ---------- OOTD：上傳 / 編輯 ---------- */
    ootdForm(ctx, rec) {
      const o = rec || {};
      const img = L.imageField({ id: 'ot', value: o.image || '', label: '照片' });
      L.modal(rec ? '編輯這天的穿搭' : '上傳今日穿搭',
        img.html +
        '<div class="field"><label>穿搭筆記</label><input class="inp" id="f-n" value="' + U.esc(o.note || '') + '" placeholder="例如：米白針織＋牛仔長裙"></div>' +
        '<div class="field"><label>日期</label><input class="inp" type="date" id="f-d" value="' + (o.date || D.today()) + '"></div>' +
        L.formFooter({ isEdit: !!rec }),
        (body, close) => {
          L.bindCancel(body, close);
          const up = img.mount(body);
          body.querySelector('#ok').onclick = async () => {
            const key = await up.save(rec ? rec.image : '');
            if (!key) return L.toast('請先選一張照片 ♡');
            const data = { date: L.val(body, 'f-d') || D.today(), image: key, note: L.val(body, 'f-n').trim() };
            if (rec) oCol().update(rec.id, data); else oCol().add(data);
            close(); L.toast(rec ? '已更新 ♡' : '穿搭已收藏 ♡'); ctx.refresh();
          };
        });
    },

    /* ---------- 衣櫃單品：新增 / 編輯 ---------- */
    itemForm(ctx, rec) {
      const x = rec || {};
      const img = L.imageField({ id: 'it', value: x.image || '', label: '照片' });
      L.modal(rec ? '編輯單品' : '新增衣櫃單品',
        '<div class="field"><label>名稱 <span class="req">*</span></label>' +
        '<input class="inp" id="f-n" value="' + U.esc(x.name || '') + '" placeholder="例如：米白針織上衣"></div>' +
        '<div class="field"><label>分類</label><select class="inp" id="f-c">' +
        L.WARDROBE_CATS.map(c => '<option value="' + c.k + '"' + ((x.category || wcat) === c.k ? ' selected' : '') + '>' + c.t + '</option>').join('') +
        '</select></div>' +
        '<div class="field"><label>顏色 / 材質 / 備註</label><input class="inp" id="f-t" value="' + U.esc(x.tags || '') + '" placeholder="例如：棉 · 米白"></div>' +
        img.html +
        L.formFooter({ isEdit: !!rec }),
        (body, close) => {
          L.bindCancel(body, close);
          const up = img.mount(body);
          body.querySelector('#ok').onclick = async () => {
            const n = L.val(body, 'f-n').trim();
            if (!n) return L.toast('請填寫名稱 ♡');
            const cat = L.val(body, 'f-c');
            const data = { name: n, category: cat, tags: L.val(body, 'f-t').trim(), image: await up.save(rec ? rec.image : '') };
            if (rec) wCol().update(rec.id, data); else wCol().add(data);
            wcat = cat;
            close(); L.toast(rec ? '已更新 ♡' : '已放進衣櫃 ♡'); ctx.refresh();
          };
        });
    }
  };
})(window.Lume);
