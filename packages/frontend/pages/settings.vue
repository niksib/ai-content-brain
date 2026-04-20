<template>
  <div class="settings-page">

    <!-- Subscription -->
    <section class="settings-section">
      <h2 class="section-title">Subscription</h2>
      <div class="info-row">
        <span class="info-label">Plan</span>
        <span class="info-value">Free (Beta)</span>
      </div>
      <div class="credits-progress-wrap">
        <div class="credits-progress__header">
          <span class="info-label">Credits Used</span>
          <span class="credits-progress__stat">{{ creditsUsedPercent }}%</span>
        </div>
        <div class="credits-progress__bar">
          <div
            class="credits-progress__fill"
            :style="{ width: creditsUsedPercent + '%' }"
          ></div>
        </div>
      </div>
      <div class="placeholder-actions">
        <button type="button" class="btn btn--primary" @click="handleBuyCredits">
          Buy Credits
        </button>
      </div>
      <p v-if="billingStatus === 'success'" class="save-message">Payment successful! Credits have been added.</p>
      <p v-if="billingStatus === 'cancel'" class="save-message save-message--error">Payment was cancelled.</p>
    </section>

    <!-- Account -->
    <section class="settings-section">
      <h2 class="section-title">Account</h2>

      <div class="info-row">
        <span class="info-label">Email</span>
        <span class="info-value">{{ profileStore.userEmail || '---' }}</span>
      </div>

      <!-- Change Password -->
      <div class="account-action">
        <div class="account-action__header">
          <div>
            <p class="account-action__title">Password</p>
            <p class="account-action__desc">Update your account password</p>
          </div>
          <button
            type="button"
            class="btn btn--secondary"
            @click="showPasswordForm = !showPasswordForm"
          >
            {{ showPasswordForm ? 'Cancel' : 'Change Password' }}
          </button>
        </div>

        <form v-if="showPasswordForm" class="account-subform" @submit.prevent="handleChangePassword">
          <div class="form-group">
            <label class="form-label" for="currentPassword">Current Password</label>
            <input
              id="currentPassword"
              v-model="passwordForm.current"
              type="password"
              class="form-input"
              autocomplete="current-password"
              placeholder="Enter current password"
              required
            />
          </div>
          <div class="form-group">
            <label class="form-label" for="newPassword">New Password</label>
            <input
              id="newPassword"
              v-model="passwordForm.next"
              type="password"
              class="form-input"
              autocomplete="new-password"
              placeholder="At least 8 characters"
              minlength="8"
              required
            />
          </div>
          <div class="form-group">
            <label class="form-label" for="confirmPassword">Confirm New Password</label>
            <input
              id="confirmPassword"
              v-model="passwordForm.confirm"
              type="password"
              class="form-input"
              autocomplete="new-password"
              placeholder="Repeat new password"
              required
            />
          </div>
          <p v-if="passwordError" class="save-message save-message--error">{{ passwordError }}</p>
          <p v-if="passwordSuccess" class="save-message">{{ passwordSuccess }}</p>
          <button
            type="submit"
            class="btn btn--primary"
            :disabled="isChangingPassword"
          >
            {{ isChangingPassword ? 'Saving...' : 'Save New Password' }}
          </button>
        </form>
      </div>

      <!-- Delete Account -->
      <div class="account-action account-action--danger">
        <div class="account-action__header">
          <div>
            <p class="account-action__title account-action__title--danger">Delete Account</p>
            <p class="account-action__desc">Permanently delete your account and all data</p>
          </div>
          <button
            type="button"
            class="btn btn--danger"
            :disabled="isDeletingAccount"
            @click="handleDeleteAccount"
          >
            {{ isDeletingAccount ? 'Deleting...' : 'Delete Account' }}
          </button>
        </div>
        <p v-if="deleteError" class="save-message save-message--error">{{ deleteError }}</p>
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { useProfileStore } from '~/stores/profile';
import { useBillingStore } from '~/stores/billing';

definePageMeta({
  layout: 'default',
  ssr: false,
});

const config = useRuntimeConfig();
const router = useRouter();
const route = useRoute();

const profileStore = useProfileStore();
const billingStore = useBillingStore();

const PLAN_MAX_CREDITS = 500;
const creditsUsedPercent = computed(() => {
  const used = PLAN_MAX_CREDITS - billingStore.balance;
  return Math.max(0, Math.min(100, Math.round((used / PLAN_MAX_CREDITS) * 100)));
});

