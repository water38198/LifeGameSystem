<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { storeToRefs } from 'pinia';
import { useGameStore } from '../stores/game';

const store = useGameStore();
const { phrases, taskLogs, isProcessing } = storeToRefs(store);
const { submitPhrase, addPhrase, updatePhrase, deletePhrase } = store;

const emit = defineEmits(['toast']);

const view = ref('quiz');
const started = ref(false);

const startQuiz = () => {
  buildQueue();
  resetQuestion();
  started.value = true;
};

// ── 答題狀態 ────────────────────────────────────
const queue      = ref([]);
const queueIndex = ref(0);
const userInput  = ref('');
const wrongAttempts = ref(0);
const result     = ref(null);
const hint       = ref(null);
const rewardInfo = ref(null);
const isSubmitting = ref(false);
const inputRef   = ref(null);

const currentPhrase = computed(() => queue.value[queueIndex.value] || null);
const firstAnswer   = computed(() => currentPhrase.value?.English.split('|')[0].trim() ?? '');

const todayStr = new Date().toISOString().slice(0, 10);
const todayTrainingCount = computed(() =>
  taskLogs.value.filter(l => l.status === 'Training' && l.timestamp.slice(0, 10) === todayStr).length
);

const buildQueue = () => {
  queue.value = [...phrases.value].sort(() => Math.random() - 0.5);
  queueIndex.value = 0;
};

const resetQuestion = () => {
  userInput.value = '';
  wrongAttempts.value = 0;
  result.value = null;
  hint.value = null;
  rewardInfo.value = null;
  nextTick(() => inputRef.value?.focus());
};

const checkAnswer = async () => {
  if (!userInput.value.trim() || isSubmitting.value || result.value !== null) return;
  const answers = currentPhrase.value.English.split('|').map(s => s.toLowerCase().trim());
  const isCorrect = answers.includes(userInput.value.toLowerCase().trim());
  if (isCorrect) {
    isSubmitting.value = true;
    result.value = 'correct';
    const res = await submitPhrase(currentPhrase.value);
    rewardInfo.value = res.rewarded ? { type: res.rewardType, amount: res.rewardAmount } : null;
    if (res.trainingMilestoneBonus) emit('toast', '🎯 訓練里程碑！累積 15 次，獲得 +15 Gold！');
    isSubmitting.value = false;
  } else {
    wrongAttempts.value++;
    if (wrongAttempts.value === 1) {
      hint.value = firstAnswer.value.split(' ')[0];
      userInput.value = '';
      nextTick(() => inputRef.value?.focus());
    } else {
      result.value = 'failed';
    }
  }
};

const nextPhrase = () => {
  queueIndex.value++;
  if (queueIndex.value >= queue.value.length) buildQueue();
  resetQuestion();
};

watch(() => phrases.value.length, (n, o) => { if (o === 0 && n > 0) buildQueue(); });

// ── 管理片語狀態 ────────────────────────────────
const showAddForm = ref(false);
const editTarget  = ref(null);
const deleteTarget = ref(null);
const phraseForm  = ref({ Chinese: '', English: '' });

const openAdd = () => {
  phraseForm.value = { Chinese: '', English: '' };
  showAddForm.value = true;
};

const openEdit = (phrase) => {
  editTarget.value = phrase;
  phraseForm.value = { Chinese: phrase.Chinese, English: phrase.English };
};

const handleAdd = async () => {
  const res = await addPhrase(phraseForm.value);
  if (res?.success) {
    emit('toast', `新增片語「${phraseForm.value.Chinese}」成功！`);
    showAddForm.value = false;
    buildQueue();
  } else {
    emit('toast', '新增失敗，請稍後再試。');
  }
};

const handleUpdate = async () => {
  const res = await updatePhrase(editTarget.value, phraseForm.value);
  if (res?.success) {
    emit('toast', `片語「${phraseForm.value.Chinese}」已更新。`);
    editTarget.value = null;
  } else {
    emit('toast', '更新失敗，請稍後再試。');
  }
};

const handleDelete = async () => {
  const chinese = deleteTarget.value.Chinese;
  const res = await deletePhrase(deleteTarget.value);
  if (res?.success) {
    emit('toast', `已刪除片語「${chinese}」。`);
    deleteTarget.value = null;
    buildQueue();
  } else {
    emit('toast', '刪除失敗，請稍後再試。');
  }
};
</script>

