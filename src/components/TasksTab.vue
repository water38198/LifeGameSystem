<template>
  <div class="p-6 space-y-4">

    <div class="flex justify-between items-center">
      <h2 class="text-lg font-serif text-white tracking-wide">冒險公會佈告欄</h2>
      <button @click="showTaskForm = true" class="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white rounded transition-colors">
        ➕ 新任務
      </button>
    </div>

    <!-- Add task modal -->
    <Teleport to="body">
      <div v-if="showTaskForm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4" @click.self="showTaskForm = false">
        <div class="bg-fantasy-panel border border-epic-red/60 shadow-[0_0_40px_rgba(241,111,79,0.25)] rounded-lg w-full max-w-md">
          <div class="flex items-center justify-between px-5 py-4 border-b border-gray-700/50">
            <p class="text-epic-red font-serif tracking-wide">發佈新委託</p>
            <button @click="showTaskForm = false" class="text-gray-500 hover:text-white transition-colors text-lg leading-none">✕</button>
          </div>
          <div class="p-5 space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div class="col-span-2">
                <label class="block text-xs text-gray-400 mb-1">任務名稱</label>
                <input v-model="newTask.Title" type="text" placeholder="例如：跑步 3 公里" class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:border-epic-red focus:outline-none">
              </div>
              <div>
                <label class="block text-xs text-gray-400 mb-1">稀有度</label>
                <select v-model="newTask.Type" class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:border-epic-red focus:outline-none appearance-none">
                  <option v-for="type in typeConfigs" :key="type.id" :value="type.id">{{ type.label }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-gray-400 mb-1">EXP 獎勵</label>
                <input v-model.number="newTask.Base_EXP" type="number" min="0" class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:border-epic-red focus:outline-none">
              </div>
              <div>
                <label class="block text-xs text-gray-400 mb-1">金幣獎勵</label>
                <input v-model.number="newTask.Base_Gold" type="number" min="0" class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:border-epic-red focus:outline-none">
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-2 px-5 py-4 border-t border-gray-700/50">
            <button @click="showTaskForm = false" class="px-4 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">取消</button>
            <button @click="handleAddTask" :disabled="isProcessing || !newTask.Title" class="px-5 py-1.5 bg-epic-red hover:bg-red-600 text-white rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              發佈
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Two-column layout -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

      <!-- Daily column -->
      <div class="bg-fantasy-panel border border-gray-700/50 rounded overflow-hidden flex flex-col">
        <div class="px-4 py-2.5 border-b border-gray-700/50 flex items-center justify-between">
          <span class="font-serif text-sm text-tier-daily tracking-wide">☀️ 日常試煉</span>
          <span class="text-xs text-gray-600">{{ dailyTasks.length }} 個</span>
        </div>
        <div class="divide-y divide-gray-700/30 flex-1">
          <div v-if="dailyTasks.length === 0" class="text-center text-gray-600 text-sm py-10">今日沒有日常試煉</div>
          <div v-for="task in dailyTasks" :key="task.ID" class="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/20 transition-colors">
            <button
              @click="handleCompleteTask(task)"
              :disabled="isProcessing || completedTaskIds.has(task.ID)"
              :class="['w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 transition-colors disabled:cursor-not-allowed',
                       completedTaskIds.has(task.ID)
                         ? 'bg-tier-daily/20 border-tier-daily text-tier-daily'
                         : 'border-gray-600 hover:border-tier-daily hover:bg-tier-daily/10']"
            >
              <svg v-if="completedTaskIds.has(task.ID)" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </button>
            <div class="flex-1 min-w-0">
              <p :class="['text-sm leading-snug truncate', completedTaskIds.has(task.ID) ? 'line-through text-gray-500' : 'text-gray-100']">{{ task.Title }}</p>
              <div class="flex gap-2 mt-0.5">
                <span class="text-xs text-epic-red">+{{ task.Base_EXP }} EXP</span>
                <span class="text-xs text-tier-legend">+{{ task.Base_Gold }} 金</span>
              </div>
            </div>
            <span :class="['text-xs px-1.5 py-0.5 rounded border border-gray-700 bg-gray-900 shrink-0', getTypeConfig(task.Type).textClass]">{{ getTypeConfig(task.Type).label }}</span>
          </div>
        </div>
      </div>

      <!-- Other tasks column -->
      <div class="bg-fantasy-panel border border-gray-700/50 rounded overflow-hidden flex flex-col">
        <div class="px-4 py-2.5 border-b border-gray-700/50 flex items-center justify-between">
          <span class="font-serif text-sm text-white tracking-wide">📜 一般委託</span>
          <span class="text-xs text-gray-600">{{ pendingOtherTasks.length }} 個</span>
        </div>
        <div class="divide-y divide-gray-700/30 flex-1">
          <div v-if="pendingOtherTasks.length === 0" class="text-center text-gray-600 text-sm py-10">沒有待接取的委託</div>
          <div v-for="task in pendingOtherTasks" :key="task.ID" class="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/20 transition-colors">
            <button
              @click="handleCompleteTask(task)"
              :disabled="isProcessing"
              :class="['w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 transition-colors disabled:cursor-not-allowed hover:bg-gray-700/30', getTypeConfig(task.Type).borderClass]"
            ></button>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-gray-100 leading-snug truncate">{{ task.Title }}</p>
              <div class="flex gap-2 mt-0.5">
                <span class="text-xs text-epic-red">+{{ task.Base_EXP }} EXP</span>
                <span class="text-xs text-tier-legend">+{{ task.Base_Gold }} 金</span>
              </div>
            </div>
            <span :class="['text-xs px-1.5 py-0.5 rounded border border-gray-700 bg-gray-900 shrink-0', getTypeConfig(task.Type).textClass]">{{ getTypeConfig(task.Type).label }}</span>
          </div>
        </div>
        <!-- Completed toggle -->
        <div v-if="completedOtherTasks.length > 0" class="border-t border-gray-700/50">
          <button @click="showCompletedTasks = !showCompletedTasks" class="w-full px-4 py-2 text-xs text-gray-600 hover:text-gray-400 transition-colors text-left flex items-center gap-1.5">
            <span>{{ showCompletedTasks ? '▾' : '▸' }}</span>
            <span>已達成 {{ completedOtherTasks.length }} 個</span>
          </button>
          <div v-if="showCompletedTasks" class="divide-y divide-gray-700/30 opacity-40">
            <div v-for="task in completedOtherTasks" :key="task.ID" class="flex items-center gap-3 px-4 py-2.5">
              <div class="w-6 h-6 rounded border-2 border-gray-600 bg-gray-700 flex items-center justify-center shrink-0">
                <svg class="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <p class="text-sm text-gray-500 line-through truncate flex-1">{{ task.Title }}</p>
              <span :class="['text-xs px-1.5 py-0.5 rounded border border-gray-700 bg-gray-900 shrink-0', getTypeConfig(task.Type).textClass]">{{ getTypeConfig(task.Type).label }}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { tasks, completedTaskIds, isProcessing, completeTask, addTask } from '../services/googleAuth';
