<template>
  <div class="admin-users">
    <header class="admin-users__header">
      <PageTitle label="Admin" title="Users" />
    </header>

    <section class="card admin-users__card">
      <div v-if="adminStore.isLoading && adminStore.users.length === 0" class="admin-users__state">
        Loading users…
      </div>
      <div v-else-if="adminStore.loadError" class="admin-users__state admin-users__state--error">
        {{ adminStore.loadError }}
      </div>
      <div v-else-if="adminStore.users.length === 0" class="admin-users__state">
        No users yet.
      </div>
      <div v-else class="admin-users__table-wrap">
        <table class="admin-users__table">
          <thead>
            <tr>
              <th>User</th>
              <th>Socials</th>
              <th>Plan</th>
              <th>Credits used</th>
              <th class="admin-users__col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in adminStore.users" :key="user.id">
              <td>
                <div class="admin-users__user-cell">
                  <div class="admin-users__avatar">
                    <img v-if="user.image" :src="user.image" :alt="user.name" />
                    <span v-else>{{ initialsFor(user) }}</span>
                  </div>
                  <div class="admin-users__user-info">
                    <p class="admin-users__user-name">
                      {{ user.name || user.email }}
                      <span v-if="user.isAdmin" class="admin-users__badge">Admin</span>
                    </p>
                    <p class="admin-users__user-handle">
                      <span v-if="user.handle">@{{ user.handle }}</span>
                      <span v-else class="admin-users__muted">{{ user.email }}</span>
                    </p>
                  </div>
                </div>
              </td>
              <td>
                <div class="admin-users__socials">
                  <a
                    v-for="account in user.socialAccounts"
                    :key="account.platform"
                    :href="account.profileUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="admin-users__social-link"
                    :title="`@${account.handle} on ${account.platform}`"
                  >
                    <PlatformIcon :platform="account.platform" />
                  </a>
                  <span v-if="user.socialAccounts.length === 0" class="admin-users__muted">
                    Not connected
                  </span>
                </div>
              </td>
              <td>
                <span class="admin-users__plan" :class="`admin-users__plan--${user.plan}`">
                  {{ user.planName }}
                </span>
              </td>
              <td>
                <div class="admin-users__credits">
                  <div class="admin-users__credits-bar">
                    <div
                      class="admin-users__credits-fill"
                      :style="{ width: user.creditsUsedPercent + '%' }"
                    ></div>
                  </div>
                  <span class="admin-users__credits-text">
                    {{ user.creditsUsedPercent }}%
                    <span class="admin-users__muted">
                      ({{ user.creditsUsed }} / {{ user.monthlyCredits }})
                    </span>
                  </span>
                </div>
              </td>
              <td>
                <button type="button" class="btn btn--secondary" @click="openGrantModal(user)">
                  Add credits
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="grantTarget" class="admin-modal" role="dialog" aria-modal="true" @click.self="closeGrantModal">
        <div class="admin-modal__panel">
          <h3 class="admin-modal__title">Add credits</h3>
          <p class="admin-modal__subtitle">
            For <strong>{{ grantTarget.name || grantTarget.email }}</strong>
            <span class="admin-users__muted">— current balance: {{ grantTarget.balance }}</span>
          </p>
          <label class="admin-modal__label" for="grantAmount">Amount</label>
          <input
            id="grantAmount"
            v-model.number="grantAmount"
            type="number"
            min="1"
            step="1"
            class="admin-modal__input"
            :disabled="isGranting"
          />
          <p v-if="grantError" class="admin-modal__error">{{ grantError }}</p>
          <div class="admin-modal__actions">
            <button type="button" class="btn btn--ghost" :disabled="isGranting" @click="closeGrantModal">
              Cancel
            </button>
            <button type="button" class="btn btn--primary" :disabled="isGranting || !canSubmit" @click="submitGrant">
              {{ isGranting ? 'Granting…' : 'Grant credits' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import PageTitle from '~/components/PageTitle.vue';
import PlatformIcon from '~/components/PlatformIcon.vue';
import { useAdminStore, type AdminUser } from '~/stores/admin';

definePageMeta({
  layout: 'default',
  middleware: 'admin',
  ssr: false,
});

useHead({ title: 'Users — Admin' });

const adminStore = useAdminStore();

const grantTarget = ref<AdminUser | null>(null);
const grantAmount = ref<number>(100);
const grantError = ref('');
const isGranting = ref(false);

const canSubmit = computed(() => Number.isInteger(grantAmount.value) && grantAmount.value > 0);

function initialsFor(user: AdminUser): string {
  const source = user.name || user.email;
  if (!source) return '?';
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
}

function openGrantModal(user: AdminUser): void {
  grantTarget.value = user;
  grantAmount.value = 100;
  grantError.value = '';
}

function closeGrantModal(): void {
  if (isGranting.value) return;
  grantTarget.value = null;
  grantError.value = '';
}

async function submitGrant(): Promise<void> {
  if (!grantTarget.value || !canSubmit.value) return;
  isGranting.value = true;
  grantError.value = '';
  try {
    await adminStore.grantCredits(grantTarget.value.id, grantAmount.value);
    grantTarget.value = null;
  } catch (error: unknown) {
    const apiError = error as { data?: { error?: string } };
    grantError.value = apiError?.data?.error ?? 'Failed to grant credits';
  } finally {
    isGranting.value = false;
  }
}

onMounted(() => {
  adminStore.loadUsers();
});
</script>

<style scoped>
.admin-users {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2.5rem 2rem 4rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.admin-users__card {
  padding: 1.25rem;
}

.admin-users__state {
  padding: 2rem;
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
}

.admin-users__state--error {
  color: #b91c1c;
}

.admin-users__table-wrap {
  overflow-x: auto;
}

.admin-users__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.admin-users__table th,
.admin-users__table td {
  padding: 0.75rem 0.875rem;
  text-align: left;
  vertical-align: middle;
  border-bottom: 1px solid #f1f5f9;
}

.admin-users__table th {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6b7280;
  background: #f8fafc;
}

.admin-users__table tbody tr:hover {
  background: #fafbff;
}

.admin-users__col-actions {
  width: 1%;
  white-space: nowrap;
}

.admin-users__user-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.admin-users__avatar {
  width: 40px;
  height: 40px;
  border-radius: 9999px;
  overflow: hidden;
  background: #eef2ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #4338ca;
  font-size: 0.8125rem;
  flex-shrink: 0;
}

.admin-users__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.admin-users__user-info {
  min-width: 0;
}

.admin-users__user-name {
  margin: 0;
  font-weight: 600;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.admin-users__user-handle {
  margin: 0.125rem 0 0;
  font-size: 0.8125rem;
  color: #4f46e5;
  font-weight: 500;
}

.admin-users__muted {
  color: #9ca3af;
  font-weight: 400;
}

.admin-users__badge {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  background: #ede9fe;
  color: #6d28d9;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.admin-users__socials {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.admin-users__social-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  text-decoration: none;
  transition: transform 0.15s ease;
}

.admin-users__social-link:hover {
  transform: scale(1.1);
}

.admin-users__plan {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  background: #f3f4f6;
  color: #374151;
  text-transform: capitalize;
}

.admin-users__plan--creator {
  background: #ede9fe;
  color: #5b21b6;
}

.admin-users__plan--pro {
  background: linear-gradient(135deg, #4f46e5, #9333ea);
  color: #fff;
}

.admin-users__credits {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 140px;
}

.admin-users__credits-bar {
  height: 6px;
  background: #e5e7eb;
  border-radius: 9999px;
  overflow: hidden;
}

.admin-users__credits-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #818cf8);
  border-radius: 9999px;
  transition: width 0.3s ease;
}

.admin-users__credits-text {
  font-size: 0.75rem;
  color: #4b5563;
  font-weight: 500;
}

.btn {
  padding: 0.5rem 0.875rem;
  border: none;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s, opacity 0.15s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn--primary {
  background: linear-gradient(135deg, #3525cd 0%, #4f46e5 100%);
  color: #fff;
}

.btn--secondary {
  background: #eef2ff;
  color: #4338ca;
}

.btn--secondary:hover:not(:disabled) {
  background: #e0e7ff;
}

.btn--ghost {
  background: transparent;
  color: #4b5563;
}

.btn--ghost:hover:not(:disabled) {
  background: #f3f4f6;
}

.admin-modal {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 100;
}

.admin-modal__panel {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  box-shadow: 0 24px 48px -12px rgba(15, 23, 42, 0.25);
}

.admin-modal__title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: #111827;
}

.admin-modal__subtitle {
  margin: 0;
  font-size: 0.8125rem;
  color: #4b5563;
}

.admin-modal__label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #374151;
  margin-top: 0.25rem;
}

.admin-modal__input {
  padding: 0.625rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #111827;
  background: #fff;
  transition: border-color 0.15s;
}

.admin-modal__input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.admin-modal__error {
  margin: 0;
  font-size: 0.8125rem;
  color: #b91c1c;
}

.admin-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #f1f5f9;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
}
</style>
