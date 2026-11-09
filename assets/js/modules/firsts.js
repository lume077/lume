/* ============================================================
   firsts.js — 「初」成就記錄（人生第一次解鎖清單）
   ------------------------------------------------------------
   記錄「第一次做了什麼事情」的嘗試狀態，累積專屬 Lume 的成就感 ♡
   欄位：事件名稱 / 發生日期 / 心情感悟 / 照片記錄（＋分類）
   ============================================================ */
window.Lume = window.Lume || {}; window.Lume.modules = window.Lume.modules || {};
(function (L) {
  'use strict';
  const { D, U, icon, Store } = L;
  const col = () => Store.col('firsts');
  let filter = 'all';          // all | 今年 | 分類
  let showAll = false;

  /* 底部「初成就月曆」的狀態 */
  let fcalY = new Date().getFullYear();
  let fcalM = new Date().getMonth();
  let pickDate = '';           // 被點選、要在下方預覽的日期

  /** { 'yyyy-mm-dd': [record...] } */
  function fByDate() {
    const m = {};
    col().all().forEach(r => {
      if (!r || !r.date) return;
      (m[r.date] = m[r.date] || []).push(r);
    });
    Object.keys(m).forEach(k => m[k].sort((a, b) => (a.createdAt || '') < (b.createdAt || '') ? -1 : 1));
    return m;
  }

  /** 月曆：有解鎖的日子放上手繪小圖示 */
  function fcalHTML() {
    const map = fByDate();
    const first = D.firstDow(fcalY, fcalM);
    const total = D.daysInMonth(fcalY, fcalM);
    const today = D.today();
    let cells = '<div class="cal-dow">日</div><div class="cal-dow">一</div><div class="cal-dow">二</div>' +
      '<div class="cal-dow">三</div><div class="cal-dow">四</div><div class="cal-dow">五</div><div class="cal-dow">六</div>';
    for (let i = 0; i < first; i++) cells += '<div class="cal-cell out"></div>';
    let n = 0;
    for (let d = 1; d <= total; d++) {
      const key = fcalY + '-' + D.pad(fcalM + 1) + '-' + D.pad(d);
      const arr = map[key] || [];
      let inner = '<span>' + d + '</span>';
      if (arr.length) {
        n++;
        const hasPhoto = arr.some(r => (r.images || []).length);
        inner += '<div class="cal-icos">' +
          '<span class="cal-ico">' + icon('sprout', 15) + '</span>' +
          (arr.length > 1 ? '<span class="cal-ico tiny">' + arr.length + '</span>' : '') +
          (hasPhoto ? '<span class="cal-ico">' + icon('star', 15) + '</span>' : '') +
          '</div><i class="cal-dot" style="background:#87BBA0"></i>';
      }
      cells += '<div class="cal-cell' + (key === today ? ' today' : '') + (arr.length ? ' has' : '') +
        (key === pickDate ? ' sel' : '') + '" data-fdate="' + key + '">' + inner + '</div>';
    }
    return '<div class="cal-head">' +
      '<button class="icon-btn" data-fcal="prev" style="width:32px;height:32px">' +
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M15 5l-7 7 7 7" stroke="#8E6FC8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<b>' + fcalY + ' 年 ' + (fcalM + 1) + ' 月 · 解鎖 ' + n + ' 個</b>' +
      '<button class="icon-btn" data-fcal="next" style="width:32px;height:32px">' +
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M9 5l7 7-7 7" stroke="#8E6FC8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>' +
      '<div class="cal-grid">' + cells + '</div>' +
      '<div class="cal-legend mt8">' +
      '<span class="lg"><span style="width:15px;height:15px;display:inline-block">' + icon('sprout', 15) + '</span>當天有解鎖第一次</span>' +
      '<span class="lg"><span style="width:15px;height:15px;display:inline-block">' + icon('star', 15) + '</span>有照片記錄</span>' +
      '<span class="lg">點日期看那天發生了什麼 ♡</span></div>';
  }

  /** 點日期後，在月曆下方直接預覽當天的成就內容與照片 */
  function fPreviewHTML() {
    if (!pickDate) {
      return '<div class="muted center mt8" style="padding:14px;font-size:12.5px">' +
        '☁️ 點上面任何一個日期，這裡就會出現那天解鎖的「第一次」♡</div>';
    }
    const arr = fByDate()[pickDate] || [];
    if (!arr.length) {
      return '<div class="muted center mt8" style="padding:14px;font-size:12.5px">' +
        D.pretty(pickDate) + ' 星期' + D.weekday(pickDate) + ' 還沒有解鎖紀錄 ♡</div>' +
        '<button class="btn block mt8" data-fnew="' + U.esc(pickDate) + '">🌱 為這天補一個「第一次」</button>';
    }
    return '<div class="deco-line"></div>' +
      '<div class="spread mb8"><b style="font-size:13.5px">📅 ' + D.pretty(pickDate) + ' 星期' + D.weekday(pickDate) +
      ' · 解鎖 ' + arr.length + ' 個</b>' +
      '<button class="btn soft sm" data-fnew="' + U.esc(pickDate) + '">＋ 再加一個</button></div>' +
      arr.map(r =>
        '<div class="card soft" style="margin:0 0 10px;padding:12px">' +
        '<div class="spread"><div style="display:flex;align-items:flex-start;gap:8px;min-width:0">' +
        '<span class="first-seal" style="width:26px;height:26px;flex:0 0 26px">' + icon('sprout', 22) + '</span>' +
        '<div style="min-width:0"><b style="font-size:13.5px;line-height:1.5;word-break:break-word">' + U.esc(titleOf(r)) + '</b>' +
        '<div class="muted" style="margin-top:2px"><span class="chip">' + U.esc(catOf(r)) + '</span></div></div></div>' +
        '<div style="display:flex;flex-direction:column;gap:2px;align-items:flex-end;flex:0 0 auto">' +
        L.editBtn(r.id) + '<button class="mini-btn" data-del="' + U.esc(r.id) + '">刪除</button></div></div>' +
        (r.feeling ? '<p style="white-space:pre-wrap;margin:8px 0 0;font-size:13px;line-height:1.7">' + L.nl2br(r.feeling) + '</p>' : '') +
        ((r.images || []).length ? '<div class="thumb-row">' + r.images.map(k => '<div class="thumb">' + L.imgTag(k) + '</div>').join('') + '</div>' : '') +
        '</div>').join('');
  }

  /** 把紀錄的月份同步到月曆視窗（新增/編輯後才看得到標記） */
  function gotoFcal(date) {
    const d = D.parse(date);
    if (!d) return;
    fcalY = d.getFullYear(); fcalM = d.getMonth();
    pickDate = date;
  }

  /** 取得標題（沒有就從內文第一句自動抓） */
  function titleOf(r) {
    if (!r) return '';
    if (r.title && String(r.title).trim()) return String(r.title).trim();
    const first = String(r.feeling || '').split(/[\n。！？!?]/)[0].trim();
    return first ? (first.length > 22 ? first.slice(0, 22) + '…' : first) : '（沒有標題）';
  }

  function catOf(r) {
    const c = String((r && r.cat) || '其他');
    return L.FIRST_CATS.indexOf(c) >= 0 ? c : '其他';
  }

  function sorted() {
    return col().all().slice().sort((a, b) => (a.date || '') < (b.date || '') ? 1 : -1);
  }

  function stats() {
    const all = col().all();
    const y = String(new Date().getFullYear());
    const mk = D.monthKey(D.today());
    return {
      total: all.length,
      year: all.filter(r => (r.date || '').slice(0, 4) === y).length,
      month: all.filter(r => (r.date || '').slice(0, 7) === mk).length
    };
  }

  /** 篩選列 */
  function filterHTML() {
    const tabs = [{ k: 'all', t: '全部' }, { k: 'year', t: '今年' }]
      .concat(L.FIRST_CATS.map(c => ({ k: 'c:' + c, t: c })));
    return '<div class="dswitch" style="flex-wrap:wrap">' + tabs.map(t =>
      '<button type="button" class="dtab' + (filter === t.k ? ' on' : '') + '" style="flex:0 0 auto;padding:0 14px" data-ff="' +
      U.esc(t.k) + '">' + U.esc(t.t) + '</button>').join('') + '</div>';
  }

  function listOf() {
    const all = sorted();
    const y = String(new Date().getFullYear());
    if (filter === 'year') return all.filter(r => (r.date || '').slice(0, 4) === y);
    if (filter.indexOf('c:') === 0) return all.filter(r => catOf(r) === filter.slice(2));
    return all;
  }

  /** 單筆卡片 */
  function cardHTML(r) {
    const imgs = r.images || [];
    return '<div class="card first-card" data-fid="' + U.esc(r.id) + '">' +
      '<div class="spread">' +
      '<div style="display:flex;align-items:flex-start;gap:9px;min-width:0">' +
      '<span class="first-seal" title="人生解鎖">' + icon('sprout', 30) + '</span>' +
      '<div style="min-width:0">' +
      '<b style="font-size:14.5px;line-height:1.45;word-break:break-word">' + U.esc(titleOf(r)) + '</b>' +
      '<div class="muted" style="margin-top:3px">📅 ' + U.esc(r.date || '') + ' 星期' + D.weekday(r.date || D.today()) +
      ' · <span class="chip">' + U.esc(catOf(r)) + '</span></div>' +
      '</div></div>' +
      '<div style="display:flex;flex-direction:column;gap:2px;align-items:flex-end;flex:0 0 auto">' +
      L.editBtn(r.id) +
      '<button class="mini-btn" data-del="' + U.esc(r.id) + '">刪除</button></div></div>' +
      (r.feeling ? '<p style="white-space:pre-wrap;margin:10px 0 0;font-size:13.5px;line-height:1.75">' + L.nl2br(r.feeling) + '</p>' : '') +
      (imgs.length ? '<div class="thumb-row">' + imgs.map(k => '<div class="thumb">' + L.imgTag(k) + '</div>').join('') + '</div>' : '') +
      '</div>';
  }


  /* ============================================================
     🌳 成長之樹：一開始只有樹幹與樹枝，每解鎖一個「第一次」就長一片葉子
     · 葉子位置用固定種子決定 → 每次打開都長在同一個地方，不會亂跳
     · 葉子顏色依分類，點葉子可以看那一次的內容
     ============================================================ */
  const LEAF_COLORS = {
    '生活技能': '#9FCFB0', '工作與成長': '#7FB394', '人際與關係': '#F2B8C9', '自我挑戰': '#E8C46A',
    '旅行探索': '#8CC3D9', '手作與料理': '#F0C9A8', '身體與健康': '#B9DFA0', '其他': '#C7ACE9'
  };
  const BRANCHES = [
    // [起點x, 起點y, 控制點x, 控制點y, 終點x, 終點y, 粗細]
    [180, 210, 140, 196, 92, 160, 7], [180, 210, 220, 196, 268, 160, 7],
    [180, 182, 150, 150, 118, 104, 6], [180, 182, 210, 150, 242, 104, 6],
    [180, 176, 178, 128, 182, 58, 6],
    [138, 186, 108, 168, 66, 168, 3.5], [222, 186, 252, 168, 294, 168, 3.5],
    [130, 176, 112, 140, 84, 122, 3.5], [230, 176, 248, 140, 276, 122, 3.5],
    [158, 140, 140, 104, 146, 66, 3.5], [202, 140, 220, 104, 214, 66, 3.5],
    [181, 110, 160, 92, 136, 84, 2.6], [181, 100, 202, 84, 226, 80, 2.6]
  ];
  function seeded(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const qpt = (b, t) => {
    const u = 1 - t;
    return [u * u * b[0] + 2 * u * t * b[2] + t * t * b[4], u * u * b[1] + 2 * u * t * b[3] + t * t * b[5]];
  };
  const qdir = (b, t) => [2 * (1 - t) * (b[2] - b[0]) + 2 * t * (b[4] - b[2]), 2 * (1 - t) * (b[3] - b[1]) + 2 * t * (b[5] - b[3])];
  let LEAF_SPOTS = null;
  function leafSpots() {
    if (LEAF_SPOTS) return LEAF_SPOTS;
    const rnd = seeded(20000725);
    const spots = [];
    BRANCHES.forEach((b, bi) => {
      const ts = bi < 5 ? [0.38, 0.52, 0.66, 0.8, 0.92, 1] : [0.45, 0.65, 0.85, 1];
      ts.forEach(t => {
        const p = qpt(b, t), d = qdir(b, t);
        const len = Math.hypot(d[0], d[1]) || 1;
        const nx = -d[1] / len, ny = d[0] / len;
        const base = Math.atan2(d[1], d[0]) * 180 / Math.PI;
        [-1, 1, 0].forEach(side => {
          const off = side === 0 ? 0 : (7 + rnd() * 7) * side;
          const along = side === 0 ? 6 + rnd() * 4 : (rnd() - 0.5) * 6;
          spots.push({
            x: p[0] + nx * off + d[0] / len * along,
            y: p[1] + ny * off + d[1] / len * along,
            r: base + (side === 0 ? 0 : side * (40 + rnd() * 35)),
            s: 0.85 + rnd() * 0.4
          });
        });
      });
    });
    /* 樹冠補位：枝條長滿之後，葉子往樹冠外圍長 */
    for (let i = 0; i < 160; i++) {
      const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd());
      const x = 180 + Math.cos(a) * 118 * rr, y = 112 + Math.sin(a) * 74 * rr;
      if (y > 196) continue;
      spots.push({ x: x, y: y, r: rnd() * 360, s: 0.8 + rnd() * 0.45 });
    }
    /* 固定洗牌：葉子會平均地長滿整棵樹 */
    for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = spots[i]; spots[i] = spots[j]; spots[j] = t; }
    LEAF_SPOTS = spots;
    return spots;
  }

  function treeStage(n) {
    if (!n) return '還是一棵空空的小樹，等你的第一片葉子 ♡';
    if (n < 5) return '冒出新芽了，' + n + ' 片葉子正在曬太陽 ☀️';
    if (n < 15) return '枝頭開始熱鬧起來了，' + n + ' 片葉子 🌿';
    if (n < 40) return '已經是一棵有模有樣的小樹了，' + n + ' 片葉子 🌳';
    if (n < 100) return '枝葉越來越茂密，' + n + ' 片葉子替你遮風擋雨 🌳';
    return '一棵茂盛的大樹！' + n + ' 個第一次，都是你長出來的 ✨';
  }

  function treeHTML() {
    const recs = col().all().slice().sort((a, b) =>
      ((a.date || '') + (a.createdAt || '')) < ((b.date || '') + (b.createdAt || '')) ? -1 : 1);
    const spots = leafSpots();
    const trunk =
      '<path d="M166 286 C170 250 172 222 174 196 C175 180 176 172 178 160 L184 160 C185 174 186 182 187 196 C189 222 191 250 196 286 Z" fill="#B89A86"/>' +
      '<path d="M176 280 C178 250 179 224 180 200" stroke="#9C7E6B" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".55"/>' +
      '<path d="M150 288 C164 280 172 282 181 284 C190 282 198 280 212 288" stroke="#B89A86" stroke-width="5" fill="none" stroke-linecap="round"/>';
    const branches = BRANCHES.map(b =>
      '<path d="M' + b[0] + ' ' + b[1] + ' Q' + b[2] + ' ' + b[3] + ' ' + b[4] + ' ' + b[5] + '" stroke="#B89A86" stroke-width="' + b[6] +
      '" fill="none" stroke-linecap="round"/>').join('');
    const newest = recs.length ? recs[recs.length - 1].id : '';
    const leaves = recs.map((r, i) => {
      const sp = spots[i % spots.length];
      const lap = Math.floor(i / spots.length);           // 位置用完後，往旁邊再疊一層，樹會越來越密
      const x = sp.x + lap * 4.5, y = sp.y - lap * 3.5;
      const c = LEAF_COLORS[catOf(r)] || LEAF_COLORS['其他'];
      return '<g class="leaf' + (r.id === newest ? ' leaf-new' : '') + '" data-leaf="' + U.esc(r.id) + '" transform="translate(' +
        x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + (sp.r + lap * 23).toFixed(0) + ') scale(' + sp.s.toFixed(2) + ')">' +
        '<title>' + U.esc(titleOf(r) + ' · ' + (r.date || '')) + '</title>' +
        '<path d="M0 0 C4 -6 11 -6 15 0 C11 6 4 6 0 0 Z" fill="' + c + '" stroke="#ffffff" stroke-width=".8"/>' +
        '<path d="M1.5 0 L12 0" stroke="#ffffff" stroke-width=".7" opacity=".7"/></g>';
    }).join('');
    const used = {};
    recs.forEach(r => { used[catOf(r)] = 1; });
    const legend = Object.keys(used).map(k =>
      '<span class="lg"><i class="leaf-dot" style="background:' + LEAF_COLORS[k] + '"></i>' + U.esc(k) + '</span>').join('');
    return '<div class="tree-wrap"><svg class="first-tree" viewBox="0 0 360 296" role="img" aria-label="成長之樹">' +
      '<ellipse cx="181" cy="289" rx="92" ry="7" fill="#EFEAFB"/>' + trunk + branches + leaves + '</svg></div>' +
      '<div class="center muted" style="font-size:12.5px;margin-top:4px">' + treeStage(recs.length) + '</div>' +
      (legend ? '<div class="cal-legend mt8" style="justify-content:center">' + legend + '</div>' : '') +
      (recs.length ? '<div class="center muted" style="font-size:11px;margin-top:4px">點葉子可以看那一次的「第一次」♡</div>' : '');
  }

  function leafModal(ctx, id) {
    const r = col().find(id);
    if (!r) return;
    const imgs = r.images || [];
    L.modal('🍃 ' + titleOf(r),
      '<div class="muted mb8">📅 ' + U.esc(r.date || '') + ' 星期' + D.weekday(r.date || D.today()) + ' · <span class="chip">' + U.esc(catOf(r)) + '</span></div>' +
      (r.feeling ? '<p style="white-space:pre-wrap;margin:0;font-size:13.5px;line-height:1.75">' + L.nl2br(r.feeling) + '</p>' : '') +
      (imgs.length ? '<div class="thumb-row">' + imgs.map(k => '<div class="thumb">' + L.imgTag(k) + '</div>').join('') + '</div>' : '') +
      '<div class="row mt14"><button class="btn ghost" id="le" style="flex:1">✏️ 編輯</button>' +
      '<button class="btn ghost" id="ld" style="flex:1;color:var(--danger);border-color:#F0C9CE">刪除</button></div>',
      (body, close) => {
        L.hydrateImages(body);
        body.querySelector('#le').onclick = () => { close(); L.modules.firsts.form(ctx, r); };
        body.querySelector('#ld').onclick = () => { close(); L.modules.firsts.askDelete(ctx, r.id); };
      });
  }

  L.modules.firsts = {
    id: 'firsts', name: '初', icon: 'sprout',

    render() {
      const st = stats();

      return '' +
        '<div class="card tinted"><h3>' + icon('sprout') + '「初」 · 人生第一次解鎖</h3>' +
        '<div class="muted" style="line-height:1.8">每一個「第一次」都是你替自己開的一扇門 ♡<br>' +
        '不管是第一次自己從頭到尾簽約、第一次手作生乳捲，還是第一次一個人旅行——' +
        '寫下來，它就會變成你走過的證據。</div>' +
        '<div class="stats mt14">' + L.stat(st.total, ' 個', '累計第一次') +
        L.stat(st.year, ' 個', '今年解鎖') + L.stat(st.month, ' 個', '本月新增') + '</div>' +
        '<button class="btn block mt14" id="fadd">🌱 記錄一個新的「第一次」</button></div>' +

        '<div class="sec-title"><h2>🌳 我的成長之樹</h2><span class="muted">每個第一次都是一片葉子</span></div>' +
        '<div class="card" id="ftree">' + treeHTML() + '</div>' +

        '<div class="sec-title"><h2>🗓 初成就月曆 · Milestone Calendar</h2>' +
        '<span class="muted">點日期看那天做了什麼 ♡</span></div>' +
        '<div class="card" id="fwrap">' +
        '<div id="fcal">' + fcalHTML() + '</div>' +
        '<div id="fpick">' + fPreviewHTML() + '</div></div>';
    },

    mount(root, ctx) {
      root.querySelector('#fadd').onclick = () => this.form(ctx, null);

      /* 成長之樹：點葉子看那一次 */
      const tree = root.querySelector('#ftree');
      if (tree) tree.addEventListener('click', e => {
        const lf = e.target.closest ? e.target.closest('[data-leaf]') : null;
        if (lf) leafModal(ctx, lf.getAttribute('data-leaf'));
      });

      /* ---- 初成就月曆：事件委派（切月 / 點日期） ---- */
      const wrap = root.querySelector('#fwrap');
      if (wrap) wrap.addEventListener('click', async e => {
        const nav = e.target.closest ? e.target.closest('[data-fcal]') : null;
        if (nav) {
          if (nav.dataset.fcal === 'prev') { fcalM--; if (fcalM < 0) { fcalM = 11; fcalY--; } }
          else { fcalM++; if (fcalM > 11) { fcalM = 0; fcalY++; } }
          const c = root.querySelector('#fcal');
          if (c) c.innerHTML = fcalHTML();
          return;
        }
        const cell = e.target.closest ? e.target.closest('[data-fdate]') : null;
        if (cell && cell.dataset.fdate) {
          pickDate = cell.dataset.fdate;
          const c = root.querySelector('#fcal');
          if (c) c.innerHTML = fcalHTML();
          const p = root.querySelector('#fpick');
          if (p) { p.innerHTML = fPreviewHTML(); L.hydrateImages(p); }
          return;
        }
        /* 預覽區：為這天補一個「第一次」 */
        const add = e.target.closest ? e.target.closest('[data-fnew]') : null;
        if (add) { this.form(ctx, { date: add.dataset.fnew }); return; }
        /* 預覽區的編輯 / 刪除（這兩塊是重繪出來的，只能用委派） */
        const ed = e.target.closest ? e.target.closest('[data-edit]') : null;
        if (ed) { this.form(ctx, col().find(ed.dataset.edit)); return; }
        const dl = e.target.closest ? e.target.closest('[data-del]') : null;
        if (dl) this.askDelete(ctx, dl.dataset.del);
      });
    },

    /** 刪除確認（清單與月曆預覽共用） */
    async askDelete(ctx, id) {
      if (!await L.confirm('刪除這筆「初」', '確定刪掉這個第一次的紀錄嗎？（含照片）')) return;
      const r = col().find(id);
      if (r && r.images) r.images.forEach(k => { try { L.IDB.del(k); } catch (e) { } });
      col().remove(id); ctx.refresh();
    },

    /* ---------- 新增 / 編輯 ---------- */
    form(ctx, rec) {
      const r = rec || {};
      /* ★ 只有真的有 id 才是編輯；從月曆按「為這天補一個」進來只帶 {date}，
         若誤判成編輯會變成 update(undefined) → 存不進去、畫面沒反應。 */
      const editing = !!(rec && rec.id);
      const keep = (r.images || []).slice();
      const added = [];

      const imgHTML = () => keep.map((k, i) => '<div class="thumb">' + L.imgTag(k) +
        '<span class="x" data-rmold="' + i + '">×</span></div>').join('') +
        added.map((s, i) => '<div class="thumb"><img src="' + s + '"><span class="x" data-rmnew="' + i + '">×</span></div>').join('');

      const date = r.date || D.today();
      const isBack = !editing && date !== D.today();

      L.modal(editing ? '編輯這個「第一次」'
        : (isBack ? '🗓 補寫 ' + D.pretty(date) + ' 的第一次' : '記錄一個新的「第一次」'),
        '<div class="field"><label>事件名稱 <span class="req">*</span></label>' +
        '<input class="inp" id="f-t" value="' + U.esc(r.title || '') + '" placeholder="例如：第一次自己從頭到尾簽約"></div>' +
        '<div class="grid2">' +
        '<div class="field"><label>發生日期</label><input class="inp" type="date" id="f-d" value="' + U.esc(date) + '"></div>' +
        '<div class="field"><label>分類</label><select class="inp" id="f-c">' +
        L.FIRST_CATS.map(c => '<option' + (catOf(r) === c ? ' selected' : '') + '>' + c + '</option>').join('') +
        '</select></div></div>' +
        (isBack ? '<div class="muted mb8" style="font-size:11.5px">♡ 這是補寫 ' + D.pretty(date) + ' 的第一次，一樣珍貴</div>' : '') +
        '<div class="field"><label>心情感悟</label>' +
        '<textarea class="inp" id="f-f" style="min-height:120px;line-height:1.8" placeholder="當下的感覺是什麼？學到了什麼？想對那時候的自己說什麼 ♡">' + U.esc(r.feeling || '') + '</textarea></div>' +
        '<div class="field"><label>照片記錄</label>' +
        '<div class="uploader" id="f-up"><div class="hint">📷 點此上傳照片 / 拍照 ♡</div></div>' +
        '<div class="thumb-row" id="f-th"></div></div>' +
        L.formFooter({ isEdit: editing, okText: editing ? '💾 保存修改' : '🌱 收進我的第一次' }),

        (body, close) => {
          L.bindCancel(body, close);
          const box = body.querySelector('#f-th');
          const paint = () => {
            box.innerHTML = imgHTML();
            box.querySelectorAll('[data-rmold]').forEach(b => b.onclick = () => { keep.splice(+b.dataset.rmold, 1); paint(); });
            box.querySelectorAll('[data-rmnew]').forEach(b => b.onclick = () => { added.splice(+b.dataset.rmnew, 1); paint(); });
            try { L.hydrateImages(box); } catch (e) { }
          };
          paint();
          body.querySelector('#f-up').onclick = async () => {
            const arr = await U.pickImages(1000, 0.7);
            added.push.apply(added, arr); paint();
          };

          let saving = false;
          body.querySelector('#ok').onclick = async () => {
            if (saving) return;                          // 防連點送出兩次
            const t = L.val(body, 'f-t').trim();
            if (!t) return L.toast('幫這個「第一次」取個名字吧 ♡');
            saving = true;
            const btn = body.querySelector('#ok');
            if (btn) { btn.disabled = true; btn.textContent = '💾 儲存中…'; }
            try {
              const data = {
                title: t,
                date: L.val(body, 'f-d') || D.today(),
                cat: L.val(body, 'f-c') || '其他',
                feeling: L.val(body, 'f-f').trim(),
                images: keep.slice()
              };
              let id;
              if (editing) { col().update(rec.id, data); id = rec.id; }
              else { id = col().add(data).id; }
              (r.images || []).forEach(k => { if (keep.indexOf(k) < 0) { try { L.IDB.del(k); } catch (e) { } } });
              gotoFcal(data.date);                       // 月曆跳到那天，標記馬上看得到
              close();
              L.toast(editing ? '已更新 ♡' : '又解鎖一個第一次了，好棒 ♡');
              ctx.refresh();
              /* 照片背景補上，失敗也不影響紀錄 */
              if (added.length) {
                (async () => {
                  try {
                    const keys = await L.IDB.putMany(added, 5000);
                    const rec2 = col().find(id);
                    if (!rec2) return;
                    col().update(id, { images: (rec2.images || []).concat(keys.filter(Boolean)) });
                    if (ctx && ctx.refresh) ctx.refresh();
                  } catch (e) { }
                })();
              }
            } catch (e) {
              saving = false;
              const b2 = body.querySelector('#ok');
              if (b2) { b2.disabled = false; b2.textContent = editing ? '💾 保存修改' : '🌱 收進我的第一次'; }
              L.toast('儲存時出了一點小狀況，再按一次試試 ♡');
            }
          };
        });
    }
  };
})(window.Lume);