import { typeConfigs, getTypeConfig } from '../utils/taskTypes';

const emit = defineEmits(['toast', 'levelUp']);

const showTaskForm = ref(false);
const showCompletedTasks = ref(false);
const newTask = ref({ Title: '', Type: 'Daily', Base_EXP: 50, Base_Gold: 5 });

const dailyTasks = computed(() =>
  tasks.value.filter(t => t.Type?.toLowerCase() === 'daily')
);
const pendingOtherTasks = computed(() =>
  tasks.value.filter(t => (!t.Type || t.Type.toLowerCase() !== 'daily') && !completedTaskIds.value.has(t.ID))
);
const completedOtherTasks = computed(() =>
  tasks.value.filter(t => (!t.Type || t.Type.toLowerCase() !== 'daily') && completedTaskIds.value.has(t.ID))
);

const handleCompleteTask = async (task) => {
  const result = await completeTask(task);
  if (!result?.success) { emit('toast', '連線至世界樹失敗，請確認網路或 API 權限。'); return; }
  if (result.leveledUp) {
    emit('levelUp');
  } else {
    let msg = result.isCrit
      ? `🔥 幸運爆擊！獲得雙倍獎勵：${result.earnedExp} 經驗與 ${result.earnedGold} 金幣！`
      : `已完成「${task.Title}」，獲得 ${result.earnedExp} 經驗與 ${result.earnedGold} 金幣！`;
    if (result.newStreak > 1 && !result.streakBroken) msg += ` 🔥 連續第 ${result.newStreak} 天！`;
    emit('toast', msg);
  }
};

const handleAddTask = async () => {
  const result = await addTask(newTask.value);
  if (result?.success) {
    emit('toast', `新任務「${newTask.value.Title}」發佈成功！`);
    showTaskForm.value = false;
    newTask.value = { Title: '', Type: 'Daily', Base_EXP: 50, Base_Gold: 5 };
  } else {
    emit('toast', '發佈任務失敗，請稍後再試。');
  }
};
</script>
