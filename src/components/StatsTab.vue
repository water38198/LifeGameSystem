<template>
  <div class="p-6 space-y-5">
    <h2 class="text-lg font-serif text-white tracking-wide">冒險紀錄</h2>

    <!-- Summary cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="bg-fantasy-panel border border-gray-700/50 p-4 rounded text-center">
        <div class="text-2xl font-serif font-bold text-epic-red mb-1">{{ totalCompleted }}</div>
        <div class="text-xs text-gray-500 uppercase tracking-wider">完成總數</div>
      </div>
      <div class="bg-fantasy-panel border border-gray-700/50 p-4 rounded text-center">
        <div class="text-2xl font-serif font-bold text-tier-rare mb-1">{{ totalEXPEarned.toLocaleString() }}</div>
        <div class="text-xs text-gray-500 uppercase tracking-wider">累積 EXP</div>
      </div>
      <div class="bg-fantasy-panel border border-gray-700/50 p-4 rounded text-center">
        <div class="text-2xl font-serif font-bold text-tier-legend mb-1">{{ totalGoldEarned.toLocaleString() }}</div>
        <div class="text-xs text-gray-500 uppercase tracking-wider">累積金幣</div>
      </div>
      <div class="bg-fantasy-panel border border-gray-700/50 p-4 rounded text-center">
        <div class="text-2xl font-serif font-bold text-orange-400 mb-1">{{ activeStreak }}</div>
        <div class="text-xs text-gray-500 uppercase tracking-wider">🔥 連續天數</div>
      </div>
    </div>

    <!-- 7-day chart -->
    <div class="bg-fantasy-panel border border-gray-700/50 p-5 rounded">
      <p class="text-xs font-serif text-gray-400 mb-4 uppercase tracking-wider">近 7 天完成任務數</p>
      <div class="flex items-end gap-2 h-28">
        <div v-for="day in last7DaysData" :key="day.date" class="flex-1 flex flex-col items-center gap-1.5">
          <span class="text-xs text-gray-600">{{ day.count || '' }}</span>
          <div class="w-full rounded-t transition-all duration-500"
               :style="{ height: (day.count / maxDayCount * 100) + '%', minHeight: day.count > 0 ? '4px' : '0' }"
               :class="day.date === todayDateStr ? 'bg-epic-red shadow-[0_0_8px_rgba(241,111,79,0.4)]' : 'bg-gray-700'"></div>
          <span class="text-xs text-gray-600">{{ day.label }}</span>
        </div>
      </div>
    </div>

    <!-- Type distribution -->
    <div class="bg-fantasy-panel border border-gray-700/50 p-5 rounded">
      <p class="text-xs font-serif text-gray-400 mb-4 uppercase tracking-wider">任務類型分布</p>
      <div v-if="typeDistribution.length === 0" class="text-gray-600 text-sm text-center py-4">尚無完成任務紀錄</div>
      <div v-else class="space-y-3">
        <div v-for="item in typeDistribution" :key="item.type">
          <div class="flex justify-between text-xs mb-1">
            <span :class="item.config.textClass">{{ item.config.label }}</span>
            <span class="text-gray-500">{{ item.count }} 次</span>
          </div>
          <div class="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all duration-700"
                 :class="item.config.borderClass.replace('border-', 'bg-')"
                 :style="{ width: (item.count / totalCompleted * 100) + '%' }"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { taskLogs, tasks, userStats } from '../services/googleAuth';
import { getTypeConfig } from '../utils/taskTypes';

const todayDateStr = new Date().toISOString().slice(0, 10);

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
const totalCompleted = computed(() => completedLogs.value.length);
const totalEXPEarned = computed(() => completedLogs.value.reduce((s, l) => s + l.exp, 0));
const totalGoldEarned = computed(() => completedLogs.value.reduce((s, l) => s + l.gold, 0));

const last7DaysData = computed(() =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const count = completedLogs.value.filter(l => l.timestamp.slice(0, 10) === dateStr).length;
    return { date: dateStr, count, label: i === 6 ? '今天' : `${d.getMonth() + 1}/${d.getDate()}` };
  })
);

const maxDayCount = computed(() => Math.max(1, ...last7DaysData.value.map(d => d.count)));

const typeDistribution = computed(() => {
  const count = {};
  completedLogs.value.forEach(log => {
    const task = tasks.value.find(t => t.ID === log.taskId);
    const type = task?.Type || 'Daily';
    count[type] = (count[type] || 0) + 1;
  });
  return Object.entries(count)
    .sort((a, b) => b[1] - a[1])
    .map(([type, cnt]) => ({ type, count: cnt, config: getTypeConfig(type) }));
});
</script>