<template>
  <div class="p-6 space-y-4">

    <!-- Header + sub-nav -->
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-serif text-white tracking-wide">訓練場</h2>
      <div class="flex bg-gray-800 rounded-lg p-0.5">
        <button @click="view = 'quiz'"   :class="['px-4 py-1.5 text-sm rounded-md transition-colors', view === 'quiz'   ? 'bg-cyan-700 text-white' : 'text-gray-400 hover:text-white']">答題</button>
        <button @click="view = 'manage'; started = false" :class="['px-4 py-1.5 text-sm rounded-md transition-colors', view === 'manage' ? 'bg-gray-600 text-white'  : 'text-gray-400 hover:text-white']">管理片語</button>
      </div>
    </div>

    <!-- ── 答題 ─────────────────────────────────── -->
    <template v-if="view === 'quiz'">
      <div v-if="phrases.length === 0" class="flex flex-col items-center justify-center py-24 space-y-3 text-center">
        <div class="text-5xl">📖</div>
        <p class="text-gray-500 text-sm">題庫是空的，請先到「管理片語」新增片語。</p>
        <button @click="view = 'manage'" class="px-5 py-2 border border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 rounded text-sm transition-colors">前往管理片語</button>
      </div>

      <!-- 開始畫面 -->
      <div v-else-if="!started" class="max-w-lg mx-auto flex flex-col items-center justify-center py-16 space-y-6 text-center">
        <div class="text-6xl">📖</div>
        <div class="space-y-2">
          <h3 class="text-2xl font-serif text-white">準備好了嗎？</h3>
          <p class="text-gray-500 text-sm">題庫共 <span class="text-white">{{ phrases.length }}</span> 個片語・今日已練習 <span class="text-white">{{ todayTrainingCount }}</span> 次</p>
        </div>
        <button @click="startQuiz" class="px-10 py-3 bg-cyan-700 hover:bg-cyan-600 text-white rounded-lg text-base font-serif tracking-wide transition-colors shadow-[0_0_20px_rgba(6,182,212,0.3)]">
          開始訓練
        </button>
      </div>

      <div v-else class="max-w-lg mx-auto space-y-4">
        <div class="flex justify-between text-xs text-gray-500">
          <span>題庫共 {{ phrases.length }} 個片語</span>
          <span>今日已練習 <span class="text-white">{{ todayTrainingCount }}</span> 次</span>
        </div>

        <!-- Phrase card -->
        <div class="bg-fantasy-panel border border-gray-700/50 rounded-lg px-4 py-6 sm:px-8 sm:py-10 text-center">
          <p class="text-xs text-gray-500 uppercase tracking-wider mb-5">翻譯成英文</p>
          <p class="text-3xl font-serif text-white leading-relaxed">{{ currentPhrase?.Chinese }}</p>
          <div v-if="hint" class="mt-5 inline-flex items-center gap-2 bg-cyan-900/30 border border-cyan-800/50 rounded px-4 py-1.5">
            <span class="text-xs text-gray-500">提示</span>
            <span class="text-cyan-400 font-mono tracking-wide">{{ hint }}</span>
          </div>
        </div>

        <!-- Input -->
        <div v-if="result === null" class="space-y-2">
          <div class="flex gap-2">
            <input
              ref="inputRef"
              v-model="userInput"
              type="text"
              @keyup.enter="checkAnswer"
              placeholder="輸入英文片語..."
              class="flex-1 min-w-0 bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-base text-white focus:border-cyan-500 focus:outline-none"
            />
            <button @click="checkAnswer" :disabled="!userInput.trim() || isSubmitting"
                    class="px-6 py-3 bg-cyan-700 hover:bg-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              確認
            </button>
          </div>
          <p v-if="wrongAttempts === 1" class="text-xs text-yellow-600 text-center">已顯示提示，再錯就不給獎勵</p>
        </div>

        <!-- Result -->
        <div v-else class="rounded-lg p-6 text-center space-y-2"
             :class="result === 'correct' ? 'bg-green-900/20 border border-green-800/40' : 'bg-red-900/20 border border-red-800/40'">
          <template v-if="result === 'correct'">
            <p class="text-green-400 font-serif text-xl">✓ 答對了！</p>
            <div v-if="rewardInfo" class="text-sm text-gray-300">
              獲得
              <span :class="rewardInfo.type === 'gold' ? 'text-tier-legend' : 'text-epic-red'" class="font-bold text-base">
                {{ rewardInfo.amount }} {{ rewardInfo.type === 'gold' ? '金幣' : 'EXP' }}
              </span>
            </div>
            <p v-else class="text-xs text-gray-500">今日此片語已領取過獎勵</p>
            <p class="text-xs text-gray-600 font-mono mt-1">{{ firstAnswer }}</p>
          </template>
          <template v-else>
            <p class="text-red-400 font-serif text-xl">✗ 答錯兩次</p>
            <p class="text-sm text-gray-400">正確答案：</p>
            <p class="text-gray-200 font-mono">{{ firstAnswer }}</p>
          </template>
          <button @click="nextPhrase" class="mt-3 px-6 py-2 border border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 rounded-lg text-sm transition-colors">
            下一題 →
          </button>
        </div>
      </div>
    </template>

    <!-- ── 管理片語 ──────────────────────────────── -->
    <template v-else>
      <div class="flex justify-end">
        <button @click="openAdd" class="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white rounded transition-colors">
          ➕ 新增片語
        </button>
      </div>

      <div class="bg-fantasy-panel border border-gray-700/50 rounded overflow-hidden">
        <div v-if="phrases.length === 0" class="text-center text-gray-600 text-sm py-12">尚未新增任何片語</div>
        <div v-else class="divide-y divide-gray-700/30">
          <div v-for="phrase in phrases" :key="phrase.Phrase_ID"
               class="flex items-center gap-4 px-5 py-3 hover:bg-gray-700/10 transition-colors group">
            <div class="flex-1 min-w-0 grid grid-cols-2 gap-4">
              <p class="text-sm text-white truncate">{{ phrase.Chinese }}</p>
              <p class="text-sm text-gray-400 font-mono truncate">{{ phrase.English }}</p>
            </div>
            <div class="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button @click="openEdit(phrase)" class="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-white rounded transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </button>
              <button @click="deleteTarget = phrase" class="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-red-400 rounded transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Add modal -->
    <Teleport to="body">
      <div v-if="showAddForm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
        <div class="bg-fantasy-panel border border-gray-600 rounded-lg w-full max-w-md">
          <div class="flex items-center justify-between px-5 py-4 border-b border-gray-700/50">
            <p class="text-white font-serif">新增片語</p>
            <button @click="showAddForm = false" class="text-gray-500 hover:text-white text-lg leading-none">✕</button>
          </div>
          <div class="p-5 space-y-3">
            <div>
              <label class="block text-xs text-gray-400 mb-1">繁體中文</label>
              <input v-model="phraseForm.Chinese" type="text" placeholder="例如：日復一日"
                     class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:border-white focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">英文答案 <span class="text-gray-600">（多個答案用 | 分隔）</span></label>
              <input v-model="phraseForm.English" type="text" placeholder="例如：day in and day out"
                     class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:border-white focus:outline-none" />
            </div>
          </div>
          <div class="flex justify-end gap-2 px-5 py-4 border-t border-gray-700/50">
            <button @click="showAddForm = false" class="px-4 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">取消</button>
            <button @click="handleAdd" :disabled="!phraseForm.Chinese.trim() || !phraseForm.English.trim() || isProcessing"
                    class="px-5 py-1.5 border border-gray-400 text-gray-300 hover:bg-gray-700 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              新增
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Edit modal -->
    <Teleport to="body">
      <div v-if="editTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
        <div class="bg-fantasy-panel border border-gray-600 rounded-lg w-full max-w-md">
          <div class="flex items-center justify-between px-5 py-4 border-b border-gray-700/50">
            <p class="text-white font-serif">編輯片語</p>
            <button @click="editTarget = null" class="text-gray-500 hover:text-white text-lg leading-none">✕</button>
          </div>
          <div class="p-5 space-y-3">
            <div>
              <label class="block text-xs text-gray-400 mb-1">繁體中文</label>
              <input v-model="phraseForm.Chinese" type="text"
                     class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:border-white focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">英文答案 <span class="text-gray-600">（多個答案用 | 分隔）</span></label>
              <input v-model="phraseForm.English" type="text"
                     class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:border-white focus:outline-none" />
            </div>
          </div>
          <div class="flex justify-end gap-2 px-5 py-4 border-t border-gray-700/50">
            <button @click="editTarget = null" class="px-4 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">取消</button>
            <button @click="handleUpdate" :disabled="!phraseForm.Chinese.trim() || !phraseForm.English.trim() || isProcessing"
                    class="px-5 py-1.5 border border-gray-400 text-gray-300 hover:bg-gray-700 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              儲存
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete confirm -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
        <div class="bg-fantasy-panel border border-gray-600 rounded-lg p-6 max-w-xs w-full text-center">
          <p class="text-white font-serif mb-1">確定要刪除？</p>
          <p class="text-gray-400 text-sm mb-5">「{{ deleteTarget.Chinese }}」將永久移除</p>
          <div class="flex justify-center gap-3">
            <button @click="deleteTarget = null" class="px-4 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">取消</button>
            <button @click="handleDelete" :disabled="isProcessing" class="px-4 py-1.5 text-sm bg-red-600 hover:bg-red-500 text-white rounded transition-colors disabled:opacity-50">刪除</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>
