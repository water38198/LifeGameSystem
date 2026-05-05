import { ref } from 'vue';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const SPREADSHEET_ID = import.meta.env.VITE_SPREADSHEET_ID;

const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

export const isAuthenticated = ref(false);
export const userStats = ref(null);
export const userStatsHeaders = ref([]);
export const tasks = ref([]);
export const taskHeaders = ref([]);
export const skills = ref([]);
export const shopItems = ref([]);
export const shopHeaders = ref([]);
export const completedTaskIds = ref(new Set());
export const taskLogs = ref([]);
export const isGapiLoaded = ref(false);
export const isGsiLoaded = ref(false);
export const isProcessing = ref(false);
export const loginBonus = ref(null);

let tokenClient;
let tokenRefreshTimer = null;

function scheduleTokenRefresh() {
  if (tokenRefreshTimer) clearTimeout(tokenRefreshTimer);
  // Token 有效期 60 分鐘，55 分鐘時靜默刷新
  tokenRefreshTimer = setTimeout(() => {
    tokenClient.requestAccessToken({ prompt: '' });
  }, 55 * 60 * 1000);
}

// 1. 載入 Google API Client Library
export function loadGapi() {
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

// 2. 載入 Google Identity Services
export function loadGsi() {
  if (window.google) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (tokenResponse) => {
        if (tokenResponse && tokenResponse.access_token) {
          const firstLogin = !isAuthenticated.value;
          isAuthenticated.value = true;
          scheduleTokenRefresh();
          if (firstLogin) {
            fetchAllData();
          }
        }
      },
    });
    isGsiLoaded.value = true;
  } else {
    setTimeout(loadGsi, 100);
  }
}

// 3. 觸發登入
export function login() {
  if (tokenClient) {
    tokenClient.requestAccessToken();
  } else {
    console.warn('OAuth token client 尚未準備好');
  }
}

// 4. 取得所有資料
export async function fetchAllData() {
  if (!SPREADSHEET_ID) {
    console.warn('未設定 VITE_SPREADSHEET_ID');
    return;
  }
  
  try {
    // 批次讀取五個分頁 (改回 A1 寫法以解決 400 Bad Request，並加大範圍到 Z 欄以防萬一)
    const response = await window.gapi.client.sheets.spreadsheets.values.batchGet({
      spreadsheetId: SPREADSHEET_ID,
      ranges: ['User_Stats!A1:Z', 'Task_Pool!A1:Z', 'Task_Logs!A1:Z', 'Skill_Tree!A1:Z', 'Shop_Items!A1:Z'],
    });
    
    const valueRanges = response.result.valueRanges;
    
    // [0] 處理 User_Stats
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
    
    // [1] 處理 Task_Pool
    const taskRows = valueRanges[1].values;
    if (taskRows && taskRows.length > 1) {
      const headers = taskRows[0];
      taskHeaders.value = headers;
      const parsedTasks = [];
      for (let i = 1; i < taskRows.length; i++) {
        const row = taskRows[i];
        if (!row[0]) continue;
        const taskObj = {};
        headers.forEach((header, index) => {
          const cleanHeader = (header || '').trim();
          taskObj[cleanHeader] = row[index];
        });
        parsedTasks.push(taskObj);
      }
      console.log('讀取到的 Task_Pool 原始資料:', taskRows);
      console.log('解析後的任務:', parsedTasks);
      tasks.value = parsedTasks;
    }
    
    // [2] 處理 Task_Logs
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

    // [3] 處理 Skill_Tree
    const skillRows = valueRanges[3]?.values;
    if (skillRows && skillRows.length > 1) {
      const headers = skillRows[0];
      const parsedSkills = [];
      for (let i = 1; i < skillRows.length; i++) {
        const row = skillRows[i];
        if (!row[0]) continue;
        const skillObj = { _rowIndex: i + 1 }; // 紀錄在試算表中的實際列數 (Header=1, Data starts at 2)
        headers.forEach((header, index) => {
          skillObj[header] = row[index];
        });
        // 確保 Is_Unlocked 轉為 boolean 方便前端判斷
        skillObj.Is_Unlocked = (skillObj.Is_Unlocked === 'TRUE' || skillObj.Is_Unlocked === true);
        parsedSkills.push(skillObj);
      }
      skills.value = parsedSkills;
    }

    // [4] 處理 Shop_Items
    const shopRows = valueRanges[4]?.values;
    if (shopRows && shopRows.length > 1) {
      const headers = shopRows[0];
      shopHeaders.value = headers;
      const parsedShopItems = [];
      for (let i = 1; i < shopRows.length; i++) {
        const row = shopRows[i];
        if (!row[0]) continue;
        const itemObj = {};
        headers.forEach((header, index) => {
          itemObj[header] = row[index];
        });
        parsedShopItems.push(itemObj);
      }
      shopItems.value = parsedShopItems;
    } else if (!shopRows) {
      console.warn("找不到 Shop_Items 分頁資料，請確認是否已建立。");
    }
    
    // 命運的齒輪：資料載入完畢後觸發
    await applyFortuneWheel();

  } catch (err) {
    console.error('讀取資料失敗:', err);
  }
}

