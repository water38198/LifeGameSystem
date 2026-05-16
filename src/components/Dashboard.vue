<script setup>
import { ref, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useGameStore } from '../stores/game';
import { calculateLevelData } from '../utils/levelData';
import TasksTab    from './TasksTab.vue';
import SkillsTab   from './SkillsTab.vue';
import ShopTab     from './ShopTab.vue';
import StatsTab    from './StatsTab.vue';
import TrainingTab from './TrainingTab.vue';

const store = useGameStore();
const { userStats, loginBonus, achievementQueue, isLoading } = storeToRefs(store);

const currentTab  = ref('tasks');
const toastMessage = ref('');
const showLevelUp  = ref(false);

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

const tabClass = (tab, activeText) => {
  const base = 'px-4 py-1.5 text-sm flex items-center gap-1.5 shrink-0 whitespace-nowrap transition-all font-sans sketch-sm';
  return currentTab.value === tab
    ? `${base} ${activeText} bg-white border-2 border-stone-500 shadow-sketch-sm font-medium`
    : `${base} text-stone-500 border-2 border-transparent hover:text-stone-700 hover:bg-white/50`;
};
</script>

<template>
  <div class="min-h-screen bg-fantasy-bg text-stone-800">

    <!-- Sticky Header -->
    <header class="bg-fantasy-panel border-b-2 border-stone-500 sticky top-0 z-40">
      <div class="max-w-5xl mx-auto px-4">

        <!-- Logo -->
        <div class="flex items-center py-2.5">
          <h1 class="font-serif text-epic-red text-base tracking-widest">Life Game</h1>
        </div>

        <!-- Stats Dashboard -->
        <div class="grid grid-cols-3 gap-2 pb-3">

          <!-- Level + EXP (full width) -->
          <div class="col-span-3 bg-stone-50 sketch-sm border-[1.5px] border-stone-400 px-4 py-2.5 flex items-center gap-3">
            <div class="w-10 h-10 rounded-full border-2 border-epic-red bg-white flex items-center justify-center shrink-0">
              <span class="font-serif font-bold text-epic-red text-base leading-none">{{ userStats?.Level || 1 }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex justify-between text-xs mb-1">
                <span class="text-stone-400 font-serif tracking-wide">Lv.{{ userStats?.Level || 1 }} · EXP</span>
                <span class="text-epic-red font-medium">{{ levelData.progressExp }} / {{ levelData.nextLevelExp }}</span>
              </div>
              <div class="h-2 bg-stone-200 sketch-sm overflow-hidden">
                <div class="h-full bg-epic-red transition-all duration-1000" :style="{ width: expPercentage }"></div>
              </div>
            </div>
          </div>

          <!-- Gold -->
          <div class="bg-stone-50 sketch-sm border-[1.5px] border-amber-400 px-3 py-2.5 text-center">
            <div class="text-2xl font-bold font-serif text-tier-legend leading-tight">{{ userStats?.Gold || 0 }}</div>
            <div class="text-xs text-stone-400 mt-0.5">💰 金幣</div>
          </div>

          <!-- Streak -->
          <div class="bg-stone-50 sketch-sm border-[1.5px] border-orange-300 px-3 py-2.5 text-center">
            <div class="text-2xl font-bold font-serif leading-tight" :class="activeStreak > 0 ? 'text-orange-500' : 'text-stone-400'">{{ activeStreak }}</div>
            <div class="text-xs text-stone-400 mt-0.5">🔥 連續天</div>
          </div>

          <!-- Stat Points -->
          <div class="bg-stone-50 sketch-sm border-[1.5px] border-blue-300 px-3 py-2.5 text-center">
            <div class="text-2xl font-bold font-serif text-tier-rare leading-tight">{{ userStats?.Stat_Points || 0 }}</div>
            <div class="text-xs text-stone-400 mt-0.5">🔷 能力點</div>
          </div>

        </div>

        <!-- Tab navigation -->
        <nav class="flex overflow-x-auto gap-1.5 py-2">
          <button @click="currentTab = 'tasks'"    :class="tabClass('tasks',    'text-epic-red')">    ⚔️ 任務</button>
          <button @click="currentTab = 'skills'"   :class="tabClass('skills',   'text-tier-epic')">   🔮 技能</button>
          <button @click="currentTab = 'shop'"     :class="tabClass('shop',     'text-tier-legend')"> 🛒 商店</button>
          <button @click="currentTab = 'stats'"    :class="tabClass('stats',    'text-tier-rare')">   📊 統計</button>
          <button @click="currentTab = 'training'" :class="tabClass('training', 'text-cyan-500')">    📖 訓練場</button>
        </nav>

      </div>
    </header>

    <!-- Toast -->
    <div v-if="toastMessage" class="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-white border-2 border-epic-red px-5 py-2.5 sketch-panel flex items-center gap-3 whitespace-nowrap">
      <span class="text-epic-red">✨</span>
      <span class="text-stone-900 text-sm">{{ toastMessage }}</span>
    </div>

    <!-- Achievement Modal -->
    <div v-if="currentAchievement && !showLevelUp" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div class="bg-fantasy-panel border-2 border-tier-legend p-8 sketch-panel max-w-sm w-full mx-4 text-center">
        <div class="text-5xl mb-3">{{ currentAchievement.icon }}</div>
        <p class="text-xs text-tier-legend uppercase tracking-widest mb-2 font-serif">成就解鎖</p>
        <h2 class="text-2xl font-serif text-stone-900 mb-2">{{ currentAchievement.name }}</h2>
        <p class="text-stone-500 text-sm mb-4">{{ currentAchievement.desc }}</p>
        <div class="flex justify-center gap-4 mb-6 text-sm">
          <span v-if="currentAchievement.rewardEXP"  class="text-epic-red">+{{ currentAchievement.rewardEXP }} EXP</span>
          <span v-if="currentAchievement.rewardGold" class="text-tier-legend">+{{ currentAchievement.rewardGold }} 金幣</span>
        </div>
        <button @click="dismissAchievement" class="px-6 py-2 bg-transparent border-2 border-tier-legend text-tier-legend hover:bg-tier-legend hover:text-white sketch-btn transition-colors font-serif uppercase tracking-wider">
          繼續旅程
        </button>
      </div>
    </div>

    <!-- Level Up Modal -->
    <div v-if="showLevelUp" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div class="bg-fantasy-panel border-2 border-tier-legend p-8 sketch-panel max-w-sm w-full text-center">
        <h2 class="text-4xl font-serif text-tier-legend mb-2 tracking-widest">LEVEL UP!</h2>
        <p class="text-stone-600 mb-6">力量湧現，您已達到等級 <span class="text-stone-900 font-bold text-xl">{{ userStats?.Level }}</span></p>
        <button @click="showLevelUp = false" class="px-6 py-2 bg-transparent border-2 border-tier-legend text-tier-legend hover:bg-tier-legend hover:text-white sketch-btn transition-colors font-serif uppercase tracking-wider">
          繼續旅程
        </button>
      </div>
    </div>

    <!-- Main content -->
    <main class="max-w-5xl mx-auto relative">
      <div v-if="isLoading" class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-fantasy-bg/80 backdrop-blur-sm min-h-64">
        <div class="w-8 h-8 border-2 border-epic-red border-t-transparent rounded-full animate-spin mb-3"></div>
        <p class="text-stone-500 text-sm font-serif tracking-wide">載入冒險資料中...</p>
      </div>
      <TasksTab    v-if="currentTab === 'tasks'"    @toast="showToast" @levelUp="showLevelUp = true" />
      <SkillsTab   v-if="currentTab === 'skills'"   @toast="showToast" />
      <ShopTab     v-if="currentTab === 'shop'"     @toast="showToast" />
      <StatsTab    v-if="currentTab === 'stats'" />
      <TrainingTab v-if="currentTab === 'training'" @toast="showToast" />
    </main>

  </div>
</template>

<style>
.animate-fade-in-down {
  animation: fadeInDown 0.25s ease-out forwards;
}
@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
