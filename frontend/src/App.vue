<script setup lang="ts">
import { useRouter } from 'vue-router';
import { authState, logout } from './stores/auth';

const router = useRouter();

async function onLogout() {
  await logout();
  await router.push('/login');
}
</script>

<template>
  <div id="app-shell">
    <nav v-if="authState.accessToken">
      <span class="brand">sIDP Admin</span>
      <RouterLink to="/">Utenti</RouterLink>
      <RouterLink to="/roles">Ruoli</RouterLink>
      <span class="spacer" />
      <span class="username">{{ authState.username }}</span>
      <button @click="onLogout">Esci</button>
    </nav>
    <main>
      <RouterView />
    </main>
  </div>
</template>
