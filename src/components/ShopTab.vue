<script setup>
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useGameStore } from '../stores/game';

const store = useGameStore();
const { shopItems, userStats, isProcessing } = storeToRefs(store);
const { buyItem, addShopItem, updateShopItem, deleteShopItem } = store;

const emit = defineEmits(['toast']);

const showShopForm = ref(false);
const newShopItem = ref({ Name: '', Description: '', Cost: 100 });

const buyConfirmTarget = ref(null);
const editTarget = ref(null);
const editForm = ref({ Name: '', Description: '', Cost: 100 });
const deleteTarget = ref(null);

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
  emit('toast', result?.success
    ? `已購買「${item.Name}」！請在現實中好好享受您的獎勵！`
    : (result?.error || '金幣不足或操作失敗'));
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
      <button @click="showShopForm = true" class="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white rounded transition-colors">
        ➕ 新增商品
      </button>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <div v-for="item in shopItems" :key="item.Item_ID"
           class="bg-fantasy-panel border border-gray-700/50 p-5 rounded flex flex-col justify-between min-h-[120px] hover:border-tier-legend transition-colors">
        <div>
          <h4 class="font-serif font-bold text-white text-sm mb-1">{{ item.Name }}</h4>
          <p class="text-sm text-gray-400 mb-4 leading-relaxed">{{ item.Description }}</p>
        </div>
        <button
          @click="buyConfirmTarget = item"
          :disabled="isProcessing || parseInt(userStats?.Gold || 0) < parseInt(item.Cost || 0)"
          class="w-full py-1.5 bg-transparent border border-tier-legend text-tier-legend hover:bg-tier-legend hover:text-white transition-colors rounded text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-tier-legend flex justify-center items-center gap-2 mb-2"
        >
          <span>購買</span><span class="font-bold">{{ item.Cost }} 金幣</span>
        </button>
        <div class="flex justify-end gap-2 border-t border-gray-700/30 pt-2">
          <button @click="openEditShopItem(item)" class="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            編輯
          </button>
          <button @click="deleteTarget = item" class="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 transition-colors">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            刪除
          </button>
        </div>
      </div>
      <div v-if="shopItems.length === 0" class="col-span-full text-center text-gray-500 py-10 text-sm">商店空空的，快來補貨吧...</div>
    </div>

    <!-- Add shop item modal -->
    <Teleport to="body">
      <div v-if="showShopForm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
        <div class="bg-fantasy-panel border border-tier-legend/60 shadow-[0_0_40px_rgba(249,115,22,0.2)] rounded-lg w-full max-w-md">
          <div class="flex items-center justify-between px-5 py-4 border-b border-gray-700/50">
            <p class="text-tier-legend font-serif tracking-wide">上架商品</p>
            <button @click="showShopForm = false" class="text-gray-500 hover:text-white transition-colors text-lg leading-none">✕</button>
          </div>
          <div class="p-5 space-y-3">
            <div>
              <label class="block text-xs text-gray-400 mb-1">商品名稱</label>
              <input v-model="newShopItem.Name" type="text" placeholder="例如：買一杯飲料"
                     class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:border-tier-legend focus:outline-none">
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">商品描述</label>
              <input v-model="newShopItem.Description" type="text" placeholder="例如：犒賞自己的小確幸"
                     class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:border-tier-legend focus:outline-none">
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">金幣售價</label>
              <input v-model.number="newShopItem.Cost" type="number" min="0"
                     class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:border-tier-legend focus:outline-none">
            </div>
          </div>
          <div class="flex justify-end gap-2 px-5 py-4 border-t border-gray-700/50">
            <button @click="showShopForm = false" class="px-4 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">取消</button>
            <button @click="handleAddShopItem" :disabled="isProcessing || !newShopItem.Name"
                    class="px-5 py-1.5 bg-transparent border border-tier-legend text-tier-legend hover:bg-tier-legend hover:text-white rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              上架
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Edit shop item modal -->
    <Teleport to="body">
      <div v-if="editTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
        <div class="bg-fantasy-panel border border-tier-legend/60 shadow-[0_0_40px_rgba(249,115,22,0.2)] rounded-lg w-full max-w-md">
          <div class="flex items-center justify-between px-5 py-4 border-b border-gray-700/50">
            <p class="text-tier-legend font-serif tracking-wide">編輯商品</p>
            <button @click="editTarget = null" class="text-gray-500 hover:text-white transition-colors text-lg leading-none">✕</button>
          </div>
          <div class="p-5 space-y-3">
            <div>
              <label class="block text-xs text-gray-400 mb-1">商品名稱</label>
              <input v-model="editForm.Name" type="text"
                     class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:border-tier-legend focus:outline-none">
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">商品描述</label>
              <input v-model="editForm.Description" type="text"
                     class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:border-tier-legend focus:outline-none">
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">金幣售價</label>
              <input v-model.number="editForm.Cost" type="number" min="0"
                     class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:border-tier-legend focus:outline-none">
            </div>
          </div>
          <div class="flex justify-end gap-2 px-5 py-4 border-t border-gray-700/50">
            <button @click="editTarget = null" class="px-4 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">取消</button>
            <button @click="handleUpdateShopItem" :disabled="isProcessing || !editForm.Name"
                    class="px-5 py-1.5 bg-transparent border border-tier-legend text-tier-legend hover:bg-tier-legend hover:text-white rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              儲存
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Buy confirm modal -->
    <Teleport to="body">
      <div v-if="buyConfirmTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
        <div class="bg-fantasy-panel border border-gray-600 rounded-lg p-6 max-w-xs w-full text-center">
          <p class="text-white font-serif mb-1">確定購買？</p>
          <p class="text-gray-100 text-sm font-medium mb-1">「{{ buyConfirmTarget.Name }}」</p>
          <p class="text-gray-400 text-xs mb-2 leading-relaxed">{{ buyConfirmTarget.Description }}</p>
          <p class="text-gray-400 text-xs mb-5">消耗 <span class="text-tier-legend font-bold">{{ buyConfirmTarget.Cost }} 金幣</span></p>
          <div class="flex justify-center gap-3">
            <button @click="buyConfirmTarget = null" class="px-4 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">取消</button>
            <button @click="handleConfirmBuy" :disabled="isProcessing" class="px-4 py-1.5 text-sm bg-tier-legend hover:bg-orange-500 text-white rounded transition-colors disabled:opacity-50">確認購買</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete confirm modal -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
        <div class="bg-fantasy-panel border border-gray-600 rounded-lg p-6 max-w-xs w-full text-center">
          <p class="text-white font-serif mb-1">確定要移除？</p>
          <p class="text-gray-400 text-sm mb-5">「{{ deleteTarget.Name }}」將永久刪除</p>
          <div class="flex justify-center gap-3">
            <button @click="deleteTarget = null" class="px-4 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">取消</button>
            <button @click="handleDeleteShopItem" :disabled="isProcessing"
                    class="px-4 py-1.5 text-sm bg-red-600 hover:bg-red-500 text-white rounded transition-colors disabled:opacity-50">
              刪除
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
