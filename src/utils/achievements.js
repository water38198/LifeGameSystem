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
];
