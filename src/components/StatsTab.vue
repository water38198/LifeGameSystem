<script setup>
import { computed, ref, watch } from 'vue';
import VueApexCharts from 'vue3-apexcharts';
import { storeToRefs } from 'pinia';
import { useGameStore } from '../stores/game';
import { getTypeConfig } from '../utils/taskTypes';
import { achievementDefs } from '../utils/achievements';

const store = useGameStore();
const { taskLogs, tasks, userStats, userStatsHeaders } = storeToRefs(store);

const apexchart = VueApexCharts;

const todayDateStr = new Date().toISOString().slice(0, 10);

const tierColors = {
  Daily:  '#10B981',
  Normal: '#9CA3AF',
  Rare:   '#3B82F6',
  Epic:   '#A855F7',
  Legend: '#F97316',
};

// ── 統計數值 ────────────────────────────────────
const activeStreak = computed(() => {
  const s = parseInt(userStats.value?.Streak || 0);
  if (!s) return 0;
  const last = userStats.value?.Last_Task_Date || '';
  if (!last) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (last === today || last === yesterday.toISOString().slice(0, 10)) ? s : 0;
});

const completedLogs = computed(() => taskLogs.value.filter(l => l.status === 'Completed'));
const totalCompleted  = computed(() => completedLogs.value.length);
const totalEXPEarned  = computed(() => completedLogs.value.reduce((s, l) => s + l.exp, 0));
const totalGoldEarned = computed(() => completedLogs.value.reduce((s, l) => s + l.gold, 0));

// ── 長條圖（7 天）──────────────────────────────
const last7DaysData = computed(() =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const count = completedLogs.value.filter(l => l.timestamp.slice(0, 10) === dateStr).length;
    return { date: dateStr, count, label: i === 6 ? '今天' : `${d.getMonth() + 1}/${d.getDate()}` };
  })
);

const barSeries = computed(() => [{ name: '完成任務數', data: last7DaysData.value.map(d => d.count) }]);

const barOptions = computed(() => ({
  chart: { type: 'bar', background: 'transparent', toolbar: { show: false } },
  theme: { mode: 'light' },
  colors: last7DaysData.value.map(d => d.date === todayDateStr ? '#F16F4F' : '#D6D3D1'),
  plotOptions: { bar: { borderRadius: 4, columnWidth: '55%', distributed: true } },
  dataLabels: { enabled: false },
  legend: { show: false },
  grid: { borderColor: '#E7E5E4', strokeDashArray: 3, yaxis: { lines: { show: true } }, xaxis: { lines: { show: false } } },
  xaxis: {
    categories: last7DaysData.value.map(d => d.label),
    labels: { style: { colors: '#78716C', fontSize: '12px' } },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    min: 0,
    tickAmount: 4,
    labels: { style: { colors: '#78716C', fontSize: '12px' } },
  },
  tooltip: { theme: 'light', y: { formatter: val => `${val} 個任務` } },
}));

// ── 甜甜圈（類型分布）─────────────────────────
const typeDistribution = computed(() => {
  const count = {};
  completedLogs.value.forEach(log => {
    const type = tasks.value.find(t => t.ID === log.taskId)?.Type || 'Daily';
    count[type] = (count[type] || 0) + 1;
  });
  return Object.entries(count)
    .sort((a, b) => b[1] - a[1])
    .map(([type, cnt]) => ({ type, count: cnt, config: getTypeConfig(type) }));
});

const donutSeries  = computed(() => typeDistribution.value.map(i => i.count));
const donutOptions = computed(() => ({
  chart: { type: 'donut', background: 'transparent' },
  theme: { mode: 'light' },
  colors: typeDistribution.value.map(i => tierColors[i.type] || '#A8A29E'),
  labels: typeDistribution.value.map(i => i.config.label),
  dataLabels: { enabled: false },
  stroke: { colors: ['#FFFFFF'], width: 2 },
  legend: { position: 'bottom', labels: { colors: '#78716C' }, fontSize: '12px', itemMargin: { horizontal: 8 } },
  plotOptions: { pie: { donut: { size: '62%' } } },
  tooltip: { theme: 'light', y: { formatter: (val, { seriesIndex }) => `${val} 次（${typeDistribution.value[seriesIndex]?.config.label}）` } },
}));