const billingStatus = computed(() => route.query.billing as string | undefined);

// ── Change Password ──
const showPasswordForm = ref(false);
const isChangingPassword = ref(false);
const passwordError = ref('');
const passwordSuccess = ref('');
const passwordForm = reactive({ current: '', next: '', confirm: '' });

// ── Delete Account ──
const isDeletingAccount = ref(false);
const deleteError = ref('');

function handleBuyCredits() {
  billingStore.createCheckout('price_credits_500', 'payment');
}

async function handleChangePassword() {
  passwordError.value = '';
  passwordSuccess.value = '';

  if (passwordForm.next !== passwordForm.confirm) {
    passwordError.value = 'New passwords do not match.';
    return;
  }
  if (passwordForm.next.length < 8) {
    passwordError.value = 'New password must be at least 8 characters.';
    return;
  }

  isChangingPassword.value = true;
  try {
    await $fetch(`${config.public.apiBaseUrl}/api/auth/change-password`, {
      method: 'POST',
      credentials: 'include',
      body: {
        currentPassword: passwordForm.current,
        newPassword: passwordForm.next,
      },
    });
    passwordSuccess.value = 'Password updated successfully.';
    passwordForm.current = '';
    passwordForm.next = '';
    passwordForm.confirm = '';
    setTimeout(() => {
      showPasswordForm.value = false;
      passwordSuccess.value = '';
    }, 2000);
  } catch (error: unknown) {
    const apiError = error as { data?: { message?: string } };
    passwordError.value = apiError?.data?.message ?? 'Failed to change password. Check your current password and try again.';
  } finally {
    isChangingPassword.value = false;
  }
}

async function handleDeleteAccount() {
  const confirmed = confirm(
    'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.'
  );
  if (!confirmed) return;

  deleteError.value = '';
  isDeletingAccount.value = true;
  try {
    await $fetch(`${config.public.apiBaseUrl}/api/auth/delete-user`, {
      method: 'POST',
      credentials: 'include',
    });
    const isAuthenticated = useState<boolean | null>('auth:authenticated');
    isAuthenticated.value = false;
    router.replace('/');
  } catch (error: unknown) {
    const apiError = error as { data?: { message?: string } };
    deleteError.value = apiError?.data?.message ?? 'Failed to delete account. Please try again.';
  } finally {
    isDeletingAccount.value = false;
  }
}

onMounted(async () => {
  await Promise.all([
    profileStore.loadProfile(),
    billingStore.loadBalance(),
  ]);
});
</script>

<style scoped>
.settings-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2.5rem 2rem 4rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.settings-section {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.375rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.375rem 0;
}

.info-row + .info-row {
  border-top: 1px solid #f3f4f6;
}

.info-label {
  font-size: 0.875rem;
  color: #6b7280;
}

.info-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: #111827;
}

.credits-progress-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.credits-progress__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.credits-progress__stat {
  font-size: 0.8125rem;
  font-weight: 700;
  color: #6366f1;
}

.credits-progress__bar {
  height: 8px;
  background: #e5e7eb;
  border-radius: 9999px;
  overflow: hidden;
}

.credits-progress__fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #818cf8);
  border-radius: 9999px;
  transition: width 0.4s ease;
}

.placeholder-actions {
  display: flex;
  gap: 0.75rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.form-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #374151;
}

.form-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #111827;
  background: #fff;
  transition: border-color 0.15s;
}

.form-input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn--primary {
  background: #6366f1;
  color: #fff;
}

.btn--primary:hover:not(:disabled) {
  background: #4f46e5;
}

.btn--secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn--danger {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.save-message {
  font-size: 0.8125rem;
  color: #059669;
  margin: 0;
}

.save-message--error {
  color: #dc2626;
}

.account-action {
  border-top: 1px solid #f3f4f6;
  padding-top: 1.25rem;
  margin-top: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.account-action--danger {
  border-top-color: #fee2e2;
}

.account-action__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.account-action__title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.125rem;
}

.account-action__title--danger {
  color: #dc2626;
}

.account-action__desc {
  font-size: 0.8125rem;
  color: #9ca3af;
}

.account-subform {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  background: #f9fafb;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
}
</style>
