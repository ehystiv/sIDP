import { createRouter, createWebHistory } from 'vue-router';
import { authState } from '../stores/auth';
import LoginView from '../views/LoginView.vue';
import UsersView from '../views/UsersView.vue';
import RolesView from '../views/RolesView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: LoginView },
    { path: '/', name: 'users', component: UsersView, meta: { requiresAuth: true } },
    { path: '/roles', name: 'roles', component: RolesView, meta: { requiresAuth: true } },
  ],
});

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !authState.accessToken) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (to.name === 'login' && authState.accessToken) {
    return { name: 'users' };
  }
});

export default router;
