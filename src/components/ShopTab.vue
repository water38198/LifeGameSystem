<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-5">
      <h2 class="text-lg font-serif text-tier-legend tracking-wide">獎勵商店</h2>
      <button @click="showShopForm = true" class="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white rounded transition-colors">
        ➕ 新增商品
      </button>
    </div>

    <!-- Add shop item modal -->
    <Teleport to="body">
      <div v-if="showShopForm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4" @click.self="showShopForm = false">
        <div class="bg-fantasy-panel border border-tier-legend/60 shadow-[0_0_40px_rgba(249,115,22,0.2)] rounded-lg w-full max-w-md">
          <div class="flex items-center justify-between px-5 py-4 border-b border-gray-700/50">
            <p class="text-tier-legend font-serif tracking-wide">上架新商品</p>
            <button @click="showShopForm = false" class="text-gray-500 hover:text-white transition-colors text-lg leading-none">✕</button>
          </div>
          <div class="p-5 space-y-3">
            <div>
              <label class="block text-xs text-gray-400 mb-1">商品名稱</label>
              <input v-model="newShopItem.Name" type="text" placeholder="例如：看一部電影" class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:border-tier-legend focus:outline-none">
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">商品描述</label>
              <input v-model="newShopItem.Description" type="text" placeholder="例如：犒賞自己的小確幸" class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:border-tier-legend focus:outline-none">
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">金幣售價</label>
              <input v-model.number="newShopItem.Cost" type="number" min="0" class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:border-tier-legend focus:outline-none">
            </div>
          </div>
          <div class="flex justify-end gap-2 px-5 py-4 border-t border-gray-700/50">
            <button @click="showShopForm = false" class="px-4 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">取消</button>
            <button @click="handleAddShopItem" :disabled="isProcessing || !newShopItem.Name" class="px-5 py-1.5 bg-transparent border border-tier-legend text-tier-legend hover:bg-tier-legend hover:text-white rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              上架
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <div v-for="item in shopItems" :key="item.Item_ID"
           class="bg-fantasy-panel border border-gray-700/50 p-5 rounded flex flex-col justify-between min-h-[120px] hover:border-tier-legend transition-colors">
        <div>
          <h4 class="font-serif font-bold text-white text-sm mb-1">{{ item.Name }}</h4>
          <p class="text-xs text-gray-400 mb-4 leading-relaxed">{{ item.Description }}</p>
        </div>
        <button
          @click="handleBuyItem(item)"
          :disabled="isProcessing || parseInt(userStats?.Gold || 0) < parseInt(item.Cost || 0)"
          class="w-full py-1.5 bg-transparent border border-tier-legend text-tier-legend hover:bg-tier-legend hover:text-white transition-colors rounded text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-tier-legend flex justify-center items-center gap-2"
        >
          <span>兌換</span><span class="font-bold">{{ item.Cost }} 金幣</span>
        </button>
      </div>
      <div v-if="shopItems.length === 0" class="col-span-full text-center text-gray-500 py-10 text-sm">商店老闆出遠門補貨了...</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { shopItems, userStats, isProcessing, buyItem, addShopItem } from '../services/googleAuth';

const emit = defineEmits(['toast']);

const showShopForm = ref(false);
const newShopItem = ref({ Name: '', Description: '', Cost: 100 });

const handleBuyItem = async (item) => {
  const result = await buyItem(item);
  emit('toast', result?.success
    ? `成功兌換【${item.Name}】！請在現實中好好享受您的獎勵！`
    : (result?.error || '金幣不足或兌換失敗。'));
};

const handleAddShopItem = async () => {
  const result = await addShopItem(newShopItem.value);
  if (result?.success) {
    emit('toast', `新商品「${newShopItem.value.Name}」上架成功！`);
    showShopForm.value = false;
    newShopItem.value = { Name: '', Description: '', Cost: 100 };
  } else {
    emit('toast', '上架商品失敗，請稍後再試。');
  }
};
</script>