async function applyFortuneWheel() {
  const hasFortune = skills.value.some(s => s.Effect_Type === 'FORTUNE_WHEEL' && s.Is_Unlocked);
  if (!hasFortune) return;

  // 每天只觸發一次：檢查今天是否已有 FortuneWheel 紀錄
  const todayStr = new Date().toISOString().slice(0, 10);
  const alreadyToday = taskLogs.value.some(l => l.status === 'FortuneWheel' && l.timestamp.slice(0, 10) === todayStr);
  if (alreadyToday) return;

  // 30% 機率
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

// 依照試算表實際標題順序動態組出要寫入的欄位陣列
function buildStatsRow(overrides) {
  return userStatsHeaders.value.map(h => {
    const key = h.trim();
    return overrides[key] !== undefined ? overrides[key] : (userStats.value?.[key] ?? '');
  });
}

// 計算要更新的範圍字串（例如 User_Stats!A2:E2）
function statsRange() {
  const endCol = String.fromCharCode(64 + userStatsHeaders.value.length);
  return `User_Stats!A2:${endCol}2`;
}

export function calculateLevelData(totalExp) {
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
    level: level,
    progressExp: totalExp - currentLevelBaseExp,
    nextLevelExp: expForNextLevel,
    totalExp: totalExp
  };
}

