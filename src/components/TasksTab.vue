<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
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

// ── 冷卻計時器 ─────────────────────────────────
const now = ref(Date.now());
const _clockTimer = setInterval(() => { now.value = Date.now(); }, 60_000);
onUnmounted(() => clearInterval(_clockTimer));

const taskCooldownInfo = (task) => {
  const hours = parseFloat(task.Cooldown || 0);
  if (!hours) return { onCooldown: false, remainingMs: 0 };
  const lastLog = taskLogs.value
    .filter(l => l.taskId === task.ID && l.status === 'Completed')
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
  if (!lastLog) return { onCooldown: false, remainingMs: 0 };
  const remaining = new Date(lastLog.timestamp).getTime() + hours * 3_600_000 - now.value;
  return remaining > 0 ? { onCooldown: true, remainingMs: remaining } : { onCooldown: false, remainingMs: 0 };
};

const formatRemaining = (ms) => {
  const mins = Math.ceil(ms / 60_000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return m > 0 ? `${h} 時 ${m} 分` : `${h} 小時`;
  return `${m} 分鐘`;
};

const cooldownMap = computed(() => {
  const m = new Map();
  for (const t of tasks.value) m.set(t.ID, taskCooldownInfo(t));
  return m;
});

const enrichedDailyTasks = computed(() =>
  dailyTasks.value.map(task => {
    const cooldown = cooldownMap.value.get(task.ID) ?? { onCooldown: false, remainingMs: 0 };
    const isDone = parseFloat(task.Cooldown || 0) > 0
      ? cooldown.onCooldown
      : completedTaskIds.value.has(task.ID);
    return {
      ...task,
      cooldown,
      isDone,
      bgClass:     stickyBg(task.Type, cooldown.onCooldown, isDone),
      stripeClass: stickyStripe(task.Type, cooldown.onCooldown, isDone),
      titleClass:  cooldown.onCooldown ? 'text-stone-500'
        : isDone ? 'text-stone-400 line-through' : 'text-stone-800',
      btnClass: cooldown.onCooldown
        ? 'border-amber-400 bg-amber-100 text-amber-600 cursor-not-allowed'
        : isDone
          ? 'border-tier-daily bg-tier-daily text-white cursor-default'
          : 'border-stone-300 bg-white/80 text-stone-400 hover:border-tier-daily hover:text-tier-daily',
    };
  })
);

const enrichedPendingOtherTasks = computed(() =>
  pendingOtherTasks.value.map(task => {
    const cooldown = cooldownMap.value.get(task.ID) ?? { onCooldown: false, remainingMs: 0 };
    return {
      ...task,
      cooldown,
      bgClass:     stickyBg(task.Type, cooldown.onCooldown, false),
      stripeClass: stickyStripe(task.Type, cooldown.onCooldown, false),
      titleClass:  cooldown.onCooldown ? 'text-stone-500' : 'text-stone-800',
      btnClass: cooldown.onCooldown
        ? 'border-amber-400 bg-amber-100 text-amber-600 cursor-not-allowed'
        : 'border-stone-300 bg-white/80 text-stone-400 hover:border-stone-500 hover:text-stone-700',
    };
  })
);

const emit = defineEmits(['toast', 'levelUp']);

const showTaskForm = ref(false);
const showCompletedTasks = ref(false);
const newTask = ref({ Title: '', Type: 'Daily', Base_EXP: 50, Base_Gold: 5, Cooldown: 0 });

const TYPE_DEFAULTS = {
  Daily:  { Base_EXP: 50,  Base_Gold: 25  },
  Normal: { Base_EXP: 80,  Base_Gold: 40  },
  Rare:   { Base_EXP: 130, Base_Gold: 65  },
  Epic:   { Base_EXP: 200, Base_Gold: 100 },
  Legend: { Base_EXP: 350, Base_Gold: 175 },
};

const confirmTarget = ref(null);
const editTarget = ref(null);
const editForm = ref({ Title: '', Type: 'Daily', Base_EXP: 50, Base_Gold: 5, Cooldown: 0 });
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
  tasks.value.filter(t => {
    if (!t.Type || t.Type.toLowerCase() === 'daily') return false;
    if (parseFloat(t.Cooldown || 0) > 0) return true;
    return !completedTaskIds.value.has(t.ID);
  })
);
const completedOtherTasks = computed(() =>
  tasks.value.filter(t =>
    (!t.Type || t.Type.toLowerCase() !== 'daily') &&
    parseFloat(t.Cooldown || 0) === 0 &&
    completedTaskIds.value.has(t.ID)
  )
);

