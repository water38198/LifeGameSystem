<template>
  <Dashboard v-if="isAuthenticated" />
  <Login v-else />
</template>

<script setup>
import { onMounted } from 'vue';
import { loadGapi, loadGsi, isAuthenticated } from './services/googleAuth';
import Login from './components/Login.vue';
import Dashboard from './components/Dashboard.vue';

onMounted(() => {
  // 網頁載入時初始化 Google API 與登入套件
  loadGapi();
  loadGsi();
});
</script>
