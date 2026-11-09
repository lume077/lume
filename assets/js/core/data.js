/* ============================================================
   data.js — 靜態內容庫：金句 / 塔羅牌 / 心情 / 症狀 / 分類
   ============================================================ */
window.Lume = window.Lume || {};
(function (L) {
  'use strict';

  /* ---------------- 每日金句（中 / 英 / 韓） ---------------- */
  L.QUOTES = [
    { zh: '你的敏感不是缺陷，而是一種能聽見世界細微聲音的天賦。', en: 'Your sensitivity is not a flaw — it is the gift of hearing the world\'s quietest notes.', kr: '너의 섬세함은 결점이 아니라, 세상의 작은 소리를 듣는 재능이야.' },
    { zh: '允許自己慢下來，靈魂也需要時間跟上腳步。', en: 'Allow yourself to slow down; the soul needs time to catch up.', kr: '천천히 해도 괜찮아, 영혼도 따라올 시간이 필요하니까.' },
    { zh: '你不必照亮所有人，先溫柔地照亮自己。', en: 'You don\'t have to light up everyone — gently light yourself first.', kr: '모두를 밝힐 필요는 없어, 먼저 너 자신을 따뜻하게 비춰줘.' },
    { zh: '真正的平靜，是允許情緒來了又走，而不急著評判它。', en: 'True peace is letting feelings come and go without judging them.', kr: '진정한 평온은 감정이 왔다 가도록 두고 서둘러 판단하지 않는 것.' },
    { zh: '你的內在世界很大，大到足以安放所有還沒說出口的話。', en: 'Your inner world is vast enough to hold everything you haven\'t said yet.', kr: '너의 내면세계는 아직 꺼내지 못한 모든 말을 담을 만큼 넓어.' },
    { zh: '別急著成為誰的太陽，做一輪溫柔的月亮也很好。', en: 'Don\'t rush to be someone\'s sun; being a gentle moon is beautiful too.', kr: '누군가의 태양이 되려 서두르지 마, 다정한 달이 되는 것도 참 좋아.' },
    { zh: '今天只要完成一件小小的好事，就足夠了。', en: 'One small good thing today is enough.', kr: '오늘은 작은 좋은 일 하나만 해도 충분해.' },
    { zh: '你對他人的理解，也請留一份給自己。', en: 'Save a share of the understanding you give others — for yourself.', kr: '남에게 주는 이해의 한 몫은 너 자신에게도 남겨둬.' },
    { zh: '有些答案不在遠方，而在你終於願意安靜下來的那一刻。', en: 'Some answers aren\'t far away — they appear the moment you finally get quiet.', kr: '어떤 답은 멀리 있지 않아, 네가 조용해지기로 한 순간에 나타나.' },
    { zh: '溫柔是一種力量，不需要大聲證明。', en: 'Gentleness is a kind of strength that never needs to shout.', kr: '다정함은 큰 소리로 증명할 필요 없는 힘이야.' },
    { zh: '你正在成為的自己，值得被耐心對待。', en: 'The self you are becoming deserves your patience.', kr: '되어가는 너 자신은 너의 인내를 받을 자격이 있어.' },
    { zh: '疲累的時候，休息不是放棄，而是為了走更遠。', en: 'When you\'re tired, rest isn\'t giving up — it\'s how you go further.', kr: '지칠 때의 휴식은 포기가 아니라 더 멀리 가기 위한 선택이야.' },
    { zh: '把注意力還給自己，世界會重新變得柔軟。', en: 'Give your attention back to yourself, and the world softens again.', kr: '주의를 너에게 돌려주면, 세상은 다시 부드러워져.' },
    { zh: '不需要被所有人理解，被一人真心看見就足夠。', en: 'You don\'t need to be understood by everyone — being truly seen by one is enough.', kr: '모두에게 이해받을 필요 없어, 한 사람에게 진심으로 보이는 것만으로 충분해.' },
    { zh: '你的直覺早就知道答案，只是等你願意相信。', en: 'Your intuition knew the answer long ago — it waits for you to believe it.', kr: '너의 직감은 이미 답을 알고 있었어, 네가 믿어주길 기다릴 뿐.' },
    { zh: '今天的雲很厚也沒關係，天空一直都在。', en: 'Even if today\'s clouds are heavy, the sky is still there.', kr: '오늘 구름이 두꺼워도 괜찮아, 하늘은 늘 그 자리에 있어.' },
    { zh: '把心意寫下來，它就有了形狀，也有了重量。', en: 'Write your heart down — then it has shape, and weight.', kr: '마음을 글로 적으면, 그것은 형태와 무게를 갖게 돼.' },
    { zh: '你不需要完美才值得被愛，此刻的你已經足夠。', en: 'You don\'t need to be perfect to be loved; who you are now is enough.', kr: '완벽해야 사랑받는 게 아니야, 지금의 너로 충분해.' },
    { zh: '孤獨有時是靈魂在替自己騰出一點空間。', en: 'Loneliness is sometimes the soul making room for itself.', kr: '외로움은 때때로 영혼이 자신을 위해 공간을 비우는 일이야.' },
    { zh: '讓今天的你，比昨天多愛自己一點點。', en: 'Let today\'s you love yourself a little more than yesterday\'s.', kr: '오늘의 네가 어제보다 너를 조금 더 사랑하게 해줘.' },
    { zh: '慢一點也沒關係，花期本來就不一樣。', en: 'It\'s fine to be slower — every flower has its own season.', kr: '조금 느려도 괜찮아, 꽃이 피는 시절은 원래 다르니까.' },
    { zh: '你給出去的溫柔，終會以另一種方式回到你身上。', en: 'The gentleness you give will find its way back to you.', kr: '네가 건넨 다정함은 결국 다른 모습으로 돌아올 거야.' },
    { zh: '與其勉強合群，不如誠實地與自己相處。', en: 'Rather than forcing yourself to fit in, be honest with your own company.', kr: '억지로 어울리기보다 너 자신과 솔직하게 지내는 게 나아.' },
    { zh: '所有看不見的累積，都會在某一天開成一朵花。', en: 'Everything you accumulate unseen will bloom into a flower one day.', kr: '보이지 않게 쌓인 모든 것은 언젠가 한 송이 꽃이 될 거야.' }
  ];

  /* ---------------- 塔羅：大阿爾克那 22 張 ---------------- */
  L.TAROT = [
    { n: 0, zh: '愚者', en: 'The Fool', up: '新的開始、天真、信任未知', rev: '衝動、準備不足、害怕起步' },
    { n: 1, zh: '魔術師', en: 'The Magician', up: '創造力、行動力、資源到位', rev: '猶豫、自我懷疑、能量分散' },
    { n: 2, zh: '女祭司', en: 'The High Priestess', up: '直覺、潛意識、靜觀其變', rev: '忽略內在聲音、秘密、混亂' },
    { n: 3, zh: '皇后', en: 'The Empress', up: '豐盛、滋養、創造與美', rev: '過度付出、匱乏感、依賴' },
    { n: 4, zh: '皇帝', en: 'The Emperor', up: '結構、紀律、界線清晰', rev: '僵化、控制欲、權威衝突' },
    { n: 5, zh: '教皇', en: 'The Hierophant', up: '學習、傳承、尋求指引', rev: '墨守成規、質疑體制' },
    { n: 6, zh: '戀人', en: 'The Lovers', up: '連結、選擇、價值一致', rev: '價值衝突、搖擺、失衡' },
    { n: 7, zh: '戰車', en: 'The Chariot', up: '前進、意志、掌控方向', rev: '失控、方向不明、內耗' },
    { n: 8, zh: '力量', en: 'Strength', up: '柔韌、勇氣、溫和的力量', rev: '自我否定、急躁、耗竭' },
    { n: 9, zh: '隱者', en: 'The Hermit', up: '獨處、內省、尋找真理', rev: '孤立、逃避、拒絕求助' },
    { n: 10, zh: '命運之輪', en: 'Wheel of Fortune', up: '轉機、循環、順勢而為', rev: '停滯、抗拒改變、壞運' },
    { n: 11, zh: '正義', en: 'Justice', up: '平衡、因果、誠實面對', rev: '偏頗、逃避責任、不公' },
    { n: 12, zh: '吊人', en: 'The Hanged Man', up: '換位思考、暫停、放下執著', rev: '無謂犧牲、拖延、卡住' },
    { n: 13, zh: '死神', en: 'Death', up: '結束與重生、斷捨離', rev: '害怕改變、拖著不放' },
    { n: 14, zh: '節制', en: 'Temperance', up: '平衡、調和、耐心融合', rev: '過度、失衡、急躁' },
    { n: 15, zh: '惡魔', en: 'The Devil', up: '看見束縛、慾望、覺察執念', rev: '掙脫、釋放、重獲自由' },
    { n: 16, zh: '高塔', en: 'The Tower', up: '崩解舊結構、真相揭露', rev: '延後的崩塌、勉強維持' },
    { n: 17, zh: '星星', en: 'The Star', up: '希望、療癒、重新相信', rev: '失去信心、失望、枯竭' },
    { n: 18, zh: '月亮', en: 'The Moon', up: '潛意識、夢境、模糊不安', rev: '看清幻象、走出迷霧' },
    { n: 19, zh: '太陽', en: 'The Sun', up: '喜悅、清晰、被看見', rev: '暫時的陰影、過度樂觀' },
    { n: 20, zh: '審判', en: 'Judgement', up: '召喚、總結、重新出發', rev: '自我批判、逃避總結' },
    { n: 21, zh: '世界', en: 'The World', up: '圓滿、完成、整合', rev: '未竟之事、收尾拖延' }
  ];
  L.SPREADS = ['單張指引', '三張牌（過去 · 現在 · 未來）', '現況 · 阻礙 · 建議', '本週主題牌', '陽陽的自由對話'];

  /* ---------------- 心情 ---------------- */
  L.MOODS = [
    { k: 'happy', t: '開心', c: '#F8DCE4', kws: ['開心', '快樂', '幸福', '喜悅', '笑', '好棒', '喜歡'] },
    { k: 'calm', t: '平靜', c: '#D6EBE0', kws: ['平靜', '安穩', '舒服', '自在', '放鬆'] },
    { k: 'full', t: '充實', c: '#FBE7C6', kws: ['充實', '完成', ' productive', '努力', '收穫'] },
    { k: 'tired', t: '疲累', c: '#D8BFD8', kws: ['累', '疲', '想睡', '沒力', '耗盡', '撐'] },
    { k: 'down', t: '低落', c: '#C7ACE9', kws: ['難過', '低落', '委屈', '想哭', '孤單', '失落', '難受'] },
    { k: 'anxious', t: '焦慮', c: '#E9A8BC', kws: ['焦慮', '緊張', '擔心', '害怕', '不安', '壓力'] },
    { k: 'angry', t: '煩躁', c: '#E2868F', kws: ['生氣', '煩', '討厭', '怒', '不爽'] },
    { k: 'grateful', t: '感恩', c: '#EFE7FB', kws: ['感謝', '感恩', '謝謝', '幸運', '珍惜'] }
  ];
  function moodSVG(k) {
    const c = { happy: '#F8DCE4', calm: '#D6EBE0', full: '#FBE7C6', tired: '#D8BFD8', down: '#C7ACE9', anxious: '#E9A8BC', angry: '#E2868F', grateful: '#EFE7FB' }[k] || '#E6E6FA';
    const mouth = { happy: 'M22 36c3 5 9 5 12 0', calm: 'M23 37h10', full: 'M23 36c3 4 9 4 12 0', tired: 'M23 38c3-3 9-3 12 0', down: 'M23 39c3-5 9-5 12 0', anxious: 'M23 37c2 3 4-3 6 0s4 3 6 0', angry: 'M23 39c3-5 9-5 12 0', grateful: 'M23 36c3 5 9 5 12 0' }[k] || 'M23 37h10';
    return '<svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="20" fill="' + c + '" stroke="#A98BD9" stroke-width="1.8"/>' +
      '<circle cx="25" cy="27" r="2.4" fill="#6E4FA8"/><circle cx="39" cy="27" r="2.4" fill="#6E4FA8"/>' +
      '<path d="' + mouth + '" stroke="#6E4FA8" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>';
  }
  L.moodSVG = moodSVG;

  /* ---------------- 生理期症狀 ---------------- */
  L.SYMPTOMS = ['心情好', '低落', '痛經', '疲勞', '噁心', '頭痛', '嗜睡', '想吃甜食', '腹脹', '乳房脹痛', '長痘', '食慾大增'];
  L.PHASES = [
    { k: 'menstrual', t: '經期', range: '第 1-5 天', color: '#E9A8BC', tip: '多喝溫水、熱敷下腹，避免生冷。可以做一些緩和的伸展或散步，讓身體好好休息。' },
    { k: 'follicular', t: '卵泡期', range: '第 6-12 天', color: '#D6EBE0', tip: '體力與專注力回升的好時機，適合安排新計畫、學習與運動，飲食可多補充蛋白質。' },
    { k: 'ovulation', t: '排卵期', range: '第 13-15 天', color: '#FBE7C6', tip: '能量高點，社交與表達都很順。記得補充水分與鐵質，注意身體的細微變化。' },
    { k: 'luteal', t: '黃體期', range: '第 16-28 天', color: '#C7ACE9', tip: '容易水腫與情緒起伏，減少咖啡因與精緻糖，選擇低 GI 食物，給自己多一點緩衝時間。' }
  ];

  /* ---------------- 願望 / 書籍 / 衣櫃 分類 ---------------- */
  L.WISH_CATS = [
    { k: 'short', t: '短期願望', icon: 'star', color: '#C7ACE9' },
    { k: 'long', t: '中長期目標', icon: 'moon', color: '#A98BD9' },
    { k: 'travel', t: '旅行清單', icon: 'butterfly', color: '#87BBA0' },
    { k: 'item', t: '種草好物', icon: 'bow', color: '#E9A8BC' }
  ];
  L.BOOK_CATS = ['文學小說', '心理成長', '商業理財', '人文社科', '藝術設計', '療癒散文', '語言學習', '其他'];

  /* 劇單（影集 / 連續劇）狀態 */
  L.DRAMA_STATUS = [
    { k: 'wish', t: '想看清單' },
    { k: 'watching', t: '追劇中' },
    { k: 'done', t: '已追完' }
  ];
  L.DRAMA_T = { wish: '想看清單', watching: '追劇中', done: '已追完' };
  L.DRAMA_PLATFORMS = ['Netflix', 'Disney+', 'HBO Max', 'Apple TV+', 'friDay', 'LINE TV', '愛奇藝', 'KKTV', 'MyVideo', 'YouTube', '電視台', '其他'];
  L.WARDROBE_CATS = [
    { k: 'top', t: '上衣', icon: 'shirt' },
    { k: 'bottom', t: '下著', icon: 'shirt' },
    { k: 'outer', t: '外套', icon: 'shirt' },
    { k: 'shoes', t: '鞋包', icon: 'bow' },
    { k: 'acc', t: '配件', icon: 'flower' }
  ];
  L.NOTE_TAGS = ['社交媒體', '個人隨筆', '品牌靈感', '質感金句', '文章摘錄', '待用文案'];

  /* ---------------- 身體狀態日記：專屬症狀標籤（依 Lume 的體質客製化） ---------------- */
  L.BODY_LEVELS = [
    { k: 'mild', t: '輕微', c: '#87BBA0', bg: '#EAF4EE' },
    { k: 'mid', t: '中度', c: '#E9A8BC', bg: '#FBEFF2' },
    { k: 'severe', t: '嚴重', c: '#E2868F', bg: '#FCE9EB' }
  ];
  L.BODY_GROUPS = [
    {
      k: 'stomach', t: '胃部專區', icon: 'stomach', color: '#E9A8BC',
      items: ['慢性胃炎', '胃食道逆流', '胃酸過多', '胃脹氣', '胃痛', '噁心想吐', '食慾不振']
    },
    {
      k: 'neuro', t: '神經與血壓專區', icon: 'dizzy', color: '#C7ACE9',
      items: ['暈眩', '頭暈', '低血糖', '低血壓', '貧血', '疲倦乏力']
    },
    {
      k: 'immune', t: '免疫與過敏專區', icon: 'allergy', color: '#87BBA0',
      items: ['蕁麻疹', '皮膚發癢', '慢性過敏', '打噴嚏']
    },
    {
      k: 'cold', t: '感冒與感染專區', icon: 'thermo', color: '#E2868F',
      items: ['發燒', '流鼻水', '鼻塞', '咳嗽', '喉嚨痛', '身體痠痛', '畏寒', '全身倦怠', '聲音沙啞', '頭痛']
    },
    {
      k: 'other', t: '其他 / 自定義', icon: 'flower', color: '#A98BD9',
      items: ['頭痛', '經痛', '失眠', '心悸', '手腳冰冷', '水腫', '肌肉痠痛']
    }
  ];

  /* ---------------- 日記：心態卡點（INFJ 常見） ---------------- */
  L.MIND_BLOCKS = [
    { k: 'perfection', t: '陷入完美主義', hint: '事情沒有做到最好就過不了自己那關' },
    { k: 'anxiety', t: '焦慮過度', hint: '腦袋一直預演還沒發生的事' },
    { k: 'boundary', t: '邊界感模糊', hint: '不好意思拒絕，把別人的情緒扛到自己身上' },
    { k: 'drain', t: '人際消耗', hint: '相處完特別累，需要很久才恢復' },
    { k: 'selfdeny', t: '自我否定', hint: '覺得自己不夠好、不值得' },
    { k: 'overown', t: '過度負責', hint: '不是自己的責任也攬下來' },
    { k: 'compare', t: '比較心態', hint: '忍不住拿自己和別人比' },
    { k: 'conflict', t: '害怕衝突', hint: '寧可忍著也不想把話說開' },
    { k: 'overthink', t: '反芻思考', hint: '一件事在腦裡重播好多次' },
    { k: 'guilt', t: '休息罪惡感', hint: '一停下來就覺得自己不夠努力' },
    { k: 'lonely', t: '不被理解的孤單', hint: '明明身邊有人，卻覺得沒人真的懂' },
    { k: 'control', t: '想掌控卻失控', hint: '計畫被打亂就整個人不安' }
  ];

  /* ---------------- 日記：正向心態 / 收穫標籤（與卡點互相平衡） ---------------- */
  L.MIND_GIFTS = [
    { k: 'accept', t: '接納自己', hint: '允許自己就是現在這個樣子' },
    { k: 'boundary', t: '守住界線', hint: '說出需求、拒絕了也沒關係' },
    { k: 'done', t: '完成一件事的踏實', hint: '真的把它做完了' },
    { k: 'seen', t: '被理解的溫暖', hint: '有人真的聽懂了' },
    { k: 'brave', t: '跨出一步的勇氣', hint: '害怕還是做了' },
    { k: 'grateful', t: '感恩與知足', hint: '看見自己擁有的' },
    { k: 'calm', t: '平靜安穩', hint: '情緒沒有被牽著走' },
    { k: 'focus', t: '專注投入', hint: '進入心流的狀態' },
    { k: 'growth', t: '看見自己的成長', hint: '和以前不一樣了' },
    { k: 'gentle', t: '溫柔對待自己', hint: '沒有苛責、好好休息' },
    { k: 'letgo', t: '放下了一點執著', hint: '不再那麼糾結' },
    { k: 'connect', t: '真實的連結', hint: '和人好好相處了一場' },
    { k: 'create', t: '創造與表達', hint: '做出／寫出屬於自己的東西' },
    { k: 'joy', t: '單純的快樂', hint: '就是很開心' }
  ];

  /* ---------------- 「初」成就記錄：分類 ---------------- */
  L.FIRST_CATS = ['生活技能', '工作與成長', '人際與關係', '自我挑戰', '旅行探索', '手作與料理', '身體與健康', '其他'];

  /* ------------------------------------------------------------
     日記：自動抓取關鍵字（食物 / 地點 / 事件 / 心情 / 人物 / 身體）
     從內文中比對詞庫，回傳 [{k:'food', t:'蛋糕', g:'食物'} ...]
     ------------------------------------------------------------ */
  L.KW_KINDS = [
    { k: 'food', t: '食物', emoji: '🍰', bg: '#FBE7C6', fg: '#9A7333' },
    { k: 'place', t: '地點', emoji: '📍', bg: '#D6EBE0', fg: '#4E8B6C' },
    { k: 'event', t: '事件', emoji: '✨', bg: '#EFE7FB', fg: '#7A5AA8' },
    { k: 'mood', t: '心情', emoji: '💗', bg: '#F8DCE4', fg: '#A85C74' },
    { k: 'person', t: '人物', emoji: '👤', bg: '#E6E6FA', fg: '#7A5AA8' },
    { k: 'body', t: '身體', emoji: '🌿', bg: '#EAF4EE', fg: '#4E8B6C' }
  ];
  L.KW_DICT = {
    food: ['咖啡', '奶茶', '珍珠', '蛋糕', '甜點', '生乳捲', '拉麵', '火鍋', '麻辣燙', '壽司', '便當',
      '早餐', '午餐', '晚餐', '宵夜', '水果', '蔬菜', '牛肉', '雞胸肉', '優格', '麵包',
      '巧克力', '冰淇淋', '泡麵', '吐司', '蛋餅', '豆漿', '牛奶', '披薩', '義大利麵', '甜食', '手搖杯',
      '烤肉', '湯麵', '飯糰', '堅果', '芭樂', '蘋果', '番茄'],
    place: ['家裡', '公司', '辦公室', '咖啡廳', '咖啡店', '健身房', '圖書館', '學校', '醫院', '診所',
      '車站', '捷運', '機場', '公園', '海邊', '山上', '台北', '台中', '台南', '高雄', '桃園', '新竹',
      '日本', '韓國', '泰國', '歐洲', '美國', '超市', '市場', '書店', '便利商店', '餐廳', '租屋處', '宿舍'],
    event: ['開會', '報告', '簡報', '面試', '加班', '出差', '聚餐', '約會', '生日', '搬家', '簽約', '會議',
      '考試', '上課', '運動', '跑步', '瑜伽', '看書', '看電影', '追劇', '逛街', '打掃', '煮飯', '做菜',
      '烘焙', '睡覺', '散步', '旅行', '旅遊', '領薪', '繳費', '看醫生', '打針', '簡訊', '電話', '寄信',
      '寫作', '畫畫', '拍照', '練琴', '排練', '面談', '提案', '結案', '收尾', '整理房間', '洗衣服'],
    mood: ['開心', '快樂', '感動', '平靜', '放鬆', '充實', '滿足', '感謝', '感恩', '幸福', '喜歡', '期待',
      '疲累', '難過', '低落', '委屈', '孤單', '孤獨', '焦慮', '緊張', '擔心', '害怕', '不安',
      '生氣', '煩躁', '迷惘', '後悔', '釋懷', '踏實', '安心', '驕傲', '成就感', '窩心', '溫暖'],
    person: ['媽媽', '爸爸', '家人', '朋友', '同事', '主管', '老闆', '客戶', '室友', '伴侶', '男朋友',
      '女朋友', '妹妹', '哥哥', '姊姊', '姐姐', '弟弟', '老師', '同學', '鄰居', '店員', '陽陽', '醫生'],
    body: ['頭痛', '胃痛', '胃脹', '胃食道逆流', '暈眩', '頭暈', '發燒', '咳嗽', '喉嚨痛', '流鼻水',
      '生理期', '經痛', '失眠', '睡不好', '過敏', '水腫', '痠痛', '疲倦', '沒力', '想吐', '噁心', '心悸']
  };

  /**
   * 從日記內文自動抓取關鍵字
   * 採「分類輪流取」策略：六大類都有命中時，會先各取一個，
   * 避免食物一籮筐卻把心情 / 身體標籤擠掉。
   * @param {string} text 內文
   * @param {number} limit 最多回傳幾個（預設 8）
   * @returns {Array<{k:string,g:string,t:string,bg:string,fg:string,emoji:string}>}
   */
  L.pickKeywords = function (text, limit) {
    limit = limit || 8;
    const src = String(text || '');
    if (!src) return [];
    /* 1) 先各自收集每一類命中的詞 */
    const buckets = [];
    L.KW_KINDS.forEach(kind => {
      const words = L.KW_DICT[kind.k] || [];
      const hits = [];
      const seen = {};
      words.forEach(w => {
        if (!w) return;
        if (seen[w]) return;
        const at = src.indexOf(w);
        if (at >= 0) {
          seen[w] = 1;
          hits.push({ k: kind.k, g: kind.t, t: w, bg: kind.bg, fg: kind.fg, emoji: kind.emoji, at: at });
        }
      });
      /* 去掉被長詞包住的短詞（例如「咖啡廳」命中後就不再標「咖啡」） */
      const kept = hits.filter(function (a) {
        return !hits.some(function (b) {
          return b !== a && b.t.length > a.t.length &&
            b.at <= a.at && (a.at + a.t.length) <= (b.at + b.t.length);
        });
      });
      kept.sort(function (a, b) { return a.at - b.at; });
      if (kept.length) buckets.push(kept);
    });
    /* 2) 輪流從每一類各取一個，直到額滿 */
    const out = [];
    let round = 0, more = true;
    while (more && out.length < limit) {
      more = false;
      for (let i = 0; i < buckets.length && out.length < limit; i++) {
        if (buckets[i][round]) { out.push(buckets[i][round]); if (buckets[i][round + 1]) more = true; }
      }
      round++;
      if (round > 40) break;
    }
    /* 3) 最後依照在內文中出現的先後排序，讀起來更順 */
    out.sort(function (a, b) { return a.at - b.at; });
    return out;
  };

  /* ---------------- 飲食建議庫 ---------------- */
  L.HIGH_PROTEIN = ['雞胸肉', '水煮蛋 / 茶葉蛋', '無糖希臘優格', '豆腐 / 豆乾', '毛豆', '鮭魚 / 鯖魚', '蝦仁', '低脂牛奶'];
  L.LOW_GI = ['糙米 / 藜麥', '地瓜', '燕麥', '全麥麵包', '蘋果 / 芭樂', '堅果一小把', '大量蔬菜', '奇亞籽'];

  /* ---------------- 季節穿搭建議 ---------------- */
  L.OUTFIT_TIPS = {
    hot: ['選擇淺色系、透氣棉麻材質', '記得防曬：帽子 / 薄外套 / 防曬乳', '多喝水，隨身帶水壺', '避免深色吸熱，配件可選亮色點綴'],
    warm: ['薄長袖 + 背心，方便早晚溫差穿脫', '淺色系單品最百搭', '一雙好走的鞋，走路也舒服'],
    cool: ['洋蔥式穿搭：內薄外厚', '針織外套 / 風衣是好朋友', '可加一條絲巾增加層次感'],
    cold: ['保暖內層 + 毛衣 + 外套三層', '圍巾、手套、襪子別忘了', '深色與大地色系更有季節感', '材質可選羊毛、刷毛，柔軟又暖']
  };
})(window.Lume);
