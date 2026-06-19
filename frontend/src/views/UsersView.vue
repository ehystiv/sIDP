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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { X } from '@lucide/vue';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

function onToggleTrashed(value: boolean | 'indeterminate') {
  trashed.value = value === true;
  refresh();
}

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
    error.value = err.response?.data?.message ?? "Errore durante l'assegnazione del ruolo";
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
  <div class="flex flex-col gap-6">
    <div class="flex items-baseline justify-between">
      <h2 class="text-2xl font-semibold">Utenti</h2>
      <Label class="flex items-center gap-2 text-sm">
        <Checkbox :model-value="trashed" @update:model-value="onToggleTrashed" />
        Mostra eliminati
      </Label>
    </div>

    <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Username</TableHead>
          <TableHead>Ruoli</TableHead>
          <TableHead class="text-right">Azioni</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="user in users" :key="user.id">
          <template v-if="editingId === user.id">
            <TableCell><Input v-model="editName" /></TableCell>
            <TableCell><Input v-model="editUsername" /></TableCell>
            <TableCell>—</TableCell>
            <TableCell class="flex justify-end gap-2">
              <Button size="sm" @click="saveEdit(user.id)">Salva</Button>
              <Button size="sm" variant="outline" @click="cancelEdit">Annulla</Button>
            </TableCell>
          </template>
          <template v-else>
            <TableCell class="font-medium">{{ user.name }}</TableCell>
            <TableCell class="text-muted-foreground">{{ user.username }}</TableCell>
            <TableCell>
              <div class="flex flex-wrap items-center gap-1">
                <Badge v-for="role in user.roles" :key="role.id" variant="secondary" class="gap-1 pr-1">
                  {{ role.name }}
                  <button
                    type="button"
                    class="rounded-full p-0.5 hover:bg-muted-foreground/20"
                    @click="onRemoveRole(user.id, role.id)"
                  >
                    <X class="size-3" />
                  </button>
                </Badge>
              </div>
              <div class="mt-2 flex gap-2">
                <Select v-model="roleToAdd[user.id]">
                  <SelectTrigger size="sm" class="h-8 w-36">
                    <SelectValue placeholder="+ ruolo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="role in availableRoles(user)" :key="role.id" :value="role.id">
                      {{ role.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" :disabled="!roleToAdd[user.id]" @click="onAssignRole(user.id)">
                  Aggiungi
                </Button>
              </div>
            </TableCell>
            <TableCell class="text-right">
              <div v-if="user.id === authState.userId" class="flex justify-end gap-2">
                <Button size="sm" variant="outline" @click="startEdit(user)">Modifica</Button>
                <Button size="sm" variant="destructive" @click="onDelete(user.id)">Elimina</Button>
              </div>
              <span v-else class="text-xs text-muted-foreground">solo il proprietario può modificare</span>
            </TableCell>
          </template>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
