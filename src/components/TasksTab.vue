<script setup>
import { ref, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useGameStore } from '../stores/game';
import { typeConfigs, getTypeConfig } from '../utils/taskTypes';

const store = useGameStore();
const { tasks, taskLogs, completedTaskIds, isProcessing } = storeToRefs(store);
const { completeTask, addTask, updateTask, deleteTask } = store;

const todayStr = new Date().toISOString().slice(0, 10);

const todayCompletedLogs = computed(() =>
  taskLogs.value.filter(l => l.status === 'Completed' && l.timestamp.slice(0, 10) === todayStr)
);
const todayDailyLogs = computed(() =>
  todayCompletedLogs.value.filter(l => tasks.value.find(t => t.ID === l.taskId)?.Type?.toLowerCase() === 'daily')
);
const todayOtherLogs = computed(() =>
  todayCompletedLogs.value.filter(l => tasks.value.find(t => t.ID === l.taskId)?.Type?.toLowerCase() !== 'daily')
);
const todayDailyCompleted = computed(() => dailyTasks.value.filter(t => completedTaskIds.value.has(t.ID)).length);
const todayDailyEXP  = computed(() => todayDailyLogs.value.reduce((s, l) => s + l.exp, 0));
const todayDailyGold = computed(() => todayDailyLogs.value.reduce((s, l) => s + l.gold, 0));
const todayOtherEXP  = computed(() => todayOtherLogs.value.reduce((s, l) => s + l.exp, 0));
const todayOtherGold = computed(() => todayOtherLogs.value.reduce((s, l) => s + l.gold, 0));

const emit = defineEmits(['toast', 'levelUp']);

const showTaskForm = ref(false);
const showCompletedTasks = ref(false);
const newTask = ref({ Title: '', Type: 'Daily', Base_EXP: 50, Base_Gold: 5 });

const TYPE_DEFAULTS = {
  Daily:  { Base_EXP: 50,  Base_Gold: 25  },
  Normal: { Base_EXP: 80,  Base_Gold: 40  },
  Rare:   { Base_EXP: 130, Base_Gold: 65  },
  Epic:   { Base_EXP: 200, Base_Gold: 100 },
  Legend: { Base_EXP: 350, Base_Gold: 175 },
};

const confirmTarget = ref(null);
const editTarget = ref(null);
const editForm = ref({ Title: '', Type: 'Daily', Base_EXP: 50, Base_Gold: 5 });
const deleteTarget = ref(null);

watch(() => newTask.value.Type, (type) => {
  const d = TYPE_DEFAULTS[type];
  if (d) { newTask.value.Base_EXP = d.Base_EXP; newTask.value.Base_Gold = d.Base_Gold; }
});

watch(() => editForm.value.Type, (type) => {
  const d = TYPE_DEFAULTS[type];
  if (d) { editForm.value.Base_EXP = d.Base_EXP; editForm.value.Base_Gold = d.Base_Gold; }
});

const dailyTasks = computed(() =>
  tasks.value.filter(t => t.Type?.toLowerCase() === 'daily')
);
const pendingOtherTasks = computed(() =>
  tasks.value.filter(t => (!t.Type || t.Type.toLowerCase() !== 'daily') && !completedTaskIds.value.has(t.ID))
);
const completedOtherTasks = computed(() =>
  tasks.value.filter(t => (!t.Type || t.Type.toLowerCase() !== 'daily') && completedTaskIds.value.has(t.ID))
);

const openEditTask = (task) => {
  editTarget.value = task;
  editForm.value = { Title: task.Title, Type: task.Type, Base_EXP: parseInt(task.Base_EXP), Base_Gold: parseInt(task.Base_Gold) };
};

const handleConfirmComplete = async () => {
  const task = confirmTarget.value;
  confirmTarget.value = null;
  await handleCompleteTask(task);
};

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

