<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { storeToRefs } from 'pinia';
import { useGameStore } from '../stores/game';

const store = useGameStore();
const { phrases, taskLogs, isProcessing } = storeToRefs(store);
const { submitPhrase, addPhrase, updatePhrase, deletePhrase } = store;

const emit = defineEmits(['toast']);

const quizBtnClass = computed(() =>
  view.value === 'quiz' ? 'bg-cyan-600 text-white' : 'text-stone-500 hover:text-stone-900'
);
const manageBtnClass = computed(() =>
  view.value === 'manage' ? 'bg-stone-300 text-stone-900' : 'text-stone-500 hover:text-stone-900'
);
const resultClass = computed(() =>
  result.value === 'correct' ? 'bg-green-50 border-2 border-green-400' : 'bg-red-50 border-2 border-red-400'
);
const rewardAmountClass = computed(() =>
  rewardInfo.value?.type === 'gold' ? 'text-tier-legend' : 'text-epic-red'
);
const rewardUnit = computed(() =>
  rewardInfo.value?.type === 'gold' ? '金幣' : 'EXP'
);
const hintBtnTitle = computed(() => `提示（剩 ${2 - hintLevel.value} 次）`);

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
const hintLevel  = ref(0);
const rewardInfo = ref(null);

const hintWords = computed(() => firstAnswer.value.split(' ').filter(Boolean));
const hintText  = computed(() => {
  if (hintLevel.value === 0) return null;
  return hintWords.value.slice(0, hintLevel.value).join(' ') + (hintLevel.value < hintWords.value.length ? '...' : '');
});

