# Life Game System

將日常任務遊戲化的個人生產力工具。完成現實中的任務來獲得 EXP 與金幣、升級角色、解鎖被動技能、在商店兌換獎勵。

**線上版本：** [https://water38198.github.io/LifeGameSystem/](https://water38198.github.io/LifeGameSystem/)

---

## 功能

- **任務系統** — 新增日常 / 一般任務，完成後獲得 EXP 與金幣，支援稀有度分級
- **角色成長** — EXP 累積自動升級，等級對應升級所需 EXP 遞增
- **被動技能樹** — 19 個技能，消耗能力點解鎖，影響 EXP / 金幣加乘、爆擊、訓練場獎勵等
- **獎勵商店** — 用累積金幣兌換自訂的現實獎勵
- **成就系統** — 31 個成就，涵蓋任務、等級、連續天數、技能、財富、訓練場各維度
- **訓練場** — 中英片語問答，答對獲得獎勵，支援自訂題庫
- **統計頁面** — 7 天完成趨勢圖、任務類型分布圓餅圖、歷史明細

## 技術架構

| 項目 | 技術 |
| ---- | ---- |
| 前端框架 | Vue 3 (Composition API) |
| 狀態管理 | Pinia |
| 樣式 | Tailwind CSS |
| 圖表 | ApexCharts |
| 建構工具 | Vite |
| 資料儲存 | Google Sheets API v4 |
| 登入驗證 | Google OAuth 2.0 (GSI) |
| 部署 | GitHub Pages + GitHub Actions |

## 本地開發

需要先在 [Google Cloud Console](https://console.cloud.google.com/) 建立專案並啟用 Google Sheets API，取得 OAuth Client ID 與 API Key。

```bash
# 安裝依賴
npm install

# 建立 .env 並填入金鑰
cp .env.example .env

# 啟動開發伺服器
npm run dev
```

`.env` 需要的變數：

```env
VITE_GOOGLE_CLIENT_ID=你的 OAuth Client ID
VITE_GOOGLE_API_KEY=你的 API Key
VITE_SPREADSHEET_ID=你的 Google Sheets ID
```

## Google Sheets 結構

需要建立以下工作表（Sheet）：

| 工作表名稱 | 必要欄位 |
| --------- | ------- |
| `Tasks` | ID, Title, Type, Base_EXP, Base_Gold |
| `Task_Logs` | Log_ID, Task_ID, Status, EXP, Gold, Timestamp |
| `User_Stats` | Level, EXP, Gold, Stat_Points, Streak, Last_Task_Date, Last_Login, Achievements |
| `Skills` | Skill_ID, Name, Description, Cost, Effect_Type, Is_Unlocked |
| `Shop_Items` | Item_ID, Name, Description, Cost |
| `Phrases` | Phrase_ID, Chinese, English |