// ── 歷史明細 ───────────────────────────────────
const filterOptions = [
  { label: '近 7 天', value: 7 },
  { label: '近 30 天', value: 30 },
  { label: '全部', value: 0 },
];
const activeFilter = ref(7);
const pageSize = 20;
const shownCount = ref(pageSize);

watch(activeFilter, () => { shownCount.value = pageSize; });

const filteredLogs = computed(() => {
  const sorted = [...completedLogs.value].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  if (activeFilter.value === 0) return sorted;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - activeFilter.value);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return sorted.filter(l => l.timestamp.slice(0, 10) >= cutoffStr);
});

const paginatedLogs = computed(() => filteredLogs.value.slice(0, shownCount.value));

const getTaskName = (taskId) => tasks.value.find(t => t.ID === taskId)?.Title || '（已刪除的任務）';
const getTaskType = (taskId) => tasks.value.find(t => t.ID === taskId)?.Type || 'Daily';

// ── 成就 ───────────────────────────────────────
const hasAchievementsColumn = computed(() => userStatsHeaders.value.includes('Achievements'));
const unlockedIds = computed(() => (userStats.value?.Achievements || '').split(',').filter(Boolean));
const unlockedCount = computed(() => unlockedIds.value.length);
const unlockedAchievements = computed(() =>
  achievementDefs.filter(a => unlockedIds.value.includes(a.id))
);
const lockedAchievements = computed(() =>
  achievementDefs.filter(a => !unlockedIds.value.includes(a.id))
);

const filterClass = (filterValue) =>
  activeFilter.value === filterValue
    ? 'bg-stone-200 text-stone-900 border-2 border-stone-500'
    : 'text-stone-400 hover:text-stone-700 border-2 border-stone-300';

const enrichedPaginatedLogs = computed(() =>
  paginatedLogs.value.map(log => {
    const typeConfig = getTypeConfig(getTaskType(log.taskId));
    return { ...log, name: getTaskName(log.taskId), typeConfig };
  })
);

const formatLogDate = (ts) => {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

// ── 習慣熱力圖（18 週，週一起始）────────────────
const heatmapWeeks = computed(() => {
  const today = new Date();
  // find most recent Monday (or today if Monday)
  const dayOfWeek = today.getDay(); // 0=Sun,1=Mon,...
  const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const lastMonday = new Date(today);
  lastMonday.setDate(today.getDate() - daysToLastMonday);

  // count completed tasks per day
  const countByDate = {};
  completedLogs.value.forEach(l => {
    const d = l.timestamp.slice(0, 10);
    countByDate[d] = (countByDate[d] || 0) + 1;
  });

  const weeks = [];
  for (let w = 17; w >= 0; w--) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(lastMonday);
      date.setDate(lastMonday.getDate() - w * 7 + d);
      const dateStr = date.toISOString().slice(0, 10);
      const isFuture = dateStr > today.toISOString().slice(0, 10);
      days.push({ dateStr, count: countByDate[dateStr] || 0, isFuture });
    }
    weeks.push(days);
  }
  return weeks;
});

const heatColor = (count, isFuture) => {
  if (isFuture) return '#E7E5E4';
  if (count === 0) return '#E7E5E4';
  if (count <= 1) return '#BBF7D0';
  if (count <= 3) return '#4ADE80';
  if (count <= 5) return '#16A34A';
  return '#14532D';
};
</script>

