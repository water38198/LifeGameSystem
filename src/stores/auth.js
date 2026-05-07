import { ref } from 'vue';
import { defineStore } from 'pinia';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY    = import.meta.env.VITE_GOOGLE_API_KEY;
const SCOPES     = 'https://www.googleapis.com/auth/spreadsheets';

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated  = ref(false);
  const isGapiLoaded     = ref(false);
  const isGsiLoaded      = ref(false);
  const isSessionExpired = ref(false);

  let tokenClient;
  let tokenRefreshTimer = null;

  function scheduleTokenRefresh() {
    if (tokenRefreshTimer) clearTimeout(tokenRefreshTimer);
    tokenRefreshTimer = setTimeout(() => {
      tokenClient.requestAccessToken({ prompt: '' });
    }, 55 * 60 * 1000);
  }

  function loadGapi() {
    if (window.gapi) {
      window.gapi.load('client', initializeGapiClient);
    } else {
      setTimeout(loadGapi, 100);
    }
  }

  async function initializeGapiClient() {
    try {
      await window.gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
      });
      isGapiLoaded.value = true;
    } catch (err) {
      console.error('GAPI 初始化失敗', err);
    }
  }

  function loadGsi() {
    if (window.google) {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
          if (tokenResponse.error) {
            if (isAuthenticated.value) {
              isAuthenticated.value = false;
              isSessionExpired.value = true;
            }
            return;
          }
          if (tokenResponse?.access_token) {
            const firstLogin = !isAuthenticated.value;
            isAuthenticated.value = true;
            isSessionExpired.value = false;
            scheduleTokenRefresh();
            if (firstLogin) {
              // 延遲 import 避免循環依賴
              import('./game').then(({ useGameStore }) => {
                useGameStore().fetchAllData();
              });
            }
          }
        },
      });
      isGsiLoaded.value = true;
    } else {
      setTimeout(loadGsi, 100);
    }
  }

  function login() {
    if (tokenClient) {
      tokenClient.requestAccessToken();
    } else {
      console.warn('OAuth token client 尚未準備好');
    }
  }

  return { isAuthenticated, isGapiLoaded, isGsiLoaded, isSessionExpired, loadGapi, loadGsi, login };
});
