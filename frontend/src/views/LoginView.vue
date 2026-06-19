<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { login } from '../stores/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

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
  <div class="mx-auto mt-20 max-w-sm">
    <Card>
      <CardHeader>
        <CardTitle class="text-xl">sIDP Admin</CardTitle>
        <CardDescription>Accedi per gestire utenti e ruoli</CardDescription>
      </CardHeader>
      <CardContent>
        <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
          <div class="flex flex-col gap-2">
            <Label for="username">Username</Label>
            <Input id="username" v-model="username" required autocomplete="username" />
          </div>
          <div class="flex flex-col gap-2">
            <Label for="password">Password</Label>
            <Input
              id="password"
              v-model="password"
              type="password"
              required
              autocomplete="current-password"
            />
          </div>
          <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
          <Button type="submit" :disabled="loading" class="w-full">
            {{ loading ? 'Accesso in corso…' : 'Accedi' }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
