/* ============================================================
   utils.js — 日期 / 農曆 / 手繪 SVG 圖示 / 通用工具
   ============================================================ */
window.Lume = window.Lume || {};
(function (L) {
  'use strict';

  /* ---------------- 日期 ---------------- */
  const D = {
    pad: (n) => String(n).padStart(2, '0'),
    /** yyyy-mm-dd */
    key(d) {
      d = d || new Date();
      return d.getFullYear() + '-' + D.pad(d.getMonth() + 1) + '-' + D.pad(d.getDate());
    },
    today: () => D.key(new Date()),
    parse(s) {
      if (!s) return null;
      const p = String(s).split('-').map(Number);
      if (p.length < 3) return null;
      return new Date(p[0], p[1] - 1, p[2]);
    },
    addDays(s, n) {
      const d = D.parse(s) || new Date();
      d.setDate(d.getDate() + n);
      return D.key(d);
    },
    diffDays(a, b) {
      const x = D.parse(a), y = D.parse(b);
      if (!x || !y) return 0;
      return Math.round((x - y) / 86400000);
    },
    /** 該日期在當年的第幾天 */
    dayOfYear(s) {
      const d = D.parse(s);
      return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
    },
    weekday(s) { return '日一二三四五六'[D.parse(s).getDay()]; },
    /** 週一為一週開始，回傳 yyyy-Www */
    weekKey(s) {
      const d = D.parse(s || D.today());
      const day = (d.getDay() + 6) % 7;
      d.setDate(d.getDate() - day);
      return D.key(d);
    },
    monthKey(s) { return (s || D.today()).slice(0, 7); },
    /** 某月 1 號是星期幾(0=日) */
    firstDow(y, m) { return new Date(y, m, 1).getDay(); },
    daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); },
    pretty(s) {
      const d = D.parse(s); if (!d) return s;
      return (d.getMonth() + 1) + '月' + d.getDate() + '日';
    },
    /** 下一年的同月日（每年重複用） */
    nextAnnual(dateStr, from) {
      const d = D.parse(dateStr), base = D.parse(from || D.today());
      if (!d) return dateStr;
      let y = base.getFullYear();
      let cand = new Date(y, d.getMonth(), d.getDate());
      if (cand < new Date(base.getFullYear(), base.getMonth(), base.getDate())) {
        cand = new Date(y + 1, d.getMonth(), d.getDate());
      }
      return D.key(cand);
    }
  };

  /* ---------------- 農曆（1900-2100） ---------------- */
  const lunarInfo = [
    0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
    0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
    0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
    0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
    0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
    0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
    0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
    0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b5a0,0x195a6,
    0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
    0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x055c0,0x0ab60,0x096d5,0x092e0,
    0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
    0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
    0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
    0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
    0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
    0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
    0x0a2e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
    0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
    0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
    0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,
    0x0d520
  ];
  const CN_NUM = ['零','一','二','三','四','五','六','七','八','九','十'];
  const CN_MONTH = ['正','二','三','四','五','六','七','八','九','十','冬','臘'];
  const GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  const ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const SX = ['鼠','牛','虎','兔','龍','蛇','馬','羊','猴','雞','狗','豬'];
  const SOLAR_TERM = ['小寒','大寒','立春','雨水','驚蟄','春分','清明','穀雨','立夏','小滿','芒種','夏至','小暑','大暑','立秋','處暑','白露','秋分','寒露','霜降','立冬','小雪','大雪','冬至'];

  function lYearDays(y) { let s = 348; for (let i = 0x8000; i > 0x8; i >>= 1) s += (lunarInfo[y - 1900] & i) ? 1 : 0; return s + leapDays(y); }
  function leapMonth(y) { return lunarInfo[y - 1900] & 0xf; }
  function leapDays(y) { return leapMonth(y) ? ((lunarInfo[y - 1900] & 0x10000) ? 30 : 29) : 0; }
  function monthDays(y, m) { return (lunarInfo[y - 1900] & (0x10000 >> m)) ? 30 : 29; }

  function cnDay(d) {
    if (d === 10) return '初十';
    if (d === 20) return '二十';
    if (d === 30) return '三十';
    const p = ['初','十','廿','三'];
    const q = Math.floor(d / 10), r = d % 10;
    if (q === 0) return p[0] + CN_NUM[r];
    if (d < 20) return '十' + (r ? CN_NUM[r] : '');
    if (d < 30) return '廿' + (r ? CN_NUM[r] : '');
    return '三十';
  }

  const Lunar = {
    /** 回傳 {y,m,d,isLeap,text,ganzhi,shengxiao} */
    of(dateStr) {
      const base = new Date(1900, 0, 31);
      const obj = D.parse(dateStr) || new Date();
      let offset = Math.floor((obj - base) / 86400000);
      let y = 1900, temp = 0;
      for (; y < 2101 && offset > 0; y++) { temp = lYearDays(y); offset -= temp; }
      if (offset < 0) { offset += temp; y--; }
      let leap = leapMonth(y), isLeap = false;
      let m = 1;
      for (; m < 13 && offset > 0; m++) {
        let t = (leap > 0 && m === leap + 1 && !isLeap)
          ? (isLeap = true, leapDays(y))
          : monthDays(y, m);
        offset -= t;
        if (isLeap && m === leap + 1) isLeap = false;
      }
      if (offset === 0 && leap > 0 && m === leap + 1) { if (isLeap) isLeap = false; else { isLeap = true; m--; } }
      if (offset < 0) { offset += (isLeap && m === leap + 1) ? leapDays(y) : monthDays(y, m); m--; }
      const day = offset + 1;
      const gz = GAN[(y - 4) % 10] + ZHI[(y - 4) % 12];
      return {
        y, m, d: day, isLeap,
        text: (isLeap ? '閏' : '') + CN_MONTH[m - 1] + '月' + cnDay(day),
        ganzhi: gz,
        shengxiao: SX[(y - 4) % 12]
      };
    }
  };

  /* ---------------- 節氣（簡易近似） ---------------- */
  const TERM_C = [6.11,20.84,4.6295,19.4599,6.3826,21.4155,5.59,20.888,6.318,21.86,6.5,22.2,7.928,23.65,8.35,23.95,8.44,23.822,9.098,24.218,8.218,23.08,7.9,22.6];
  function solarTerm(y, mIndex) {
    // 只用來顯示，不做精確天文計算
    const idx = mIndex * 2;
    return { name: SOLAR_TERM[idx], day: Math.round(TERM_C[idx]) };
  }

  /* ---------------- 手繪水彩 SVG 圖示 ---------------- */
  const P = {
    butterfly: '<svg viewBox="0 0 64 64" fill="none"><path d="M32 20c-6-9-18-13-24-8s-2 16 6 20c-5 5-4 13 3 14 8 1 12-6 15-13 3 7 7 14 15 13 7-1 8-9 3-14 8-4 12-15 6-20s-18-1-24 8z" fill="#D8BFD8" stroke="#A98BD9" stroke-width="1.6" stroke-linejoin="round"/><path d="M32 20v29" stroke="#8E6FC8" stroke-width="2" stroke-linecap="round"/><circle cx="21" cy="24" r="3" fill="#F8DCE4" opacity=".9"/><circle cx="43" cy="24" r="3" fill="#F8DCE4" opacity=".9"/><path d="M30 18c-2-4-6-5-9-4M34 18c2-4 6-5 9-4" stroke="#8E6FC8" stroke-width="1.4" stroke-linecap="round"/></svg>',
    moon: '<svg viewBox="0 0 64 64" fill="none"><path d="M42 10a24 24 0 1 0 14 40A26 26 0 0 1 42 10z" fill="#E6E6FA" stroke="#A98BD9" stroke-width="1.8" stroke-linejoin="round"/><circle cx="26" cy="30" r="4" fill="#D8BFD8" opacity=".8"/><circle cx="20" cy="42" r="2.6" fill="#D8BFD8" opacity=".7"/><path d="M50 14l1.6 3.6L55 19l-3.4 1.4L50 24l-1.6-3.6L45 19l3.4-1.4z" fill="#F8DCE4"/></svg>',
    star: '<svg viewBox="0 0 64 64" fill="none"><path d="M32 8l6 16 17 1.6-13 11 4 17-14-9-14 9 4-17-13-11L26 24z" fill="#E6E6FA" stroke="#A98BD9" stroke-width="1.7" stroke-linejoin="round"/><circle cx="32" cy="30" r="4" fill="#F8DCE4"/></svg>',
    flower: '<svg viewBox="0 0 64 64" fill="none"><path d="M32 16c-5 0-9 5-9 10 0 6 4 12 9 16 5-4 9-10 9-16 0-5-4-10-9-10z" fill="#D8BFD8" stroke="#A98BD9" stroke-width="1.6"/><path d="M23 26c-4-2-8 0-9 3s1 6 4 7M41 26c4-2 8 0 9 3s-1 6-4 7" fill="#E6E6FA" stroke="#A98BD9" stroke-width="1.5" stroke-linejoin="round"/><path d="M32 42v14M32 50c-3-2-5-2-7 0M32 50c3-2 5-2 7 0" stroke="#8E6FC8" stroke-width="1.6" stroke-linecap="round" fill="none"/></svg>',
    bow: '<svg viewBox="0 0 64 64" fill="none"><path d="M32 32c-8-8-18-12-22-7s1 15 10 12M32 32c8-8 18-12 22-7s-1 15-10 12" fill="#F8DCE4" stroke="#E9A8BC" stroke-width="1.7" stroke-linejoin="round"/><circle cx="32" cy="32" r="5" fill="#D8BFD8" stroke="#A98BD9" stroke-width="1.6"/><path d="M30 37l-6 14M34 37l6 14" stroke="#E9A8BC" stroke-width="1.7" stroke-linecap="round"/></svg>',
    cake: '<svg viewBox="0 0 64 64" fill="none"><path d="M14 34h36v14a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6z" fill="#E6E6FA" stroke="#A98BD9" stroke-width="1.7"/><path d="M14 34c0-5 4-8 9-8s9 3 18 3 9-3 9-3v8z" fill="#F8DCE4" stroke="#E9A8BC" stroke-width="1.6"/><path d="M32 22V12" stroke="#8E6FC8" stroke-width="1.8" stroke-linecap="round"/><circle cx="32" cy="10" r="3" fill="#E9A8BC"/><path d="M20 44h24" stroke="#C7ACE9" stroke-width="1.4" stroke-dasharray="3 3"/></svg>',
    drop: '<svg viewBox="0 0 64 64" fill="none"><path d="M32 8c8 12 14 19 14 27a14 14 0 1 1-28 0c0-8 6-15 14-27z" fill="#D6EBE0" stroke="#87BBA0" stroke-width="1.8" stroke-linejoin="round"/><path d="M26 38c0 5 3 8 7 9" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>',
    book: '<svg viewBox="0 0 64 64" fill="none"><path d="M12 12h16a6 6 0 0 1 6 6v34a6 6 0 0 0-6-6H12z" fill="#E6E6FA" stroke="#A98BD9" stroke-width="1.7" stroke-linejoin="round"/><path d="M52 12H36a6 6 0 0 0-6 6v34a6 6 0 0 1 6-6h16z" fill="#F8DCE4" stroke="#E9A8BC" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    pen: '<svg viewBox="0 0 64 64" fill="none"><path d="M14 50l3-10 26-26 7 7-26 26z" fill="#E6E6FA" stroke="#A98BD9" stroke-width="1.7" stroke-linejoin="round"/><path d="M17 40l7 7-10 3z" fill="#8E6FC8"/><path d="M43 14l7 7" stroke="#8E6FC8" stroke-width="1.7"/></svg>',
    tarot: '<svg viewBox="0 0 64 64" fill="none"><rect x="14" y="8" width="36" height="48" rx="6" fill="#F4F1FD" stroke="#A98BD9" stroke-width="1.8"/><circle cx="32" cy="26" r="9" fill="#E6E6FA" stroke="#8E6FC8" stroke-width="1.5"/><path d="M32 17l2.4 5.4L40 24l-5.6 2.2L32 32l-2.4-5.8L24 24l5.6-1.6z" fill="#D8BFD8"/><path d="M24 44h16M22 50h20" stroke="#C7ACE9" stroke-width="1.6" stroke-linecap="round"/></svg>',
    quote: '<svg viewBox="0 0 64 64" fill="none"><rect x="8" y="12" width="48" height="34" rx="8" fill="#F4F1FD" stroke="#A98BD9" stroke-width="1.7"/><path d="M20 24h24M20 31h16M20 38h20" stroke="#C7ACE9" stroke-width="1.8" stroke-linecap="round"/><path d="M24 46l-6 8 10-3z" fill="#F4F1FD" stroke="#A98BD9" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    shirt: '<svg viewBox="0 0 64 64" fill="none"><path d="M24 10l8 6 8-6 14 8-6 10-4-2v26H20V26l-4 2-6-10z" fill="#E6E6FA" stroke="#A98BD9" stroke-width="1.7" stroke-linejoin="round"/><circle cx="32" cy="20" r="2.5" fill="#F8DCE4"/></svg>',
    heart: '<svg viewBox="0 0 64 64" fill="none"><path d="M32 52S10 40 10 26a12 12 0 0 1 22-6 12 12 0 0 1 22 6c0 14-22 26-22 26z" fill="#F8DCE4" stroke="#E9A8BC" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    wish: '<svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="30" r="18" fill="#E6E6FA" stroke="#A98BD9" stroke-width="1.7"/><path d="M32 18l2.6 6 6.4.6-4.8 4.4 1.4 6.4L32 32l-5.6 3.4 1.4-6.4-4.8-4.4 6.4-.6z" fill="#D8BFD8"/><path d="M26 48h12M28 54h8" stroke="#C7ACE9" stroke-width="1.8" stroke-linecap="round"/></svg>',
    calendar: '<svg viewBox="0 0 64 64" fill="none"><rect x="10" y="14" width="44" height="40" rx="8" fill="#F4F1FD" stroke="#A98BD9" stroke-width="1.8"/><path d="M10 26h44" stroke="#A98BD9" stroke-width="1.6"/><path d="M22 8v10M42 8v10" stroke="#8E6FC8" stroke-width="2" stroke-linecap="round"/><circle cx="22" cy="36" r="3" fill="#D8BFD8"/><circle cx="32" cy="36" r="3" fill="#F8DCE4"/><circle cx="42" cy="44" r="3" fill="#D8BFD8"/></svg>',
    check: '<svg viewBox="0 0 64 64" fill="none"><path d="M14 34l12 12 24-26" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    clock: '<svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="22" fill="#F4F1FD" stroke="#A98BD9" stroke-width="1.8"/><path d="M32 18v14l10 6" stroke="#8E6FC8" stroke-width="2.2" stroke-linecap="round"/></svg>',
    sparkle: '<svg viewBox="0 0 64 64" fill="none"><path d="M32 6l5 17 17 5-17 5-5 17-5-17-17-5 17-5z" fill="#E6E6FA" stroke="#A98BD9" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    cloudSun: '<svg viewBox="0 0 64 64" fill="none"><circle cx="22" cy="20" r="9" fill="#FBE7C6" stroke="#E9A8BC" stroke-width="1.5"/><path d="M24 46h22a8 8 0 0 0 0-16 11 11 0 0 0-20-4 8 8 0 0 0-2 20z" fill="#E6E6FA" stroke="#A98BD9" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    home: '<svg viewBox="0 0 64 64" fill="none"><path d="M12 30l20-16 20 16v22a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4z" fill="#F4F1FD" stroke="#A98BD9" stroke-width="1.8" stroke-linejoin="round"/><path d="M26 56V40h12v16" stroke="#8E6FC8" stroke-width="1.8" fill="#fff"/></svg>',
    list: '<svg viewBox="0 0 64 64" fill="none"><rect x="12" y="10" width="40" height="44" rx="8" fill="#F4F1FD" stroke="#A98BD9" stroke-width="1.8"/><path d="M22 24h20M22 34h20M22 44h12" stroke="#C7ACE9" stroke-width="2" stroke-linecap="round"/></svg>',
    gear: '<svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="8" fill="#E6E6FA" stroke="#A98BD9" stroke-width="1.8"/><path d="M32 8v8M32 48v8M8 32h8M48 32h8M15 15l6 6M43 43l6 6M49 15l-6 6M21 43l-6 6" stroke="#A98BD9" stroke-width="2" stroke-linecap="round"/></svg>',
    /* ---- 身體狀態日記：手繪小圖示 ---- */
    body: '<svg viewBox="0 0 64 64" fill="none"><path d="M32 10c-6 0-10 4-10 10v6c0 5-4 7-6 12-2 5-1 12 3 15 3 2 7 1 9-2l2-3 2 3c2 3 6 4 9 2 4-3 5-10 3-15-2-5-6-7-6-12v-6c0-6-4-10-10-10z" fill="#F4F1FD" stroke="#A98BD9" stroke-width="1.8" stroke-linejoin="round"/><path d="M32 30c-4 0-7 3-7 7s3 6 7 6 7-2 7-6-3-7-7-7z" fill="#F8DCE4" stroke="#E9A8BC" stroke-width="1.5"/><path d="M25 37h4l2-3 2 4 3-4 3 3" stroke="#E9A8BC" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="28" cy="18" r="1.8" fill="#8E6FC8"/><circle cx="36" cy="18" r="1.8" fill="#8E6FC8"/></svg>',
    stomach: '<svg viewBox="0 0 64 64" fill="none"><path d="M24 12c-7 2-11 8-11 15 0 9 5 15 12 18 6 3 12 2 15-3 3-5 1-11-4-13-5-2-7-6-6-11 1-4-1-6-6-6z" fill="#FBEFF2" stroke="#E9A8BC" stroke-width="1.8" stroke-linejoin="round"/><path d="M18 26c4 3 9 4 14 3" stroke="#E9A8BC" stroke-width="1.6" stroke-linecap="round"/><path d="M28 44c2 4 6 6 10 5" stroke="#E9A8BC" stroke-width="1.6" stroke-linecap="round"/><path d="M40 14l2.2 4.6L47 21l-4.8 2.2L40 28l-2.2-4.8L33 21l4.8-2.4z" fill="#F8DCE4" stroke="#E9A8BC" stroke-width="1.2"/></svg>',
    dizzy: '<svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="30" r="16" fill="#F4F1FD" stroke="#A98BD9" stroke-width="1.8"/><path d="M24 26c2-2 5-2 7 0M31 26c2-2 5-2 7 0" stroke="#8E6FC8" stroke-width="1.8" stroke-linecap="round"/><path d="M26 36c2 2 5 2 7 0s5-2 7 0" stroke="#8E6FC8" stroke-width="1.8" stroke-linecap="round"/><path d="M46 18a10 10 0 1 1-6 18" stroke="#C7ACE9" stroke-width="1.8" stroke-linecap="round" fill="none"/><path d="M52 10l1.4 3.2L57 15l-3.6 1.4L52 20l-1.4-3.6L47 15l3.6-1.8z" fill="#D8BFD8" stroke="#A98BD9" stroke-width="1.2"/><path d="M14 52c4 2 9 1 12-2" stroke="#C7ACE9" stroke-width="1.6" stroke-linecap="round"/></svg>',
    allergy: '<svg viewBox="0 0 64 64" fill="none"><path d="M32 12c8 6 14 12 14 20a14 14 0 1 1-28 0c0-8 6-14 14-20z" fill="#EAF4EE" stroke="#87BBA0" stroke-width="1.8" stroke-linejoin="round"/><circle cx="26" cy="30" r="2.4" fill="#87BBA0"/><circle cx="35" cy="27" r="2" fill="#87BBA0"/><circle cx="31" cy="37" r="2.6" fill="#87BBA0"/><circle cx="39" cy="36" r="1.8" fill="#87BBA0"/><path d="M24 43c2 2 5 3 8 3s6-1 8-3" stroke="#87BBA0" stroke-width="1.5" stroke-linecap="round"/><circle cx="14" cy="20" r="2" fill="#D8BFD8"/><circle cx="50" cy="24" r="2.4" fill="#D8BFD8"/><circle cx="46" cy="48" r="1.8" fill="#D8BFD8"/></svg>',
    /* ---- 感冒與免疫（溫度計） ---- */
    thermo: '<svg viewBox="0 0 64 64" fill="none"><path d="M27 10a6 6 0 0 1 12 0v24a11 11 0 1 1-12 0z" fill="#FBEFF2" stroke="#E2868F" stroke-width="1.8" stroke-linejoin="round"/><circle cx="33" cy="46" r="8" fill="#E2868F"/><path d="M33 26v18" stroke="#E9A8BC" stroke-width="2.6" stroke-linecap="round"/><path d="M45 16h6M45 23h6M45 30h6" stroke="#C7ACE9" stroke-width="1.8" stroke-linecap="round"/><circle cx="33" cy="10" r="2.4" fill="#F8DCE4" stroke="#E9A8BC" stroke-width="1.2"/></svg>',
    /* ---- 「初」成就記錄（幼苗 / 人生解鎖） ---- */
    sprout: '<svg viewBox="0 0 64 64" fill="none"><path d="M32 54V28" stroke="#8E6FC8" stroke-width="2.2" stroke-linecap="round"/><path d="M32 32c-8 0-14-6-14-15 8 0 14 6 14 15z" fill="#D6EBE0" stroke="#87BBA0" stroke-width="1.7" stroke-linejoin="round"/><path d="M32 27c8 0 14-6 14-16-8 0-14 7-14 16z" fill="#E6E6FA" stroke="#A98BD9" stroke-width="1.7" stroke-linejoin="round"/><path d="M21 49c5 5 15 6 22 0" stroke="#87BBA0" stroke-width="1.8" stroke-linecap="round" fill="none"/><circle cx="32" cy="20" r="2.8" fill="#F8DCE4" stroke="#E9A8BC" stroke-width="1.2"/></svg>',
    bubble: '<svg viewBox="0 0 64 64" fill="none"><path d="M12 28c0-9 9-16 20-16s20 7 20 16-9 16-20 16c-2.6 0-5-.3-7.3-1L15 48l3-8c-3.8-3-6-7.2-6-12z" fill="#F4F1FD" stroke="#A98BD9" stroke-width="1.8" stroke-linejoin="round"/><circle cx="24" cy="28" r="2.6" fill="#C7ACE9"/><circle cx="32" cy="28" r="2.6" fill="#E9A8BC"/><circle cx="40" cy="28" r="2.6" fill="#87BBA0"/><path d="M47 10l1.4 3 3 1.4-3 1.4L47 19l-1.4-3.2-3-1.4 3-1.4z" fill="#FBE7B5" stroke="#E8C46A" stroke-width="1" stroke-linejoin="round"/></svg>',
    bulb: '<svg viewBox="0 0 64 64" fill="none"><path d="M32 9c-10 0-17 7.4-17 16.6 0 6.3 3.4 10.4 6.6 13.6 1.9 1.9 2.8 3.6 2.8 6V47h15.2v-1.8c0-2.4.9-4.1 2.8-6 3.2-3.2 6.6-7.3 6.6-13.6C49 16.4 42 9 32 9z" fill="#FBF3D9" stroke="#A98BD9" stroke-width="1.8" stroke-linejoin="round"/><path d="M25 51.5h14M27 56h10" stroke="#A98BD9" stroke-width="2" stroke-linecap="round"/><path d="M27 30c1.6 2.4 3.3 3.6 5 3.6s3.4-1.2 5-3.6M32 33.6V46" stroke="#E8C46A" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="25" cy="21" r="2.6" fill="#fff" opacity=".9"/><path d="M52 8l1.2 2.6 2.6 1.2-2.6 1.2L52 15.6l-1.2-2.6-2.6-1.2 2.6-1.2z" fill="#E6E6FA" stroke="#A98BD9" stroke-width="1" stroke-linejoin="round"/></svg>'
  };
  const icon = (name, size) => {
    const s = P[name] || P.star;
    return size ? s.replace('<svg', '<svg width="' + size + '" height="' + size + '"') : s;
  };

  /* ---------------- 其他 ---------------- */
  const U = {
    uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    esc: (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    clamp: (n, a, b) => Math.max(a, Math.min(b, n)),
    num: (v, d) => { const n = parseFloat(v); return isNaN(n) ? (d || 0) : n; },
    /** 壓縮圖片為 dataURL（最長邊 max，jpeg 品質 q）— 預設 800px / 0.65 */
    compress(file, max, q) {
      max = max || 800; q = q || 0.65;
      return new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => {
          const img = new Image();
          img.onload = () => {
            let w = img.width, h = img.height;
            const r = Math.min(1, max / Math.max(w, h));
            w = Math.round(w * r); h = Math.round(h * r);
            const cv = document.createElement('canvas');
            cv.width = w; cv.height = h;
            cv.getContext('2d').drawImage(img, 0, 0, w, h);
            res(cv.toDataURL('image/jpeg', q));
          };
          img.onerror = rej;
          img.src = fr.result;
        };
        fr.onerror = rej;
        fr.readAsDataURL(file);
      });
    },
    /** 選取並壓縮多張圖片（預設最長邊 800px、品質 0.65），自動存入呼叫端處理由 L.IDB.put 處理 */
    pickImages(max, q) {
      return new Promise(res => {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = 'image/*'; input.multiple = true;
        // 使用者取消選圖時也要結束，避免 Promise 永遠懸著
        try { input.addEventListener('cancel', () => res([])); } catch (e) { }
        input.onchange = async () => {
          const out = [];
          for (const f of Array.from(input.files || [])) {
            try { out.push(await U.compress(f, max, q)); } catch (e) { }
          }
          res(out);
        };
        input.click();
      });
    },
    copy(text) {
      const done = () => {};
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).catch(() => fallback());
      } else fallback();
      function fallback() {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (e) { }
        document.body.removeChild(ta);
      }
      done();
    },
    /** 每日穩定的偽隨機（同一天結果相同） */
    dailySeed(str) {
      let h = 2166136261;
      for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
      return Math.abs(h);
    }
  };

  /* ---------------- 外來資料消毒 ----------------
     雲端、同步碼、備份檔進來的資料可能被別人動過手腳，
     存進本機前先清一遍：移除危險的鍵、id / 日期 / 數字只留安全字元、圖片只收真正的圖片。 */
  const BAD_KEYS = { __proto__: 1, constructor: 1, prototype: 1 };
  const DATE_KEYS = { date: 1, start: 1, end: 1, planStart: 1, planEnd: 1, week: 1, time: 1, createdAt: 1, updatedAt: 1, at: 1 };
  const NUM_KEYS = { cycleLen: 1, periodLen: 1, target: 1, totalPages: 1, currentPage: 1, dayNo: 1, dayTotal: 1 };
  const IMG_DATA = /^data:image\/(png|jpe?g|gif|webp|avif|bmp);base64,[A-Za-z0-9+/=\s]+$/;
  function cleanStr(k, v) {
    if (v.indexOf('data:') === 0) return IMG_DATA.test(v) ? v : '';
    if (v.indexOf('idb:') === 0) return /^idb:[\w-]{1,60}$/.test(v) ? v : '';
    if (k === 'id' || /Id$/.test(k)) return v.replace(/[^\w\-:.@]/g, '').slice(0, 120) || ('x' + U.uid());
    if (DATE_KEYS[k]) return v.replace(/[^\w\-:.+/ ]/g, '').slice(0, 40);
    if (k === 'pri') return v.replace(/[^\w-]/g, '').slice(0, 20);
    return v;
  }
  function sanitize(v, k, depth) {
    depth = depth || 0;
    if (depth > 40) return null;
    if (typeof v === 'string') return cleanStr(k || '', v);
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    if (v === null || typeof v === 'boolean') return v;
    if (Array.isArray(v)) return v.map(x => sanitize(x, k, depth + 1));
    if (typeof v === 'object') {
      const o = {};
      for (const key of Object.keys(v)) {
        if (BAD_KEYS[key]) continue;
        let x = v[key];
        if (NUM_KEYS[key] && x !== '' && x != null) { x = Number(x); if (!isFinite(x)) x = 0; }
        o[key] = sanitize(x, key, depth + 1);
      }
      return o;
    }
    return null;   // function / undefined 等不該出現在資料裡的東西
  }
  U.sanitize = v => sanitize(v, '', 0);

  L.D = D; L.Lunar = Lunar; L.icon = icon; L.U = U; L.solarTerm = solarTerm;
  L.ICONS = P;   // 讓 extras.js 可以補新圖示
})(window.Lume);