<template>
  <div class="p-6 space-y-5">
    <h2 class="text-lg font-serif text-stone-900 tracking-wide">冒險紀錄</h2>

    <!-- Summary cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="bg-fantasy-panel border-2 border-stone-500 sketch-panel p-4 text-center">
        <div class="text-2xl font-serif font-bold text-epic-red mb-1">{{ totalCompleted }}</div>
        <div class="text-xs text-stone-500 uppercase tracking-wider">完成總數</div>
      </div>
      <div class="bg-fantasy-panel border-2 border-stone-500 sketch-panel p-4 text-center">
        <div class="text-2xl font-serif font-bold text-tier-rare mb-1">{{ totalEXPEarned.toLocaleString() }}</div>
        <div class="text-xs text-stone-500 uppercase tracking-wider">累積 EXP</div>
      </div>
      <div class="bg-fantasy-panel border-2 border-stone-500 sketch-panel p-4 text-center">
        <div class="text-2xl font-serif font-bold text-tier-legend mb-1">{{ totalGoldEarned.toLocaleString() }}</div>
        <div class="text-xs text-stone-500 uppercase tracking-wider">累積金幣</div>
      </div>
      <div class="bg-fantasy-panel border-2 border-stone-500 sketch-panel p-4 text-center">
        <div class="text-2xl font-serif font-bold text-orange-400 mb-1">{{ activeStreak }}</div>
        <div class="text-xs text-stone-500 uppercase tracking-wider">🔥 連續天數</div>
      </div>
    </div>

    <!-- Charts -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div class="bg-fantasy-panel border-2 border-stone-500 sketch-panel p-5">
        <p class="text-sm font-serif text-stone-500 mb-2 uppercase tracking-wider">近 7 天完成任務數</p>
        <apexchart type="bar" height="200" :options="barOptions" :series="barSeries" />
      </div>
      <div class="bg-fantasy-panel border-2 border-stone-500 sketch-panel p-5 flex flex-col">
        <p class="text-sm font-serif text-stone-500 mb-2 uppercase tracking-wider">任務類型分布</p>
        <div v-if="donutSeries.length === 0" class="flex-1 flex items-center justify-center text-stone-400 text-sm">尚無完成任務紀錄</div>
        <apexchart v-else type="donut" height="200" :options="donutOptions" :series="donutSeries" />
      </div>
    </div>

    <!-- Habit heatmap -->
    <div class="bg-fantasy-panel border-2 border-stone-500 sketch-panel p-5">
      <div class="flex items-center justify-between mb-3">
        <p class="text-sm font-serif text-stone-500 uppercase tracking-wider">習慣熱力圖</p>
        <div class="flex items-center gap-1.5 text-xs text-stone-400">
          <span>少</span>
          <span v-for="c in ['#E7E5E4','#BBF7D0','#4ADE80','#16A34A','#14532D']" :key="c"
                class="w-3 h-3 rounded-sm" :style="{ background: c }"></span>
          <span>多</span>
        </div>
      </div>
      <div class="flex gap-1 overflow-x-auto pb-1">
        <div v-for="(week, wi) in heatmapWeeks" :key="wi" class="flex flex-col gap-1 shrink-0">
          <div v-for="day in week" :key="day.dateStr"
               class="w-3.5 h-3.5 rounded-sm transition-colors"
               :style="{ background: heatColor(day.count, day.isFuture) }"
               :title="`${day.dateStr}：${day.isFuture ? '' : day.count + ' 個任務'}`"></div>
        </div>
      </div>
      <div class="flex justify-between text-xs text-stone-400 mt-1">
        <span>18 週前</span><span>今天</span>
      </div>
    </div>

    <!-- Achievements -->
    <div class="bg-fantasy-panel border-2 border-stone-500 sketch-panel">
      <div class="px-5 py-3 border-b-2 border-stone-400 flex items-center justify-between">
        <p class="text-sm font-serif text-stone-500 uppercase tracking-wider">成就</p>
        <span class="text-xs text-stone-400">{{ unlockedCount }} / {{ achievementDefs.length }} 已解鎖</span>
      </div>
      <div v-if="!hasAchievementsColumn" class="px-5 py-3 text-xs text-yellow-700 bg-yellow-50 border-b border-stone-100">
        提示：請在 Google Sheets 的 User_Stats 新增 <span class="font-mono bg-stone-100 px-1 rounded">Achievements</span> 欄位以啟用獎勵與持久化功能。
      </div>

      <!-- 已達成 -->
      <template v-if="unlockedAchievements.length > 0">
        <div class="px-5 py-2 bg-stone-50 border-b-2 border-stone-400 flex items-center gap-2">
          <span class="text-xs text-tier-legend font-serif uppercase tracking-wider">已達成</span>
          <span class="text-xs text-stone-400">{{ unlockedAchievements.length }}</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 border-b border-stone-100">
          <div v-for="ach in unlockedAchievements" :key="ach.id"
               class="flex items-start gap-3 p-4 border-b border-r border-stone-100 last:border-b-0">
            <div class="text-2xl shrink-0 leading-none mt-0.5">{{ ach.icon }}</div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-0.5">
                <p class="text-sm font-serif font-bold text-stone-900 truncate">{{ ach.name }}</p>
                <span class="text-tier-legend text-xs shrink-0">✓</span>
              </div>
              <p class="text-xs text-stone-500 leading-relaxed mb-1">{{ ach.desc }}</p>
              <div class="flex gap-2 text-xs">
                <span v-if="ach.rewardEXP"  class="text-epic-red">+{{ ach.rewardEXP }} EXP</span>
                <span v-if="ach.rewardGold" class="text-tier-legend">+{{ ach.rewardGold }} 金</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 未達成 -->
      <template v-if="lockedAchievements.length > 0">
        <div class="px-5 py-2 bg-stone-50 border-b-2 border-stone-400 flex items-center gap-2">
          <span class="text-xs text-stone-400 font-serif uppercase tracking-wider">未達成</span>
          <span class="text-xs text-stone-400">{{ lockedAchievements.length }}</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 opacity-40">
          <div v-for="ach in lockedAchievements" :key="ach.id"
               class="flex items-start gap-3 p-4 border-b border-r border-stone-100 last:border-b-0">
            <div class="text-2xl shrink-0 leading-none mt-0.5">{{ ach.icon }}</div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-serif font-bold text-stone-500 truncate mb-0.5">{{ ach.name }}</p>
              <p class="text-xs text-stone-400 leading-relaxed mb-1">{{ ach.desc }}</p>
              <div class="flex gap-2 text-xs">
                <span v-if="ach.rewardEXP"  class="text-epic-red">+{{ ach.rewardEXP }} EXP</span>
                <span v-if="ach.rewardGold" class="text-tier-legend">+{{ ach.rewardGold }} 金</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- History detail -->
    <div class="bg-fantasy-panel border-2 border-stone-500 sketch-panel">
      <div class="px-5 py-3 border-b-2 border-stone-400 flex items-center justify-between flex-wrap gap-2">
        <p class="text-sm font-serif text-stone-500 uppercase tracking-wider">歷史明細</p>
        <div class="flex gap-1">
          <button v-for="f in filterOptions" :key="f.value" @click="activeFilter = f.value"
                  :class="['px-3 py-1 text-xs sketch-btn transition-colors', filterClass(f.value)]">
            {{ f.label }}
          </button>
        </div>
      </div>

      <div class="divide-y divide-stone-100">
        <div v-if="filteredLogs.length === 0" class="text-center text-stone-400 text-sm py-10">此期間沒有紀錄</div>
        <div v-for="log in enrichedPaginatedLogs" :key="log.timestamp + log.taskId"
             class="flex items-center gap-3 px-5 py-3.5 hover:bg-stone-50 transition-colors">
          <div class="text-xs text-stone-400 shrink-0 w-24">{{ formatLogDate(log.timestamp) }}</div>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-stone-700 truncate">{{ log.name }}</p>
          </div>
          <span :class="['text-xs px-1.5 py-0.5 sketch-sm border-[1.5px] border-stone-400 bg-stone-50 shrink-0', log.typeConfig.textClass]">
            {{ log.typeConfig.label }}
          </span>
          <div class="flex gap-3 shrink-0 text-xs">
            <span class="text-epic-red">+{{ log.exp }} EXP</span>
            <span class="text-tier-legend">+{{ log.gold }} 金</span>
          </div>
        </div>
      </div>

      <div v-if="filteredLogs.length > pageSize" class="px-5 py-3 border-t border-stone-100 text-center">
        <button v-if="shownCount < filteredLogs.length" @click="shownCount += pageSize"
                class="text-xs text-stone-400 hover:text-stone-700 transition-colors">
          顯示更多（剩餘 {{ filteredLogs.length - shownCount }} 筆）
        </button>
        <span v-else class="text-xs text-stone-400">已顯示全部 {{ filteredLogs.length }} 筆</span>
      </div>
    </div>
  </div>
</template>
