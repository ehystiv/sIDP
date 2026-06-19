<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { createRole, deleteRole, listRoles, updateRole } from '../api/resources';
import type { Role } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const roles = ref<Role[]>([]);
const error = ref('');

const newName = ref('');
const newDescription = ref('');

const editingId = ref<string | null>(null);
const editName = ref('');
const editDescription = ref('');

async function refresh() {
  error.value = '';
  try {
    roles.value = await listRoles();
  } catch (err: any) {
    error.value = err.response?.data?.message ?? 'Errore nel caricamento dei ruoli';
  }
}

onMounted(refresh);

async function onCreate() {
  if (!newName.value) return;
  try {
    await createRole({ name: newName.value, description: newDescription.value || undefined });
    newName.value = '';
    newDescription.value = '';
    await refresh();
  } catch (err: any) {
    error.value = err.response?.data?.message ?? 'Errore durante la creazione del ruolo';
  }
}

function startEdit(role: Role) {
  editingId.value = role.id;
  editName.value = role.name;
  editDescription.value = role.description ?? '';
}

function cancelEdit() {
  editingId.value = null;
}

async function saveEdit(id: string) {
  try {
    await updateRole(id, { name: editName.value, description: editDescription.value || undefined });
    editingId.value = null;
    await refresh();
  } catch (err: any) {
    error.value = err.response?.data?.message ?? 'Errore durante il salvataggio del ruolo';
  }
}

async function onDelete(id: string) {
  try {
    await deleteRole(id);
    await refresh();
  } catch (err: any) {
    error.value = err.response?.data?.message ?? 'Errore durante la cancellazione del ruolo';
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <h2 class="text-2xl font-semibold">Ruoli</h2>

    <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">Nuovo ruolo</CardTitle>
      </CardHeader>
      <CardContent>
        <form class="flex gap-2" @submit.prevent="onCreate">
          <Input v-model="newName" placeholder="Nome ruolo" required />
          <Input v-model="newDescription" placeholder="Descrizione (opzionale)" />
          <Button type="submit">Crea</Button>
        </form>
      </CardContent>
    </Card>

    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Descrizione</TableHead>
          <TableHead class="text-right">Azioni</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="role in roles" :key="role.id">
          <template v-if="editingId === role.id">
            <TableCell><Input v-model="editName" /></TableCell>
            <TableCell><Input v-model="editDescription" /></TableCell>
            <TableCell class="flex justify-end gap-2">
              <Button size="sm" @click="saveEdit(role.id)">Salva</Button>
              <Button size="sm" variant="outline" @click="cancelEdit">Annulla</Button>
            </TableCell>
          </template>
          <template v-else>
            <TableCell class="font-medium">{{ role.name }}</TableCell>
            <TableCell class="text-muted-foreground">{{ role.description ?? '—' }}</TableCell>
            <TableCell class="flex justify-end gap-2">
              <Button size="sm" variant="outline" @click="startEdit(role)">Modifica</Button>
              <Button size="sm" variant="destructive" @click="onDelete(role.id)">Elimina</Button>
            </TableCell>
          </template>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