const handleUpdateTask = async () => {
  const result = await updateTask(editTarget.value, editForm.value);
  if (result?.success) {
    emit('toast', `任務「${editForm.value.Title}」已更新。`);
    editTarget.value = null;
  } else {
    emit('toast', '更新失敗，請稍後再試。');
  }
};

const handleDeleteTask = async () => {
  const title = deleteTarget.value.Title;
  const result = await deleteTask(deleteTarget.value);
  if (result?.success) {
    emit('toast', `已移除任務「${title}」。`);
    deleteTarget.value = null;
  } else {
    emit('toast', '刪除失敗，請稍後再試。');
  }
};
</script>

<template>
  <div class="p-6 space-y-4">

    <div class="flex justify-between items-center">
      <h2 class="text-lg font-serif text-white tracking-wide">冒險公會佈告欄</h2>
      <button @click="showTaskForm = true" class="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white rounded transition-colors">
        ➕ 新任務
      </button>
    </div>

    <!-- Today's progress summary -->
    <div class="grid grid-cols-2 gap-3">
      <div class="bg-fantasy-panel border border-gray-700/50 rounded px-4 py-3 flex items-center gap-3">
        <span class="text-lg shrink-0 leading-none">☀️</span>
        <div class="flex-1 min-w-0">
          <div class="text-xs text-gray-500 mb-1">今日日常</div>
          <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span class="text-sm font-serif text-white">{{ todayDailyCompleted }} / {{ dailyTasks.length }}</span>
            <span class="text-xs text-epic-red">+{{ todayDailyEXP }} EXP</span>
            <span class="text-xs text-tier-legend">+{{ todayDailyGold }} 金</span>
          </div>
        </div>
      </div>
      <div class="bg-fantasy-panel border border-gray-700/50 rounded px-4 py-3 flex items-center gap-3">
        <span class="text-lg shrink-0 leading-none">📜</span>
        <div class="flex-1 min-w-0">
          <div class="text-xs text-gray-500 mb-1">今日委託</div>
          <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span class="text-sm font-serif text-white">{{ todayOtherLogs.length }} 個</span>
            <span class="text-xs text-epic-red">+{{ todayOtherEXP }} EXP</span>
            <span class="text-xs text-tier-legend">+{{ todayOtherGold }} 金</span>
          </div>
        </div>
      </div>
    </div>

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
          <div v-for="task in dailyTasks" :key="task.ID" class="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-700/20 transition-colors group">
            <button
              @click="confirmTarget = task"
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
                <span class="text-sm text-epic-red">+{{ task.Base_EXP }} EXP</span>
                <span class="text-sm text-tier-legend">+{{ task.Base_Gold }} 金</span>
              </div>
            </div>
            <span :class="['text-xs px-1.5 py-0.5 rounded border border-gray-700 bg-gray-900 shrink-0', getTypeConfig(task.Type).textClass]">{{ getTypeConfig(task.Type).label }}</span>
            <div class="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button @click.stop="openEditTask(task)" class="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-white rounded transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </button>
              <button @click.stop="deleteTarget = task" class="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-red-400 rounded transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
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
          <div v-for="task in pendingOtherTasks" :key="task.ID" class="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-700/20 transition-colors group">
            <button
              @click="confirmTarget = task"
              :disabled="isProcessing"
              :class="['w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 transition-colors disabled:cursor-not-allowed hover:bg-gray-700/30', getTypeConfig(task.Type).borderClass]"
            ></button>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-gray-100 leading-snug truncate">{{ task.Title }}</p>
              <div class="flex gap-2 mt-0.5">
                <span class="text-sm text-epic-red">+{{ task.Base_EXP }} EXP</span>
                <span class="text-sm text-tier-legend">+{{ task.Base_Gold }} 金</span>
              </div>
            </div>
            <span :class="['text-xs px-1.5 py-0.5 rounded border border-gray-700 bg-gray-900 shrink-0', getTypeConfig(task.Type).textClass]">{{ getTypeConfig(task.Type).label }}</span>
            <div class="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button @click.stop="openEditTask(task)" class="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-white rounded transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </button>
              <button @click.stop="deleteTarget = task" class="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-red-400 rounded transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
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

    <!-- Add task modal -->
    <Teleport to="body">
      <div v-if="showTaskForm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
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
            <button @click="handleAddTask" :disabled="isProcessing || !newTask.Title" class="px-5 py-1.5 bg-epic-red hover:bg-red-600 text-white rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">發佈</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Edit task modal -->
    <Teleport to="body">
      <div v-if="editTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
        <div class="bg-fantasy-panel border border-epic-red/60 shadow-[0_0_40px_rgba(241,111,79,0.25)] rounded-lg w-full max-w-md">
          <div class="flex items-center justify-between px-5 py-4 border-b border-gray-700/50">
            <p class="text-epic-red font-serif tracking-wide">編輯委託</p>
            <button @click="editTarget = null" class="text-gray-500 hover:text-white transition-colors text-lg leading-none">✕</button>
          </div>
          <div class="p-5 space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div class="col-span-2">
                <label class="block text-xs text-gray-400 mb-1">任務名稱</label>
                <input v-model="editForm.Title" type="text" class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:border-epic-red focus:outline-none">
              </div>
              <div>
                <label class="block text-xs text-gray-400 mb-1">稀有度</label>
                <select v-model="editForm.Type" class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:border-epic-red focus:outline-none appearance-none">
                  <option v-for="type in typeConfigs" :key="type.id" :value="type.id">{{ type.label }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-gray-400 mb-1">EXP 獎勵</label>
                <input v-model.number="editForm.Base_EXP" type="number" min="0" class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:border-epic-red focus:outline-none">
              </div>
              <div>
                <label class="block text-xs text-gray-400 mb-1">金幣獎勵</label>
                <input v-model.number="editForm.Base_Gold" type="number" min="0" class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:border-epic-red focus:outline-none">
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-2 px-5 py-4 border-t border-gray-700/50">
            <button @click="editTarget = null" class="px-4 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">取消</button>
            <button @click="handleUpdateTask" :disabled="isProcessing || !editForm.Title" class="px-5 py-1.5 bg-epic-red hover:bg-red-600 text-white rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">儲存</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Complete confirm modal -->
    <Teleport to="body">
      <div v-if="confirmTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
        <div class="bg-fantasy-panel border border-gray-600 rounded-lg p-6 max-w-xs w-full text-center">
          <p class="text-white font-serif mb-1">確定完成任務？</p>
          <p class="text-gray-100 text-sm font-medium mb-1">「{{ confirmTarget.Title }}」</p>
          <p class="text-gray-400 text-xs mb-5">預計獲得 <span class="text-epic-red">+{{ confirmTarget.Base_EXP }} EXP</span> 與 <span class="text-tier-legend">+{{ confirmTarget.Base_Gold }} 金幣</span></p>
          <div class="flex justify-center gap-3">
            <button @click="confirmTarget = null" class="px-4 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">取消</button>
            <button @click="handleConfirmComplete" :disabled="isProcessing" class="px-4 py-1.5 text-sm bg-tier-daily hover:bg-green-500 text-white rounded transition-colors disabled:opacity-50">確認完成</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete confirm modal -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
        <div class="bg-fantasy-panel border border-gray-600 rounded-lg p-6 max-w-xs w-full text-center">
          <p class="text-white font-serif mb-1">確定要移除？</p>
          <p class="text-gray-400 text-sm mb-5">「{{ deleteTarget.Title }}」將永久刪除</p>
          <div class="flex justify-center gap-3">
            <button @click="deleteTarget = null" class="px-4 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">取消</button>
            <button @click="handleDeleteTask" :disabled="isProcessing" class="px-4 py-1.5 text-sm bg-red-600 hover:bg-red-500 text-white rounded transition-colors disabled:opacity-50">刪除</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>
