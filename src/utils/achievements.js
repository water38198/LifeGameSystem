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
];
