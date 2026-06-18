<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { createRole, deleteRole, listRoles, updateRole } from '../api/resources';
import type { Role } from '../types';

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
  <div>
    <h2>Ruoli</h2>

    <p v-if="error" class="error">{{ error }}</p>

    <form class="new-role" @submit.prevent="onCreate">
      <input v-model="newName" placeholder="Nome ruolo" required />
      <input v-model="newDescription" placeholder="Descrizione (opzionale)" />
      <button type="submit">Crea ruolo</button>
    </form>

    <table>
      <thead>
        <tr>
          <th>Nome</th>
          <th>Descrizione</th>
          <th>Azioni</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="role in roles" :key="role.id">
          <template v-if="editingId === role.id">
            <td><input v-model="editName" /></td>
            <td><input v-model="editDescription" /></td>
            <td>
              <button @click="saveEdit(role.id)">Salva</button>
              <button @click="cancelEdit">Annulla</button>
            </td>
          </template>
          <template v-else>
            <td>{{ role.name }}</td>
            <td>{{ role.description ?? '—' }}</td>
            <td>
              <button @click="startEdit(role)">Modifica</button>
              <button @click="onDelete(role.id)">Elimina</button>
            </td>
          </template>
        </tr>
      </tbody>
    </table>
  </div>
</template>
