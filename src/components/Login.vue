<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-fantasy-bg text-gray-200 px-4">
    <div class="bg-fantasy-panel border-2 border-epic-red p-8 rounded-lg shadow-[0_0_20px_rgba(241,111,79,0.3)] max-w-md w-full text-center relative overflow-hidden">
      <!-- 裝飾線條 -->
      <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-epic-red to-transparent"></div>
      
      <h1 class="text-4xl font-serif text-epic-red mb-2 tracking-widest drop-shadow-md">
        Life Game
      </h1>
      <p class="text-gray-400 mb-8 font-sans">將生活化作史詩任務，踏上英雄旅程</p>
      
      <button 
        @click="handleLogin" 
        :disabled="!isReady"
        class="w-full py-3 px-6 bg-transparent border-2 border-epic-red text-epic-red hover:bg-epic-red hover:text-white transition-all duration-300 rounded font-serif tracking-wider uppercase disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(241,111,79,0.2)] hover:shadow-[0_0_20px_rgba(241,111,79,0.6)]"
      >
        <span v-if="!isReady">魔法陣充能中...</span>
        <span v-else>踏上旅途 (登入)</span>
      </button>
      
      <p v-if="!isReady" class="text-xs text-gray-500 mt-4 font-sans">
        正在載入 Google 服務，請稍候。若持續未回應，請檢查 API 金鑰設定。
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../stores/auth';

const store = useAuthStore();
const { isGapiLoaded, isGsiLoaded } = storeToRefs(store);
const { login } = store;

const isReady = computed(() => isGapiLoaded.value && isGsiLoaded.value);

const handleLogin = () => {
  login();
};
</script>
