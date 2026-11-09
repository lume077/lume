/* ============================================================
   tarot.js — 塔羅：抽牌對話 / 貼上外部對話紀錄 / 對話總結 / 週總結
   ============================================================ */
window.Lume = window.Lume || {}; window.Lume.modules = window.Lume.modules || {};
(function (L) {
  'use strict';
  const { D, U, icon, Store } = L;
  const col = () => Store.col('tarot');
  const wk = () => Store.col('tarotWeekly');

  /* ============================================================
     一、牌名辨識：從貼上的文字中自動抓出塔羅牌與正逆位
     ============================================================ */
  const ALIAS = {
    '愚者': 0, '愚人': 0, 'the fool': 0, 'fool': 0,
    '魔術師': 1, '魔法師': 1, 'the magician': 1, 'magician': 1,
    '女祭司': 2, '女教皇': 2, 'the high priestess': 2, 'high priestess': 2,
    '皇后': 3, 'the empress': 3, 'empress': 3,
    '皇帝': 4, 'the emperor': 4, 'emperor': 4,
    '教皇': 5, '教宗': 5, 'the hierophant': 5, 'hierophant': 5,
    '戀人': 6, 'the lovers': 6, 'lovers': 6,
    '戰車': 7, 'the chariot': 7, 'chariot': 7,
    '力量': 8, 'the strength': 8, 'strength': 8,
    '隱者': 9, '隱士': 9, 'the hermit': 9, 'hermit': 9,
    '命運之輪': 10, 'wheel of fortune': 10,
    '正義': 11, 'justice': 11,
    '倒吊人': 12, '吊人': 12, 'the hanged man': 12, 'hanged man': 12,
    '死神': 13, '死亡': 13, 'death': 13,
    '節制': 14, 'temperance': 14,
    '惡魔': 15, 'the devil': 15, 'devil': 15,
    '高塔': 16, 'the tower': 16, 'tower': 16,
    '星星': 17, 'the star': 17, 'star': 17,
    '月亮': 18, 'the moon': 18, 'moon': 18,
    '太陽': 19, 'the sun': 19, 'sun': 19,
    '審判': 20, 'judgement': 20, 'judgment': 20,
    '世界': 21, '宇宙': 21, 'the world': 21, 'world': 21
  };
  const ALIAS_KEYS = Object.keys(ALIAS).sort((a, b) => b.length - a.length);

  /** 從文字中偵測牌卡（含正逆位）；回傳 [{id, rev}] */
  function detectCards(text) {
    const t = String(text || '').toLowerCase();
    const found = {};
    ALIAS_KEYS.forEach(k => {
      let from = 0, at;
      while ((at = t.indexOf(k, from)) !== -1) {
        if (found[ALIAS[k]] === undefined) {
          const win = t.slice(at, at + k.length + 26);
          const rev = /逆位|逆位置|逆|反向|reversed|倒置/.test(win);
          const up = /正位|正位置|正向|upright/.test(win);
          found[ALIAS[k]] = rev && !up;
        }
        from = at + k.length;
      }
    });
    return Object.keys(found).map(k => ({ id: +k, rev: !!found[k] }))
      .sort((a, b) => a.id - b.id);
  }

  /* ============================================================
     二、對話總結引擎：從對話內文中萃取重點 + 行動建議
     ============================================================ */
  function splitSentences(text) {
    return String(text || '')
      .split(/[\n\r。！？!?；;．]+/)
      .map(s => s
        .replace(/^[\s\-•·*>「」"'#]+/, '')                 // 去掉項目符號
        .replace(/^\d+\s*[.、)．]\s*/, '')                  // 去掉「1. 2.」編號
        .replace(/^[^\s：:]{1,14}[：:]\s*/, '')             // 去掉「我：」「Gemini：」發言者
        .trim())
      .filter(s => s.length >= 6 && s.length <= 160);
  }
  const KW = {
    core: ['我想問', '想問', '問題是', '我的問題', '請問', '困惑', '不知道該', '該不該', '要不要', '選擇', '決定', '方向', '主題'],
    advice: ['建議', '可以試著', '試試看', '試著', '提醒', '注意', '記得', '不妨', '先從', '讓自己', '可以開始', '試著把', '或許'],
    feel: ['焦慮', '不安', '害怕', '難過', '疲累', '壓力', '開心', '期待', '感謝', '孤單', '委屈', '迷惘', '疑惑', '內耗', '卡住', '糾結', '放不下', '在意'],
    action: ['行動', '開始', '整理', '溝通', '說出口', '休息', '放下', '練習', '安排', '計畫', '設定', '寫下', '列清單', '暫停', '界線', '拒絕']
  };
  const score = (s, list) => list.reduce((n, k) => n + (s.includes(k) ? 1 : 0), 0);

  /** 依據對話紀錄產生總結（容錯：傳 null 也不會炸） */
  function summarizeDialogue(rec) {
    rec = rec || {};
    const text = rec.dialogue || '';
    const cards = rec.cards || [];
    const sents = splitSentences(text);
    const seed = U.dailySeed(rec.id + text.slice(0, 60));

    // 1. 議題核心
    let core = (rec.note || '').trim();
    if (!core) {
      const q = sents.filter(s => /[？?]|嗎|呢/.test(s))[0];
      core = q || sents.slice().sort((a, b) => b.length - a.length)[0] || '（沒有偵測到明確提問，以下是從對話中讀到的重點）';
    }

    // 2. 情緒線索
    const feels = [...new Set(sents.flatMap(s => KW.feel.filter(k => s.includes(k))))].slice(0, 4);

    // 3. 建議句（依關鍵詞排序，取前 3）
    const advice = sents.filter(s => score(s, KW.advice) > 0 || score(s, KW.action) > 0)
      .sort((a, b) => (score(b, KW.advice) + score(b, KW.action)) - (score(a, KW.advice) + score(a, KW.action)))
      .slice(0, 3);

    // 4. 重要句（最長的幾句，代表對話的主軸）
    const keySents = sents.slice().sort((a, b) => b.length - a.length).slice(0, 2);

    // 5. 牌面訊息
    const cardLines = cards.map(c => {
      const t = L.TAROT.find(x => x.n === c.id) || L.TAROT[0];
      return t.zh + '（' + (c.rev ? '逆位' : '正位') + '）：' + (c.rev ? t.rev : t.up);
    });

    const tone = feels.length
      ? '這段對話裡，反覆出現的情緒是「' + feels.join('、') + '」。陽陽覺得，你不是在找一個標準答案，而是在確認自己早就隱約知道的事情。'
      : '這段對話的語氣很平靜，陽陽看見你正在用自己的節奏，把一件事慢慢看清楚。';

    let summary = '';
    if (cards.length) summary += '🃏 牌面：' + cardLines.join('；') + '。\n\n';
    summary += '💭 議題核心：' + core + '\n\n';
    summary += '🌙 陽陽的觀察：' + tone + '\n';
    if (keySents.length) summary += '對話裡最關鍵的一句是：「' + keySents[0] + '」。\n';
    if (advice.length) summary += '\n💡 從對話中整理出的方向：\n' + advice.map((s, i) => '　' + (i + 1) + '. ' + s).join('\n');

    // 6. 行動建議卡片
    const actions = [];
    if (advice[0]) actions.push({ t: '立刻能做', d: advice[0].length > 60 ? advice[0].slice(0, 60) + '…' : advice[0] });
    if (advice[1]) actions.push({ t: '本週練習', d: advice[1].length > 60 ? advice[1].slice(0, 60) + '…' : advice[1] });
    else actions.push({ t: '本週練習', d: '每天給自己十分鐘，把今天最在意的一件事寫下來，觀察它是否真的那麼嚴重。' });
    if (advice[2]) actions.push({ t: '溫柔提醒', d: advice[2].length > 60 ? advice[2].slice(0, 60) + '…' : advice[2] });
    else actions.push({ t: '溫柔提醒', d: '不需要一次解決所有事，選一件先開始，剩下的交給時間。' });
    actions.push({
      t: '照顧自己',
      d: ['這週留一個完全空白的晚上給自己，不回訊息、不解決問題。',
        '身體先照顧好：睡飽、喝水、吃一頓喜歡的飯，靈感才進得來。',
        '把這段對話再讀一次，看看三天後的自己有沒有不同的感覺。'][seed % 3]
    });

    return { summary, actions, feels, at: new Date().toISOString() };
  }

  /* ============================================================
     三、共用小工具
     ============================================================ */
  function draw(n) {
    const pool = L.TAROT.slice();
    const out = [];
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      const c = pool.splice(idx, 1)[0];
      out.push({ id: c.n, rev: Math.random() < 0.35 });
    }
    return out;
  }
  const cardMeaning = (c) => {
    const t = L.TAROT.find(x => x.n === c.id) || L.TAROT[0];
    return c.rev ? t.rev : t.up;
  };
  const cardName = (c) => {
    const t = L.TAROT.find(x => x.n === c.id) || L.TAROT[0];
    return t.zh + (c.rev ? '（逆位）' : '（正位）');
  };
  const POS3 = ['過去', '現在', '未來'];
  const POS_AD = ['現況', '阻礙', '建議'];

  /* ============================================================
     儲存防護：讓「送出」永遠有反應
     ------------------------------------------------------------
     · 先同步把紀錄寫進資料庫（文字一定存得到）
     · 照片再用背景工作補上，失敗也不會拖垮主流程
     · 任何一步出錯都有 toast + 關閉彈窗 + 刷新，不會卡死
     ============================================================ */
  /** 背景補照片：寫進 IndexedDB 後回填到紀錄上（失敗就略過，紀錄仍在） */
  function attachImages(id, added, ctx) {
    if (!added || !added.length || !id) return;
    (async () => {
      try {
        const keys = await L.IDB.putMany(added, 5000);
        const rec = col().find(id);
        if (!rec) return;
        col().update(id, { images: (rec.images || []).concat(keys.filter(Boolean)) });
        if (ctx && ctx.refresh) ctx.refresh();
      } catch (e) { /* 照片沒存到也沒關係，紀錄還在 */ }
    })();
  }

  /** 存完把月曆跳到那一筆的月份，讓標記馬上看得到 */
  function gotoCal(date) {
    const d = D.parse(date);
    if (!d) return;
    tcalY = d.getFullYear(); tcalM = d.getMonth();
  }

  /* ============================================================
     實體抽牌照片：上傳 / 拍照（存進 IndexedDB，與抽牌紀錄一起保存）
     ============================================================ */
  const photoHTML = () =>
    '<div class="field"><label>實體抽牌照片（可上傳 / 拍照）</label>' +
    '<div class="uploader" id="ph-up"><div class="hint">📷 點此上傳照片或拍照 ♡<br><span style="font-size:11px">會和這次的牌陣、對話一起保存</span></div></div>' +
    '<div class="thumb-row" id="ph-th"></div></div>';

  /** 綁定照片上傳；回傳 { get() → 要存進紀錄的 idb 鍵陣列 } */
  function mountPhoto(body, keep, added, onPaint) {
    const box = body.querySelector('#ph-th');
    const paint = () => {
      box.innerHTML =
        keep.map((k, i) => '<div class="thumb">' + L.imgTag(k) + '<span class="x" data-prmold="' + i + '">×</span></div>').join('') +
        added.map((s, i) => '<div class="thumb"><img src="' + s + '"><span class="x" data-prmnew="' + i + '">×</span></div>').join('');
      box.querySelectorAll('[data-prmold]').forEach(b => b.onclick = () => { keep.splice(+b.dataset.prmold, 1); paint(); });
      box.querySelectorAll('[data-prmnew]').forEach(b => b.onclick = () => { added.splice(+b.dataset.prmnew, 1); paint(); });
      try { L.hydrateImages(box); } catch (e) { }
      if (onPaint) onPaint();
    };
    paint();
    body.querySelector('#ph-up').onclick = async () => {
      const arr = await U.pickImages(1000, 0.7);
      added.push.apply(added, arr);
      paint();
    };
    return { paint };
  }

  const photosHTML = (r) => (r && r.images && r.images.length)
    ? '<div class="thumb-row mt8">' + r.images.map(k => '<div class="thumb">' + L.imgTag(k) + '</div>').join('') + '</div>'
    : '';

  /* ============================================================
     塔羅歷史月曆
     ============================================================ */
  let tcalY = new Date().getFullYear();
  let tcalM = new Date().getMonth();

  function tarotByDate() {
    const m = {};
    col().all().forEach(r => { if (r && r.date) (m[r.date] = m[r.date] || []).push(r); });
    Object.keys(m).forEach(k => m[k].sort((a, b) => (a.createdAt || '') < (b.createdAt || '') ? -1 : 1));
    return m;
  }

  function tcalHTML() {
    const map = tarotByDate();
    const first = D.firstDow(tcalY, tcalM);
    const total = D.daysInMonth(tcalY, tcalM);
    const today = D.today();
    let cells = '<div class="cal-dow">日</div><div class="cal-dow">一</div><div class="cal-dow">二</div>' +
      '<div class="cal-dow">三</div><div class="cal-dow">四</div><div class="cal-dow">五</div><div class="cal-dow">六</div>';
    for (let i = 0; i < first; i++) cells += '<div class="cal-cell out"></div>';
    let n = 0, cards = 0;
    for (let d = 1; d <= total; d++) {
      const key = tcalY + '-' + D.pad(tcalM + 1) + '-' + D.pad(d);
      const arr = map[key] || [];
      let inner = '<span>' + d + '</span>';
      if (arr.length) {
        n++;
        cards += arr.reduce((s, r) => s + ((r.cards || []).length), 0);
        const hasPhoto = arr.some(r => (r.images || []).length);
        const rev = arr.some(r => (r.cards || []).some(c => c.rev));
        inner += '<div class="cal-icos">' +
          '<span class="cal-ico">' + icon('tarot', 15) + '</span>' +
          (hasPhoto ? '<span class="cal-ico">' + icon('star', 15) + '</span>' : '') +
          '</div><i class="cal-dot" style="background:' + (rev ? '#C7ACE9' : '#E9A8BC') + '"></i>';
      }
      cells += '<div class="cal-cell' + (key === today ? ' today' : '') + (arr.length ? ' has' : '') +
        '" data-tdate="' + key + '">' + inner + '</div>';
    }
    return '<div class="cal-head">' +
      '<button class="icon-btn" data-tcal="prev" style="width:32px;height:32px">' +
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M15 5l-7 7 7 7" stroke="#8E6FC8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<b>' + tcalY + ' 年 ' + (tcalM + 1) + ' 月 · ' + n + ' 次對話</b>' +
      '<button class="icon-btn" data-tcal="next" style="width:32px;height:32px">' +
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M9 5l7 7-7 7" stroke="#8E6FC8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>' +
      '<div class="cal-grid">' + cells + '</div>' +
      '<div class="cal-legend mt8">' +
      '<span class="lg"><span style="width:15px;height:15px;display:inline-block">' + icon('tarot', 15) + '</span>有塔羅紀錄</span>' +
      '<span class="lg"><span style="width:15px;height:15px;display:inline-block">' + icon('star', 15) + '</span>有實體抽牌照片</span>' +
      '<span class="lg">本月共抽到 ' + cards + ' 張牌</span></div>';
  }

  /** 點日期 → 回顧當天的塔羅對話、抽牌照片與重點建議 */
  function tarotDayModal(ctx, key) {
    const arr = tarotByDate()[key] || [];
    if (!arr.length) {
      L.modal(D.pretty(key) + ' · 這天沒有塔羅紀錄',
        '<div class="muted center" style="padding:18px">這天沒有抽牌，也沒有貼上對話 ♡</div>' +
        '<button class="btn block mt14" id="tnew">🃏 為這天補一筆紀錄</button>',
        (body, close) => { body.querySelector('#tnew').onclick = () => { close(); L.modules.tarot.pasteForm(ctx, { date: key }); }; });
      return;
    }
    const html = arr.map(r => {
      const isPaste = r.source === 'paste';
      return '<div class="card soft" style="margin:0 0 12px;padding:12px">' +
        '<div class="spread"><div><b style="font-size:13.5px">' + U.esc(r.spread || '塔羅對話') + '</b>' +
        '<div class="muted">' + D.pretty(r.date) + ' 星期' + D.weekday(r.date) + ' · ' +
        '<span class="chip ' + (isPaste ? 'mint' : '') + '">' + (isPaste ? '貼上紀錄' : '抽牌') + '</span></div></div>' +
        '<button class="mini-btn" data-tedit="' + U.esc(r.id) + '">✏️</button></div>' +
        (r.note ? '<div class="muted mt8">💭 提問：' + L.nl2br(r.note) + '</div>' : '') +
        ((r.cards || []).length ? '<div class="sym-chips mt8">' + r.cards.map(c =>
          '<span class="chip ' + (c.rev ? 'pink' : '') + '">' + U.esc(cardName(c)) + '</span>').join('') + '</div>' : '') +
        photosHTML(r) +
        (r.dialogue ? '<div class="ai-box" style="margin-top:8px"><div class="who">' + icon('quote', 16) +
          (isPaste ? '貼上的對話內容' : '陽陽說') + '</div><p>' + L.nl2br(r.dialogue) + '</p></div>' : '') +
        (r.summary ? '<div class="ai-box" style="margin-top:8px;background:linear-gradient(150deg,#F4EFFD,#FFF7F9)">' +
          '<div class="who">' + icon('moon', 16) + '重點建議</div><p>' + L.nl2br(r.summary) + '</p>' +
          ((r.summaryActions || []).length ? '<div class="grid2 mt8">' + r.summaryActions.map(a =>
            '<div class="card soft" style="margin:0;padding:9px"><b style="font-size:12px">' + U.esc(a.t) + '</b>' +
            '<div class="muted" style="margin-top:2px;line-height:1.55;font-size:11.5px">' + U.esc(a.d) + '</div></div>').join('') + '</div>' : '') +
          '</div>' : '<button class="btn soft sm mt8" data-tsum="' + U.esc(r.id) + '">✨ 產生重點建議</button>') +
        '</div>';
    }).join('');

    L.modal(D.pretty(key) + ' 星期' + D.weekday(key) + ' · 塔羅回顧',
      html + '<button class="btn block mt8" id="tnew">🃏 再補一筆</button>',
      (body, close) => {
        L.hydrateImages(body);
        body.querySelectorAll('[data-tedit]').forEach(b => b.onclick = () => {
          close(); L.modules.tarot.pasteForm(ctx, col().find(b.dataset.tedit));
        });
        body.querySelectorAll('[data-tsum]').forEach(b => b.onclick = () => {
          const rec = col().find(b.dataset.tsum);
          if (!rec) return;
          const s = summarizeDialogue(rec);
          col().update(rec.id, { summary: s.summary, summaryActions: s.actions, summaryAt: s.at });
          L.toast('陽陽整理好了 ♡'); close(); ctx.refresh();
        });
        body.querySelector('#tnew').onclick = () => { close(); L.modules.tarot.pasteForm(ctx, { date: key }); };
      });
  }

  function cardFace(c) {
    const t = L.TAROT.find(x => x.n === c.id) || L.TAROT[0];
    return '<div class="tarot-card"><div class="tarot-face' + (c.rev ? ' rev' : '') + '">' + icon('tarot') + '</div>' +
      '<b style="font-size:13.5px">' + t.zh + '</b>' +
      '<div class="muted" style="font-size:11px">' + t.en + '</div>' +
      '<div class="chip ' + (c.rev ? 'pink' : '') + '" style="display:inline-block;margin-top:5px">' + (c.rev ? '逆位' : '正位') + '</div>' +
      '<div class="muted" style="margin-top:5px;font-size:11.5px">' + cardMeaning(c) + '</div></div>';
  }

  /** 本週總結（含貼上的對話內容） */
  function buildSummary(records) {
    const cards = [];
    records.forEach(r => (r.cards || []).forEach(c => cards.push(c)));
    const seed = U.dailySeed(D.weekKey(D.today()) + records.length);
    const names = cards.map(cardName);
    const revCount = cards.filter(c => c.rev).length;
    const themes = [...new Set(cards.map(cardMeaning).flatMap(m => m.split('、')))];

    // 從對話文字中萃取本週關鍵詞
    const allText = records.map(r => (r.note || '') + '\n' + (r.dialogue || '')).join('\n');
    const sents = splitSentences(allText);
    const feelSet = [...new Set(sents.flatMap(s => KW.feel.filter(k => s.includes(k))))];
    const topics = [...new Set(sents.flatMap(s => KW.core.concat(KW.action).filter(k => s.includes(k))))].slice(0, 6);
    const topAdvice = sents.filter(s => score(s, KW.advice) + score(s, KW.action) > 0)
      .sort((a, b) => b.length - a.length)[0];

    const tone = revCount > cards.length / 2
      ? '這週逆位偏多，代表你正在處理一些「卡住」與「需要放下」的課題，陽陽覺得你已經在移動了，只是速度比你想的慢。'
      : '這週正位偏多，能量是流動的，陽陽看見你正在往自己想要的方向靠近，請繼續相信那個感覺。';

    let summary = '本週你記錄了 ' + records.length + ' 次塔羅對話' +
      (cards.length ? '，抽到 ' + cards.length + ' 張牌：' + names.join('、') : '（部分紀錄為純文字對話）') + '。\n\n' + tone;
    if (themes.length) summary += '\n\n這週反覆出現的主題是：' + themes.slice(0, 5).join('、') + '。';
    if (feelSet.length) summary += '\n\n從對話中讀到的情緒關鍵字：' + feelSet.join('、') + '。';
    if (topics.length) summary += '\n大家（和你自己）最在意的事情圍繞在：' + topics.join('、') + '。';
    if (topAdvice) summary += '\n\n本週最重要的一句提醒：「' + topAdvice + '」';

    const actions = [
      { t: '看見', d: '把這週的主題寫在紙上，觀察它在哪些時刻又出現了。' },
      { t: '釋放', d: '挑一件你一直撐著沒放的事，本週為它做一個小小的收尾動作。' },
      topAdvice
        ? { t: '行動', d: topAdvice.length > 70 ? topAdvice.slice(0, 70) + '…' : topAdvice }
        : { t: '行動', d: '選一件「不做會後悔」的小事，在 48 小時內開始。' },
      { t: '照顧', d: '每天留 15 分鐘完全屬於自己，不回訊息、不解決問題。' }
    ];
    return { week: D.weekKey(D.today()), summary, actions };
  }

  /* ============================================================
     四、模組
     ============================================================ */
  const expand = {};   // 記錄哪些長文被展開
  let showOld = false; // 以前的對話預設收起來（點月曆一樣看得到）

  L.modules.tarot = {
    id: 'tarot', name: '塔羅', icon: 'tarot',
    render() {
      const thisWeek = D.weekKey(D.today());
      const weekRecs = col().where(r => D.weekKey(r.date) === thisWeek);
      const saved = wk().where(w => w.week === thisWeek)[0];
      const today = D.today();
      const all = col().all().slice().sort((a, b) =>
        ((b.date || '') + (b.createdAt || '')) < ((a.date || '') + (a.createdAt || '')) ? -1 : 1);
      const list = all.filter(r => r.date === today);
      const older = all.filter(r => r.date !== today);

      return '' +
        '<div class="card tinted"><h3>' + icon('tarot') + '陽陽在這裡</h3>' +
        '<div class="muted">「嗨 Lume，我是陽陽。可以直接抽牌，也可以把你在別處（例如 Gemini）的塔羅對話貼進來，我幫你整理。」</div>' +
        '<div class="row mt14"><button class="btn" id="draw" style="flex:1">🔮 開始新的對話</button>' +
        '<button class="btn ghost" id="paste" style="flex:1">📋 貼上外部對話紀錄</button></div>' +
        '<button class="btn ghost block mt8" id="backfill">🗓 補寫過去某一天的塔羅</button></div>' +

        '<div class="sec-title"><h2>🌟 本週總結與建議</h2>' +
        '<button class="btn sm" id="gen">' + (saved ? '重新統整' : '生成本週總結') + '</button></div>' +
        '<div class="card">' + (saved ?
          '<div class="ai-box" style="margin-top:0"><div class="who">' + icon('moon', 18) + '陽陽的本週統整 · ' + saved.week + '</div>' +
          '<p>' + L.nl2br(saved.summary) + '</p></div>' +
          '<div class="sec-title"><h2 style="font-size:14px">行動建議卡片</h2></div>' +
          '<div class="grid2">' + saved.actions.map(a =>
            '<div class="card soft" style="margin:0;padding:12px"><b style="font-size:13px">' + a.t + '</b>' +
            '<div class="muted" style="margin-top:4px;line-height:1.65">' + U.esc(a.d) + '</div></div>').join('') + '</div>'
          : '<div class="muted center" style="padding:16px">本週共 ' + weekRecs.length + ' 次對話，按下「生成本週總結」，陽陽會把抽牌與貼上的對話一起整理 ♡</div>') + '</div>' +

        '<div class="sec-title"><h2>📜 今天的對話</h2><span class="muted">累積 ' + all.length + ' 次</span></div>' +
        (list.length ? list.map(r => this.recordCard(r)).join('')
          : '<div class="card">' + L.empty('今天還沒有對話，抽一張牌或貼上一段對話吧 ♡', 'tarot') + '</div>') +
        (older.length ? '<button class="btn ghost block mt8" id="toldtoggle">' +
          (showOld ? '收起以前的對話 ▲' : '展開以前的對話（' + older.length + ' 次）▼') + '</button>' +
          (showOld ? older.slice(0, 30).map(r => this.recordCard(r)).join('') +
            (older.length > 30 ? '<div class="muted center mt8" style="font-size:12px">更早的紀錄請從下方月曆點日期查看 ♡</div>' : '') : '')
          : '') +

        '<div class="sec-title"><h2>🌙 塔羅歷史月曆</h2><span class="muted">點擊日期回顧那天 ♡</span></div>' +
        '<div class="card"><div id="tcal">' + tcalHTML() + '</div></div>';
    },

    recordCard(r) {
      const isPaste = r.source === 'paste';
      const long = (r.dialogue || '').length > 320;
      const open = !!expand[r.id];
      const bodyText = long && !open ? r.dialogue.slice(0, 320) + '…' : r.dialogue;
      return '<div class="card" data-rid="' + r.id + '">' +
        '<div class="spread"><div><b style="font-size:14px">' + U.esc(r.spread || '塔羅對話') + '</b>' +
        '<div class="muted">' + r.date + ' 星期' + D.weekday(r.date) + ' · ' +
        '<span class="chip ' + (isPaste ? 'mint' : '') + '">' + (isPaste ? '貼上紀錄' : '抽牌') + '</span></div></div>' +
        '<div style="display:flex;flex-direction:column;gap:2px;align-items:flex-end">' +
        L.editBtn(r.id) +
        '<button class="mini-btn" data-del="' + r.id + '">刪除</button></div></div>' +

        (r.note ? '<div class="muted mt8">💭 提問：' + L.nl2br(r.note) + '</div>' : '') +

        (r.cards && r.cards.length ? '<div class="grid' + (r.cards.length >= 3 ? '3' : '2') + ' mt8">' + r.cards.map(cardFace).join('') + '</div>' : '') +
        photosHTML(r) +

        (r.dialogue ? '<div class="ai-box"><div class="who">' + icon('quote', 18) +
          (isPaste ? '貼上的對話內容' : '陽陽說') + '</div><p>' + L.nl2br(bodyText) + '</p>' +
          (long ? '<button class="btn soft sm mt8" data-exp="' + r.id + '">' + (open ? '收合 ▲' : '展開全文 ▼') + '</button>' : '') +
          '</div>' : '') +

        (r.summary ?
          '<div class="ai-box" style="background:linear-gradient(150deg,#F4EFFD,#FFF7F9)">' +
          '<div class="who">' + icon('moon', 18) + '陽陽依據這段對話做的總結' +
          (r.summaryAt ? ' · ' + r.summaryAt.slice(0, 10) : '') + '</div>' +
          '<p>' + L.nl2br(r.summary) + '</p>' +
          (r.summaryActions && r.summaryActions.length ?
            '<div class="grid2 mt14">' + r.summaryActions.map(a =>
              '<div class="card soft" style="margin:0;padding:10px"><b style="font-size:12.5px">' + U.esc(a.t) + '</b>' +
              '<div class="muted" style="margin-top:3px;line-height:1.6;font-size:12px">' + U.esc(a.d) + '</div></div>').join('') + '</div>' : '') +
          '</div>'
          : (r.dialogue ? '<button class="btn block mt8" data-sum="' + r.id + '">✨ 依據這段對話產生總結</button>' : '')) +

        (r.summary ? '<div class="row mt8"><button class="btn soft sm" data-sum="' + r.id + '">🔄 重新整理總結</button></div>' : '') +
        '</div>';
    },

    mount(root, ctx) {
      const tog = root.querySelector('#toldtoggle');
      if (tog) tog.onclick = () => { showOld = !showOld; ctx.refresh(); };
      /* ---- 抽牌 ---- */
      root.querySelector('#draw').onclick = () => {
        L.modal('與陽陽對話',
          '<div class="field"><label>日期（想補寫過去也可以直接改 ♡）</label>' +
          '<input class="inp" type="date" id="d" value="' + D.today() + '"></div>' +
          '<div class="field"><label>牌陣</label><select class="inp" id="sp">' +
          L.SPREADS.map((s, i) => '<option' + (i === 0 ? ' selected' : '') + '>' + s + '</option>').join('') + '</select></div>' +
          '<div class="field"><label>牌數</label><select class="inp" id="n">' +
          [1, 2, 3, 4, 5].map(n => '<option value="' + n + '"' + (n === 1 ? ' selected' : '') + '>' + n + ' 張</option>').join('') + '</select></div>' +
          '<div class="field"><label>你的提問 / 想說的話</label><textarea class="inp" id="q" placeholder="例如：這個月的工作方向該怎麼調整？"></textarea></div>' +
          photoHTML() +
          '<button class="btn block" id="ok">🔮 抽牌</button>',
          (body, close) => {
            const keep = [], added = [];
            mountPhoto(body, keep, added);
            let saving = false;
            body.querySelector('#ok').onclick = () => {
              if (saving) return;                       // 防連點送出兩次
              saving = true;
              const btn = body.querySelector('#ok');
              if (btn) { btn.disabled = true; btn.textContent = '🔮 抽牌中…'; }
              try {
                const date = L.val(body, 'd') || D.today();
                const sp = body.querySelector('#sp').value;
                const n = +body.querySelector('#n').value;
                const q = body.querySelector('#q').value.trim();
                const cards = draw(n);
                const labels = /三張/.test(sp) ? POS3 : /現況/.test(sp) ? POS_AD : null;
                let dialogue = '「我聽見了。' + (q ? '你問的是：' + q : '你把心事帶來了') + '。」\n\n';
                cards.forEach((c, i) => {
                  const t = L.TAROT.find(x => x.n === c.id);
                  const pos = labels && labels[i] ? '【' + labels[i] + '】' : '';
                  dialogue += pos + '抽到 ' + t.zh + '（' + (c.rev ? '逆位' : '正位') + '）：' + (c.rev ? t.rev : t.up) + '。\n';
                });
                dialogue += '\n陽陽的小提醒：' +
                  ['牌面在說的是「先照顧好自己，答案會變清楚」。', '這組牌提醒你，不需要一次解決所有事，選一件先開始。',
                    '你心裡其實已經有方向了，牌只是幫你確認而已 ♡', '如果覺得卡住，先停下來休息，而不是逼自己更用力。'][U.dailySeed(q + D.today()) % 4];
                /* ★ 先同步寫進資料庫（文字一定存得到），照片再用背景補 */
                const rec = col().add({
                  date: date, spread: sp, cards, note: q, dialogue,
                  images: keep.slice(), source: 'draw'
                });
                gotoCal(date);
                close();
                L.toast('陽陽收到了 ♡');
                ctx.refresh();
                attachImages(rec.id, added, ctx);
              } catch (e) {
                saving = false;
                const b2 = body.querySelector('#ok');
                if (b2) { b2.disabled = false; b2.textContent = '🔮 抽牌'; }
                L.toast('有點小狀況，再按一次試試 ♡');
              }
            };
          });
      };

      /* ---- 貼上外部對話紀錄 ---- */
      root.querySelector('#paste').onclick = () => this.pasteForm(ctx, null);

      /* ---- 補寫過去某一天 ---- */
      root.querySelector('#backfill').onclick = () => this.backfill(ctx);

      /* ---- 塔羅月曆：事件委派（innerHTML 會重繪） ---- */
      const tcb = root.querySelector('#tcal');
      if (tcb) tcb.addEventListener('click', e => {
        const nav = e.target.closest ? e.target.closest('[data-tcal]') : null;
        if (nav) {
          if (nav.dataset.tcal === 'prev') { tcalM--; if (tcalM < 0) { tcalM = 11; tcalY--; } }
          else { tcalM++; if (tcalM > 11) { tcalM = 0; tcalY++; } }
          tcb.innerHTML = tcalHTML();
          return;
        }
        const cell = e.target.closest ? e.target.closest('[data-tdate]') : null;
        if (cell && cell.dataset.tdate) tarotDayModal(ctx, cell.dataset.tdate);
      });

      /* ---- 長文展開 ---- */
      root.querySelectorAll('[data-exp]').forEach(b => b.onclick = () => {
        expand[b.dataset.exp] = !expand[b.dataset.exp]; ctx.refresh();
      });

      /* ---- 產生 / 重整單筆總結 ---- */
      root.querySelectorAll('[data-sum]').forEach(b => b.onclick = () => {
        const rec = col().find(b.dataset.sum);
        if (!rec || !rec.dialogue) return L.toast('這筆還沒有對話內容可以整理 ♡');
        const s = summarizeDialogue(rec);
        col().update(rec.id, { summary: s.summary, summaryActions: s.actions, summaryAt: s.at });
        L.toast('陽陽整理好了 ♡'); ctx.refresh();
      });

      /* ---- 補充 / 修改對話 ---- */
      root.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => this.pasteForm(ctx, col().find(b.dataset.edit)));

      /* ---- 本週總結 ---- */
      root.querySelector('#gen').onclick = () => {
        const recs = col().where(r => D.weekKey(r.date) === D.weekKey(D.today()));
        if (!recs.length) return L.toast('本週還沒有對話記錄 ♡');
        const s = buildSummary(recs);
        const ex = wk().where(w => w.week === s.week)[0];
        if (ex) wk().update(ex.id, s); else wk().add(s);
        L.toast('陽陽整理好了 ♡'); ctx.refresh();
      };

      root.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
        if (await L.confirm('刪除對話', '確定刪掉這筆塔羅對話嗎？（含實體抽牌照片）')) {
          const r = col().find(b.dataset.del);
          if (r && r.images) r.images.forEach(k => { try { L.IDB.del(k); } catch (e) { } });
          col().remove(b.dataset.del); ctx.refresh();
        }
      });
    },

    /* ---------- 貼上 / 編輯對話表單 ---------- */
    pasteForm(ctx, rec) {
      const r = rec || {};
      /* ★ 關鍵修正：只有「真的有 id」才是編輯。
         從月曆按「為這天補一筆」進來時只帶 {date}，以前會被誤判成編輯，
         變成 col().update(undefined) → 找不到紀錄 → 送出完全沒反應。 */
      const editing = !!(rec && rec.id);
      const initCards = r.cards || [];
      L.modal(editing
        ? (r.source === 'draw' ? '編輯這筆抽牌對話' : '補充 / 修改對話紀錄')
        : (r.date && r.date !== D.today() ? '🗓 補寫 ' + D.pretty(r.date) + ' 的塔羅' : '貼上外部對話紀錄'),
        '<div class="grid2">' +
        '<div class="field"><label>日期</label><input class="inp" type="date" id="d" value="' + (r.date || D.today()) + '"></div>' +
        '<div class="field"><label>牌陣 / 主題</label><input class="inp" id="sp" value="' + U.esc(r.spread || '') + '" placeholder="例如：與 Gemini 的三牌對話"></div>' +
        '</div>' +
        '<div class="field"><label>提問 / 標題（選填）</label><input class="inp" id="q" value="' + U.esc(r.note || '') + '" placeholder="例如：這段關係該怎麼走下去？"></div>' +
        '<div class="field"><label>對話內容（直接貼上即可） <span class="req">*</span></label>' +
        '<textarea class="inp" id="dl" style="min-height:200px;line-height:1.75" placeholder="把 Gemini / ChatGPT / 任何地方的塔羅對話整段複製貼上來 ♡&#10;系統會自動從文字中辨識出現過的塔羅牌與正逆位。">' + U.esc(r.dialogue || '') + '</textarea></div>' +
        '<div class="row mb8"><button class="btn soft sm" id="scan">🔍 掃描文字中的牌卡</button>' +
        '<span class="muted" id="hint">貼上後點這裡，會自動抓出牌名</span></div>' +
        '<div class="field"><label>偵測到的牌卡（可自行增減）</label><div id="cards" class="row"></div>' +
        '<div class="row mt8"><select class="inp" id="addc" style="flex:1;min-width:130px">' +
        L.TAROT.map(t => '<option value="' + t.n + '">' + t.zh + '</option>').join('') + '</select>' +
        '<select class="inp" id="addr" style="width:96px;flex:0 0 96px"><option value="0">正位</option><option value="1">逆位</option></select>' +
        '<button class="btn sm" id="addb">加入</button></div></div>' +
        photoHTML() +
        '<label class="row" style="align-items:center;gap:8px;font-size:13px;margin-bottom:12px">' +
        '<input type="checkbox" id="autosum" checked style="width:17px;height:17px"> 存檔後立刻幫我產生對話總結</label>' +
        L.formFooter({ isEdit: editing, okText: editing ? '💾 保存修改' : '💾 收藏這段對話' }),

        (body, close) => {
          L.bindCancel(body, close);
          let cards = initCards.slice();

          /* 實體抽牌照片：舊圖（idb 鍵）+ 新圖（dataURL） */
          const keep = (r.images || []).slice();
          const added = [];
          mountPhoto(body, keep, added);

          const drawCards = () => {
            const box = body.querySelector('#cards');
            box.innerHTML = cards.length ? cards.map((c, i) => {
              const t = L.TAROT.find(x => x.n === c.id) || L.TAROT[0];
              return '<span class="chip ' + (c.rev ? 'pink' : '') + '" style="padding:6px 10px;cursor:pointer" data-rm="' + i + '">' +
                t.zh + (c.rev ? '（逆）' : '（正）') + ' ×</span>';
            }).join('') : '<span class="muted">尚未偵測到牌卡（也可以手動加入）</span>';
            box.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => {
              cards.splice(+b.dataset.rm, 1); drawCards();
            });
          };
          drawCards();

          body.querySelector('#scan').onclick = () => {
            const txt = body.querySelector('#dl').value;
            const found = detectCards(txt);
            if (!found.length) { body.querySelector('#hint').textContent = '沒有找到牌名，可手動加入 ♡'; return; }
            const seen = new Set(cards.map(c => c.id));
            found.forEach(f => { if (!seen.has(f.id)) cards.push(f); });
            body.querySelector('#hint').textContent = '找到 ' + found.length + ' 張牌 ♡';
            drawCards();
          };

          body.querySelector('#addb').onclick = () => {
            cards.push({ id: +body.querySelector('#addc').value, rev: body.querySelector('#addr').value === '1' });
            drawCards();
          };

          let saving = false;
          body.querySelector('#ok').onclick = () => {
            if (saving) return;                          // 防連點送出兩次
            /* 1) 先把欄位值通通讀出來（之後就算重繪也不會掉） */
            const dl = L.val(body, 'dl').trim();
            const sp = L.val(body, 'sp').trim();
            const note = L.val(body, 'q').trim();
            const date = L.val(body, 'd') || D.today();
            if (!dl && !cards.length && !note) return L.toast('貼上對話、選幾張牌，或至少寫一句提問吧 ♡');

            saving = true;
            const btn = body.querySelector('#ok');
            if (btn) { btn.disabled = true; btn.textContent = '💾 儲存中…'; }
            const autoSum = !!(body.querySelector('#autosum') && body.querySelector('#autosum').checked);

            try {
              /* 2) 同步寫入（文字一定存得到），照片先放既有鍵、新圖等一下再補 */
              const data = {
                date: date,
                spread: sp || (editing ? (r.spread || '塔羅對話') : '貼上的塔羅對話'),
                note: note,
                dialogue: dl,
                cards: cards.slice(),
                images: keep.slice(),
                source: editing ? (r.source || 'paste') : 'paste'
              };
              let id;
              if (editing) {
                col().update(rec.id, data);
                id = rec.id;
              } else {
                id = col().add(data).id;
              }
              /* 3) 被移除的舊照片從 IndexedDB 清掉 */
              (r.images || []).forEach(k => { if (keep.indexOf(k) < 0) { try { L.IDB.del(k); } catch (e) { } } });
              /* 4) 總結（用資料庫裡的那筆，保證拿得到） */
              if (autoSum) {
                const s = summarizeDialogue(col().find(id) || data);
                col().update(id, { summary: s.summary, summaryActions: s.actions, summaryAt: s.at });
              }
              /* 5) 月曆跳到這一筆的月份，標記馬上看得到 */
              gotoCal(date);
              close();
              L.toast(editing ? '已更新 ♡' : '對話已收藏，陽陽正在讀 ♡');
              ctx.refresh();
              attachImages(id, added, ctx);              // 6) 背景補照片
            } catch (e) {
              saving = false;
              const b2 = body.querySelector('#ok');
              if (b2) { b2.disabled = false; b2.textContent = editing ? '💾 保存修改' : '💾 收藏這段對話'; }
              L.toast('儲存時出了一點小狀況，再按一次試試 ♡');
            }
          };
        });
    },

    /* ---------- 補寫：選一個過去的日期 ---------- */
    backfill(ctx) {
      const t = D.today();
      const opts = [
        { k: D.addDays(t, -1), t: '昨天' },
        { k: D.addDays(t, -2), t: '前天' },
        { k: D.addDays(t, -7), t: '上週同一天' }
      ];
      L.modal('🗓 補寫過去某一天',
        '<div class="muted mb8" style="font-size:12.5px">選一天，幫那天補上塔羅紀錄（含實體抽牌照片）♡</div>' +
        '<div class="row mb8">' + opts.map(o =>
          '<button class="btn soft sm" data-bf="' + o.k + '" style="flex:1">' + o.t + '</button>').join('') + '</div>' +
        '<div class="field"><label>或直接選日期</label><input class="inp" type="date" id="bf-d" value="' + D.addDays(t, -1) + '"></div>' +
        '<button class="btn block mt8" id="ok">✏️ 開始補寫</button>' +
        '<button class="btn-cancel mt8" id="cancel">取消</button>',
        (body, close) => {
          L.bindCancel(body, close);
          body.querySelectorAll('[data-bf]').forEach(b => b.onclick = () => {
            const k = b.dataset.bf; close(); this.pasteForm(ctx, { date: k });
          });
          body.querySelector('#ok').onclick = () => {
            const v = L.val(body, 'bf-d') || D.addDays(t, -1);
            close(); this.pasteForm(ctx, { date: v });
          };
        });
    }
  };
})(window.Lume);
