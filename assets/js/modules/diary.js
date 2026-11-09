/* ============================================================
   diary.js — 心靈與心態成長日記
   ------------------------------------------------------------
   ① 今天的心情
   ② 心態覺察：卡點（負向）＋ 正向收穫標籤 ＋ 轉念與自我對話
   ③ AI 心靈導師回覆（情感共鳴 → 針對卡點的轉念視角）
   ④ 直式時間軸清單（左：大日期＋星期／右：標題、摘要、自動關鍵字、照片）
   ⑤ 補寫：可自由選擇過去的任一天補上日記
   ⑥ 日記月曆回看
   ============================================================ */
window.Lume = window.Lume || {}; window.Lume.modules = window.Lume.modules || {};
(function (L) {
  'use strict';
  const { D, U, icon, Store } = L;
  const col = () => Store.col('diary');

  let mood = 'calm', imgs = [];
  let pending = null;          // 正在產生回覆的日記 id
  let blocks = [];             // 心態卡點（負向）
  let gifts = [];              // 正向收穫標籤
  let blockText = '';
  let reframe = '';
  let draftDate = D.today();   // 「補寫」用的日期（預設今天，可自由改）
  const expandD = {};          // 時間軸卡片展開全文
  let showMonth = false;       // 是否在月曆下方展開「這個月全部日記」

  function blockTitle(k) {
    const b = L.MIND_BLOCKS.find(x => x.k === k);
    return b ? b.t : k;
  }
  function giftTitle(k) {
    const b = (L.MIND_GIFTS || []).find(x => x.k === k);
    return b ? b.t : k;
  }
  const moodOf = (k) => L.MOODS.find(x => x.k === k) || L.MOODS[1];

  /** 標題：有寫就用，沒寫就自動抓內文第一句 */
  function titleOf(d) {
    if (!d) return '';
    if (d.title && String(d.title).trim()) return String(d.title).trim();
    const first = String(d.text || '').split(/[\n。！？!?．]/).map(s => s.trim()).filter(Boolean)[0] || '';
    if (!first) return '（沒有標題）';
    return first.length > 24 ? first.slice(0, 24) + '…' : first;
  }

  /** 關鍵字標籤 HTML（記錄上沒有就現場從內文抓一次，舊資料也能顯示） */
  function kwHTML(d) {
    let list = d.keywords;
    if (!list || !list.length) list = L.pickKeywords(d.text || '');
    if (!list.length) return '';
    return '<div class="kw-chips">' + list.map(k =>
      '<span class="kw" style="background:' + (k.bg || '#EFE7FB') + ';color:' + (k.fg || '#7A5AA8') + '">' +
      (k.emoji || '') + ' ' + U.esc(k.t) + '</span>').join('') + '</div>';
  }

  /* ============================================================
     日記月曆（Journal Calendar）
     ============================================================ */
  let calY = new Date().getFullYear();
  let calM = new Date().getMonth();

  function byDate() {
    const m = {};
    col().all().forEach(d => {
      if (!d || !d.date) return;
      (m[d.date] = m[d.date] || []).push(d);
    });
    Object.keys(m).forEach(k => m[k].sort((a, b) => (a.createdAt || '') < (b.createdAt || '') ? -1 : 1));
    return m;
  }

  function jcalHTML() {
    const map = byDate();
    const first = D.firstDow(calY, calM);
    const total = D.daysInMonth(calY, calM);
    const today = D.today();
    let cells = '<div class="cal-dow">日</div><div class="cal-dow">一</div><div class="cal-dow">二</div>' +
      '<div class="cal-dow">三</div><div class="cal-dow">四</div><div class="cal-dow">五</div><div class="cal-dow">六</div>';
    for (let i = 0; i < first; i++) cells += '<div class="cal-cell out"></div>';
    let n = 0;
    for (let d = 1; d <= total; d++) {
      const key = calY + '-' + D.pad(calM + 1) + '-' + D.pad(d);
      const arr = map[key] || [];
      let inner = '<span>' + d + '</span>';
      if (arr.length) {
        n++;
        const hasBlock = arr.some(x => (x.blocks || []).length || x.blockText);
        const hasGift = arr.some(x => (x.gifts || []).length);
        const hasReframe = arr.some(x => !!x.reframe);
        inner += '<div class="cal-icos">' +
          '<span class="cal-ico">' + icon('heart', 15) + '</span>' +
          (hasBlock ? '<span class="cal-ico">' + icon('star', 15) + '</span>' : '') +
          (hasGift ? '<span class="cal-ico">' + icon('sparkle', 15) + '</span>' : '') +
          (hasReframe ? '<span class="cal-ico">' + icon('flower', 15) + '</span>' : '') +
          '</div><i class="cal-dot" style="background:' + moodOf(arr[arr.length - 1].mood).c + '"></i>';
      }
      cells += '<div class="cal-cell' + (key === today ? ' today' : '') + (arr.length ? ' has' : '') +
        '" data-jdate="' + key + '">' + inner + '</div>';
    }
    return '<div class="cal-head">' +
      '<button class="icon-btn" data-jcal="prev" style="width:32px;height:32px">' +
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M15 5l-7 7 7 7" stroke="#8E6FC8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<b>' + calY + ' 年 ' + (calM + 1) + ' 月 · 寫了 ' + n + ' 篇</b>' +
      '<button class="icon-btn" data-jcal="next" style="width:32px;height:32px">' +
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M9 5l7 7-7 7" stroke="#8E6FC8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>' +
      '<div class="cal-grid">' + cells + '</div>' +
      '<div class="cal-legend mt8">' +
      '<span class="lg"><span style="width:15px;height:15px;display:inline-block">' + icon('heart', 15) + '</span>有寫日記</span>' +
      '<span class="lg"><span style="width:15px;height:15px;display:inline-block">' + icon('star', 15) + '</span>記錄了心態卡點</span>' +
      '<span class="lg"><span style="width:15px;height:15px;display:inline-block">' + icon('sparkle', 15) + '</span>正向收穫</span>' +
      '<span class="lg"><span style="width:15px;height:15px;display:inline-block">' + icon('flower', 15) + '</span>寫下轉念</span>' +
      '<span class="lg">圓點 = 當天心情</span></div>';
  }

  /** 點日期 → 回看當天的日記 / 心態 / 轉念 / AI 回覆 */
  function dayModal(ctx, key) {
    const arr = byDate()[key] || [];
    if (!arr.length) {
      L.modal(D.pretty(key) + ' · 這天還沒有寫日記',
        '<div class="muted center" style="padding:18px">這天沒有留下紀錄 ♡<br>想補寫的話，可以按下面的按鈕。</div>' +
        '<button class="btn block mt14" id="dnew">✏️ 為這天補寫一篇</button>',
        (body, close) => {
          body.querySelector('#dnew').onclick = () => { close(); L.modules.diary.form(ctx, { date: key }); };
        });
      return;
    }
    const html = arr.map(d => {
      const m = moodOf(d.mood);
      const bs = d.blocks || [];
      const gs = d.gifts || [];
      return '<div class="card soft" style="margin:0 0 12px;padding:12px">' +
        '<div class="spread"><div style="display:flex;align-items:center;gap:8px">' +
        '<div style="width:26px;height:26px">' + L.moodSVG(d.mood) + '</div>' +
        '<div><b style="font-size:13.5px">' + D.pretty(d.date) + ' 星期' + D.weekday(d.date) + '</b>' +
        '<div class="muted">心情：' + m.t + '</div></div></div>' +
        '<button class="mini-btn" data-jedit="' + U.esc(d.id) + '">✏️</button></div>' +
        '<div style="font-size:14px;font-weight:700;margin-top:8px;line-height:1.5">' + U.esc(titleOf(d)) + '</div>' +
        '<p style="white-space:pre-wrap;margin:8px 0 0;font-size:14px">' + L.nl2br(d.text || '') + '</p>' +
        kwHTML(d) +
        (bs.length || d.blockText ? '<div class="card soft mt8" style="padding:10px 12px">' +
          '<div class="muted mb8" style="font-size:11.5px">今日內心卡點</div>' +
          '<div class="sym-chips">' + bs.map(k => '<span class="chip" style="background:var(--lav-100)">' + U.esc(blockTitle(k)) + '</span>').join('') +
          (d.blockText ? '<span class="chip" style="background:#fff">' + U.esc(d.blockText) + '</span>' : '') + '</div></div>' : '') +
        (gs.length ? '<div class="card soft mt8" style="padding:10px 12px">' +
          '<div class="muted mb8" style="font-size:11.5px">🌱 今天的正向收穫</div>' +
          '<div class="sym-chips">' + gs.map(k => '<span class="chip mint">' + U.esc(giftTitle(k)) + '</span>').join('') + '</div></div>' : '') +
        (d.reframe ? '<div class="card soft mt8" style="padding:10px 12px">' +
          '<div class="muted mb8" style="font-size:11.5px">轉念 / 自我對話</div>' +
          '<div style="white-space:pre-wrap;font-size:13.5px">' + L.nl2br(d.reframe) + '</div></div>' : '') +
        (d.images && d.images.length ? '<div class="thumb-row">' + d.images.map(s => '<div class="thumb">' + L.imgTag(s) + '</div>').join('') + '</div>' : '') +
        (d.reply ? '<div class="ai-box" style="margin-top:8px"><div class="who">' + icon('sparkle', 16) + '當時的回覆</div><p>' + L.nl2br(d.reply) + '</p></div>' : '') +
        '</div>';
    }).join('');

    L.modal(D.pretty(key) + ' 星期' + D.weekday(key) + ' · 那天的心情',
      html + '<button class="btn block mt8" id="dnew">✏️ 再補一篇</button>',
      (body, close) => {
        L.hydrateImages(body);
        body.querySelectorAll('[data-jedit]').forEach(b => b.onclick = () => {
          close(); L.modules.diary.form(ctx, col().find(b.dataset.jedit));
        });
        body.querySelector('#dnew').onclick = () => { close(); L.modules.diary.form(ctx, { date: key }); };
      });
  }

  /* ============================================================
     AI 溫暖回覆
     ============================================================ */
  function extraOf(rec) {
    return {
      blocks: (rec && rec.blocks) || [],
      gifts: (rec && rec.gifts) || [],
      blockText: (rec && rec.blockText) || '',
      reframe: (rec && rec.reframe) || ''
    };
  }
  /* 日記 AI 回覆已停用（Lume 覺得每天都差不多）；舊日記的回覆仍會顯示 */
  function makeReply(ctx, id, text, moodKey, extra) {
    return Promise.resolve('');
    // eslint-disable-next-line no-unreachable
    if (!L.AI) return Promise.resolve('');
    pending = id; ctx.refresh();
    return L.AI.reply(text, moodKey, extra).then(r => {
      pending = null;
      try {
        col().update(id, { reply: r });
        if (L.modules.diary) L.modules.diary.lastReply = r;
      } catch (e) { }
      ctx.refresh();
      return r;
    }).catch(() => { pending = null; ctx.refresh(); return ''; });
  }

  function genReply(moodKey, text) {
    return L.AI ? L.AI.localReply(text, moodKey) : '';
  }

  /* ============================================================
     心態覺察區塊（卡點 ＋ 正向收穫 ＋ 轉念）
     ============================================================ */
  function mindHTML(sel, bt, rf, gs) {
    const list = sel || [];
    const gl = gs || [];
    return '<div class="mb8" style="font-size:13px">今日內心卡點 / 心態問題（可複選）</div>' +
      '<div class="mind-chips">' + L.MIND_BLOCKS.map(b =>
        '<button type="button" class="mind-chip' + (list.indexOf(b.k) >= 0 ? ' on' : '') + '" data-block="' + b.k +
        '" title="' + U.esc(b.hint) + '">' + U.esc(b.t) + '</button>').join('') + '</div>' +
      '<div class="field mt8"><label>卡點的細節（可不填）</label>' +
      '<input class="inp" id="dblock" value="' + U.esc(bt || '') + '" placeholder="例如：報告改了五次還是覺得不夠好…"></div>' +
      '<div class="deco-line"></div>' +
      '<div class="mb8" style="font-size:13px">🌱 今天的正向收穫 / 溫暖時刻（可複選）</div>' +
      '<div class="mind-chips">' + (L.MIND_GIFTS || []).map(b =>
        '<button type="button" class="mind-chip gift' + (gl.indexOf(b.k) >= 0 ? ' on' : '') + '" data-gift="' + b.k +
        '" title="' + U.esc(b.hint) + '">' + U.esc(b.t) + '</button>').join('') + '</div>' +
      '<div class="field mt8"><label>轉念 / 自我對話</label>' +
      '<textarea class="inp" id="dreframe" placeholder="我今天嘗試如何安放這個情緒？例如：我先允許自己交出 80 分的版本。">' + U.esc(rf || '') + '</textarea></div>' +
      ((list.length || gl.length) ? '<div class="mind-note">已選：' +
        (list.length ? '卡點「' + list.map(blockTitle).map(U.esc).join('、') + '」' : '') +
        (list.length && gl.length ? '　' : '') +
        (gl.length ? '收穫「' + gl.map(giftTitle).map(U.esc).join('、') + '」' : '') +
        '　♡ 覺察本身就是改變的開始</div>' : '');
  }

  /* ============================================================
     時間軸清單卡片（左：大日期＋星期 / 右：標題、摘要、關鍵字、照片）
     ============================================================ */
  function tlItem(d) {
    const m = moodOf(d.mood);
    const bs = d.blocks || [];
    const gs = d.gifts || [];
    const full = String(d.text || '');
    const long = full.length > 150;
    const open = !!expandD[d.id];
    const sum = long && !open ? full.slice(0, 150) + '…' : full;
    const dateNum = String(d.date || '').slice(8, 10) || '--';
    const ym = String(d.date || '').slice(0, 7);

    return '<div class="tl-item" data-did="' + U.esc(d.id) + '">' +
      '<div class="tl-date">' +
      '<b>' + U.esc(dateNum) + '</b>' +
      '<span>週' + D.weekday(d.date || D.today()) + '</span>' +
      '<em>' + U.esc(ym) + '</em>' +
      '<i class="tl-dot" style="background:' + m.c + '"></i>' +
      '</div>' +
      '<div class="tl-body">' +
      '<div class="tl-head">' +
      '<div class="tl-title">' + U.esc(titleOf(d)) + '</div>' +
      '<div class="tl-act">' + L.editBtn(d.id) +
      '<button class="mini-btn" data-del="' + U.esc(d.id) + '">刪除</button></div>' +
      '</div>' +
      '<div class="tl-meta"><span class="chip">' + m.t + '</span>' +
      (bs.length ? '<span class="chip" style="background:var(--lav-100)">卡點 ' + bs.length + '</span>' : '') +
      (gs.length ? '<span class="chip mint">收穫 ' + gs.length + '</span>' : '') +
      (d.reframe ? '<span class="chip sun">已轉念</span>' : '') +
      '</div>' +
      (full ? '<div class="tl-sum">' + L.nl2br(sum) + '</div>' +
        (long ? '<button class="btn soft sm mt8" data-dexp="' + U.esc(d.id) + '">' + (open ? '收合 ▲' : '展開全文 ▼') + '</button>' : '') : '') +
      kwHTML(d) +
      (d.images && d.images.length ? '<div class="thumb-row">' + d.images.map(s => '<div class="thumb">' + L.imgTag(s) + '</div>').join('') + '</div>' : '') +
      (gs.length ? '<div class="sym-chips mt8">' + gs.map(k => '<span class="chip mint">🌱 ' + U.esc(giftTitle(k)) + '</span>').join('') + '</div>' : '') +
      (bs.length || d.blockText ? '<div class="sym-chips mt8">' +
        bs.map(k => '<span class="chip" style="background:var(--lav-100)">' + U.esc(blockTitle(k)) + '</span>').join('') +
        (d.blockText ? '<span class="chip" style="background:#fff">' + U.esc(d.blockText) + '</span>' : '') + '</div>' : '') +
      (d.reframe ? '<div class="tl-reframe"><b>轉念</b>' + L.nl2br(d.reframe) + '</div>' : '') +
      (d.reply ? '<div class="ai-box"><div class="who">' + icon('sparkle', 18) + '當時的回覆</div><p>' + L.nl2br(d.reply) + '</p></div>' : '') +
      '</div></div>';
  }

  L.modules.diary = {
    id: 'diary', name: '日記', icon: 'pen',
    render() {
      const today = D.today();
      /* 主畫面只放「今天」的日記；過去的全部收進下方月曆，畫面保持乾淨 */
      const list = col().all().filter(d => (d.date || '') === today)
        .slice().sort((a, b) => (a.createdAt || '') < (b.createdAt || '') ? 1 : -1);
      const monthList = showMonth ? col().all().filter(d => (d.date || '').slice(0, 7) === (calY + '-' + D.pad(calM + 1)))
        .slice().sort((a, b) => (a.date || '') < (b.date || '') ? 1 : -1) : [];
      const total = col().all().length;
      const back = draftDate !== today;

      return '' +
        '<div class="card tinted"><h3>' + icon('heart') + '今天的心情是…</h3>' +
        '<div class="moods">' + L.MOODS.map(m =>
          '<div class="mood' + (mood === m.k ? ' on' : '') + '" data-mood="' + m.k + '">' + L.moodSVG(m.k) +
          '<span>' + m.t + '</span></div>').join('') + '</div></div>' +

        '<div class="card"><h3>' + icon('pen') + '寫點什麼給自己</h3>' +
        '<div class="field" style="margin-bottom:8px"><label>日期（可以自由選過去任何一天補寫 ♡）</label>' +
        '<input class="inp" type="date" id="ddate" value="' + U.esc(draftDate) + '"></div>' +
        (back ? '<div class="muted mb8" style="font-size:11.5px">♡ 正在補寫 <b>' + D.pretty(draftDate) +
          ' 星期' + D.weekday(draftDate) + '</b> 的日記</div>' : '') +
        '<div class="field"><label>標題（選填）</label>' +
        '<input class="inp" id="dtitle" placeholder="沒寫的話，會自動抓內文第一句當標題 ♡"></div>' +
        '<div class="muted mb8" style="font-size:12px">今天發生了什麼？心裡有什麼感受？想對自己說什麼都可以寫下來…</div>' +
        '<textarea class="inp" id="dtext" placeholder="今天發生了什麼？心裡有什麼感受？"></textarea>' +
        '<div class="row mt8"><button class="btn ghost sm" id="upimg">🖼 加入圖片</button>' +
        '<div class="thumb-row" id="thumbs" style="margin-top:0"></div></div>' +
        '<div class="muted mt8" style="font-size:11.5px">💡 送出後會自動從內文抓出食物 / 地點 / 事件 / 心情 / 人物 / 身體等關鍵字標籤</div>' +
        '</div>' +

        '<div class="card tinted"><h3>' + icon('sparkle') + '心態覺察與問題記錄</h3>' +
        '<div class="muted mb8" style="font-size:12px">今天卡在哪裡？又收到了什麼溫暖？試著把自己安放好 ♡</div>' +
        '<div id="mindbox">' + mindHTML(blocks, blockText, reframe, gifts) + '</div>' +
        '</div>' +

        '<button class="btn block mt14" id="submit">' + (back ? '📝 補寫這一天 ♡' : '收藏今天的心情 ♡') + '</button>' +
        '<button class="btn ghost block mt8" id="backfill">🗓 選擇別的日期補寫</button>' +

        '<div class="sec-title"><h2>📝 今天的日記</h2><span class="muted">' +
        (list.length ? list.length + ' 篇 · ' + D.pretty(today) + ' 星期' + D.weekday(today) : '今天還沒寫 ♡') + '</span></div>' +
        (list.length ? '<div class="tl">' + list.map(tlItem).join('') + '</div>'
          : '<div class="card">' + L.empty('今天是空白的一頁，在上面寫一點給自己吧 ♡', 'pen') + '</div>') +

        '<div class="sec-title"><h2>📅 日記月曆 · 全部回顧</h2><span class="muted">共收藏 ' + total + ' 篇 ♡</span></div>' +
        '<div class="card"><div id="jcal">' + jcalHTML() + '</div>' +
        '<div class="muted mt8" style="font-size:11.5px;text-align:center;line-height:1.7">' +
        '☁️ 以前的日記都收在這個月曆裡 ♡<br>點任何一個日期，就會展開那天的完整日記與心態卡點</div>' +
        (showMonth
          ? '<div class="deco-line"></div><div class="tl">' + monthList.map(tlItem).join('') + '</div>' +
          '<button class="btn ghost block mt8" id="mhide">收起這個月 ▲</button>'
          : '<button class="btn ghost block mt8" id="mshow">📖 展開這個月全部日記</button>') +
        '</div>';
    },

    mount(root, ctx) {
      root.querySelectorAll('[data-mood]').forEach(b => b.onclick = () => {
        mood = b.dataset.mood;
        root.querySelectorAll('.mood').forEach(x => x.classList.remove('on'));
        b.classList.add('on');
      });

      /* 日期（補寫）：改日期就更新草稿日期 */
      const dEl = root.querySelector('#ddate');
      if (dEl) dEl.onchange = () => {
        draftDate = dEl.value || D.today();
        const t = root.querySelector('#dtitle'), x = root.querySelector('#dtext');
        const keepT = t ? t.value : '', keepX = x ? x.value : '';
        ctx.refresh();
        const t2 = root.querySelector('#dtitle'), x2 = root.querySelector('#dtext');
        if (t2) t2.value = keepT; if (x2) x2.value = keepX;
      };

      /* 心態標籤（卡點 / 正向收穫）：事件委派，點一下勾選或取消 */
      const mb = root.querySelector('#mindbox');
      if (mb) {
        mb.addEventListener('click', e => {
          const gb = e.target.closest ? e.target.closest('[data-gift]') : null;
          const bb = e.target.closest ? e.target.closest('[data-block]') : null;
          if (!gb && !bb) return;
          const bt = mb.querySelector('#dblock'), rf = mb.querySelector('#dreframe');
          if (bt) blockText = bt.value;
          if (rf) reframe = rf.value;
          if (gb) {
            const k = gb.dataset.gift;
            if (gifts.indexOf(k) >= 0) gifts = gifts.filter(x => x !== k); else gifts.push(k);
          } else {
            const k = bb.dataset.block;
            if (blocks.indexOf(k) >= 0) blocks = blocks.filter(x => x !== k); else blocks.push(k);
          }
          mb.innerHTML = mindHTML(blocks, blockText, reframe, gifts);
        });
        /* 輸入時只記值，不重繪（避免手機鍵盤跳掉） */
        const bt = mb.querySelector('#dblock');
        if (bt) bt.addEventListener('input', () => { blockText = bt.value; });
        const rf = mb.querySelector('#dreframe');
        if (rf) rf.addEventListener('input', () => { reframe = rf.value; });
      }

      /* ---- 日記月曆：事件委派 ---- */
      const cb = root.querySelector('#jcal');
      if (cb) cb.addEventListener('click', e => {
        const nav = e.target.closest ? e.target.closest('[data-jcal]') : null;
        if (nav) {
          if (nav.dataset.jcal === 'prev') { calM--; if (calM < 0) { calM = 11; calY--; } }
          else { calM++; if (calM > 11) { calM = 0; calY++; } }
          cb.innerHTML = jcalHTML();
          return;
        }
        const cell = e.target.closest ? e.target.closest('[data-jdate]') : null;
        if (cell && cell.dataset.jdate) dayModal(ctx, cell.dataset.jdate);
      });

      /* 月曆下方：展開 / 收起「這個月全部日記」 */
      const ms = root.querySelector('#mshow');
      if (ms) ms.onclick = () => { showMonth = true; ctx.refresh(); };
      const mh = root.querySelector('#mhide');
      if (mh) mh.onclick = () => { showMonth = false; ctx.refresh(); };

      const th = root.querySelector('#thumbs');
      const draw = () => th.innerHTML = imgs.map((s, i) =>
        '<div class="thumb">' + L.imgTag(s) + '<span class="x" data-rm="' + i + '">×</span></div>').join('');
      draw();
      th.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { imgs.splice(+b.dataset.rm, 1); draw(); });
      root.querySelector('#upimg').onclick = async () => {
        const arr = await U.pickImages();
        imgs = imgs.concat(arr); draw();
      };

      /* 補寫：直接開表單（可以自由選日期） */
      root.querySelector('#backfill').onclick = () => this.form(ctx, { date: draftDate });

      root.querySelector('#submit').onclick = async () => {
        const tEl = root.querySelector('#dtext');
        const tiEl = root.querySelector('#dtitle');
        const dEl2 = root.querySelector('#ddate');
        const t = String(tEl.value || '').trim();
        if (!t) return L.toast('寫一點什麼再提交吧 ♡');
        const btEl = root.querySelector('#dblock'), rfEl = root.querySelector('#dreframe');
        if (btEl) blockText = btEl.value || '';
        if (rfEl) reframe = rfEl.value || '';
        const myBlocks = blocks.slice();
        const myGifts = gifts.slice();
        const myImgs = imgs.slice();
        const date = (dEl2 && dEl2.value) || draftDate || D.today();
        /* ★ 先同步寫進資料庫（文字一定存得到），照片背景再補 */
        const rec = col().add({
          date: date,
          title: String((tiEl && tiEl.value) || '').trim(),
          mood, text: t, images: [], reply: '',
          keywords: L.pickKeywords(t),
          blocks: myBlocks, gifts: myGifts,
          blockText: blockText.trim(), reframe: reframe.trim()
        });
        this.lastReply = null;
        imgs = []; blocks = []; gifts = []; blockText = ''; reframe = '';
        const wasBack = date !== D.today();
        draftDate = D.today();
        L.toast(wasBack ? '這一天補上了 ♡' : '已收藏這份心情 ♡');
        if (myImgs.length) {
          (async () => {
            try {
              const keys = await L.IDB.putMany(myImgs, 5000);
              const r2 = col().find(rec.id);
              if (r2) col().update(rec.id, { images: keys.filter(Boolean) });
            } catch (e) { }
          })();
        }
        if (wasBack) {
          /* 補寫過去的日子：月曆跳到那個月，並直接打開那天的回看 */
          const d = D.parse(date);
          if (d) { calY = d.getFullYear(); calM = d.getMonth(); }
          ctx.refresh();
          dayModal(ctx, date);
        } else {
          ctx.refresh();
        }
        makeReply(ctx, rec.id, t, mood, extraOf(rec));
      };

      root.querySelectorAll('[data-dexp]').forEach(b => b.onclick = () => {
        expandD[b.dataset.dexp] = !expandD[b.dataset.dexp]; ctx.refresh();
      });
      root.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
        if (await L.confirm('刪除日記', '這篇日記會消失，確定嗎？')) {
          const d = col().find(b.dataset.del);
          if (d && d.images) d.images.forEach(k => L.IDB.del(k));
          col().remove(b.dataset.del); ctx.refresh();
        }
      });
      root.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => this.form(ctx, col().find(b.dataset.edit)));
      root.querySelectorAll('[data-regen]').forEach(b => b.onclick = () => {
        const d = col().find(b.dataset.regen);
        if (d) makeReply(ctx, d.id, d.text || '', d.mood || 'calm', extraOf(d));
      });
    },

    /* ---------- 新增 / 編輯日記（含補寫） ---------- */
    form(ctx, rec) {
      const d = rec || {};
      let curMood = d.mood || mood || 'calm';
      const oldImages = d.images || [];
      let keep = oldImages.slice();
      let added = [];
      let fBlocks = (d.blocks || (rec ? [] : blocks)).slice();
      let fGifts = (d.gifts || (rec ? [] : gifts)).slice();
      let fBlockText = rec ? (d.blockText || '') : blockText;
      let fReframe = rec ? (d.reframe || '') : reframe;
      const initDate = d.date || draftDate || D.today();

      const imgHTML = () => keep.map((k, i) => '<div class="thumb">' + L.imgTag(k) +
        '<span class="x" data-rmold="' + i + '">×</span></div>').join('') +
        added.map((s, i) => '<div class="thumb"><img src="' + s + '"><span class="x" data-rmnew="' + i + '">×</span></div>').join('');

      const mindBoxHTML = () =>
        '<div class="mb8" style="font-size:13px">今日內心卡點 / 心態問題（可複選）</div>' +
        '<div class="mind-chips">' + L.MIND_BLOCKS.map(b =>
          '<button type="button" class="mind-chip' + (fBlocks.indexOf(b.k) >= 0 ? ' on' : '') + '" data-block="' + b.k +
          '" title="' + U.esc(b.hint) + '">' + U.esc(b.t) + '</button>').join('') + '</div>' +
        '<div class="field mt8"><label>卡點的細節（可不填）</label>' +
        '<input class="inp" id="fb-t" value="' + U.esc(fBlockText) + '" placeholder="例如：報告改了五次還是覺得不夠好…"></div>' +
        '<div class="deco-line"></div>' +
        '<div class="mb8" style="font-size:13px">🌱 今天的正向收穫 / 溫暖時刻（可複選）</div>' +
        '<div class="mind-chips">' + (L.MIND_GIFTS || []).map(b =>
          '<button type="button" class="mind-chip gift' + (fGifts.indexOf(b.k) >= 0 ? ' on' : '') + '" data-gift="' + b.k +
          '" title="' + U.esc(b.hint) + '">' + U.esc(b.t) + '</button>').join('') + '</div>' +
        '<div class="field mt8"><label>轉念 / 自我對話</label>' +
        '<textarea class="inp" id="fb-r" placeholder="我今天嘗試如何安放這個情緒？">' + U.esc(fReframe) + '</textarea></div>';

      L.modal(rec && rec.id ? '編輯這篇日記' : '寫一篇日記',
        '<div class="grid2"><div class="field"><label>日期（可選過去任何一天補寫 ♡）</label>' +
        '<input class="inp" type="date" id="f-d" value="' + U.esc(initDate) + '"></div>' +
        '<div class="field"><label>心情</label><select class="inp" id="f-m">' +
        L.MOODS.map(m => '<option value="' + m.k + '"' + (curMood === m.k ? ' selected' : '') + '>' + m.t + '</option>').join('') +
        '</select></div></div>' +
        '<div class="field"><label>標題（選填）</label>' +
        '<input class="inp" id="f-title" value="' + U.esc(d.title || '') + '" placeholder="沒寫就自動抓內文第一句 ♡"></div>' +
        '<div class="field"><label>今天的感受 <span class="req">*</span></label>' +
        '<textarea class="inp" id="f-t" style="min-height:150px;line-height:1.8" placeholder="想對自己說什麼都可以寫下來…">' + U.esc(d.text || '') + '</textarea></div>' +
        '<div class="deco-line"></div>' +
        '<div id="fmb">' + mindBoxHTML() + '</div>' +
        '<div class="field"><label>圖片</label>' +
        '<div class="uploader" id="f-up"><div class="hint">點此加入圖片 ♡</div></div>' +
        '<div class="thumb-row" id="f-th"></div></div>' +
        L.formFooter({ isEdit: !!(rec && rec.id) }),
        (body, close) => {
          L.bindCancel(body, close);
          const box = body.querySelector('#f-th');
          const paint = () => {
            box.innerHTML = imgHTML();
            box.querySelectorAll('[data-rmold]').forEach(b => b.onclick = () => { keep.splice(+b.dataset.rmold, 1); paint(); });
            box.querySelectorAll('[data-rmnew]').forEach(b => b.onclick = () => { added.splice(+b.dataset.rmnew, 1); paint(); });
            L.hydrateImages(box);
          };
          paint();

          const mb = body.querySelector('#fmb');
          if (mb) mb.addEventListener('click', e => {
            const gb = e.target.closest ? e.target.closest('[data-gift]') : null;
            const bb = e.target.closest ? e.target.closest('[data-block]') : null;
            if (!gb && !bb) return;
            const bi = body.querySelector('#fb-t'), ri = body.querySelector('#fb-r');
            if (bi) fBlockText = bi.value; if (ri) fReframe = ri.value;
            if (gb) {
              const k = gb.dataset.gift;
              if (fGifts.indexOf(k) >= 0) fGifts = fGifts.filter(x => x !== k); else fGifts.push(k);
            } else {
              const k = bb.dataset.block;
              if (fBlocks.indexOf(k) >= 0) fBlocks = fBlocks.filter(x => x !== k); else fBlocks.push(k);
            }
            mb.innerHTML = mindBoxHTML();
          });

          body.querySelector('#f-up').onclick = async () => {
            const arr = await U.pickImages();
            added = added.concat(arr); paint();
          };
          let saving = false;
          body.querySelector('#ok').onclick = () => {
            if (saving) return;                          // 防連點送出兩次
            const t = L.val(body, 'f-t').trim();
            if (!t) return L.toast('寫一點什麼吧 ♡');
            saving = true;
            const btn = body.querySelector('#ok');
            if (btn) { btn.disabled = true; btn.textContent = '💾 儲存中…'; }
            const isEdit = !!(rec && rec.id);
            try {
              const newMood = L.val(body, 'f-m');
              const bi = body.querySelector('#fb-t'), ri = body.querySelector('#fb-r');
              const newBlockText = bi ? String(bi.value || '').trim() : '';
              const newReframe = ri ? String(ri.value || '').trim() : '';
              const myAdded = added.slice();
              const data = {
                date: L.val(body, 'f-d') || D.today(),
                title: L.val(body, 'f-title').trim(),
                mood: newMood, text: t, images: keep.slice(),
                keywords: L.pickKeywords(t),
                blocks: fBlocks.slice(), gifts: fGifts.slice(),
                blockText: newBlockText, reframe: newReframe
              };
            const changed = !isEdit || newMood !== rec.mood || (rec.text || '').trim() !== t ||
              newReframe !== (rec.reframe || '') || newBlockText !== (rec.blockText || '') ||
              JSON.stringify(fBlocks) !== JSON.stringify(rec.blocks || []) ||
              JSON.stringify(fGifts) !== JSON.stringify(rec.gifts || []);
            let id;
            if (isEdit) {
              if (newMood !== rec.mood || (rec.text || '').trim() !== t) data.reply = '';
              oldImages.forEach(k => { if (keep.indexOf(k) < 0) { try { L.IDB.del(k); } catch (e) { } } });
              col().update(rec.id, data); id = rec.id;
            } else {
              id = col().add(Object.assign({ reply: '' }, data)).id;
            }
            /* 補寫過去的日子就把月曆跳過去，標記才看得到 */
            const d2 = D.parse(data.date);
            if (d2) { calY = d2.getFullYear(); calM = d2.getMonth(); }
            close();
            L.toast(isEdit ? '已更新 ♡' : '已收藏這份心情 ♡');
            ctx.refresh();
            /* 照片背景補上，失敗也不影響日記本體 */
            if (myAdded.length) {
              (async () => {
                try {
                  const keys = await L.IDB.putMany(myAdded, 5000);
                  const r2 = col().find(id);
                  if (r2) col().update(id, { images: (r2.images || []).concat(keys.filter(Boolean)) });
                } catch (e) { }
              })();
            }
            if (changed) makeReply(ctx, id, t, newMood, {
              blocks: data.blocks, gifts: data.gifts, blockText: newBlockText, reframe: newReframe
            });
          } catch (e) {
            saving = false;
            const b2 = body.querySelector('#ok');
            if (b2) { b2.disabled = false; b2.textContent = isEdit ? '💾 保存修改' : '新增'; }
            L.toast('儲存時出了一點小狀況，再按一次試試 ♡');
          }
          };
        });
    }
  };
})(window.Lume);
