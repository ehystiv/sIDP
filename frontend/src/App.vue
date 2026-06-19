<script setup lang="ts">
import { useRouter } from 'vue-router';
import { authState, logout } from './stores/auth';
import { Button } from '@/components/ui/button';

const router = useRouter();

async function onLogout() {
  await logout();
  await router.push('/login');
}
</script>

<template>
  <div class="min-h-screen bg-background">
    <nav v-if="authState.accessToken" class="flex items-center gap-6 border-b px-6 py-3">
      <span class="font-semibold">sIDP Admin</span>
      <RouterLink to="/" class="text-sm text-muted-foreground hover:text-foreground" active-class="text-foreground font-medium">
        Utenti
      </RouterLink>
      <RouterLink to="/roles" class="text-sm text-muted-foreground hover:text-foreground" active-class="text-foreground font-medium">
        Ruoli
      </RouterLink>
      <span class="flex-1" />
      <span class="text-sm text-muted-foreground">{{ authState.username }}</span>
      <Button variant="outline" size="sm" @click="onLogout">Esci</Button>
    </nav>
    <main class="mx-auto max-w-4xl p-6">
      <RouterView />
    </main>
  </div>
</template>
