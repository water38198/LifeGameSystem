import { ref } from 'vue';
import { defineStore } from 'pinia';
import { achievementDefs } from '../utils/achievements.js';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const SPREADSHEET_ID = import.meta.env.VITE_SPREADSHEET_ID;
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

export const useGameStore = defineStore('game', () => {
  // --- State ---
  const isAuthenticated = ref(false);
  const userStats = ref(null);
  const userStatsHeaders = ref([]);
  const tasks = ref([]);
  const taskHeaders = ref([]);
  const skills = ref([]);
  const shopItems = ref([]);
  const shopHeaders = ref([]);
  const completedTaskIds = ref(new Set());
  const taskLogs = ref([]);
  const phrases = ref([]);
  const phraseHeaders = ref([]);
  const isGapiLoaded = ref(false);
  const isGsiLoaded = ref(false);
  const isProcessing = ref(false);
  const loginBonus = ref(null);
  const achievementQueue = ref([]);
  const isSessionExpired = ref(false);

  // --- Internal (non-reactive) ---
  let tokenClient;
  let tokenRefreshTimer = null;
  const sheetIds = {};

  // --- Auth ---
  function scheduleTokenRefresh() {
    if (tokenRefreshTimer) clearTimeout(tokenRefreshTimer);
    tokenRefreshTimer = setTimeout(() => {
      tokenClient.requestAccessToken({ prompt: '' });
    }, 55 * 60 * 1000);
  }

  function loadGapi() {
    if (window.gapi) {
      window.gapi.load('client', initializeGapiClient);
    } else {
      setTimeout(loadGapi, 100);
    }
  }

  async function initializeGapiClient() {
    try {
      await window.gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
      });
      isGapiLoaded.value = true;
    } catch (err) {
      console.error('GAPI 初始化失敗', err);
    }
  }

  function loadGsi() {
    if (window.google) {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
          if (tokenResponse.error) {
            if (isAuthenticated.value) {
              isAuthenticated.value = false;
              isSessionExpired.value = true;
            }
            return;
          }
          if (tokenResponse && tokenResponse.access_token) {
            const firstLogin = !isAuthenticated.value;
            isAuthenticated.value = true;
            isSessionExpired.value = false;
            scheduleTokenRefresh();
            if (firstLogin) fetchAllData();
          }
        },
      });
      isGsiLoaded.value = true;
    } else {
      setTimeout(loadGsi, 100);
    }
  }

  function login() {
    if (tokenClient) {
      tokenClient.requestAccessToken();
    } else {
      console.warn('OAuth token client 尚未準備好');
    }
  }

  function handleApiError(err) {
    const status = err?.result?.error?.code || err?.status;
    if (status === 401) {
      isAuthenticated.value = false;
      isSessionExpired.value = true;
    }
  }

  // --- Sheets Helpers ---
  function buildStatsRow(overrides) {
    return userStatsHeaders.value.map(h => {
      const key = h.trim();
      return overrides[key] !== undefined ? overrides[key] : (userStats.value?.[key] ?? '');
    });
  }

  function statsRange() {
    const endCol = String.fromCharCode(64 + userStatsHeaders.value.length);
    return `User_Stats!A2:${endCol}2`;
  }

  // --- Data Fetching ---
  async function fetchSheetMeta() {
    try {
      const res = await window.gapi.client.sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
        fields: 'sheets.properties'
      });
      res.result.sheets.forEach(s => {
        sheetIds[s.properties.title] = s.properties.sheetId;
      });
    } catch (err) {
      console.error('取得 Sheet metadata 失敗:', err);
    }
  }

  async function fetchAllData() {
    if (!SPREADSHEET_ID) {
      console.warn('未設定 VITE_SPREADSHEET_ID');
      return;
    }

    try {
      await fetchSheetMeta();

      const response = await window.gapi.client.sheets.spreadsheets.values.batchGet({
        spreadsheetId: SPREADSHEET_ID,
        ranges: ['User_Stats!A1:Z', 'Task_Pool!A1:Z', 'Task_Logs!A1:Z', 'Skill_Tree!A1:Z', 'Shop_Items!A1:Z', 'Phrase_Bank!A1:Z'],
      });

      const valueRanges = response.result.valueRanges;

      // [0] User_Stats
      const statsRows = valueRanges[0].values;
      if (statsRows && statsRows.length >= 2) {
        const headers = statsRows[0];
        const data = statsRows[1];
        userStatsHeaders.value = headers;
        const stats = {};
        headers.forEach((header, index) => {
          stats[header] = data[index];
        });
        userStats.value = stats;
      }

      // [1] Task_Pool
      const taskRows = valueRanges[1].values;
      if (taskRows && taskRows.length > 1) {
        const headers = taskRows[0];
        taskHeaders.value = headers;
        const parsedTasks = [];
        for (let i = 1; i < taskRows.length; i++) {
          const row = taskRows[i];
          if (!row[0]) continue;
          const taskObj = { _rowIndex: i + 1 };
          headers.forEach((header, index) => {
            const cleanHeader = (header || '').trim();
            taskObj[cleanHeader] = row[index];
          });
          parsedTasks.push(taskObj);
        }
        tasks.value = parsedTasks;
      }

      // [2] Task_Logs
      const logsRows = valueRanges[2].values;
      const completedSet = new Set();
      const todayStr = new Date().toDateString();

      if (logsRows && logsRows.length > 1) {
        const parsedLogs = [];
        for (let i = 1; i < logsRows.length; i++) {
          const row = logsRows[i];
          if (!row[0]) continue;
          parsedLogs.push({
            timestamp: row[0] || '',
            taskId:    row[1] || '',
            exp:       parseInt(row[2]) || 0,
            gold:      parseInt(row[3]) || 0,
            status:    row[4] || ''
          });
          if (row[1] && row[4] === 'Completed') {
            const taskId = row[1];
            const task = tasks.value.find(t => t.ID === taskId);
            const isDaily = task?.Type?.toLowerCase() === 'daily';
            if (isDaily) {
              if (new Date(row[0]).toDateString() === todayStr) completedSet.add(taskId);
            } else {
              completedSet.add(taskId);
            }
          }
        }
        taskLogs.value = parsedLogs;
      }
      completedTaskIds.value = completedSet;

      // [3] Skill_Tree
      const skillRows = valueRanges[3]?.values;
      if (skillRows && skillRows.length > 1) {
        const headers = skillRows[0];
        const parsedSkills = [];
        for (let i = 1; i < skillRows.length; i++) {
          const row = skillRows[i];
          if (!row[0]) continue;
          const skillObj = { _rowIndex: i + 1 };
          headers.forEach((header, index) => {
            skillObj[header] = row[index];
          });
          skillObj.Is_Unlocked = (skillObj.Is_Unlocked === 'TRUE' || skillObj.Is_Unlocked === true);
          parsedSkills.push(skillObj);
        }
        skills.value = parsedSkills;
      }

      // [4] Shop_Items
      const shopRows = valueRanges[4]?.values;
      if (shopRows && shopRows.length > 1) {
        const headers = shopRows[0];
        shopHeaders.value = headers;
        const parsedShopItems = [];
        for (let i = 1; i < shopRows.length; i++) {
          const row = shopRows[i];
          if (!row[0]) continue;
          const itemObj = { _rowIndex: i + 1 };
          headers.forEach((header, index) => {
            itemObj[header] = row[index];
          });
          parsedShopItems.push(itemObj);
        }
        shopItems.value = parsedShopItems;
      } else if (!shopRows) {
        console.warn("找不到 Shop_Items 分頁資料，請確認是否已建立。");
      }

      // [5] Phrase_Bank
      const phraseRows = valueRanges[5]?.values;
      if (phraseRows && phraseRows.length > 1) {
        const headers = phraseRows[0];
        phraseHeaders.value = headers;
        const parsedPhrases = [];
        for (let i = 1; i < phraseRows.length; i++) {
          const row = phraseRows[i];
          if (!row[0]) continue;
          const obj = { _rowIndex: i + 1 };
          headers.forEach((h, idx) => { obj[h.trim()] = row[idx] || ''; });
          parsedPhrases.push(obj);
        }
        phrases.value = parsedPhrases;
      }

      await applyFortuneWheel();

    } catch (err) {
      console.error('讀取資料失敗:', err);
      handleApiError(err);
    }
  }

  async function applyFortuneWheel() {
    const hasFortune = skills.value.some(s => s.Effect_Type === 'FORTUNE_WHEEL' && s.Is_Unlocked);
    if (!hasFortune) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const alreadyToday = taskLogs.value.some(l => l.status === 'FortuneWheel' && l.timestamp.slice(0, 10) === todayStr);
    if (alreadyToday) return;

    if (Math.random() >= 0.3) return;

    const bonusGold = Math.floor(Math.random() * 20) + 1;
    const newGold = (parseInt(userStats.value?.Gold) || 0) + bonusGold;
    const nowIsoString = new Date().toISOString();

    try {
      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: statsRange(),
        valueInputOption: 'USER_ENTERED',
        resource: { values: [buildStatsRow({ Gold: newGold, Last_Login: nowIsoString })] }
      });
      await window.gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Task_Logs!A:E',
        valueInputOption: 'USER_ENTERED',
        resource: { values: [[nowIsoString, 'FORTUNE', 0, bonusGold, 'FortuneWheel']] }
      });

      userStats.value = { ...userStats.value, Gold: newGold, Last_Login: nowIsoString };
      taskLogs.value.push({ timestamp: nowIsoString, taskId: 'FORTUNE', exp: 0, gold: bonusGold, status: 'FortuneWheel' });
      loginBonus.value = { gold: bonusGold };
    } catch (err) {
      console.error('命運的齒輪執行失敗:', err);
    }
  }

  // --- Game Logic ---
  function calculateLevelData(totalExp) {
    let level = 1;
    let requiredExp = 1000;
    let expForNextLevel = 1000;

    while (totalExp >= requiredExp) {
      level++;
      expForNextLevel = level * 1000;
      requiredExp += expForNextLevel;
    }

    const currentLevelBaseExp = requiredExp - expForNextLevel;
    return {
      level,
      progressExp: totalExp - currentLevelBaseExp,
      nextLevelExp: expForNextLevel,
      totalExp
    };
  }

  async function checkAchievements() {
    if (!userStatsHeaders.value.includes('Achievements')) return;

    const completedLogsData = taskLogs.value.filter(l => l.status === 'Completed');
    const data = {
      totalCompleted:   completedLogsData.length,
      level:            parseInt(userStats.value?.Level || 1),
      streak:           parseInt(userStats.value?.Streak || 0),
      unlockedSkills:   skills.value.filter(s => s.Is_Unlocked).length,
      totalGoldEarned:  completedLogsData.reduce((s, l) => s + l.gold, 0),
      fortuneTriggered: taskLogs.value.some(l => l.status === 'FortuneWheel'),
    };

    const currentIds = (userStats.value?.Achievements || '').split(',').filter(Boolean);
    const newlyUnlocked = achievementDefs.filter(a => !currentIds.includes(a.id) && a.check(data));
    if (newlyUnlocked.length === 0) return;

    const bonusEXP  = newlyUnlocked.reduce((s, a) => s + a.rewardEXP,  0);
    const bonusGold = newlyUnlocked.reduce((s, a) => s + a.rewardGold, 0);
    const newEXP    = (parseInt(userStats.value.EXP  || 0)) + bonusEXP;
    const newGold   = (parseInt(userStats.value.Gold || 0)) + bonusGold;
    const { level: newLevel } = calculateLevelData(newEXP);
    const newAchievements = [...currentIds, ...newlyUnlocked.map(a => a.id)].join(',');
    const nowIsoString = new Date().toISOString();

    try {
      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: statsRange(),
        valueInputOption: 'USER_ENTERED',
        resource: { values: [buildStatsRow({ EXP: newEXP, Gold: newGold, Level: newLevel, Achievements: newAchievements, Last_Login: nowIsoString })] }
      });
      userStats.value = { ...userStats.value, EXP: newEXP, Gold: newGold, Level: newLevel, Achievements: newAchievements };
      achievementQueue.value = [...achievementQueue.value, ...newlyUnlocked];
    } catch (err) {
      console.error('成就更新失敗:', err);
    }
  }

  async function completeTask(task) {
    if (isProcessing.value) return;
    isProcessing.value = true;

    try {
      const currentStats = userStats.value;
      const oldLevel = parseInt(currentStats.Level) || 1;
      const oldExp = parseInt(currentStats.EXP) || 0;
      const oldGold = parseInt(currentStats.Gold) || 0;
      const oldStatPoints = parseInt(currentStats.Stat_Points) || 0;

      let taskExp = parseInt(task.Base_EXP) || 0;
      let taskGold = parseInt(task.Base_Gold) || 0;

      const hasGoldFlat = skills.value.some(s => s.Effect_Type === 'GOLD_FLAT' && s.Is_Unlocked);
      if (hasGoldFlat) taskGold += 2;

      const hasExpFlat = skills.value.some(s => s.Effect_Type === 'EXP_FLAT' && s.Is_Unlocked);
      if (hasExpFlat) taskExp += 10;

      const hasExpBoost = skills.value.some(s => s.Effect_Type === 'EXP_BOOST' && s.Is_Unlocked);
      if (hasExpBoost) taskExp = Math.floor(taskExp * 1.1);

      const hasGoldBoost = skills.value.some(s => s.Effect_Type === 'GOLD_BOOST' && s.Is_Unlocked);
      if (hasGoldBoost) taskGold = Math.floor(taskGold * 1.2);

      const hasWeekendBonus = skills.value.some(s => s.Effect_Type === 'WEEKEND_BONUS' && s.Is_Unlocked);
      if (hasWeekendBonus) {
        const day = new Date().getDay();
        if (day === 0 || day === 6) {
          taskExp = Math.floor(taskExp * 1.5);
          taskGold = Math.floor(taskGold * 1.5);
        }
      }

      const hasMorningBird = skills.value.some(s => s.Effect_Type === 'MORNING_BIRD' && s.Is_Unlocked);
      if (hasMorningBird) {
        const hour = new Date().getHours();
        if (hour < 10) taskGold += 20;
      }

      let isCrit = false;
      const hasLuckyStrike = skills.value.some(s => s.Effect_Type === 'LUCKY_STRIKE' && s.Is_Unlocked);
      if (hasLuckyStrike && Math.random() < 0.1) {
        taskExp *= 2;
        taskGold *= 2;
        isCrit = true;
      }

      const newTotalExp = oldExp + taskExp;
      const newGold = oldGold + taskGold;
      const { level: newLevel } = calculateLevelData(newTotalExp);

      let newStatPoints = oldStatPoints;
      if (newLevel > oldLevel) newStatPoints += (newLevel - oldLevel);

      const nowIsoString = new Date().toISOString();
      const todayDate = nowIsoString.slice(0, 10);

      const lastTaskDate = currentStats.Last_Task_Date || '';
      const currentStreak = parseInt(currentStats.Streak) || 0;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDate = yesterday.toISOString().slice(0, 10);

      let newStreak;
      if (lastTaskDate === todayDate) {
        newStreak = currentStreak;
      } else if (lastTaskDate === yesterdayDate) {
        newStreak = currentStreak + 1;
      } else {
        newStreak = 1;
      }
      const streakBroken = lastTaskDate && lastTaskDate !== todayDate && lastTaskDate !== yesterdayDate;

      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: statsRange(),
        valueInputOption: 'USER_ENTERED',
        resource: { values: [buildStatsRow({ Level: newLevel, EXP: newTotalExp, Gold: newGold, Stat_Points: newStatPoints, Last_Login: nowIsoString, Streak: newStreak, Last_Task_Date: todayDate })] }
      });

      await window.gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Task_Logs!A:E',
        valueInputOption: 'USER_ENTERED',
        resource: { values: [[nowIsoString, task.ID, taskExp, taskGold, 'Completed']] }
      });

      userStats.value = {
        ...currentStats,
        Level: newLevel,
        EXP: newTotalExp,
        Gold: newGold,
        Stat_Points: newStatPoints,
        Last_Login: nowIsoString,
        Streak: newStreak,
        Last_Task_Date: todayDate
      };

      taskLogs.value.push({ timestamp: nowIsoString, taskId: task.ID, exp: taskExp, gold: taskGold, status: 'Completed' });
      completedTaskIds.value.add(task.ID);
      await checkAchievements();

      return { success: true, leveledUp: newLevel > oldLevel, oldLevel, newLevel, earnedExp: taskExp, earnedGold: taskGold, isCrit, newStreak, streakBroken };
    } catch (err) {
      console.error('完成任務失敗:', err);
      handleApiError(err);
      return { success: false, error: err };
    } finally {
      isProcessing.value = false;
    }
  }

  async function unlockSkill(skill) {
    if (isProcessing.value) return;

    const cost = parseInt(skill.Cost) || 0;
    const currentPoints = parseInt(userStats.value.Stat_Points) || 0;

    if (currentPoints < cost) return { success: false, error: '能力點數不足' };

    isProcessing.value = true;

    try {
      const newStatPoints = currentPoints - cost;
      const nowIsoString = new Date().toISOString();

      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: statsRange(),
        valueInputOption: 'USER_ENTERED',
        resource: { values: [buildStatsRow({ Stat_Points: newStatPoints, Last_Login: nowIsoString })] }
      });

      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Skill_Tree!F${skill._rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [['TRUE']] }
      });

      userStats.value.Stat_Points = newStatPoints;
      const skillIndex = skills.value.findIndex(s => s.Skill_ID === skill.Skill_ID);
      if (skillIndex !== -1) skills.value[skillIndex].Is_Unlocked = true;
      await checkAchievements();

      return { success: true };
    } catch (err) {
      console.error('解鎖技能失敗:', err);
      handleApiError(err);
      return { success: false, error: err };
    } finally {
      isProcessing.value = false;
    }
  }

  async function buyItem(item) {
    if (isProcessing.value) return;

    const currentGold = parseInt(userStats.value.Gold) || 0;
    isProcessing.value = true;

    try {
      let finalCost = parseInt(item.Cost) || 0;

      const hasDiscount = skills.value.some(s => s.Effect_Type === 'DISCOUNT_10' && s.Is_Unlocked);
      if (hasDiscount) finalCost = Math.floor(finalCost * 0.9);

      if (currentGold < finalCost) {
        isProcessing.value = false;
        return { success: false, error: `金幣不足 (需要 ${finalCost} 金幣)` };
      }

      const newGold = currentGold - finalCost;
      const nowIsoString = new Date().toISOString();

      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: statsRange(),
        valueInputOption: 'USER_ENTERED',
        resource: { values: [buildStatsRow({ Gold: newGold, Last_Login: nowIsoString })] }
      });

      await window.gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Task_Logs!A:E',
        valueInputOption: 'USER_ENTERED',
        resource: { values: [[nowIsoString, item.Item_ID || 'SHOP', 0, -finalCost, 'Bought']] }
      });

      userStats.value.Gold = newGold;
      return { success: true };
    } catch (err) {
      console.error('購買失敗:', err);
      handleApiError(err);
      return { success: false, error: err };
    } finally {
      isProcessing.value = false;
    }
  }

  async function addTask(taskData) {
    if (isProcessing.value) return;
    isProcessing.value = true;

    try {
      const taskId = 'T' + Date.now();
      const newTask = {
        ID: taskId,
        Title: taskData.Title,
        Type: taskData.Type,
        Base_EXP: taskData.Base_EXP,
        Base_Gold: taskData.Base_Gold,
        Cooldown: taskData.Cooldown || 0
      };

      let rowData = [];
      if (taskHeaders.value && taskHeaders.value.length > 0) {
        taskHeaders.value.forEach(header => {
          const cleanHeader = (header || '').trim().toLowerCase();
          if (cleanHeader === 'id')        rowData.push(newTask.ID);
          else if (cleanHeader === 'title')     rowData.push(newTask.Title);
          else if (cleanHeader === 'type')      rowData.push(newTask.Type);
          else if (cleanHeader === 'base_exp')  rowData.push(newTask.Base_EXP);
          else if (cleanHeader === 'base_gold') rowData.push(newTask.Base_Gold);
          else if (cleanHeader === 'cooldown')  rowData.push(newTask.Cooldown);
          else rowData.push('');
        });
      } else {
        rowData = [newTask.ID, newTask.Title, newTask.Type, newTask.Base_EXP, newTask.Base_Gold, newTask.Cooldown];
      }

      const endColumn = taskHeaders.value.length > 0
        ? String.fromCharCode(64 + taskHeaders.value.length)
        : 'F';

      await window.gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `Task_Pool!A:${endColumn}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [rowData] }
      });

      tasks.value.push({ ...newTask, _rowIndex: tasks.value.length + 2 });
      return { success: true };
    } catch (err) {
      console.error('新增任務失敗:', err);
      return { success: false, error: err };
    } finally {
      isProcessing.value = false;
    }
  }

  async function updateTask(task, updates) {
    if (isProcessing.value) return;
    isProcessing.value = true;
    try {
      const updatedTask = { ...task, ...updates };
      const rowData = taskHeaders.value.map(header => {
        const h = (header || '').trim().toLowerCase();
        if (h === 'id')        return updatedTask.ID;
        if (h === 'title')     return updatedTask.Title;
        if (h === 'type')      return updatedTask.Type;
        if (h === 'base_exp')  return updatedTask.Base_EXP;
        if (h === 'base_gold') return updatedTask.Base_Gold;
        if (h === 'cooldown')  return updatedTask.Cooldown || 0;
        return '';
      });
      const endCol = String.fromCharCode(64 + taskHeaders.value.length);
      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Task_Pool!A${task._rowIndex}:${endCol}${task._rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [rowData] }
      });
      const idx = tasks.value.findIndex(t => t.ID === task.ID);
      if (idx !== -1) tasks.value[idx] = { ...updatedTask };
      return { success: true };
    } catch (err) {
      console.error('更新任務失敗:', err);
      return { success: false };
    } finally {
      isProcessing.value = false;
    }
  }

  async function deleteTask(task) {
    if (isProcessing.value) return;
    isProcessing.value = true;
    try {
      await window.gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: { requests: [{ deleteDimension: { range: {
          sheetId: sheetIds['Task_Pool'],
          dimension: 'ROWS',
          startIndex: task._rowIndex - 1,
          endIndex: task._rowIndex
        }}}]}
      });
      tasks.value = tasks.value
        .filter(t => t.ID !== task.ID)
        .map(t => ({ ...t, _rowIndex: t._rowIndex > task._rowIndex ? t._rowIndex - 1 : t._rowIndex }));
      completedTaskIds.value.delete(task.ID);
      return { success: true };
    } catch (err) {
      console.error('刪除任務失敗:', err);
      return { success: false };
    } finally {
      isProcessing.value = false;
    }
  }

  async function addShopItem(itemData) {
    if (isProcessing.value) return;
    isProcessing.value = true;

    try {
      const itemId = 'I' + Date.now();
      const newItem = {
        Item_ID: itemId,
        Name: itemData.Name,
        Description: itemData.Description,
        Cost: itemData.Cost
      };

      let rowData = [];
      if (shopHeaders.value && shopHeaders.value.length > 0) {
        shopHeaders.value.forEach(header => {
          const cleanHeader = (header || '').trim().toLowerCase();
          if (cleanHeader === 'item_id')     rowData.push(newItem.Item_ID);
          else if (cleanHeader === 'name')        rowData.push(newItem.Name);
          else if (cleanHeader === 'description') rowData.push(newItem.Description);
          else if (cleanHeader === 'cost')        rowData.push(newItem.Cost);
          else rowData.push('');
        });
      } else {
        rowData = [newItem.Item_ID, newItem.Name, newItem.Description, newItem.Cost];
      }

      const endColumn = shopHeaders.value.length > 0
        ? String.fromCharCode(64 + shopHeaders.value.length)
        : 'D';

      await window.gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `Shop_Items!A:${endColumn}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [rowData] }
      });

      shopItems.value.push({ ...newItem, _rowIndex: shopItems.value.length + 2 });
      return { success: true };
    } catch (err) {
      console.error('新增商品失敗:', err);
      return { success: false, error: err };
    } finally {
      isProcessing.value = false;
    }
  }

  async function updateShopItem(item, updates) {
    if (isProcessing.value) return;
    isProcessing.value = true;
    try {
      const updatedItem = { ...item, ...updates };
      const rowData = shopHeaders.value.map(header => {
        const h = (header || '').trim().toLowerCase();
        if (h === 'item_id')     return updatedItem.Item_ID;
        if (h === 'name')        return updatedItem.Name;
        if (h === 'description') return updatedItem.Description;
        if (h === 'cost')        return updatedItem.Cost;
        return '';
      });
      const endCol = String.fromCharCode(64 + shopHeaders.value.length);
      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Shop_Items!A${item._rowIndex}:${endCol}${item._rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [rowData] }
      });
      const idx = shopItems.value.findIndex(i => i.Item_ID === item.Item_ID);
      if (idx !== -1) shopItems.value[idx] = { ...updatedItem };
      return { success: true };
    } catch (err) {
      console.error('更新商品失敗:', err);
      return { success: false };
    } finally {
      isProcessing.value = false;
    }
  }

  async function deleteShopItem(item) {
    if (isProcessing.value) return;
    isProcessing.value = true;
    try {
      await window.gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: { requests: [{ deleteDimension: { range: {
          sheetId: sheetIds['Shop_Items'],
          dimension: 'ROWS',
          startIndex: item._rowIndex - 1,
          endIndex: item._rowIndex
        }}}]}
      });
      shopItems.value = shopItems.value
        .filter(i => i.Item_ID !== item.Item_ID)
        .map(i => ({ ...i, _rowIndex: i._rowIndex > item._rowIndex ? i._rowIndex - 1 : i._rowIndex }));
      return { success: true };
    } catch (err) {
      console.error('刪除商品失敗:', err);
      return { success: false };
    } finally {
      isProcessing.value = false;
    }
  }

  async function submitPhrase(phrase) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const alreadyRewarded = taskLogs.value.some(
      l => l.status === 'Training' && l.taskId === phrase.Phrase_ID && l.timestamp.slice(0, 10) === todayStr
    );
    if (alreadyRewarded) return { success: true, rewarded: false };

    const rewardType   = Math.random() < 0.5 ? 'gold' : 'exp';
    const rewardAmount = Math.floor(Math.random() * 5) + 1;
    const nowIsoString = new Date().toISOString();
    const newGold = parseInt(userStats.value?.Gold || 0) + (rewardType === 'gold' ? rewardAmount : 0);
    const newEXP  = parseInt(userStats.value?.EXP  || 0) + (rewardType === 'exp'  ? rewardAmount : 0);
    const { level: newLevel } = calculateLevelData(newEXP);

    try {
      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: statsRange(),
        valueInputOption: 'USER_ENTERED',
        resource: { values: [buildStatsRow({ Gold: newGold, EXP: newEXP, Level: newLevel, Last_Login: nowIsoString })] }
      });
      await window.gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Task_Logs!A:E',
        valueInputOption: 'USER_ENTERED',
        resource: { values: [[nowIsoString, phrase.Phrase_ID, rewardType === 'exp' ? rewardAmount : 0, rewardType === 'gold' ? rewardAmount : 0, 'Training']] }
      });
      userStats.value = { ...userStats.value, Gold: newGold, EXP: newEXP, Level: newLevel };
      taskLogs.value.push({ timestamp: nowIsoString, taskId: phrase.Phrase_ID, exp: rewardType === 'exp' ? rewardAmount : 0, gold: rewardType === 'gold' ? rewardAmount : 0, status: 'Training' });
      return { success: true, rewarded: true, rewardType, rewardAmount };
    } catch (err) {
      console.error('訓練獎勵發放失敗:', err);
      return { success: false, rewarded: false };
    }
  }

  async function updatePhrase(phrase, updates) {
    if (isProcessing.value) return;
    isProcessing.value = true;
    try {
      const updated = { ...phrase, ...updates };
      const rowData = phraseHeaders.value.length > 0
        ? phraseHeaders.value.map(h => {
            const c = h.trim().toLowerCase();
            if (c === 'phrase_id') return updated.Phrase_ID;
            if (c === 'chinese')   return updated.Chinese;
            if (c === 'english')   return updated.English;
            return '';
          })
        : [updated.Phrase_ID, updated.Chinese, updated.English];
      const endCol = phraseHeaders.value.length > 0 ? String.fromCharCode(64 + phraseHeaders.value.length) : 'C';
      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Phrase_Bank!A${phrase._rowIndex}:${endCol}${phrase._rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [rowData] }
      });
      const idx = phrases.value.findIndex(p => p.Phrase_ID === phrase.Phrase_ID);
      if (idx !== -1) phrases.value[idx] = { ...updated };
      return { success: true };
    } catch (err) {
      console.error('更新片語失敗:', err);
      return { success: false };
    } finally {
      isProcessing.value = false;
    }
  }

  async function deletePhrase(phrase) {
    if (isProcessing.value) return;
    isProcessing.value = true;
    try {
      await window.gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: { requests: [{ deleteDimension: { range: {
          sheetId: sheetIds['Phrase_Bank'],
          dimension: 'ROWS',
          startIndex: phrase._rowIndex - 1,
          endIndex: phrase._rowIndex
        }}}]}
      });
      phrases.value = phrases.value
        .filter(p => p.Phrase_ID !== phrase.Phrase_ID)
        .map(p => ({ ...p, _rowIndex: p._rowIndex > phrase._rowIndex ? p._rowIndex - 1 : p._rowIndex }));
      return { success: true };
    } catch (err) {
      console.error('刪除片語失敗:', err);
      return { success: false };
    } finally {
      isProcessing.value = false;
    }
  }

  async function addPhrase(phraseData) {
    if (isProcessing.value) return;
    isProcessing.value = true;
    try {
      const phraseId = 'P' + Date.now();
      const rowData = phraseHeaders.value.length > 0
        ? phraseHeaders.value.map(h => {
            const c = h.trim().toLowerCase();
            if (c === 'phrase_id') return phraseId;
            if (c === 'chinese')   return phraseData.Chinese;
            if (c === 'english')   return phraseData.English;
            return '';
          })
        : [phraseId, phraseData.Chinese, phraseData.English];
      const endCol = phraseHeaders.value.length > 0 ? String.fromCharCode(64 + phraseHeaders.value.length) : 'C';
      await window.gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `Phrase_Bank!A:${endCol}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [rowData] }
      });
      phrases.value.push({ _rowIndex: phrases.value.length + 2, Phrase_ID: phraseId, Chinese: phraseData.Chinese, English: phraseData.English });
      return { success: true };
    } catch (err) {
      console.error('新增片語失敗:', err);
      return { success: false };
    } finally {
      isProcessing.value = false;
    }
  }

  return {
    // State
    isAuthenticated, userStats, userStatsHeaders, tasks, taskHeaders,
    skills, shopItems, shopHeaders, completedTaskIds, taskLogs,
    phrases, phraseHeaders, isGapiLoaded, isGsiLoaded, isProcessing,
    loginBonus, achievementQueue, isSessionExpired,
    // Actions
    loadGapi, loadGsi, login, fetchAllData,
    calculateLevelData,
    completeTask, unlockSkill, buyItem,
    addTask, updateTask, deleteTask,
    addShopItem, updateShopItem, deleteShopItem,
    submitPhrase, addPhrase, updatePhrase, deletePhrase,
  };
});
