import api from './client';
import type { Role, User } from '../types';

export function listUsers(trashed = false) {
  return api
    .get<User[]>('/users', { params: { trashed } })
    .then((res) => res.data);
}

export function updateUser(id: string, data: { name?: string; username?: string; password?: string }) {
  return api.patch<User>(`/users/${id}`, data).then((res) => res.data);
}

export function deleteUser(id: string) {
  return api.delete(`/users/${id}`);
}

export function listRoles() {
  return api.get<Role[]>('/roles').then((res) => res.data);
}

export function createRole(data: { name: string; description?: string }) {
  return api.post<Role>('/roles', data).then((res) => res.data);
}

export function updateRole(id: string, data: { name?: string; description?: string }) {
  return api.patch<Role>(`/roles/${id}`, data).then((res) => res.data);
}

export function deleteRole(id: string) {
  return api.delete(`/roles/${id}`);
}

export function assignRole(userId: string, roleId: string) {
  return api.post<User>(`/users/${userId}/roles/${roleId}`);
}

export function removeRole(userId: string, roleId: string) {
  return api.delete<User>(`/users/${userId}/roles/${roleId}`);
}
