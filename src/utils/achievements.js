export const achievementDefs = [
  // 任務類
  { id: 'ACH001', name: '初出茅廬',   icon: '⚔️',  desc: '完成第一個任務，旅途就此展開',       rewardEXP:  50, rewardGold:  10, check: d => d.totalCompleted >= 1   },
  { id: 'ACH002', name: '勤奮冒險者', icon: '📜',  desc: '累積完成 10 個任務',                 rewardEXP: 100, rewardGold:  20, check: d => d.totalCompleted >= 10  },
  { id: 'ACH003', name: '百戰老兵',   icon: '🛡️',  desc: '累積完成 50 個任務',                 rewardEXP: 300, rewardGold:  50, check: d => d.totalCompleted >= 50  },
  { id: 'ACH004', name: '傳奇冒險者', icon: '👑',  desc: '累積完成 100 個任務，名留史冊',       rewardEXP: 500, rewardGold: 100, check: d => d.totalCompleted >= 100 },
  // 等級類
  { id: 'ACH005', name: '踏上旅程',   icon: '🌟',  desc: '達到等級 5',                         rewardEXP: 200, rewardGold:  30, check: d => d.level >= 5  },
  { id: 'ACH006', name: '精英戰士',   icon: '⚡',  desc: '達到等級 10',                        rewardEXP: 500, rewardGold:  80, check: d => d.level >= 10 },
  // 連續類
  { id: 'ACH007', name: '連勝七日',   icon: '🔥',  desc: '連續達成任務達 7 天',                 rewardEXP: 300, rewardGold:  50, check: d => d.streak >= 7  },
  { id: 'ACH008', name: '鐵血意志',   icon: '💪',  desc: '連續達成任務達 30 天',                rewardEXP: 1000, rewardGold: 200, check: d => d.streak >= 30 },
  // 技能類
  { id: 'ACH009', name: '初覺醒',     icon: '🔮',  desc: '解鎖第一個被動技能',                  rewardEXP: 100, rewardGold:   0, check: d => d.unlockedSkills >= 1 },
  // 財富類
  { id: 'ACH010', name: '黃金獵人',   icon: '💰',  desc: '累積賺取 500 金幣',                   rewardEXP: 200, rewardGold:  50, check: d => d.totalGoldEarned >= 500 },
  // 特殊
  { id: 'ACH011', name: '命運的寵兒', icon: '🎰',  desc: '首次觸發命運的齒輪獎勵',              rewardEXP:  50, rewardGold:   0, check: d => d.fortuneTriggered },
  // 任務類（補充）
  { id: 'ACH012', name: '初露鋒芒',   icon: '⚔️',  desc: '累積完成 5 個任務',                   rewardEXP:  30, rewardGold:   5, check: d => d.totalCompleted >= 5   },
  { id: 'ACH013', name: '不懈挑戰',   icon: '📜',  desc: '累積完成 25 個任務',                  rewardEXP:  60, rewardGold:  10, check: d => d.totalCompleted >= 25  },
  { id: 'ACH014', name: '征途未盡',   icon: '🏹',  desc: '累積完成 200 個任務',                 rewardEXP: 400, rewardGold:  70, check: d => d.totalCompleted >= 200 },
  { id: 'ACH015', name: '史詩征途',   icon: '🌋',  desc: '累積完成 500 個任務，名留青史',        rewardEXP: 700, rewardGold: 120, check: d => d.totalCompleted >= 500 },
  // 等級類（補充）
  { id: 'ACH016', name: '新手覺醒',   icon: '🌱',  desc: '達到等級 3，踏出第一步',               rewardEXP:  50, rewardGold:   0, check: d => d.level >= 3  },
  { id: 'ACH017', name: '精鋼之志',   icon: '⚡',  desc: '達到等級 15',                         rewardEXP: 300, rewardGold:  40, check: d => d.level >= 15 },
  { id: 'ACH018', name: '傳說境界',   icon: '🌟',  desc: '達到等級 20，抵達傳說之巔',            rewardEXP: 600, rewardGold: 100, check: d => d.level >= 20 },
  // 連續類（補充）
  { id: 'ACH019', name: '初燃之火',   icon: '🔥',  desc: '連續達成任務達 3 天',                  rewardEXP:  30, rewardGold:   5, check: d => d.streak >= 3   },
  { id: 'ACH020', name: '半月征途',   icon: '💪',  desc: '連續達成任務達 14 天',                 rewardEXP: 200, rewardGold:  25, check: d => d.streak >= 14  },
  { id: 'ACH021', name: '兩月修煉',   icon: '🗓️',  desc: '連續達成任務達 60 天',                 rewardEXP: 500, rewardGold:  80, check: d => d.streak >= 60  },
  { id: 'ACH022', name: '百日磨劍',   icon: '🗡️',  desc: '連續達成任務達 100 天，意志如鐵',      rewardEXP: 700, rewardGold: 120, check: d => d.streak >= 100 },
  // 技能類（補充）
  { id: 'ACH023', name: '力量覺醒',   icon: '🔮',  desc: '解鎖 3 個被動技能',                   rewardEXP:  80, rewardGold:   0, check: d => d.unlockedSkills >= 3  },
  { id: 'ACH024', name: '技能大師',   icon: '🌀',  desc: '解鎖 5 個被動技能',                   rewardEXP: 200, rewardGold:  20, check: d => d.unlockedSkills >= 5  },
  { id: 'ACH025', name: '全能戰士',   icon: '🌈',  desc: '解鎖 10 個被動技能',                  rewardEXP: 400, rewardGold:  60, check: d => d.unlockedSkills >= 10 },
  // 財富類（補充）
  { id: 'ACH026', name: '小富即安',   icon: '💰',  desc: '累積賺取 1000 金幣',                  rewardEXP: 150, rewardGold:  15, check: d => d.totalGoldEarned >= 1000 },
  { id: 'ACH027', name: '富可敵國',   icon: '💎',  desc: '累積賺取 5000 金幣',                  rewardEXP: 350, rewardGold:  60, check: d => d.totalGoldEarned >= 5000 },
  // 訓練場類
  { id: 'ACH028', name: '初學者',     icon: '📖',  desc: '完成 10 次訓練場練習',                rewardEXP:  60, rewardGold:   0, check: d => d.trainingCount >= 10  },
  { id: 'ACH029', name: '語言學者',   icon: '📚',  desc: '完成 50 次訓練場練習',                rewardEXP: 200, rewardGold:  20, check: d => d.trainingCount >= 50  },
  { id: 'ACH030', name: '語言大師',   icon: '🎓',  desc: '完成 100 次訓練場練習，融會貫通',      rewardEXP: 350, rewardGold:  50, check: d => d.trainingCount >= 100 },
  // 經驗類
  { id: 'ACH031', name: '老江湖',     icon: '🏆',  desc: '累積獲得 10000 EXP',                  rewardEXP: 200, rewardGold:  30, check: d => d.totalEXPEarned >= 10000 },
  // 等級類（進階）
  { id: 'ACH032', name: '勢如破竹',   icon: '🌟',  desc: '達到等級 8，初顯鋒芒',                rewardEXP: 150, rewardGold:  15, check: d => d.level >= 8  },
  { id: 'ACH033', name: '中流砥柱',   icon: '⚡',  desc: '達到等級 12，越戰越勇',               rewardEXP: 250, rewardGold:  30, check: d => d.level >= 12 },
  { id: 'ACH034', name: '超凡境界',   icon: '💫',  desc: '達到等級 25，踏入超凡之境',           rewardEXP: 900, rewardGold: 150, check: d => d.level >= 25 },
  { id: 'ACH035', name: '神話境界',   icon: '👑',  desc: '達到等級 30，神話已然降臨',           rewardEXP: 1500, rewardGold: 250, check: d => d.level >= 30 },
  // 連續類（進階）
  { id: 'ACH036', name: '三週考驗',   icon: '🔥',  desc: '連續達成任務達 21 天',                rewardEXP: 150, rewardGold:  20, check: d => d.streak >= 21  },
  { id: 'ACH037', name: '千鍊成鋼',   icon: '💪',  desc: '連續達成任務達 50 天',                rewardEXP: 300, rewardGold:  45, check: d => d.streak >= 50  },
  { id: 'ACH038', name: '季節磨礪',   icon: '🗓️',  desc: '連續達成任務達 90 天',                rewardEXP: 600, rewardGold: 100, check: d => d.streak >= 90  },
  { id: 'ACH039', name: '半年磨礪',   icon: '🌙',  desc: '連續達成任務達 180 天，意志鑄成',     rewardEXP: 1500, rewardGold: 250, check: d => d.streak >= 180 },
  { id: 'ACH040', name: '永恆意志',   icon: '🌌',  desc: '連續達成任務達 365 天，已成傳說',     rewardEXP: 3000, rewardGold: 500, check: d => d.streak >= 365 },
  // 任務類（進階）
  { id: 'ACH041', name: '初嚐勝果',   icon: '🏹',  desc: '累積完成 150 個任務',                 rewardEXP: 200, rewardGold:  35, check: d => d.totalCompleted >= 150 },
  { id: 'ACH042', name: '千戰不殆',   icon: '🛡️',  desc: '累積完成 300 個任務',                 rewardEXP: 400, rewardGold:  70, check: d => d.totalCompleted >= 300 },
  { id: 'ACH043', name: '萬年長青',   icon: '🌋',  desc: '累積完成 1000 個任務，成就神話',      rewardEXP: 1500, rewardGold: 300, check: d => d.totalCompleted >= 1000 },
  // 訓練場類（進階）
  { id: 'ACH044', name: '訓練新秀',   icon: '📖',  desc: '完成 30 次訓練場練習',                rewardEXP: 100, rewardGold:  10, check: d => d.trainingCount >= 30  },
  { id: 'ACH045', name: '訓練達人',   icon: '📚',  desc: '完成 200 次訓練場練習',               rewardEXP: 500, rewardGold:  60, check: d => d.trainingCount >= 200 },
  { id: 'ACH046', name: '語言宗師',   icon: '🎓',  desc: '完成 500 次訓練場練習，爐火純青',     rewardEXP: 1200, rewardGold: 150, check: d => d.trainingCount >= 500 },
  // 財富類（進階）
  { id: 'ACH047', name: '萬貫家財',   icon: '💰',  desc: '累積賺取 10000 金幣',                 rewardEXP: 500, rewardGold: 100, check: d => d.totalGoldEarned >= 10000 },
  { id: 'ACH048', name: '富甲一方',   icon: '💎',  desc: '累積賺取 30000 金幣，富可敵城',       rewardEXP: 1000, rewardGold: 200, check: d => d.totalGoldEarned >= 30000 },
  // 經驗類（進階）
  { id: 'ACH049', name: '博聞強識',   icon: '🏆',  desc: '累積獲得 30000 EXP',                  rewardEXP: 500, rewardGold:  60, check: d => d.totalEXPEarned >= 30000  },
  { id: 'ACH050', name: '經驗之海',   icon: '🌊',  desc: '累積獲得 100000 EXP',                 rewardEXP: 1500, rewardGold: 150, check: d => d.totalEXPEarned >= 100000 },
  { id: 'ACH051', name: '智慧之神',   icon: '🌌',  desc: '累積獲得 500000 EXP，已達智慧之巔',   rewardEXP: 5000, rewardGold: 500, check: d => d.totalEXPEarned >= 500000 },
];
