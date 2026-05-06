<template>
  <aside class="hidden md:flex md:flex-col w-60 shrink-0 bg-fantasy-panel border-r border-gray-700/50 md:sticky md:top-0 md:h-screen md:overflow-y-auto">

    <!-- Logo -->
    <div class="px-5 py-4 border-b border-gray-700/50">
      <h1 class="font-serif text-epic-red text-lg tracking-widest">Life Game</h1>
      <p class="text-xs text-gray-600 mt-0.5">上次登入：{{ formatDate(userStats?.Last_Login) }}</p>
    </div>

    <!-- Character -->
    <div class="px-5 py-4 border-b border-gray-700/50 space-y-3">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 rounded-full border-2 border-epic-red flex items-center justify-center bg-gray-800 shadow-[0_0_12px_rgba(241,111,79,0.3)] relative shrink-0">
          <div v-if="isProcessing" class="absolute inset-0 rounded-full border-2 border-tier-legend animate-ping opacity-40"></div>
          <span class="font-serif text-base font-bold text-epic-red z-10">{{ userStats?.Level || 1 }}</span>
        </div>
        <div>
          <div class="text-white font-serif text-sm">等級 {{ userStats?.Level || 1 }}</div>
          <div class="text-xs text-gray-500">英雄</div>
        </div>
      </div>
      <div>
        <div class="flex justify-between text-xs mb-1">
          <span class="text-gray-500">EXP</span>
          <span class="text-epic-red font-medium">{{ levelData.progressExp }} / {{ levelData.nextLevelExp }}</span>
        </div>
        <div class="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div class="h-full bg-epic-red transition-all duration-1000 shadow-[0_0_6px_rgba(241,111,79,0.6)]" :style="{ width: expPercentage }"></div>
        </div>
        <div class="text-right text-xs text-gray-600 mt-0.5">總計 {{ userStats?.EXP || 0 }}</div>
      </div>
    </div>

    <!-- Stats -->
    <div class="px-4 py-3 border-b border-gray-700/50 grid grid-cols-3 gap-1.5">
      <div class="bg-gray-800/50 rounded p-2 text-center">
        <div class="text-tier-legend font-bold text-base font-serif">{{ userStats?.Gold || 0 }}</div>
        <div class="text-xs text-gray-600 mt-0.5">金幣</div>
      </div>
      <div class="bg-gray-800/50 rounded p-2 text-center">
        <div class="text-tier-rare font-bold text-base font-serif">{{ userStats?.Stat_Points || 0 }}</div>
        <div class="text-xs text-gray-600 mt-0.5">能力點</div>
      </div>
      <div class="bg-gray-800/50 rounded p-2 text-center">
        <div :class="['font-bold text-base font-serif', activeStreak > 0 ? 'text-orange-400' : 'text-gray-600']">{{ activeStreak }}</div>
        <div class="text-xs text-gray-600 mt-0.5">🔥 連續</div>
      </div>
    </div>

    <!-- Nav -->
    <nav class="px-3 py-3 flex flex-col gap-0.5">
      <button @click="$emit('update:currentTab', 'tasks')"  :class="navClass('tasks',  'text-epic-red',    'border-epic-red',    'bg-epic-red/10')">  <span>🗡️</span><span>任務</span></button>
      <button @click="$emit('update:currentTab', 'skills')" :class="navClass('skills', 'text-tier-epic',   'border-tier-epic',   'bg-tier-epic/10')"> <span>🔮</span><span>技能</span></button>
      <button @click="$emit('update:currentTab', 'shop')"   :class="navClass('shop',   'text-tier-legend', 'border-tier-legend', 'bg-tier-legend/10')"><span>🛒</span><span>商店</span></button>
      <button @click="$emit('update:currentTab', 'stats')"    :class="navClass('stats',    'text-tier-rare', 'border-tier-rare',  'bg-tier-rare/10')">  <span>📊</span><span>統計</span></button>
      <button @click="$emit('update:currentTab', 'training')" :class="navClass('training', 'text-cyan-400',  'border-cyan-400',   'bg-cyan-400/10')">   <span>📖</span><span>訓練場</span></button>
    </nav>

  </aside>
</template>

<script setup>
import { computed } from 'vue';
import { userStats, isProcessing, calculateLevelData } from '../services/googleAuth';

const props = defineProps({ currentTab: String });
defineEmits(['update:currentTab']);

const levelData = computed(() => calculateLevelData(parseInt(userStats.value?.EXP || 0)));
const expPercentage = computed(() => {
  const { progressExp, nextLevelExp } = levelData.value;
  return Math.min(100, (progressExp / nextLevelExp) * 100) + '%';
});
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
const formatDate = (dateStr) => {
  if (!dateStr) return '未知';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('zh-TW');
};
const navClass = (tab, activeText, activeBorder, activeBg) => {
  const base = 'flex items-center gap-3 px-4 py-2 rounded text-left transition-colors text-sm w-full font-sans';
  return props.currentTab === tab
    ? `${base} ${activeText} ${activeBg} border-l-2 ${activeBorder} pl-3.5`
    : `${base} text-gray-400 hover:text-white hover:bg-gray-800/60`;
};
</script>
