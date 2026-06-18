<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { login } from '../stores/auth';

const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

const route = useRoute();
const router = useRouter();

async function onSubmit() {
  error.value = '';
  loading.value = true;
  try {
    await login(username.value, password.value);
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
    await router.push(redirect);
  } catch (err: any) {
    error.value = err.response?.data?.message ?? 'Login fallito';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login">
    <h1>sIDP Admin</h1>
    <form @submit.prevent="onSubmit">
      <label>
        Username
        <input v-model="username" required autocomplete="username" />
      </label>
      <label>
        Password
        <input v-model="password" type="password" required autocomplete="current-password" />
      </label>
      <p v-if="error" class="error">{{ error }}</p>
      <button type="submit" :disabled="loading">
        {{ loading ? 'Accesso in corso…' : 'Accedi' }}
      </button>
    </form>
  </div>
</template>