// 5. 完成任務與結算
export async function completeTask(task) {
  if (isProcessing.value) return;
  isProcessing.value = true;
  
  try {
    const currentStats = userStats.value;
    const oldLevel = parseInt(currentStats.Level) || 1;
    const oldExp = parseInt(currentStats.EXP) || 0;
    const oldGold = parseInt(currentStats.Gold) || 0;
    const oldStatPoints = parseInt(currentStats.Stat_Points) || 0;
    
    // --- 實作技能加成系統 ---
    let taskExp = parseInt(task.Base_EXP) || 0;
    let taskGold = parseInt(task.Base_Gold) || 0;

    // 黃金直覺：每次完成任務固定 +2 金幣
    const hasGoldFlat = skills.value.some(s => s.Effect_Type === 'GOLD_FLAT' && s.Is_Unlocked);
    if (hasGoldFlat) taskGold += 2;

    // 經驗汲取：每次完成任務固定 +10 EXP
    const hasExpFlat = skills.value.some(s => s.Effect_Type === 'EXP_FLAT' && s.Is_Unlocked);
    if (hasExpFlat) taskExp += 10;

    // 檢查是否解鎖 EXP_BOOST
    const hasExpBoost = skills.value.some(s => s.Effect_Type === 'EXP_BOOST' && s.Is_Unlocked);
    if (hasExpBoost) taskExp = Math.floor(taskExp * 1.1);

    // 檢查 GOLD_BOOST
    const hasGoldBoost = skills.value.some(s => s.Effect_Type === 'GOLD_BOOST' && s.Is_Unlocked);
    if (hasGoldBoost) taskGold = Math.floor(taskGold * 1.2);
    
    // 檢查 WEEKEND_BONUS
    const hasWeekendBonus = skills.value.some(s => s.Effect_Type === 'WEEKEND_BONUS' && s.Is_Unlocked);
    if (hasWeekendBonus) {
      const day = new Date().getDay();
      if (day === 0 || day === 6) { // 0=週日, 6=週六
        taskExp = Math.floor(taskExp * 1.5);
        taskGold = Math.floor(taskGold * 1.5);
      }
    }
    
    // 檢查 MORNING_BIRD
    const hasMorningBird = skills.value.some(s => s.Effect_Type === 'MORNING_BIRD' && s.Is_Unlocked);
    if (hasMorningBird) {
      const hour = new Date().getHours();
      if (hour < 10) taskGold += 20;
    }
    
    // 檢查 LUCKY_STRIKE
    let isCrit = false;
    const hasLuckyStrike = skills.value.some(s => s.Effect_Type === 'LUCKY_STRIKE' && s.Is_Unlocked);
    if (hasLuckyStrike && Math.random() < 0.1) { // 10% 機率爆擊
      taskExp *= 2;
      taskGold *= 2;
      isCrit = true;
    }
    
    // 計算新數值
    const newTotalExp = oldExp + taskExp;
    const newGold = oldGold + taskGold;
    
    const { level: newLevel } = calculateLevelData(newTotalExp);

    let newStatPoints = oldStatPoints;
    if (newLevel > oldLevel) {
      newStatPoints += (newLevel - oldLevel);
    }

    const nowIsoString = new Date().toISOString();
    const todayDate = nowIsoString.slice(0, 10); // YYYY-MM-DD

    // --- 計算連續達成 (Streak) ---
    const lastTaskDate = currentStats.Last_Task_Date || '';
    const currentStreak = parseInt(currentStats.Streak) || 0;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().slice(0, 10);

    let newStreak;
    if (lastTaskDate === todayDate) {
      newStreak = currentStreak;           // 今天已做過，不重複計算
    } else if (lastTaskDate === yesterdayDate) {
      newStreak = currentStreak + 1;       // 連續！遞增
    } else {
      newStreak = 1;                       // 中斷或首次，重置為 1
    }
    const streakBroken = lastTaskDate && lastTaskDate !== todayDate && lastTaskDate !== yesterdayDate;

    // 更新 User_Stats
    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: statsRange(),
      valueInputOption: 'USER_ENTERED',
      resource: { values: [buildStatsRow({ Level: newLevel, EXP: newTotalExp, Gold: newGold, Stat_Points: newStatPoints, Last_Login: nowIsoString, Streak: newStreak, Last_Task_Date: todayDate })] }
    });

    // 新增 Task_Logs
    await window.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Task_Logs!A:E',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[nowIsoString, task.ID, taskExp, taskGold, 'Completed']] }
    });

    // 更新本地狀態
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

    completedTaskIds.value.add(task.ID);

    return { success: true, leveledUp: newLevel > oldLevel, oldLevel, newLevel, earnedExp: taskExp, earnedGold: taskGold, isCrit, newStreak, streakBroken };
  } catch (err) {
    console.error('完成任務失敗:', err);
    return { success: false, error: err };
  } finally {
    isProcessing.value = false;
  }
}

// 6. 解鎖技能
export async function unlockSkill(skill) {
  if (isProcessing.value) return;
  
  const cost = parseInt(skill.Cost) || 0;
  const currentPoints = parseInt(userStats.value.Stat_Points) || 0;
  
  if (currentPoints < cost) {
    return { success: false, error: '能力點數不足' };
  }

  isProcessing.value = true;
  
  try {
    const newStatPoints = currentPoints - cost;
    const nowIsoString = new Date().toISOString();
    
    // 更新 User_Stats 的能力點數
    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: statsRange(),
      valueInputOption: 'USER_ENTERED',
      resource: { values: [buildStatsRow({ Stat_Points: newStatPoints, Last_Login: nowIsoString })] }
    });

    // 假設 Is_Unlocked 在 F 欄，更新 Skill_Tree 對應列的 F 欄為 TRUE
    // 欄位順序預設為: Skill_ID, Name, Description, Cost, Effect_Type, Is_Unlocked
    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Skill_Tree!F${skill._rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [['TRUE']] }
    });
    
    // 更新本地狀態
    userStats.value.Stat_Points = newStatPoints;
    const skillIndex = skills.value.findIndex(s => s.Skill_ID === skill.Skill_ID);
    if (skillIndex !== -1) {
      skills.value[skillIndex].Is_Unlocked = true;
    }
    
    return { success: true };
  } catch (err) {
    console.error('解鎖技能失敗:', err);
    return { success: false, error: err };
  } finally {
    isProcessing.value = false;
  }
}

