<script setup>
import { ref, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useGameStore } from '../stores/game';

const store = useGameStore();
const { shopItems, taskLogs, userStats, isProcessing } = storeToRefs(store);
const { buyItem, addShopItem, updateShopItem, deleteShopItem } = store;

const purchaseLogs = computed(() =>
  [...taskLogs.value.filter(l => l.status === 'Bought')]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 20)
);
const getItemName = (taskId) => shopItems.value.find(i => i.Item_ID === taskId)?.Name || taskId;
const formatDate = (ts) => {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

const emit = defineEmits(['toast']);

const showShopForm = ref(false);
const newShopItem = ref({ Name: '', Description: '', Cost: 100 });

const buyConfirmTarget = ref(null);
const editTarget = ref(null);
const editForm = ref({ Name: '', Description: '', Cost: 100 });
const deleteTarget = ref(null);

const purchasedItemIds = computed(() =>
  new Set(taskLogs.value.filter(l => l.status === 'Bought').map(l => l.taskId))
);
const activeShopItems   = computed(() => shopItems.value.filter(i => !purchasedItemIds.value.has(i.Item_ID)));
const archivedShopItems = computed(() => shopItems.value.filter(i =>  purchasedItemIds.value.has(i.Item_ID)));
const showArchived = ref(false);

const currentGold = computed(() => parseInt(userStats.value?.Gold || 0));
const itemProgress = (item) => {
  const cost = parseInt(item.Cost || 0);
  if (!cost) return 100;
  return Math.min(100, (currentGold.value / cost) * 100);
};
const itemShortfall = (item) => Math.max(0, parseInt(item.Cost || 0) - currentGold.value);

const openEditShopItem = (item) => {
  editTarget.value = item;
  editForm.value = { Name: item.Name, Description: item.Description, Cost: parseInt(item.Cost) };
};

const handleConfirmBuy = async () => {
  const item = buyConfirmTarget.value;
  buyConfirmTarget.value = null;
  await handleBuyItem(item);
};

const handleBuyItem = async (item) => {
  const result = await buyItem(item);
  if (result?.success) {
    let msg = `已購買「${item.Name}」！請在現實中好好享受您的獎勵！`;
    if (result.selfControlBonus) msg += ` 🎖️ 節制消費獎勵，享額外 85折！`;
    emit('toast', msg);
  } else {
    emit('toast', result?.error || '金幣不足或操作失敗');
  }
};

const handleAddShopItem = async () => {
  const result = await addShopItem(newShopItem.value);
  if (result?.success) {
    emit('toast', `商品「${newShopItem.value.Name}」已上架！`);
    showShopForm.value = false;
    newShopItem.value = { Name: '', Description: '', Cost: 100 };
  } else {
    emit('toast', '上架失敗，請稍後再試。');
  }
};

const handleUpdateShopItem = async () => {
  const result = await updateShopItem(editTarget.value, editForm.value);
  if (result?.success) {
    emit('toast', `商品「${editForm.value.Name}」已更新。`);
    editTarget.value = null;
  } else {
    emit('toast', '更新失敗，請稍後再試。');
  }
};

const handleDeleteShopItem = async () => {
  const name = deleteTarget.value.Name;
  const result = await deleteShopItem(deleteTarget.value);
  if (result?.success) {
    emit('toast', `已刪除商品「${name}」。`);
    deleteTarget.value = null;
  } else {
    emit('toast', '刪除失敗，請稍後再試。');
  }
};
</script>

<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-5">
      <h2 class="text-lg font-serif text-tier-legend tracking-wide">獎勵商店</h2>
      <button @click="showShopForm = true" class="px-3 py-1.5 text-xs bg-stone-100 hover:bg-stone-200 border-2 border-stone-500 text-stone-700 sketch-btn transition-colors">
        ➕ 新增商品
      </button>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <div v-for="item in activeShopItems" :key="item.Item_ID"
           :class="['bg-fantasy-panel border-2 p-5 sketch-panel flex flex-col justify-between min-h-[120px] transition-all duration-300',
                    itemShortfall(item) === 0
                      ? 'border-tier-legend'
                      : 'border-stone-500 hover:border-tier-legend/50']">
        <div>
          <h4 class="font-serif font-bold text-stone-900 text-sm mb-1">{{ item.Name }}</h4>
          <p class="text-sm text-stone-500 mb-3 leading-relaxed">{{ item.Description }}</p>
          <!-- Progress bar -->
          <div class="mb-3">
            <div class="flex justify-between text-xs mb-1">
              <span class="text-stone-400">{{ currentGold }} / {{ item.Cost }} 金幣</span>
              <span :class="itemShortfall(item) === 0 ? 'text-tier-legend' : 'text-stone-400'">
                {{ itemShortfall(item) === 0 ? '✓ 可購買' : `還差 ${itemShortfall(item)} 金幣` }}
              </span>
            </div>
            <div class="h-1.5 bg-stone-200 rounded-full overflow-hidden">
              <div class="h-full bg-tier-legend transition-all duration-700 rounded-full"
                   :style="{ width: itemProgress(item) + '%' }"></div>
            </div>
          </div>
        </div>
        <button
          @click="buyConfirmTarget = item"
          :disabled="isProcessing || parseInt(userStats?.Gold || 0) < parseInt(item.Cost || 0)"
          class="w-full py-1.5 bg-transparent border-2 border-tier-legend text-tier-legend hover:bg-tier-legend hover:text-white transition-colors sketch-btn text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-tier-legend flex justify-center items-center gap-2 mb-2"
        >
          <span>購買</span><span class="font-bold">{{ item.Cost }} 金幣</span>
        </button>
        <div class="flex justify-end gap-2 border-t border-stone-100 pt-2">
          <button @click="openEditShopItem(item)" class="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-700 transition-colors">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            編輯
          </button>
          <button @click="deleteTarget = item" class="flex items-center gap-1 text-xs text-stone-400 hover:text-red-400 transition-colors">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            刪除
          </button>
        </div>
      </div>
      <div v-if="activeShopItems.length === 0" class="col-span-full text-center text-stone-400 py-10 text-sm">
        {{ archivedShopItems.length > 0 ? '所有商品都已購買 🎉' : '商店空空的，快來補貨吧...' }}
      </div>
    </div>

    <!-- Archived items -->
    <div v-if="archivedShopItems.length > 0" class="mt-4">
      <button @click="showArchived = !showArchived"
              class="w-full flex items-center gap-2 px-4 py-2.5 bg-fantasy-panel border-2 border-stone-500 sketch-btn text-xs text-stone-400 hover:text-stone-600 transition-colors">
        <span>{{ showArchived ? '▾' : '▸' }}</span>
        <span>已購買 {{ archivedShopItems.length }} 個</span>
      </button>
      <div v-if="showArchived" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mt-3 opacity-50">
        <div v-for="item in archivedShopItems" :key="item.Item_ID"
             class="bg-fantasy-panel border-2 border-stone-500 sketch-panel p-4 flex flex-col gap-1">
          <div class="flex items-center justify-between">
            <h4 class="font-serif font-bold text-stone-500 text-sm truncate">{{ item.Name }}</h4>
            <span class="text-xs text-stone-400 shrink-0 ml-2">{{ item.Cost }} 金</span>
          </div>
          <p class="text-xs text-stone-400 leading-relaxed">{{ item.Description }}</p>
        </div>
      </div>
    </div>

    <!-- Add shop item modal -->
    <Teleport to="body">
      <div v-if="showShopForm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
        <div class="bg-fantasy-panel border-2 border-stone-500 sketch-panel w-full max-w-md">
          <div class="flex items-center justify-between px-5 py-4 border-b-2 border-stone-400">
            <p class="text-tier-legend font-serif tracking-wide">上架商品</p>
            <button @click="showShopForm = false" class="text-stone-400 hover:text-stone-900 transition-colors text-lg leading-none">✕</button>
          </div>
          <div class="p-5 space-y-3">
            <div>
              <label class="block text-xs text-stone-500 mb-1">商品名稱</label>
              <input v-model="newShopItem.Name" type="text" placeholder="例如：買一杯飲料"
                     class="w-full bg-stone-50 border-2 border-stone-400 sketch-input px-3 py-1.5 text-sm text-stone-800 focus:border-tier-legend focus:outline-none">
            </div>
            <div>
              <label class="block text-xs text-stone-500 mb-1">商品描述</label>
              <input v-model="newShopItem.Description" type="text" placeholder="例如：犒賞自己的小確幸"
                     class="w-full bg-stone-50 border-2 border-stone-400 sketch-input px-3 py-1.5 text-sm text-stone-800 focus:border-tier-legend focus:outline-none">
            </div>
            <div>
              <label class="block text-xs text-stone-500 mb-1">金幣售價</label>
              <input v-model.number="newShopItem.Cost" type="number" min="0"
                     class="w-full bg-stone-50 border-2 border-stone-400 sketch-input px-3 py-1.5 text-sm text-stone-800 focus:border-tier-legend focus:outline-none">
            </div>
          </div>
          <div class="flex justify-end gap-2 px-5 py-4 border-t-2 border-stone-400">
            <button @click="showShopForm = false" class="px-4 py-1.5 text-sm text-stone-500 hover:text-stone-900 sketch-btn border-2 border-stone-400 transition-colors">取消</button>
            <button @click="handleAddShopItem" :disabled="isProcessing || !newShopItem.Name"
                    class="px-5 py-1.5 bg-transparent border-2 border-tier-legend text-tier-legend hover:bg-tier-legend hover:text-white sketch-btn text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              上架
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Edit shop item modal -->
    <Teleport to="body">
      <div v-if="editTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
        <div class="bg-fantasy-panel border-2 border-stone-500 sketch-panel w-full max-w-md">
          <div class="flex items-center justify-between px-5 py-4 border-b-2 border-stone-400">
            <p class="text-tier-legend font-serif tracking-wide">編輯商品</p>
            <button @click="editTarget = null" class="text-stone-400 hover:text-stone-900 transition-colors text-lg leading-none">✕</button>
          </div>
          <div class="p-5 space-y-3">
            <div>
              <label class="block text-xs text-stone-500 mb-1">商品名稱</label>
              <input v-model="editForm.Name" type="text"
                     class="w-full bg-stone-50 border-2 border-stone-400 sketch-input px-3 py-1.5 text-sm text-stone-800 focus:border-tier-legend focus:outline-none">
            </div>
            <div>
              <label class="block text-xs text-stone-500 mb-1">商品描述</label>
              <input v-model="editForm.Description" type="text"
                     class="w-full bg-stone-50 border-2 border-stone-400 sketch-input px-3 py-1.5 text-sm text-stone-800 focus:border-tier-legend focus:outline-none">
            </div>
            <div>
              <label class="block text-xs text-stone-500 mb-1">金幣售價</label>
              <input v-model.number="editForm.Cost" type="number" min="0"
                     class="w-full bg-stone-50 border-2 border-stone-400 sketch-input px-3 py-1.5 text-sm text-stone-800 focus:border-tier-legend focus:outline-none">
            </div>
          </div>
          <div class="flex justify-end gap-2 px-5 py-4 border-t-2 border-stone-400">
            <button @click="editTarget = null" class="px-4 py-1.5 text-sm text-stone-500 hover:text-stone-900 sketch-btn border-2 border-stone-400 transition-colors">取消</button>
            <button @click="handleUpdateShopItem" :disabled="isProcessing || !editForm.Name"
                    class="px-5 py-1.5 bg-transparent border-2 border-tier-legend text-tier-legend hover:bg-tier-legend hover:text-white sketch-btn text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              儲存
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Buy confirm modal -->
    <Teleport to="body">
      <div v-if="buyConfirmTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
        <div class="bg-fantasy-panel border-2 border-stone-500 sketch-panel p-6 max-w-xs w-full text-center">
          <p class="text-stone-900 font-serif mb-1">確定購買？</p>
          <p class="text-stone-800 text-sm font-medium mb-1">「{{ buyConfirmTarget.Name }}」</p>
          <p class="text-stone-500 text-xs mb-2 leading-relaxed">{{ buyConfirmTarget.Description }}</p>
          <p class="text-stone-500 text-xs mb-5">消耗 <span class="text-tier-legend font-bold">{{ buyConfirmTarget.Cost }} 金幣</span></p>
          <div class="flex justify-center gap-3">
            <button @click="buyConfirmTarget = null" class="px-4 py-1.5 text-sm text-stone-500 hover:text-stone-900 sketch-btn border-2 border-stone-400 transition-colors">取消</button>
            <button @click="handleConfirmBuy" :disabled="isProcessing" class="px-4 py-1.5 text-sm bg-tier-legend hover:bg-orange-500 text-white sketch-btn transition-colors disabled:opacity-50">確認購買</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Purchase history -->
    <div class="bg-fantasy-panel border-2 border-stone-500 sketch-panel mt-6">
      <div class="px-5 py-3 border-b-2 border-stone-400">
        <p class="text-sm font-serif text-stone-500 uppercase tracking-wider">購買紀錄</p>
      </div>
      <div class="divide-y divide-stone-100">
        <div v-if="purchaseLogs.length === 0" class="text-center text-stone-400 text-sm py-8">還沒有購買紀錄</div>
        <div v-for="log in purchaseLogs" :key="log.timestamp"
             class="flex items-center gap-3 px-5 py-3 hover:bg-stone-50 transition-colors">
          <div class="text-xs text-stone-400 shrink-0 w-20">{{ formatDate(log.timestamp) }}</div>
          <div class="flex-1 min-w-0 text-sm text-stone-700 truncate">{{ getItemName(log.taskId) }}</div>
          <div class="text-xs text-tier-legend shrink-0">{{ log.gold }} 金幣</div>
        </div>
      </div>
    </div>

    <!-- Delete confirm modal -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
        <div class="bg-fantasy-panel border-2 border-stone-500 sketch-panel p-6 max-w-xs w-full text-center">
          <p class="text-stone-900 font-serif mb-1">確定要移除？</p>
          <p class="text-stone-500 text-sm mb-5">「{{ deleteTarget.Name }}」將永久刪除</p>
          <div class="flex justify-center gap-3">
            <button @click="deleteTarget = null" class="px-4 py-1.5 text-sm text-stone-500 hover:text-stone-900 sketch-btn border-2 border-stone-400 transition-colors">取消</button>
            <button @click="handleDeleteShopItem" :disabled="isProcessing"
                    class="px-4 py-1.5 text-sm bg-red-600 hover:bg-red-500 text-white sketch-btn transition-colors disabled:opacity-50">
              刪除
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