const openEditTask = (task) => {
  editTarget.value = task;
  editForm.value = { Title: task.Title, Type: task.Type, Base_EXP: parseInt(task.Base_EXP), Base_Gold: parseInt(task.Base_Gold), Cooldown: parseFloat(task.Cooldown) || 0 };
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
    if (result.fullDailyBonus) msg += ` 🏆 全勤獎勵 +30 Gold！`;
    if (result.milestoneBonus) msg += ` 🎯 里程碑獎勵 +50 Gold！`;
    emit('toast', msg);
  }
};

const handleAddTask = async () => {
  const result = await addTask(newTask.value);
  if (result?.success) {
    emit('toast', `新任務「${newTask.value.Title}」發佈成功！`);
    showTaskForm.value = false;
    newTask.value = { Title: '', Type: 'Daily', Base_EXP: 50, Base_Gold: 5, Cooldown: 0 };
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

const stickyBg = (type, isCooldown, isDone) => {
  if (isCooldown) return 'bg-amber-50 border-amber-300';
  if (isDone)     return 'bg-stone-100 border-stone-300';
  const m = {
    Daily:  'bg-cyan-50 border-cyan-200',
    Normal: 'bg-stone-50 border-stone-300',
    Rare:   'bg-blue-50 border-blue-200',
    Epic:   'bg-purple-50 border-purple-200',
    Legend: 'bg-orange-50 border-orange-200',
  };
  return m[type] || 'bg-stone-50 border-stone-300';
};

const stickyStripe = (type, isCooldown, isDone) => {
  if (isCooldown) return 'bg-amber-400';
  if (isDone)     return 'bg-stone-400';
  const m = {
    Daily:  'bg-tier-daily',
    Normal: 'bg-tier-normal',
    Rare:   'bg-tier-rare',
    Epic:   'bg-tier-epic',
    Legend: 'bg-tier-legend',
  };
  return m[type] || 'bg-stone-400';
};
</script>

<template>
  <div class="p-4 sm:p-6 space-y-5">

    <!-- Page header -->
    <div class="flex justify-between items-center">
      <h2 class="text-lg font-serif text-stone-900 tracking-wide">冒險公會佈告欄</h2>
      <button @click="showTaskForm = true" class="px-3 py-1.5 text-xs bg-stone-100 hover:bg-stone-200 border-2 border-stone-500 text-stone-700 sketch-btn transition-colors">
        ➕ 新任務
      </button>
    </div>

    <!-- Daily tasks -->
    <section>
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-serif text-base text-tier-daily tracking-wide">☀️ 日常試煉</h3>
        <div class="flex items-center gap-2 text-xs">
          <span class="font-serif text-stone-700">{{ todayDailyCompleted }}/{{ dailyTasks.length }}</span>
          <span v-if="todayDailyEXP > 0" class="text-epic-red">+{{ todayDailyEXP }} EXP</span>
          <span v-if="todayDailyGold > 0" class="text-tier-legend">+{{ todayDailyGold }} 金</span>
        </div>
      </div>
      <p v-if="dailyTasks.length === 0" class="text-center text-stone-400 text-sm py-8">今日沒有日常試煉</p>
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div v-for="task in enrichedDailyTasks" :key="task.ID"
             :class="['flex flex-col sketch-sm border-2 overflow-hidden', task.bgClass]">
          <!-- Tier stripe -->
          <div :class="['h-2 shrink-0', task.stripeClass]"></div>
          <div class="p-3 flex flex-col gap-2 flex-1">
            <!-- Badge + action buttons -->
            <div class="flex items-start justify-between gap-1">
              <span :class="['text-xs px-1.5 py-0.5 bg-white/70 border border-stone-200 shrink-0', getTypeConfig(task.Type).textClass]">
                {{ getTypeConfig(task.Type).label }}
              </span>
              <div class="flex gap-0.5 shrink-0">
                <button @click.stop="openEditTask(task)" class="w-5 h-5 flex items-center justify-center text-stone-400 hover:text-stone-700 transition-colors">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                </button>
                <button @click.stop="deleteTarget = task" class="w-5 h-5 flex items-center justify-center text-stone-400 hover:text-red-400 transition-colors">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            </div>
            <!-- Title -->
            <p :class="['text-sm font-medium leading-snug flex-1', task.titleClass]" style="overflow-wrap:break-word">{{ task.Title }}</p>
            <!-- Cooldown badge -->
            <div v-if="task.cooldown.onCooldown" class="text-xs text-amber-700 bg-amber-100 border border-amber-300 px-2 py-1 text-center sketch-sm">
              ⏳ {{ formatRemaining(task.cooldown.remainingMs) }}
            </div>
            <!-- Rewards + complete button -->
            <div class="flex items-end justify-between gap-1 mt-auto pt-1">
              <div class="leading-none">
                <div class="text-xs text-epic-red">+{{ task.Base_EXP }} EXP</div>
                <div class="text-xs text-tier-legend mt-0.5">+{{ task.Base_Gold }} G</div>
              </div>
              <button
                @click="confirmTarget = task"
                :disabled="isProcessing || task.isDone"
                :class="['w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all', task.btnClass]"
              >
                <span v-if="task.cooldown.onCooldown" class="text-sm leading-none">⏳</span>
                <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" :stroke-width="task.isDone ? 3 : 2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Other tasks -->
    <section>
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-serif text-base text-stone-900 tracking-wide">📜 一般委託</h3>
        <div class="flex items-center gap-2 text-xs">
          <span class="text-stone-400">待完成 {{ pendingOtherTasks.length }} 個</span>
          <span v-if="todayOtherEXP > 0" class="text-epic-red">+{{ todayOtherEXP }} EXP</span>
          <span v-if="todayOtherGold > 0" class="text-tier-legend">+{{ todayOtherGold }} 金</span>
        </div>
      </div>
      <p v-if="pendingOtherTasks.length === 0" class="text-center text-stone-400 text-sm py-8">沒有待接取的委託</p>
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div v-for="task in enrichedPendingOtherTasks" :key="task.ID"
             :class="['flex flex-col sketch-sm border-2 overflow-hidden', task.bgClass]">
          <!-- Tier stripe -->
          <div :class="['h-2 shrink-0', task.stripeClass]"></div>
          <div class="p-3 flex flex-col gap-2 flex-1">
            <!-- Badge + action buttons -->
            <div class="flex items-start justify-between gap-1">
              <span :class="['text-xs px-1.5 py-0.5 bg-white/70 border border-stone-200 shrink-0', getTypeConfig(task.Type).textClass]">
                {{ getTypeConfig(task.Type).label }}
              </span>
              <div class="flex gap-0.5 shrink-0">
                <button @click.stop="openEditTask(task)" class="w-5 h-5 flex items-center justify-center text-stone-400 hover:text-stone-700 transition-colors">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                </button>
                <button @click.stop="deleteTarget = task" class="w-5 h-5 flex items-center justify-center text-stone-400 hover:text-red-400 transition-colors">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            </div>
            <!-- Title -->
            <p :class="['text-sm font-medium leading-snug flex-1', task.titleClass]" style="overflow-wrap:break-word">{{ task.Title }}</p>
            <!-- Cooldown badge -->
            <div v-if="task.cooldown.onCooldown" class="text-xs text-amber-700 bg-amber-100 border border-amber-300 px-2 py-1 text-center sketch-sm">
              ⏳ {{ formatRemaining(task.cooldown.remainingMs) }}
            </div>
            <!-- Rewards + complete button -->
            <div class="flex items-end justify-between gap-1 mt-auto pt-1">
              <div class="leading-none">
                <div class="text-xs text-epic-red">+{{ task.Base_EXP }} EXP</div>
                <div class="text-xs text-tier-legend mt-0.5">+{{ task.Base_Gold }} G</div>
              </div>
              <button
                @click="confirmTarget = task"
                :disabled="isProcessing || task.cooldown.onCooldown"
                :class="['w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all', task.btnClass]"
              >
                <span v-if="task.cooldown.onCooldown" class="text-sm leading-none">⏳</span>
                <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Completed other tasks toggle -->
    <div v-if="completedOtherTasks.length > 0">
      <button @click="showCompletedTasks = !showCompletedTasks" class="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 transition-colors mb-3">
        <span>{{ showCompletedTasks ? '▾' : '▸' }}</span>
        <span>已達成 {{ completedOtherTasks.length }} 個委託</span>
      </button>
      <div v-if="showCompletedTasks" class="grid grid-cols-2 sm:grid-cols-3 gap-3 opacity-50">
        <div v-for="task in completedOtherTasks" :key="task.ID"
             class="flex flex-col sketch-sm border-2 bg-stone-100 border-stone-300 overflow-hidden">
          <div class="h-2 bg-stone-400 shrink-0"></div>
          <div class="p-3 flex flex-col gap-2">
            <span :class="['text-xs px-1.5 py-0.5 bg-white/70 border border-stone-200 self-start', getTypeConfig(task.Type).textClass]">
              {{ getTypeConfig(task.Type).label }}
            </span>
            <p class="text-sm text-stone-400 line-through" style="overflow-wrap:break-word">{{ task.Title }}</p>
            <div class="leading-none">
              <div class="text-xs text-stone-400">+{{ task.Base_EXP }} EXP</div>
              <div class="text-xs text-stone-400 mt-0.5">+{{ task.Base_Gold }} G</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add task modal -->
    <Teleport to="body">
      <div v-if="showTaskForm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
        <div class="bg-fantasy-panel border-2 border-stone-500 sketch-panel w-full max-w-md">
          <div class="flex items-center justify-between px-5 py-4 border-b-2 border-stone-400">
            <p class="text-epic-red font-serif tracking-wide">發佈新委託</p>
            <button @click="showTaskForm = false" class="text-stone-400 hover:text-stone-900 transition-colors text-lg leading-none">✕</button>
          </div>
          <div class="p-5 space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div class="col-span-2">
                <label class="block text-xs text-stone-500 mb-1">任務名稱</label>
                <input v-model="newTask.Title" type="text" placeholder="例如：跑步 3 公里" class="w-full bg-stone-50 border-2 border-stone-400 sketch-input px-3 py-1.5 text-sm text-stone-800 focus:border-epic-red focus:outline-none">
              </div>
              <div>
                <label class="block text-xs text-stone-500 mb-1">稀有度</label>
                <select v-model="newTask.Type" class="w-full bg-stone-50 border-2 border-stone-400 sketch-input px-3 py-1.5 text-sm text-stone-800 focus:border-epic-red focus:outline-none appearance-none">
                  <option v-for="type in typeConfigs" :key="type.id" :value="type.id">{{ type.label }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-stone-500 mb-1">EXP 獎勵</label>
                <input v-model.number="newTask.Base_EXP" type="number" min="0" class="w-full bg-stone-50 border-2 border-stone-400 sketch-input px-3 py-1.5 text-sm text-stone-800 focus:border-epic-red focus:outline-none">
              </div>
              <div>
                <label class="block text-xs text-stone-500 mb-1">金幣獎勵</label>
                <input v-model.number="newTask.Base_Gold" type="number" min="0" class="w-full bg-stone-50 border-2 border-stone-400 sketch-input px-3 py-1.5 text-sm text-stone-800 focus:border-epic-red focus:outline-none">
              </div>
              <div class="col-span-2">
                <label class="block text-xs text-stone-500 mb-1">冷卻時間（小時，0 = 完成後不重置）</label>
                <input v-model.number="newTask.Cooldown" type="number" min="0" step="0.5" placeholder="例：24 = 一天後可再次完成" class="w-full bg-stone-50 border-2 border-stone-400 sketch-input px-3 py-1.5 text-sm text-stone-800 focus:border-epic-red focus:outline-none">
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-2 px-5 py-4 border-t-2 border-stone-400">
            <button @click="showTaskForm = false" class="px-4 py-1.5 text-sm text-stone-500 hover:text-stone-900 sketch-btn border-2 border-stone-400 transition-colors">取消</button>
            <button @click="handleAddTask" :disabled="isProcessing || !newTask.Title" class="px-5 py-1.5 bg-epic-red hover:bg-red-600 text-white sketch-btn text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">發佈</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Edit task modal -->
    <Teleport to="body">
      <div v-if="editTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
        <div class="bg-fantasy-panel border-2 border-stone-500 sketch-panel w-full max-w-md">
          <div class="flex items-center justify-between px-5 py-4 border-b-2 border-stone-400">
            <p class="text-epic-red font-serif tracking-wide">編輯委託</p>
            <button @click="editTarget = null" class="text-stone-400 hover:text-stone-900 transition-colors text-lg leading-none">✕</button>
          </div>
          <div class="p-5 space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div class="col-span-2">
                <label class="block text-xs text-stone-500 mb-1">任務名稱</label>
                <input v-model="editForm.Title" type="text" class="w-full bg-stone-50 border-2 border-stone-400 sketch-input px-3 py-1.5 text-sm text-stone-800 focus:border-epic-red focus:outline-none">
              </div>
              <div>
                <label class="block text-xs text-stone-500 mb-1">稀有度</label>
                <select v-model="editForm.Type" class="w-full bg-stone-50 border-2 border-stone-400 sketch-input px-3 py-1.5 text-sm text-stone-800 focus:border-epic-red focus:outline-none appearance-none">
                  <option v-for="type in typeConfigs" :key="type.id" :value="type.id">{{ type.label }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-stone-500 mb-1">EXP 獎勵</label>
                <input v-model.number="editForm.Base_EXP" type="number" min="0" class="w-full bg-stone-50 border-2 border-stone-400 sketch-input px-3 py-1.5 text-sm text-stone-800 focus:border-epic-red focus:outline-none">
              </div>
              <div>
                <label class="block text-xs text-stone-500 mb-1">金幣獎勵</label>
                <input v-model.number="editForm.Base_Gold" type="number" min="0" class="w-full bg-stone-50 border-2 border-stone-400 sketch-input px-3 py-1.5 text-sm text-stone-800 focus:border-epic-red focus:outline-none">
              </div>
              <div class="col-span-2">
                <label class="block text-xs text-stone-500 mb-1">冷卻時間（小時，0 = 完成後不重置）</label>
                <input v-model.number="editForm.Cooldown" type="number" min="0" step="0.5" placeholder="例：24 = 一天後可再次完成" class="w-full bg-stone-50 border-2 border-stone-400 sketch-input px-3 py-1.5 text-sm text-stone-800 focus:border-epic-red focus:outline-none">
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-2 px-5 py-4 border-t-2 border-stone-400">
            <button @click="editTarget = null" class="px-4 py-1.5 text-sm text-stone-500 hover:text-stone-900 sketch-btn border-2 border-stone-400 transition-colors">取消</button>
            <button @click="handleUpdateTask" :disabled="isProcessing || !editForm.Title" class="px-5 py-1.5 bg-epic-red hover:bg-red-600 text-white sketch-btn text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">儲存</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Complete confirm modal -->
    <Teleport to="body">
      <div v-if="confirmTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
        <div class="bg-fantasy-panel border-2 border-stone-500 sketch-panel p-6 max-w-xs w-full text-center">
          <p class="text-stone-900 font-serif mb-1">確定完成任務？</p>
          <p class="text-stone-800 text-sm font-medium mb-1">「{{ confirmTarget.Title }}」</p>
          <p class="text-stone-500 text-xs mb-5">預計獲得 <span class="text-epic-red">+{{ confirmTarget.Base_EXP }} EXP</span> 與 <span class="text-tier-legend">+{{ confirmTarget.Base_Gold }} 金幣</span></p>
          <div class="flex justify-center gap-3">
            <button @click="confirmTarget = null" class="px-4 py-1.5 text-sm text-stone-500 hover:text-stone-900 sketch-btn border-2 border-stone-400 transition-colors">取消</button>
            <button @click="handleConfirmComplete" :disabled="isProcessing" class="px-4 py-1.5 text-sm bg-tier-daily hover:bg-green-500 text-white sketch-btn transition-colors disabled:opacity-50">確認完成</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete confirm modal -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
        <div class="bg-fantasy-panel border-2 border-stone-500 sketch-panel p-6 max-w-xs w-full text-center">
          <p class="text-stone-900 font-serif mb-1">確定要移除？</p>
          <p class="text-stone-500 text-sm mb-5">「{{ deleteTarget.Title }}」將永久刪除</p>
          <div class="flex justify-center gap-3">
            <button @click="deleteTarget = null" class="px-4 py-1.5 text-sm text-stone-500 hover:text-stone-900 sketch-btn border-2 border-stone-400 transition-colors">取消</button>
            <button @click="handleDeleteTask" :disabled="isProcessing" class="px-4 py-1.5 text-sm bg-red-600 hover:bg-red-500 text-white sketch-btn transition-colors disabled:opacity-50">刪除</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>