// 7. 購買商店物品
export async function buyItem(item) {
  if (isProcessing.value) return;
  
  const currentGold = parseInt(userStats.value.Gold) || 0;

  isProcessing.value = true;
  
  try {
    let finalCost = parseInt(item.Cost) || 0;
    
    // 檢查 DISCOUNT_10 (打 9 折)
    const hasDiscount = skills.value.some(s => s.Effect_Type === 'DISCOUNT_10' && s.Is_Unlocked);
    if (hasDiscount) {
      finalCost = Math.floor(finalCost * 0.9);
    }

    if (currentGold < finalCost) {
      isProcessing.value = false;
      return { success: false, error: `金幣不足 (需要 ${finalCost} 金幣)` };
    }
    
    const newGold = currentGold - finalCost;
    const nowIsoString = new Date().toISOString();
    
    // 更新 User_Stats 的金幣
    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: statsRange(),
      valueInputOption: 'USER_ENTERED',
      resource: { values: [buildStatsRow({ Gold: newGold, Last_Login: nowIsoString })] }
    });

    // 將購買紀錄寫入 Task_Logs
    await window.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Task_Logs!A:E',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[nowIsoString, item.Item_ID || 'SHOP', 0, -finalCost, 'Bought']] }
    });
    
    // 更新本地狀態
    userStats.value.Gold = newGold;
    
    return { success: true };
  } catch (err) {
    console.error('購買失敗:', err);
    return { success: false, error: err };
  } finally {
    isProcessing.value = false;
  }
}

// 8. 新增任務
export async function addTask(taskData) {
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
    
    // 動態比對真實的欄位順序 (加入 trim 與忽略大小寫，防止空白字元干擾)
    let rowData = [];
    if (taskHeaders.value && taskHeaders.value.length > 0) {
      taskHeaders.value.forEach(header => {
        const cleanHeader = (header || '').trim().toLowerCase();
        if (cleanHeader === 'id') rowData.push(newTask.ID);
        else if (cleanHeader === 'title') rowData.push(newTask.Title);
        else if (cleanHeader === 'type') rowData.push(newTask.Type);
        else if (cleanHeader === 'base_exp') rowData.push(newTask.Base_EXP);
        else if (cleanHeader === 'base_gold') rowData.push(newTask.Base_Gold);
        else if (cleanHeader === 'cooldown') rowData.push(newTask.Cooldown);
        else rowData.push('');
      });
    } else {
      // 找不到標題時的預設順序
      rowData = [newTask.ID, newTask.Title, newTask.Type, newTask.Base_EXP, newTask.Base_Gold, newTask.Cooldown];
    }
    
    // 取得寫入範圍的字母 (例如有 6 個標題就是 F)
    const endColumn = taskHeaders.value.length > 0 
      ? String.fromCharCode(64 + taskHeaders.value.length) 
      : 'F';
      
    await window.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `Task_Pool!A:${endColumn}`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [rowData] }
    });
    
    // 更新本地狀態
    tasks.value.push(newTask);
    
    return { success: true };
  } catch (err) {
    console.error('新增任務失敗:', err);
    return { success: false, error: err };
  } finally {
    isProcessing.value = false;
  }
}

// 9. 新增商店物品
export async function addShopItem(itemData) {
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
    
    // 動態比對真實的欄位順序
    let rowData = [];
    if (shopHeaders.value && shopHeaders.value.length > 0) {
      shopHeaders.value.forEach(header => {
        const cleanHeader = (header || '').trim().toLowerCase();
        if (cleanHeader === 'item_id') rowData.push(newItem.Item_ID);
        else if (cleanHeader === 'name') rowData.push(newItem.Name);
        else if (cleanHeader === 'description') rowData.push(newItem.Description);
        else if (cleanHeader === 'cost') rowData.push(newItem.Cost);
        else rowData.push('');
      });
    } else {
      // 找不到標題時的預設順序
      rowData = [newItem.Item_ID, newItem.Name, newItem.Description, newItem.Cost];
    }
    
    // 取得寫入範圍的字母
    const endColumn = shopHeaders.value.length > 0 
      ? String.fromCharCode(64 + shopHeaders.value.length) 
      : 'D';
      
    await window.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `Shop_Items!A:${endColumn}`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [rowData] }
    });
    
    // 更新本地狀態
    shopItems.value.push(newItem);
    
    return { success: true };
  } catch (err) {
    console.error('新增商品失敗:', err);
    return { success: false, error: err };
  } finally {
    isProcessing.value = false;
  }
}

