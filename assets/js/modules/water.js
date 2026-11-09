/* ============================================================
   water.js — 飲控專區：喝水打卡 / 體重趨勢 / 三餐紀錄 / 熱量提醒
   ------------------------------------------------------------
   ★ 防崩潰設計（v9）：
     雲端同步 / 舊版本資料可能帶來「不完整或型別錯亂」的紀錄
     （例如 { goal: 2000 } 卻沒有 logs、logs 裡混了 null、
      weights 少了 date…）。本模組一律先「正規化」再使用，
     任何一筆髒資料都不會讓整頁崩成白屏或錯誤卡。
   ============================================================ */
window.Lume = window.Lume || {}; window.Lume.modules = window.Lume.modules || {};
(function (L) {
  'use strict';
  const { D, U, icon, Store } = L;
  const water = () => Store.map('water');
  const diet = () => Store.map('diet');
  const wCol = () => Store.col('weights');
  const MEALS = [{ k: 'breakfast', t: '早餐', i: '☀️' }, { k: 'lunch', t: '午餐', i: '🍱' }, { k: 'dinner', t: '晚餐', i: '🌙' }, { k: 'snack', t: '點心', i: '🍰' }];
  const MEAL_KEYS = MEALS.map(m => m.k);

  /* ---------- 防錯小工具 ---------- */
  const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const safeGoal = (v, dflt) => { const n = U.num(v, dflt); return (isFinite(n) && n > 0) ? n : dflt; };
  const safeText = (v, dflt) => (typeof v === 'string' ? v : (v == null ? (dflt || '') : String(v)));

  /** 喝水陣列正規化：濾掉 null、把舊格式（純數字）轉成物件 */
  function safeLogs(v) {
    if (!Array.isArray(v)) return [];
    const out = [];
    for (let i = 0; i < v.length; i++) {
      const l = v[i];
      if (l == null) continue;
      if (typeof l === 'number') { out.push({ ml: U.num(l, 0), t: '--:--' }); continue; }  // 舊格式殘留
      if (typeof l !== 'object') continue;
      out.push({ ml: U.num(l.ml, 0), t: safeText(l.t, '--:--') || '--:--' });
    }
    return out;
  }

  /** 三餐陣列正規化：濾掉 null、保證 name 是字串、kcal 是數字 */
  function safeMealList(v) {
    if (!Array.isArray(v)) return [];
    const out = [];
    for (let i = 0; i < v.length; i++) {
      const x = v[i];
      if (x == null || typeof x !== 'object') continue;
      const name = safeText(x.name).trim();
      const img = (typeof x.img === 'string' && x.img) ? x.img : '';
      if (!name && !img) continue;
      const o = { name: name || '📷 照片紀錄', kcal: U.num(x.kcal, 0), note: safeText(x.note) };
      if (img) o.img = img;
      out.push(o);
    }
    return out;
  }

  /** 體重陣列正規化：必須有 date（缺的補今天）與數字 kg */
  function safeWeights() {
    const raw = wCol().all();
    if (!Array.isArray(raw)) return [];
    const out = [];
    for (let i = 0; i < raw.length; i++) {
      const w = raw[i];
      if (w == null || typeof w !== 'object') continue;
      const kg = U.num(w.kg, 0);
      if (!isFinite(kg) || kg <= 0) continue;
      out.push({
        id: w.id || ('w_' + i),
        date: /^\d{4}-\d{2}-\d{2}$/.test(w.date) ? w.date : D.today(),
        kg: kg,
        note: safeText(w.note)
      });
    }
    return out.sort((a, b) => a.date < b.date ? -1 : (a.date > b.date ? 1 : 0));
  }

  /* ---------- 今日喝水 ---------- */
  function todayWater(day) {
    const k = day || D.today();
    const prof = Store.doc('profile').get() || {};
    const past = k !== D.today();
    const raw = past ? (water().all()[k] || { logs: [], goal: safeGoal(prof.waterGoal, 2000) })
      : water().get(k, { logs: [], goal: safeGoal(prof.waterGoal, 2000) });
    const rec = isObj(raw) ? raw : {};
    const logs = safeLogs(rec.logs);
    const goal = safeGoal(rec.goal, safeGoal(prof.waterGoal, 2000));

    /* 自癒：資料不完整就補回標準結構（只補一次，避免同步打架） */
    const broken = !isObj(raw) || !Array.isArray(rec.logs) || logs.length !== (Array.isArray(rec.logs) ? rec.logs.length : 0) || U.num(rec.goal, 0) !== goal;
    if (broken && (!past || water().all()[k])) { try { water().set(k, { logs: logs, goal: goal }); } catch (e) { } }

    let total = 0;
    for (let i = 0; i < logs.length; i++) total += U.num(logs[i].ml, 0);
    return { rec: { logs: logs, goal: goal }, total: total, goal: goal, logs: logs };
  }

  /* ---------- 今日熱量 ---------- */
  function todayDiet(day) {
    const k = day || D.today();
    const exists = !!diet().all()[k];
    const raw = exists || k === D.today() ? diet().get(k, { meals: {} }) : { meals: {} };
    const rec = isObj(raw) ? raw : {};
    const meals = isObj(rec.meals) ? rec.meals : {};
    const out = {};
    let sum = 0;
    MEAL_KEYS.forEach(mk => {
      const list = safeMealList(meals[mk]);
      out[mk] = list;
      list.forEach(x => sum += U.num(x.kcal, 0));
    });
    if ((!isObj(raw) || !isObj(rec.meals)) && (exists || k === D.today())) { try { diet().set(k, { meals: out }); } catch (e) { } }
    return { rec: { meals: out }, meals: out, kcal: sum };
  }

  /* ---------- 體重趨勢圖 ---------- */
  function weightChart() {
    try {
      const arr = safeWeights().slice(-30);
      if (arr.length < 2) return '<div class="muted center" style="padding:14px">再記錄一次體重，就能看到趨勢囉 ♡</div>';
      const W = 320, H = 130, pad = 18;
      const vals = arr.map(x => U.num(x.kg, 0));
      const min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
      const span = (max - min) || 1;
      if (!isFinite(span) || span <= 0) return '<div class="muted center" style="padding:14px">再記錄一次體重，就能看到趨勢囉 ♡</div>';
      const px = i => pad + i * (W - pad * 2) / (arr.length - 1);
      const py = v => H - pad - (v - min) / span * (H - pad * 2.2);
      const pts = arr.map((x, i) => px(i).toFixed(1) + ',' + py(U.num(x.kg, 0)).toFixed(1)).join(' ');
      const area = 'M' + px(0).toFixed(1) + ',' + (H - pad) + ' L' +
        arr.map((x, i) => px(i).toFixed(1) + ',' + py(U.num(x.kg, 0)).toFixed(1)).join(' L') +
        ' L' + px(arr.length - 1).toFixed(1) + ',' + (H - pad) + ' Z';
      const label = safeText(arr[arr.length - 1].date).slice(5) || '';
      return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:150px">' +
        '<defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#C7ACE9" stop-opacity=".45"/><stop offset="100%" stop-color="#C7ACE9" stop-opacity="0"/></linearGradient></defs>' +
        '<path d="' + area + '" fill="url(#wg)"/>' +
        '<polyline points="' + pts + '" fill="none" stroke="#8E6FC8" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>' +
        arr.map((x, i) => '<circle cx="' + px(i).toFixed(1) + '" cy="' + py(U.num(x.kg, 0)).toFixed(1) + '" r="3.2" fill="#fff" stroke="#8E6FC8" stroke-width="2"/>').join('') +
        '<text x="' + pad + '" y="12" font-size="10" fill="#A79EB4">最高 ' + max + '</text>' +
        '<text x="' + pad + '" y="' + (H - 4) + '" font-size="10" fill="#A79EB4">最低 ' + min + '</text>' +
        '<text x="' + (W - pad) + '" y="12" font-size="10" fill="#A79EB4" text-anchor="end">' + U.esc(label) + '</text>' +
        '</svg>';
    } catch (e) {
      console.error('[water] 體重圖表略過', e);
      return '<div class="muted center" style="padding:14px">趨勢圖暫時畫不出來，其餘功能都正常 ♡</div>';
    }
  }


  /* ---------- 飲食喝水月曆 ---------- */
  let dcalY = new Date().getFullYear();
  let dcalM = new Date().getMonth();

  function daySummary(k) {
    const w = todayWater(k), dd = todayDiet(k);
    let items = 0, photo = false;
    MEAL_KEYS.forEach(mk => { items += dd.meals[mk].length; if (dd.meals[mk].some(x => x.img)) photo = true; });
    const wt = safeWeights().filter(x => x.date === k)[0] || null;
    return { water: w.total, goal: w.goal, logs: w.logs, items: items, kcal: dd.kcal, meals: dd.meals, photo: photo, weight: wt };
  }

  function dcalHTML() {
    const first = D.firstDow(dcalY, dcalM);
    const total = D.daysInMonth(dcalY, dcalM);
    const today = D.today();
    const wAll = water().all() || {}, dAll = diet().all() || {};
    const wDates = {};
    safeWeights().forEach(x => { wDates[x.date] = 1; });
    let cells = '日一二三四五六'.split('').map(d => '<div class="cal-dow">' + d + '</div>').join('');
    for (let i = 0; i < first; i++) cells += '<div class="cal-cell out"></div>';
    let n = 0;
    for (let d = 1; d <= total; d++) {
      const key = dcalY + '-' + D.pad(dcalM + 1) + '-' + D.pad(d);
      let inner = '<span>' + d + '</span>';
      let has = false;
      if (wAll[key] || dAll[key] || wDates[key]) {
        const sm = daySummary(key);
        if (sm.water || sm.items || sm.weight) {
          has = true; n++;
          const met = sm.water >= sm.goal;
          inner += '<div class="cal-icos">' +
            (sm.water ? '<span class="cal-ico">' + icon('drop', 15) + '</span>' : '') +
            (sm.items ? '<span class="cal-ico">' + icon('cake', 15) + '</span>' : '') +
            (sm.photo ? '<span class="cal-ico tiny">📷</span>' : '') + '</div>' +
            '<i class="cal-dot" style="background:' + (met ? '#87BBA0' : '#C7ACE9') + '"></i>';
        }
      }
      cells += '<div class="cal-cell' + (key === today ? ' today' : '') + (has ? ' has' : '') + '" data-ddate="' + key + '">' + inner + '</div>';
    }
    return '<div class="cal-head">' +
      '<button class="icon-btn" data-dcal="prev" style="width:32px;height:32px">' +
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M15 5l-7 7 7 7" stroke="#8E6FC8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<b>' + dcalY + ' 年 ' + (dcalM + 1) + ' 月 · 記錄 ' + n + ' 天</b>' +
      '<button class="icon-btn" data-dcal="next" style="width:32px;height:32px">' +
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M9 5l7 7-7 7" stroke="#8E6FC8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>' +
      '<div class="cal-grid">' + cells + '</div>' +
      '<div class="cal-legend mt8">' +
      '<span class="lg"><span style="width:15px;height:15px;display:inline-block">' + icon('drop', 15) + '</span>有喝水</span>' +
      '<span class="lg"><span style="width:15px;height:15px;display:inline-block">' + icon('cake', 15) + '</span>有飲食紀錄</span>' +
      '<span class="lg"><i class="cal-dot" style="position:static;display:inline-block;width:7px;height:7px;border-radius:50%;background:#87BBA0"></i>喝水達標</span></div>';
  }

  /** 點月曆日期 → 跳出那天的完整明細（可編輯 / 刪除） */
  function dayDetailHTML(k) {
    const sm = daySummary(k);
    let h = '<div class="stats" style="margin-bottom:10px">' + L.stat(sm.water, ' ml', '喝水 / ' + sm.goal) +
      L.stat(sm.kcal, ' kcal', '熱量') + L.stat(sm.weight ? sm.weight.kg : '—', sm.weight ? ' kg' : '', '體重') + '</div>';
    h += '<div class="muted mb8">💧 喝水紀錄</div>' + (sm.logs.length ? '<div class="flexlist">' + sm.logs.map((l, i) =>
      '<div class="item" style="padding:8px 12px"><div style="width:22px;height:22px">' + icon('drop', 22) + '</div>' +
      '<div class="body"><div class="t">' + U.num(l.ml, 0) + ' ml</div><div class="m"><span>' + U.esc(safeText(l.t, '--:--')) + '</span></div></div>' +
      '<div style="display:flex;flex-direction:column;gap:2px;align-items:flex-end">' + L.editBtn(i, 'xwed') +
      '<button class="mini-btn" data-xund="' + i + '">移除</button></div></div>').reverse().join('') + '</div>'
      : '<div class="muted center" style="padding:8px;font-size:12px">這天沒有喝水紀錄</div>');
    h += '<div class="deco-line"></div>';
    MEALS.forEach(m => {
      const arr = sm.meals[m.k] || [];
      if (!arr.length) return;
      const sum = arr.reduce((a, b) => a + U.num(b.kcal, 0), 0);
      h += '<div class="spread mt8"><b style="font-size:13.5px">' + m.i + ' ' + m.t + '</b><span class="muted">' + sum + ' kcal</span></div>' +
        '<div class="flexlist" style="margin-top:6px">' + arr.map((x, i) =>
          '<div class="item" style="padding:8px 12px">' +
          (x.img ? '<div class="meal-pic">' + L.imgTag(x.img) + '</div>' : '') +
          '<div class="body"><div class="t">' + U.esc(safeText(x.name)) + '</div>' +
          '<div class="m"><span>' + U.num(x.kcal, 0) + ' kcal</span>' + (x.note ? '<span>' + U.esc(x.note) + '</span>' : '') + '</div></div>' +
          '<div style="display:flex;flex-direction:column;gap:2px;align-items:flex-end">' + L.editBtn(m.k + '|' + i, 'xmedit') +
          '<button class="mini-btn" data-xrm="' + m.k + '|' + i + '">刪除</button></div></div>').join('') + '</div>';
    });
    if (!sm.items) h += '<div class="muted center" style="padding:8px;font-size:12px">這天沒有飲食紀錄</div>';
    if (sm.weight) {
      h += '<div class="deco-line"></div><div class="item" style="padding:8px 12px"><div class="body"><div class="t">⚖️ ' + sm.weight.kg + ' kg</div>' +
        (sm.weight.note ? '<div class="m"><span>' + U.esc(sm.weight.note) + '</span></div>' : '') + '</div>' +
        '<div style="display:flex;flex-direction:column;gap:2px;align-items:flex-end">' + L.editBtn(sm.weight.id, 'xwedit') +
        '<button class="mini-btn" data-xdelw="' + U.esc(sm.weight.id) + '">刪除</button></div></div>';
    }
    h += '<div class="row mt14"><button class="btn soft sm" data-xaddwater style="flex:1">＋ 補喝水</button>' +
      '<button class="btn soft sm" data-xaddmeal style="flex:1">＋ 補一餐</button>' +
      '<button class="btn soft sm" data-xaddw style="flex:1">＋ 體重</button></div>';
    return h;
  }

  function advise(kcal, goal) {
    const gk = safeGoal(goal, 1600);
    const kc = U.num(kcal, 0);
    if (kc >= gk) return { cls: 'sun', txt: '今天的熱量已達標，剩下就交給水分與休息吧 ♡ 若還想吃，優先選蛋白質與蔬菜。' };
    if (kc >= gk * 0.85) return { cls: 'pink', txt: '快靠近目標了，接下來建議以高蛋白質、低 GI 為主，會更有飽足感 ♡' };
    if (kc >= gk * 0.6) return { cls: 'mint', txt: '攝取過半，節奏不錯。記得搭配足量蛋白質，避免血糖快速起伏。' };
    return { cls: 'mint', txt: '還有充裕空間，好好吃一頓營養均衡的餐點吧 ♡' };
  }

  L.modules.water = {
    id: 'water', name: '飲食喝水', icon: 'drop',

    render() {
      /* 最外層保險：任何意外都只顯示溫和提示，絕不讓整頁掛掉 */
      try { return this._render(); }
      catch (e) {
        console.error('[water] render 失敗，改用安全版', e);
        try { return this._safeRender(e); } catch (e2) { return '<div class="card"><h3>喝水紀錄 ♡</h3><div class="muted">資料讀取中，稍候再回來看看。</div></div>'; }
      }
    },

    /** 真的整包壞掉時的最簡版面：只給喝水打卡，其餘略過 */
    _safeRender(err) {
      const prof = Store.doc('profile').get() || {};
      const goal = safeGoal(prof.waterGoal, 2000);
      return '<div class="card tinted"><h3>' + icon('drop') + '今日喝水打卡</h3>' +
        '<div class="wq-grid mt8">' +
        [200, 300, 500, 750, 900].map(v => '<button class="wq-btn" data-add="' + v + '"><b>+' + v + '</b><small>ml</small></button>').join('') +
        '<button class="wq-btn custom" data-custom><b>自訂</b><small>輸入水量</small></button></div>' +
        '<div class="muted mt8" style="font-size:12px">目標 ' + goal + ' ml ♡（部分資料讀取異常，其餘區塊已暫時略過）</div></div>';
    },

    _render() {
      const t = todayWater();
      const total = U.num(t.total, 0), goal = t.goal;
      const pct = Math.round(U.clamp(total / goal * 100, 0, 100)) || 0;
      const left = Math.max(0, goal - total);
      const dd = todayDiet();
      const kc = U.num(dd.kcal, 0);
      const prof = Store.doc('profile').get() || {};
      const kgoal = safeGoal(prof.kcalGoal, 1600);
      const ad = advise(kc, kgoal);
      const ws = safeWeights();
      const lastW = ws.length ? ws[ws.length - 1] : null;
      const logs = t.logs;
      const barPct = Math.round(U.clamp(kc / kgoal * 100, 0, 100)) || 0;

      return '' +
        /* 喝水 */
        '<div class="card tinted"><h3>' + icon('drop') + '今日喝水打卡</h3>' +
        '<div class="ring-wrap"><div id="wring">' + L.ring(pct, pct + '<i>%</i>', total + ' / ' + goal + ' ml') + '</div>' +
        '<div style="flex:1;min-width:150px">' +
        '<div class="kv"><span>已喝</span><b>' + total + ' ml</b></div>' +
        '<div class="kv"><span>目標</span><b>' + goal + ' ml</b></div>' +
        '<div class="kv"><span>還需</span><b style="color:var(--lav-700)">' + left + ' ml</b></div>' +
        '<div class="wq-grid mt8">' +
        [200, 300, 500, 750, 900].map(v =>
          '<button class="wq-btn" data-add="' + v + '"><b>+' + v + '</b><small>ml</small></button>').join('') +
        '<button class="wq-btn custom" data-custom><b>自訂</b><small>輸入水量</small></button>' +
        '</div>' +
        '</div></div>' +
        '<div class="muted center mt8" style="font-size:12px">' +
        (logs.length ? '今天已打卡 ' + logs.length + ' 次 ♡ 明細收在最下面的月曆，點今天就看得到'
          : '今天還沒喝水紀錄 ♡') + '</div></div>' +

        /* 熱量 */
        '<div class="card"><h3>' + icon('cake') + '今日熱量</h3>' +
        '<div class="spread"><b style="font-size:20px;color:var(--lav-700)">' + kc + ' <small style="font-size:12px">kcal</small></b>' +
        '<span class="muted">目標 ' + kgoal + ' kcal</span></div>' +
        '<div class="bar mt8"><i style="width:' + barPct + '%;background:linear-gradient(90deg,#F0C9A8,#E9A8BC)"></i></div>' +
        '<div class="mt8 chip ' + ad.cls + '" style="display:block;line-height:1.7;padding:9px 11px;white-space:normal">' + ad.txt + '</div>' +
        '<div class="row mt8"><button class="btn ghost sm" data-tip-p>高蛋白質建議</button><button class="btn ghost sm" data-tip-g>低 GI 建議</button>' +
        '<button class="btn ghost sm" data-set-goal>設定目標</button></div></div>' +

        /* 三餐 */
        '<div class="sec-title"><h2>🍽 三餐飲食紀錄</h2><span class="muted">' + U.esc(D.pretty(D.today())) + '</span></div>' +
        MEALS.map(m => {
          const arr = dd.meals[m.k] || [];
          const s = arr.reduce((a, b) => a + U.num(b.kcal, 0), 0);
          return '<div class="card"><div class="spread"><h3 style="margin:0">' + m.i + ' ' + m.t + '</h3>' +
            '<span class="muted">' + s + ' kcal</span></div>' +
            (arr.length ? '<div class="muted" style="font-size:12px;margin-top:4px">已記錄 ' + arr.length + ' 項' +
              (arr.some(x => x.img) ? ' · 含照片 📷' : '') + '（明細在下方月曆）</div>' : '') +
            '<div class="row mt8"><input class="inp" id="i-' + m.k + '" placeholder="吃了什麼？（拍照可不填）" style="flex:1;min-width:120px">' +
            '<input class="inp" id="k-' + m.k + '" type="number" placeholder="kcal" style="width:80px;flex:0 0 80px">' +
            '<button class="btn sm" data-mk="' + m.k + '">加入</button>' +
            '<button class="btn ghost sm" data-mphoto="' + m.k + '" title="拍照 / 上傳照片">📷</button></div></div>';
        }).join('') +

        /* 體重 */
        '<div class="sec-title"><h2>⚖️ 體重記錄與趨勢</h2><button class="btn sm" data-addw>＋ 記錄</button></div>' +
        '<div class="card">' + (lastW ? '<div class="spread mb8"><b style="font-size:22px;color:var(--lav-700)">' + lastW.kg + ' <small style="font-size:12px">kg</small></b>' +
          '<span class="muted">最近一次 ' + U.esc(lastW.date) + (prof.weightGoal ? ' · 目標 ' + U.esc(prof.weightGoal) + 'kg' : '') + '</span></div>' : '') +
        weightChart() +
        '</div>' +

        /* 月曆：每天的喝水 / 三餐 / 體重都收在這裡，點日期跳出明細 */
        '<div class="sec-title"><h2>🗓 飲食喝水月曆</h2><span class="muted">點日期看那天吃了什麼 ♡</span></div>' +
        '<div class="card" id="dcalwrap"><div id="dcal">' + dcalHTML() + '</div></div>';
    },

    mount(root, ctx) {
      /* 每個綁定都獨立包 try/catch：單一顆按鈕壞掉，其他按鈕照樣能用 */
      const bind = (sel, fn) => {
        try {
          root.querySelectorAll(sel).forEach(b => { b.onclick = () => { try { fn(b); } catch (e) { console.error('[water] ' + sel, e); L.toast('這個動作出了點小狀況 ♡'); } }; });
        } catch (e) { console.error('[water] bind ' + sel, e); }
      };

      bind('[data-add]', b => {
        const k = D.today();
        const t = todayWater();
        const n = new Date();
        const ml = U.num(b.dataset.add, 0) || 250;
        const rec = { logs: t.logs.concat([{ ml: ml, t: D.pad(n.getHours()) + ':' + D.pad(n.getMinutes()) }]), goal: t.goal };
        water().set(k, rec);
        try { Store.flush(); } catch (e) { }
        L.toast('+' + ml + ' ml，很棒 ♡'); ctx.refresh();
      });

      const cs = root.querySelector('[data-custom]');
      if (cs) cs.onclick = () => this.waterForm(ctx, null);

      /* 喝水紀錄：編輯 / 移除 */
      bind('[data-wed]', b => {
        const t = todayWater();
        this.waterForm(ctx, t.logs[U.num(b.dataset.wed, 0)], U.num(b.dataset.wed, 0));
      });
      bind('[data-und]', b => {
        const t = todayWater();
        const i = U.num(b.dataset.und, -1);
        if (i < 0 || i >= t.logs.length) return L.toast('找不到這筆紀錄 ♡');
        const logs = t.logs.slice(); logs.splice(i, 1);
        water().set(D.today(), { logs: logs, goal: t.goal }); ctx.refresh();
      });

      /* 三餐：新增 / 編輯 / 刪除 */
      bind('[data-mk]', b => {
        const k = b.dataset.mk;
        const nameEl = root.querySelector('#i-' + k);
        const kcalEl = root.querySelector('#k-' + k);
        if (!nameEl) return;
        const name = String(nameEl.value || '').trim();
        if (!name) return L.toast('先寫下吃了什麼 ♡');
        const dd = todayDiet();
        const meals = dd.meals;
        meals[k] = (meals[k] || []).concat([{ name: name, kcal: U.num(kcalEl && kcalEl.value, 0), note: '' }]);
        diet().set(D.today(), { meals: meals });
        try { Store.flush(); } catch (e) { }
        ctx.refresh();
      });
      bind('[data-medit]', b => {
        const parts = String(b.dataset.medit || '').split('|');
        const k = parts[0], i = U.num(parts[1], -1);
        const dd = todayDiet();
        this.mealForm(ctx, k, i, (dd.meals[k] || [])[i]);
      });
      bind('[data-rm]', b => {
        const parts = String(b.dataset.rm || '').split('|');
        const k = parts[0], i = U.num(parts[1], -1);
        const dd = todayDiet();
        const list = dd.meals[k] || [];
        if (i < 0 || i >= list.length) return L.toast('找不到這筆紀錄 ♡');
        const meals = {};
        MEAL_KEYS.forEach(mk => meals[mk] = (dd.meals[mk] || []).slice());
        meals[k].splice(i, 1);
        diet().set(D.today(), { meals: meals }); ctx.refresh();
      });

      /* 體重：新增 / 編輯 / 刪除 */
      const addw = root.querySelector('[data-addw]');
      if (addw) addw.onclick = () => this.weightForm(ctx, null);
      bind('[data-wedit]', b => this.weightForm(ctx, wCol().find(b.dataset.wedit)));
      bind('[data-delw]', b => { wCol().remove(b.dataset.delw); ctx.refresh(); });

      /* 三餐：拍照記錄（可不填名稱，照片就是紀錄） */
      bind('[data-mphoto]', async b => {
        const k = b.dataset.mphoto;
        const arr = await U.pickImages(1000, 0.7);
        if (!arr.length) return;
        const nameEl = root.querySelector('#i-' + k);
        const kcalEl = root.querySelector('#k-' + k);
        const name = String((nameEl && nameEl.value) || '').trim();
        const kcal = U.num(kcalEl && kcalEl.value, 0);
        L.toast('照片儲存中… ♡');
        let keys = [];
        try { keys = (await L.IDB.putMany(arr, 5000)).filter(Boolean); } catch (e) { keys = arr; }
        const dd = todayDiet();
        const meals = {};
        MEAL_KEYS.forEach(mk => meals[mk] = (dd.meals[mk] || []).slice());
        keys.forEach((key, i) => meals[k].push({ name: name, kcal: i === 0 ? kcal : 0, note: '', img: key }));
        diet().set(D.today(), { meals: meals });
        try { Store.flush(); } catch (e) { }
        L.toast('已用照片記錄 ' + keys.length + ' 筆 ♡'); ctx.refresh();
      });

      /* 飲食喝水月曆：切月 / 點日期 */
      const dwrap = root.querySelector('#dcalwrap');
      if (dwrap) dwrap.addEventListener('click', e => {
        const nav = e.target.closest ? e.target.closest('[data-dcal]') : null;
        if (nav) {
          if (nav.dataset.dcal === 'prev') { dcalM--; if (dcalM < 0) { dcalM = 11; dcalY--; } }
          else { dcalM++; if (dcalM > 11) { dcalM = 0; dcalY++; } }
          root.querySelector('#dcal').innerHTML = dcalHTML();
          return;
        }
        const cell = e.target.closest ? e.target.closest('[data-ddate]') : null;
        if (cell && cell.dataset.ddate) this.dayModal(ctx, cell.dataset.ddate);
      });

      /* 建議與目標設定 */
      const tipP = root.querySelector('[data-tip-p]');
      if (tipP) tipP.onclick = () => L.modal('高蛋白質建議',
        '<p class="muted" style="margin-top:0">攝取足量蛋白質能延長飽足感、減少嘴饞 ♡</p>' +
        '<div class="row">' + (L.HIGH_PROTEIN || []).map(x => '<span class="chip">' + U.esc(x) + '</span>').join('') + '</div>');
      const tipG = root.querySelector('[data-tip-g]');
      if (tipG) tipG.onclick = () => L.modal('低 GI 建議',
        '<p class="muted" style="margin-top:0">低 GI 食物讓血糖平穩，情緒也比較不容易起伏 ♡</p>' +
        '<div class="row">' + (L.LOW_GI || []).map(x => '<span class="chip mint">' + U.esc(x) + '</span>').join('') + '</div>');
      const setGoal = root.querySelector('[data-set-goal]');
      if (setGoal) setGoal.onclick = () => {
        const p = Store.doc('profile').get() || {};
        L.modal('設定每日目標', '<div class="grid2">' +
          '<div class="field"><label>喝水目標（ml）</label><input class="inp" type="number" id="w" value="' + U.num(p.waterGoal, 2000) + '"></div>' +
          '<div class="field"><label>熱量目標（kcal）</label><input class="inp" type="number" id="k" value="' + U.num(p.kcalGoal, 1600) + '"></div></div>' +
          '<div class="field"><label>體重目標（kg，可不填）</label><input class="inp" type="number" step="0.1" id="g" value="' + U.esc(p.weightGoal || '') + '"></div>' +
          '<button class="btn block" id="ok">儲存 ♡</button>', (body, close) => {
            const ok = body.querySelector('#ok');
            if (ok) ok.onclick = () => {
              Store.doc('profile').set({
                waterGoal: safeGoal(L.val(body, 'w'), 2000),
                kcalGoal: safeGoal(L.val(body, 'k'), 1600),
                weightGoal: L.val(body, 'g') ? U.num(L.val(body, 'g'), 0) : null
              });
              close(); ctx.refresh();
            };
          });
      };
    },

    /* ---------- 月曆：某一天的明細 ---------- */
    dayModal(ctx, k) {
      const self = this;
      const reopen = () => { ctx.refresh(); self.dayModal(ctx, k); };
      L.modal(D.pretty(k) + ' 星期' + D.weekday(k) + ' · 飲食喝水', dayDetailHTML(k), (body, close) => {
        L.hydrateImages(body);
        body.addEventListener('click', e => {
          const hit = a => e.target.closest ? e.target.closest('[data-' + a + ']') : null;
          let b;
          if ((b = hit('xwed'))) { close(); const t = todayWater(k); const i = U.num(b.dataset.xwed, 0); return self.waterForm(ctx, t.logs[i], i, k, reopen); }
          if ((b = hit('xund'))) {
            const t = todayWater(k); const i = U.num(b.dataset.xund, -1);
            if (i < 0 || i >= t.logs.length) return;
            const logs = t.logs.slice(); logs.splice(i, 1);
            water().set(k, { logs: logs, goal: t.goal }); close(); return reopen();
          }
          if ((b = hit('xmedit'))) {
            close();
            const parts = String(b.dataset.xmedit).split('|'); const mk = parts[0], i = U.num(parts[1], -1);
            return self.mealForm(ctx, mk, i, (todayDiet(k).meals[mk] || [])[i], k, reopen);
          }
          if ((b = hit('xrm'))) {
            const parts = String(b.dataset.xrm).split('|'); const mk = parts[0], i = U.num(parts[1], -1);
            const dd = todayDiet(k); const meals = {};
            MEAL_KEYS.forEach(m => meals[m] = (dd.meals[m] || []).slice());
            if (i < 0 || i >= meals[mk].length) return;
            const gone = meals[mk].splice(i, 1)[0];
            if (gone && gone.img) { try { L.IDB.del(gone.img); } catch (e2) { } }
            diet().set(k, { meals: meals }); close(); return reopen();
          }
          if ((b = hit('xwedit'))) { close(); return self.weightForm(ctx, wCol().find(b.dataset.xwedit), k, reopen); }
          if ((b = hit('xdelw'))) { wCol().remove(b.dataset.xdelw); close(); return reopen(); }
          if (hit('xaddwater')) { close(); return self.waterForm(ctx, null, null, k, reopen); }
          if (hit('xaddmeal')) { close(); return self.mealForm(ctx, 'breakfast', -1, null, k, reopen); }
          if (hit('xaddw')) { close(); return self.weightForm(ctx, null, k, reopen); }
        });
      });
    },

    /* ---------- 喝水：新增 / 編輯 ---------- */
    waterForm(ctx, log, idx, day, after) {
      day = day || D.today();
      const l = (log && typeof log === 'object') ? log : {};
      L.modal(log ? '編輯喝水紀錄' : '自訂水量',
        '<div class="grid2">' +
        '<div class="field"><label>水量（ml）</label><input class="inp" type="number" id="v" value="' + U.num(l.ml, 250) + '"></div>' +
        '<div class="field"><label>時間</label><input class="inp" type="time" id="t" value="' +
        U.esc(l.t || D.pad(new Date().getHours()) + ':' + D.pad(new Date().getMinutes())) + '"></div></div>' +
        L.formFooter({ isEdit: !!log }),
        (body, close) => {
          L.bindCancel(body, close);
          const ok = body.querySelector('#ok');
          if (!ok) return;
          ok.onclick = () => {
            const t = todayWater(day);
            const item = {
              ml: safeGoal(L.val(body, 'v'), 250),
              t: L.val(body, 't') || D.pad(new Date().getHours()) + ':' + D.pad(new Date().getMinutes())
            };
            const logs = t.logs.slice();
            if (log && idx != null && idx >= 0 && idx < logs.length) logs[idx] = item; else logs.push(item);
            water().set(day, { logs: logs, goal: t.goal });
            close(); L.toast(log ? '已更新 ♡' : '+' + item.ml + ' ml，很棒 ♡');
            if (after) after(); else ctx.refresh();
          };
        });
    },

    /* ---------- 三餐：編輯 ---------- */
    mealForm(ctx, mealKey, idx, item, day, after) {
      day = day || D.today();
      const x = (item && typeof item === 'object') ? item : {};
      const m = MEALS.find(z => z.k === mealKey) || MEALS[0];
      const isNew = !(idx >= 0 && item);
      const pic = L.imageField({ id: 'mpic', value: x.img || '', label: '照片（可不填）' });
      L.modal((isNew ? '補一筆' : '編輯') + (isNew ? '飲食' : m.t) + '紀錄' + (day !== D.today() ? ' · ' + D.pretty(day) : ''),
        '<div class="field"><label>吃了什麼（有照片可不填）</label>' +
        '<input class="inp" id="n" value="' + U.esc(safeText(x.name) === '📷 照片紀錄' ? '' : safeText(x.name)) + '" placeholder="例如：雞胸肉沙拉"></div>' +
        '<div class="grid2">' +
        '<div class="field"><label>熱量（kcal）</label><input class="inp" type="number" id="k" value="' + U.num(x.kcal, 0) + '"></div>' +
        '<div class="field"><label>餐別</label><select class="inp" id="mk">' +
        MEALS.map(z => '<option value="' + z.k + '"' + (z.k === mealKey ? ' selected' : '') + '>' + z.t + '</option>').join('') +
        '</select></div></div>' +
        '<div class="field"><label>備註（可不填）</label><input class="inp" id="no" value="' + U.esc(safeText(x.note)) + '" placeholder="份量、感想…"></div>' +
        pic.html +
        L.formFooter({ isEdit: !isNew }),
        (body, close) => {
          L.bindCancel(body, close);
          const picF = pic.mount(body);
          const ok = body.querySelector('#ok');
          if (!ok) return;
          let saving = false;
          ok.onclick = async () => {
            if (saving) return;
            const name = String(L.val(body, 'n') || '').trim();
            if (!name && !picF.get()) return L.toast('寫下吃了什麼，或放一張照片 ♡');
            saving = true;
            let img = '';
            try { img = await picF.save(x.img || ''); } catch (e) { img = x.img || ''; }
            const dd = todayDiet(day);
            const meals = {};
            MEAL_KEYS.forEach(mk => meals[mk] = (dd.meals[mk] || []).slice());
            const newKey = MEAL_KEYS.indexOf(L.val(body, 'mk')) >= 0 ? L.val(body, 'mk') : mealKey;
            const data = { name: name, kcal: U.num(L.val(body, 'k'), 0), note: String(L.val(body, 'no') || '').trim() };
            if (img) data.img = img;
            if (idx >= 0 && idx < (meals[mealKey] || []).length) {
              if (newKey !== mealKey) {                       // 換餐別：搬到另一餐
                meals[mealKey].splice(idx, 1);
                meals[newKey].push(data);
              } else {
                meals[mealKey][idx] = data;
              }
            } else {
              meals[newKey].push(data);
            }
            diet().set(day, { meals: meals });
            close(); L.toast(isNew ? '已記錄 ♡' : '已更新 ♡');
            if (after) after(); else ctx.refresh();
          };
        });
    },

    /* ---------- 體重：新增 / 編輯 ---------- */
    weightForm(ctx, rec, day, after) {
      const x = (rec && typeof rec === 'object') ? rec : (day ? { date: day } : {});
      L.modal(rec ? '編輯體重紀錄' : '記錄體重',
        '<div class="grid2">' +
        '<div class="field"><label>日期</label><input class="inp" type="date" id="d" value="' + U.esc(/^\d{4}-\d{2}-\d{2}$/.test(x.date) ? x.date : D.today()) + '"></div>' +
        '<div class="field"><label>體重（kg）</label><input class="inp" type="number" step="0.1" id="v" value="' + U.esc(x.kg == null ? '' : x.kg) + '"></div></div>' +
        '<div class="field"><label>備註（可不填）</label><input class="inp" id="n" value="' + U.esc(safeText(x.note)) + '" placeholder="例如：早上空腹"></div>' +
        L.formFooter({ isEdit: !!rec }),
        (body, close) => {
          L.bindCancel(body, close);
          const ok = body.querySelector('#ok');
          if (!ok) return;
          ok.onclick = () => {
            const v = U.num(L.val(body, 'v'), 0);
            if (!v) return L.toast('請填寫體重 ♡');
            const d = /^\d{4}-\d{2}-\d{2}$/.test(L.val(body, 'd')) ? L.val(body, 'd') : D.today();
            const data = { date: d, kg: v, note: String(L.val(body, 'n') || '').trim() };
            if (rec && rec.id) wCol().update(rec.id, data);
            else {
              const ex = safeWeights().filter(z => z.date === d)[0];
              if (ex && ex.id && wCol().find(ex.id)) wCol().update(ex.id, data); else wCol().add(data);
            }
            close(); L.toast(rec ? '已更新 ♡' : '已記錄 ♡');
            if (after) after(); else ctx.refresh();
          };
        });
    }
  };
})(window.Lume);
