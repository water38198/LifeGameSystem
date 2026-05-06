<template>
  <div class="min-h-screen bg-fantasy-bg text-gray-200">

    <!-- Mobile top bar -->
    <header class="md:hidden fixed top-0 inset-x-0 z-40 bg-fantasy-panel border-b border-gray-700/50">
      <div class="flex items-center justify-between px-4 py-2.5">
        <h1 class="font-serif text-epic-red text-base tracking-widest">Life Game</h1>
        <div class="flex items-center gap-3 text-xs">
          <span class="font-serif font-bold text-white">Lv.{{ userStats?.Level || 1 }}</span>
          <span class="text-tier-legend">{{ userStats?.Gold || 0 }} 金</span>
          <span class="text-tier-rare">{{ userStats?.Stat_Points || 0 }} 點</span>
          <span :class="mobileStreak > 0 ? 'text-orange-400' : 'text-gray-600'">🔥 {{ mobileStreak }}</span>
        </div>
      </div>
      <div class="h-0.5 bg-gray-800">
        <div class="h-full bg-epic-red transition-all duration-1000" :style="{ width: mobileExpPercentage }"></div>
      </div>
    </header>

    <!-- Toast -->
    <div v-if="toastMessage" class="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 border border-epic-red px-5 py-2.5 rounded shadow-[0_0_20px_rgba(241,111,79,0.4)] flex items-center gap-3 whitespace-nowrap">
      <span class="text-epic-red">✨</span>
      <span class="text-white text-sm font-sans">{{ toastMessage }}</span>
    </div>

    <!-- Achievement Modal -->
    <div v-if="currentAchievement && !showLevelUp" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div class="bg-fantasy-panel border-2 border-tier-legend p-8 rounded-lg shadow-[0_0_50px_rgba(249,115,22,0.3)] max-w-sm w-full mx-4 text-center">
        <div class="text-5xl mb-3">{{ currentAchievement.icon }}</div>
        <p class="text-xs text-tier-legend uppercase tracking-widest mb-2 font-serif">成就解鎖</p>
        <h2 class="text-2xl font-serif text-white mb-2">{{ currentAchievement.name }}</h2>
        <p class="text-gray-400 text-sm mb-4">{{ currentAchievement.desc }}</p>
        <div class="flex justify-center gap-4 mb-6 text-sm">
          <span v-if="currentAchievement.rewardEXP"  class="text-epic-red">+{{ currentAchievement.rewardEXP }} EXP</span>
          <span v-if="currentAchievement.rewardGold" class="text-tier-legend">+{{ currentAchievement.rewardGold }} 金幣</span>
        </div>
        <button @click="dismissAchievement" class="px-6 py-2 bg-transparent border border-tier-legend text-tier-legend hover:bg-tier-legend hover:text-white rounded transition-colors font-serif uppercase tracking-wider">
          繼續旅程
        </button>
      </div>
    </div>

    <!-- Level Up Modal -->
    <div v-if="showLevelUp" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div class="bg-fantasy-panel border-2 border-tier-legend p-8 rounded-lg shadow-[0_0_50px_rgba(249,115,22,0.4)] max-w-sm w-full text-center">
        <h2 class="text-4xl font-serif text-tier-legend mb-2 tracking-widest">LEVEL UP!</h2>
        <p class="text-gray-300 font-sans mb-6">力量湧現，您已達到等級 <span class="text-white font-bold text-xl">{{ userStats?.Level }}</span></p>
        <button @click="showLevelUp = false" class="px-6 py-2 bg-transparent border border-tier-legend text-tier-legend hover:bg-tier-legend hover:text-white rounded transition-colors font-serif uppercase tracking-wider">
          繼續旅程
        </button>
      </div>
    </div>

    <div class="flex md:min-h-screen max-w-7xl mx-auto w-full">

      <AppSidebar :currentTab="currentTab" @update:currentTab="currentTab = $event" />

      <main class="flex-1 overflow-y-auto pt-12 pb-20 md:pt-0 md:pb-0">
        <TasksTab    v-if="currentTab === 'tasks'"    @toast="showToast" @levelUp="showLevelUp = true" />
        <SkillsTab   v-if="currentTab === 'skills'"   @toast="showToast" />
        <ShopTab     v-if="currentTab === 'shop'"     @toast="showToast" />
        <StatsTab    v-if="currentTab === 'stats'" />
        <TrainingTab v-if="currentTab === 'training'" @toast="showToast" />
      </main>

    </div>

    <!-- Mobile bottom nav -->
    <nav class="md:hidden fixed bottom-0 inset-x-0 z-40 bg-fantasy-panel border-t border-gray-700/50 flex">
      <button @click="currentTab = 'tasks'"  :class="['flex-1 py-2.5 flex flex-col items-center gap-0.5 transition-colors', currentTab === 'tasks'  ? 'text-epic-red'    : 'text-gray-500']"><span class="text-xl leading-none">🗡️</span><span class="text-[10px]">任務</span></button>
      <button @click="currentTab = 'skills'" :class="['flex-1 py-2.5 flex flex-col items-center gap-0.5 transition-colors', currentTab === 'skills' ? 'text-tier-epic'   : 'text-gray-500']"><span class="text-xl leading-none">🔮</span><span class="text-[10px]">技能</span></button>
      <button @click="currentTab = 'shop'"   :class="['flex-1 py-2.5 flex flex-col items-center gap-0.5 transition-colors', currentTab === 'shop'   ? 'text-tier-legend' : 'text-gray-500']"><span class="text-xl leading-none">🛒</span><span class="text-[10px]">商店</span></button>
      <button @click="currentTab = 'stats'"    :class="['flex-1 py-2.5 flex flex-col items-center gap-0.5 transition-colors', currentTab === 'stats'    ? 'text-tier-rare' : 'text-gray-500']"><span class="text-xl leading-none">📊</span><span class="text-[10px]">統計</span></button>
      <button @click="currentTab = 'training'" :class="['flex-1 py-2.5 flex flex-col items-center gap-0.5 transition-colors', currentTab === 'training' ? 'text-cyan-400' : 'text-gray-500']"><span class="text-xl leading-none">📖</span><span class="text-[10px]">訓練場</span></button>
    </nav>

  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { userStats, calculateLevelData, loginBonus, achievementQueue } from '../services/googleAuth';
