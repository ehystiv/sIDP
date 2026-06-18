<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { authState } from '../stores/auth';
import {
  assignRole,
  deleteUser,
  listRoles,
  listUsers,
  removeRole,
  updateUser,
} from '../api/resources';
import type { Role, User } from '../types';

const users = ref<User[]>([]);
const roles = ref<Role[]>([]);
const trashed = ref(false);
const error = ref('');

const editingId = ref<string | null>(null);
const editName = ref('');
const editUsername = ref('');

const roleToAdd = ref<Record<string, string>>({});

async function refresh() {
  error.value = '';
  try {
    const [usersRes, rolesRes] = await Promise.all([listUsers(trashed.value), listRoles()]);
    users.value = usersRes;
    roles.value = rolesRes;
  } catch (err: any) {
    error.value = err.response?.data?.message ?? 'Errore nel caricamento dei dati';
  }
}

onMounted(refresh);

function startEdit(user: User) {
  editingId.value = user.id;
  editName.value = user.name;
  editUsername.value = user.username;
}

function cancelEdit() {
  editingId.value = null;
}

async function saveEdit(id: string) {
  try {
    await updateUser(id, { name: editName.value, username: editUsername.value });
    editingId.value = null;
    await refresh();
  } catch (err: any) {
    error.value = err.response?.data?.message ?? 'Errore durante il salvataggio';
  }
}

async function onDelete(id: string) {
  try {
    await deleteUser(id);
    await refresh();
  } catch (err: any) {
    error.value = err.response?.data?.message ?? 'Errore durante la cancellazione';
  }
}

function availableRoles(user: User): Role[] {
  return roles.value.filter((role) => !user.roles.some((r) => r.id === role.id));
}

async function onAssignRole(userId: string) {
  const roleId = roleToAdd.value[userId];
  if (!roleId) return;
  try {
    await assignRole(userId, roleId);
    roleToAdd.value[userId] = '';
    await refresh();
  } catch (err: any) {
    error.value = err.response?.data?.message ?? 'Errore durante l\'assegnazione del ruolo';
  }
}

async function onRemoveRole(userId: string, roleId: string) {
  try {
    await removeRole(userId, roleId);
    await refresh();
  } catch (err: any) {
    error.value = err.response?.data?.message ?? 'Errore durante la rimozione del ruolo';
  }
}
</script>

<template>
  <div>
    <div class="toolbar">
      <h2>Utenti</h2>
      <label>
        <input type="checkbox" v-model="trashed" @change="refresh" />
        Mostra eliminati
      </label>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <table>
      <thead>
        <tr>
          <th>Nome</th>
          <th>Username</th>
          <th>Ruoli</th>
          <th>Azioni</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.id">
          <template v-if="editingId === user.id">
            <td><input v-model="editName" /></td>
            <td><input v-model="editUsername" /></td>
            <td>—</td>
            <td>
              <button @click="saveEdit(user.id)">Salva</button>
              <button @click="cancelEdit">Annulla</button>
            </td>
          </template>
          <template v-else>
            <td>{{ user.name }}</td>
            <td>{{ user.username }}</td>
            <td>
              <span v-for="role in user.roles" :key="role.id" class="chip">
                {{ role.name }}
                <button class="chip-remove" @click="onRemoveRole(user.id, role.id)">×</button>
              </span>
              <div class="role-assign">
                <select v-model="roleToAdd[user.id]">
                  <option value="">+ ruolo</option>
                  <option v-for="role in availableRoles(user)" :key="role.id" :value="role.id">
                    {{ role.name }}
                  </option>
                </select>
                <button @click="onAssignRole(user.id)" :disabled="!roleToAdd[user.id]">Aggiungi</button>
              </div>
            </td>
            <td>
              <button v-if="user.id === authState.userId" @click="startEdit(user)">Modifica</button>
              <button v-if="user.id === authState.userId" @click="onDelete(user.id)">Elimina</button>
              <span v-else class="hint">solo il proprietario può modificare</span>
            </td>
          </template>
        </tr>
      </tbody>
    </table>
  </div>
</template>
