<template>
  <div>
    <Dashboard v-if="isAuthenticated || isSessionExpired" />
    <Login v-else />

    <!-- Session expired overlay -->
    <Teleport to="body">
      <div v-if="isSessionExpired" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md">
        <div class="bg-fantasy-panel border-2 border-epic-red p-8 rounded-lg shadow-[0_0_50px_rgba(241,111,79,0.4)] max-w-sm w-full mx-4 text-center relative overflow-hidden">
          <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-epic-red to-transparent"></div>
          <div class="text-5xl mb-4">⌛</div>
          <h2 class="text-2xl font-serif text-epic-red mb-2 tracking-wide">登入已過期</h2>
          <p class="text-gray-400 text-sm mb-6 leading-relaxed">您的連線憑證已逾時，<br>請重新登入以繼續您的冒險旅程。</p>
          <button
            @click="login"
            :disabled="!isReady"
            class="w-full py-3 px-6 bg-transparent border-2 border-epic-red text-epic-red hover:bg-epic-red hover:text-white transition-all duration-300 rounded font-serif tracking-wider uppercase disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(241,111,79,0.2)] hover:shadow-[0_0_20px_rgba(241,111,79,0.6)]"
          >
            重新登入
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useAuthStore } from './stores/auth';
import Login from './components/Login.vue';
import Dashboard from './components/Dashboard.vue';

const store = useAuthStore();
const { isAuthenticated, isSessionExpired, isGapiLoaded, isGsiLoaded } = storeToRefs(store);
const { loadGapi, loadGsi, login } = store;

const isReady = computed(() => isGapiLoaded.value && isGsiLoaded.value);

onMounted(() => {
  loadGapi();
  loadGsi();
});
</script>