import AppSidebar   from './AppSidebar.vue';
import TasksTab    from './TasksTab.vue';
import SkillsTab   from './SkillsTab.vue';
import ShopTab     from './ShopTab.vue';
import StatsTab    from './StatsTab.vue';
import TrainingTab from './TrainingTab.vue';

const currentTab  = ref('tasks');
const toastMessage = ref('');
const showLevelUp  = ref(false);

const mobileStreak = computed(() => {
  const s = parseInt(userStats.value?.Streak || 0);
  if (!s) return 0;
  const last = userStats.value?.Last_Task_Date || '';
  if (!last) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (last === today || last === yesterday.toISOString().slice(0, 10)) ? s : 0;
});

const mobileExpPercentage = computed(() => {
  const { progressExp, nextLevelExp } = calculateLevelData(parseInt(userStats.value?.EXP || 0));
  return Math.min(100, (progressExp / nextLevelExp) * 100) + '%';
});

watch(loginBonus, (bonus) => {
  if (bonus) showToast(`命運的齒輪轉動了！神秘金幣 +${bonus.gold} 枚已入帳！`);
});

const currentAchievement = computed(() => achievementQueue.value[0] || null);
const dismissAchievement = () => { achievementQueue.value = achievementQueue.value.slice(1); };

let toastTimer = null;
const showToast = (message) => {
  toastMessage.value = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastMessage.value = ''; }, 3000);
};
</script>

<style>
.animate-fade-in-down {
  animation: fadeInDown 0.25s ease-out forwards;
}
@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