const useHint = () => {
  if (hintLevel.value >= 3 || result.value !== null) return;
  hintLevel.value++;
  if (hintLevel.value >= 3) result.value = 'failed';
};
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
  hintLevel.value = 0;
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
      hintLevel.value = Math.max(hintLevel.value, 1);
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
      <h2 class="text-lg font-serif text-stone-900 tracking-wide">訓練場</h2>
      <div class="flex bg-stone-100 sketch-sm border-2 border-stone-400 p-0.5">
        <button @click="view = 'quiz'"   :class="['px-4 py-1.5 text-sm sketch-btn transition-colors', quizBtnClass]">答題</button>
        <button @click="view = 'manage'; started = false" :class="['px-4 py-1.5 text-sm sketch-btn transition-colors', manageBtnClass]">管理片語</button>
      </div>
    </div>

    <!-- ── 答題 ─────────────────────────────────── -->
    <template v-if="view === 'quiz'">
      <div v-if="phrases.length === 0" class="flex flex-col items-center justify-center py-24 space-y-3 text-center">
        <div class="text-5xl">📖</div>
        <p class="text-stone-400 text-sm">題庫是空的，請先到「管理片語」新增片語。</p>
        <button @click="view = 'manage'" class="px-5 py-2 border-2 border-stone-500 text-stone-500 hover:text-stone-900 sketch-btn text-sm transition-colors">前往管理片語</button>
      </div>

      <!-- 開始畫面 -->
      <div v-else-if="!started" class="max-w-lg mx-auto flex flex-col items-center justify-center py-16 space-y-6 text-center">
        <div class="text-6xl">📖</div>
        <div class="space-y-2">
          <h3 class="text-2xl font-serif text-stone-900">準備好了嗎？</h3>
          <p class="text-stone-400 text-sm">題庫共 <span class="text-stone-900">{{ phrases.length }}</span> 個片語・今日已練習 <span class="text-stone-900">{{ todayTrainingCount }}</span> 次</p>
        </div>
        <button @click="startQuiz" class="px-10 py-3 bg-cyan-600 hover:bg-cyan-500 text-white sketch-btn text-base font-serif tracking-wide transition-colors">
          開始訓練
        </button>
      </div>

      <div v-else class="max-w-lg mx-auto space-y-4">
        <div class="flex justify-between text-xs text-stone-400">
          <span>題庫共 {{ phrases.length }} 個片語</span>
          <span>今日已練習 <span class="text-stone-900">{{ todayTrainingCount }}</span> 次</span>
        </div>

        <!-- Phrase card -->
        <div class="bg-fantasy-panel border-2 border-stone-500 sketch-panel px-4 py-6 sm:px-8 sm:py-10 text-center">
          <p class="text-xs text-stone-400 uppercase tracking-wider mb-5">翻譯成英文</p>
          <p class="text-3xl font-serif text-stone-900 leading-relaxed">{{ currentPhrase?.Chinese }}</p>
          <div v-if="hintText" class="mt-5 inline-flex items-center gap-2 bg-cyan-50 border border-cyan-200 sketch-sm px-4 py-1.5">
            <span class="text-xs text-stone-400">提示</span>
            <span class="text-cyan-600 font-mono tracking-wide">{{ hintText }}</span>
          </div>
        </div>

        <!-- Input -->
        <div v-if="result === null" class="space-y-2">
          <div class="flex gap-2">
            <button @click="useHint" :disabled="hintLevel >= 2"
                    :title="hintBtnTitle"
                    class="px-3 py-3 bg-stone-100 hover:bg-stone-200 border-2 border-stone-500 sketch-btn transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0 flex flex-col items-center gap-0.5">
              <span class="text-sm">💡</span>
              <span class="flex gap-0.5">
                <span v-for="i in 3" :key="i" :class="['w-1 h-1 rounded-full', i <= hintLevel ? 'bg-cyan-500' : 'bg-stone-300']"></span>
              </span>
            </button>
            <input
              ref="inputRef"
              v-model="userInput"
              type="text"
              @keyup.enter="checkAnswer"
              placeholder="輸入英文片語..."
              class="flex-1 min-w-0 bg-stone-50 border-2 border-stone-400 sketch-input px-4 py-3 text-base text-stone-800 focus:border-cyan-500 focus:outline-none"
            />
            <button @click="checkAnswer" :disabled="!userInput.trim() || isSubmitting"
                    class="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white sketch-btn transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              確認
            </button>
          </div>
        </div>

        <!-- Result -->
        <div v-else class="sketch-panel p-6 text-center space-y-2" :class="resultClass">
          <template v-if="result === 'correct'">
            <p class="text-green-600 font-serif text-xl">✓ 答對了！</p>
            <div v-if="rewardInfo" class="text-sm text-stone-600">
              獲得
              <span :class="rewardAmountClass" class="font-bold text-base">
                {{ rewardInfo.amount }} {{ rewardUnit }}
              </span>
            </div>
            <p v-else class="text-xs text-stone-400">今日此片語已領取過獎勵</p>
            <p class="text-xs text-stone-400 font-mono mt-1">{{ firstAnswer }}</p>
          </template>
          <template v-else>
            <p class="text-red-500 font-serif text-xl">✗ 答錯兩次</p>
            <p class="text-sm text-stone-500">正確答案：</p>
            <p class="text-stone-700 font-mono">{{ firstAnswer }}</p>
          </template>
          <button @click="nextPhrase" class="mt-3 px-6 py-2 border-2 border-stone-500 text-stone-500 hover:text-stone-900 sketch-btn text-sm transition-colors">
            下一題 →
          </button>
        </div>
      </div>
    </template>

    <!-- ── 管理片語 ──────────────────────────────── -->
    <template v-else>
      <div class="flex justify-end">
        <button @click="openAdd" class="px-3 py-1.5 text-xs bg-stone-100 hover:bg-stone-200 border-2 border-stone-500 text-stone-700 sketch-btn transition-colors">
          ➕ 新增片語
        </button>
      </div>

      <div class="bg-fantasy-panel border-2 border-stone-500 sketch-panel overflow-hidden">
        <div v-if="phrases.length === 0" class="text-center text-stone-400 text-sm py-12">尚未新增任何片語</div>
        <div v-else class="divide-y divide-stone-100">
          <div v-for="phrase in phrases" :key="phrase.Phrase_ID"
               class="flex items-center gap-4 px-5 py-3 hover:bg-stone-50 transition-colors group">
            <div class="flex-1 min-w-0 grid grid-cols-2 gap-4">
              <p class="text-sm text-stone-800 truncate">{{ phrase.Chinese }}</p>
              <p class="text-sm text-stone-500 font-mono truncate">{{ phrase.English }}</p>
            </div>
            <div class="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button @click="openEdit(phrase)" class="w-7 h-7 flex items-center justify-center text-stone-400 hover:text-stone-900 rounded transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </button>
              <button @click="deleteTarget = phrase" class="w-7 h-7 flex items-center justify-center text-stone-400 hover:text-red-400 rounded transition-colors">
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
        <div class="bg-fantasy-panel border-2 border-stone-500 sketch-panel w-full max-w-md">
          <div class="flex items-center justify-between px-5 py-4 border-b-2 border-stone-400">
            <p class="text-stone-900 font-serif">新增片語</p>
            <button @click="showAddForm = false" class="text-stone-400 hover:text-stone-900 text-lg leading-none">✕</button>
          </div>
          <div class="p-5 space-y-3">
            <div>
              <label class="block text-xs text-stone-500 mb-1">繁體中文</label>
              <input v-model="phraseForm.Chinese" type="text" placeholder="例如：日復一日"
                     class="w-full bg-stone-50 border-2 border-stone-400 sketch-input px-3 py-1.5 text-sm text-stone-800 focus:border-cyan-500 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs text-stone-500 mb-1">英文答案 <span class="text-stone-400">（多個答案用 | 分隔）</span></label>
              <input v-model="phraseForm.English" type="text" placeholder="例如：day in and day out"
                     class="w-full bg-stone-50 border-2 border-stone-400 sketch-input px-3 py-1.5 text-sm text-stone-800 focus:border-cyan-500 focus:outline-none" />
            </div>
          </div>
          <div class="flex justify-end gap-2 px-5 py-4 border-t-2 border-stone-400">
            <button @click="showAddForm = false" class="px-4 py-1.5 text-sm text-stone-500 hover:text-stone-900 sketch-btn border-2 border-stone-400 transition-colors">取消</button>
            <button @click="handleAdd" :disabled="!phraseForm.Chinese.trim() || !phraseForm.English.trim() || isProcessing"
                    class="px-5 py-1.5 border-2 border-stone-500 text-stone-600 hover:bg-stone-100 sketch-btn text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              新增
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Edit modal -->
    <Teleport to="body">
      <div v-if="editTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
        <div class="bg-fantasy-panel border-2 border-stone-500 sketch-panel w-full max-w-md">
          <div class="flex items-center justify-between px-5 py-4 border-b-2 border-stone-400">
            <p class="text-stone-900 font-serif">編輯片語</p>
            <button @click="editTarget = null" class="text-stone-400 hover:text-stone-900 text-lg leading-none">✕</button>
          </div>
          <div class="p-5 space-y-3">
            <div>
              <label class="block text-xs text-stone-500 mb-1">繁體中文</label>
              <input v-model="phraseForm.Chinese" type="text"
                     class="w-full bg-stone-50 border-2 border-stone-400 sketch-input px-3 py-1.5 text-sm text-stone-800 focus:border-cyan-500 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs text-stone-500 mb-1">英文答案 <span class="text-stone-400">（多個答案用 | 分隔）</span></label>
              <input v-model="phraseForm.English" type="text"
                     class="w-full bg-stone-50 border-2 border-stone-400 sketch-input px-3 py-1.5 text-sm text-stone-800 focus:border-cyan-500 focus:outline-none" />
            </div>
          </div>
          <div class="flex justify-end gap-2 px-5 py-4 border-t-2 border-stone-400">
            <button @click="editTarget = null" class="px-4 py-1.5 text-sm text-stone-500 hover:text-stone-900 sketch-btn border-2 border-stone-400 transition-colors">取消</button>
            <button @click="handleUpdate" :disabled="!phraseForm.Chinese.trim() || !phraseForm.English.trim() || isProcessing"
                    class="px-5 py-1.5 border-2 border-stone-500 text-stone-600 hover:bg-stone-100 sketch-btn text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              儲存
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete confirm -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
        <div class="bg-fantasy-panel border-2 border-stone-500 sketch-panel p-6 max-w-xs w-full text-center">
          <p class="text-stone-900 font-serif mb-1">確定要刪除？</p>
          <p class="text-stone-500 text-sm mb-5">「{{ deleteTarget.Chinese }}」將永久移除</p>
          <div class="flex justify-center gap-3">
            <button @click="deleteTarget = null" class="px-4 py-1.5 text-sm text-stone-500 hover:text-stone-900 sketch-btn border-2 border-stone-400 transition-colors">取消</button>
            <button @click="handleDelete" :disabled="isProcessing" class="px-4 py-1.5 text-sm bg-red-600 hover:bg-red-500 text-white sketch-btn transition-colors disabled:opacity-50">刪除</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>
