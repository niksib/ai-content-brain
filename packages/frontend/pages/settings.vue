<template>
  <div class="settings-page">

    <!-- Subscription -->
    <section class="card settings-section">
      <h2 class="section-title">Subscription</h2>
      <div class="info-row">
        <span class="info-label">Plan</span>
        <span class="info-value">{{ planLabel }}</span>
      </div>
      <div v-if="renewalLabel" class="info-row">
        <span class="info-label">{{ billingStore.subscription?.cancelAtPeriodEnd ? 'Cancels on' : 'Renews on' }}</span>
        <span class="info-value">{{ renewalLabel }}</span>
      </div>
      <div class="credits-progress-wrap">
        <div class="credits-progress__header">
          <span class="info-label">Monthly usage</span>
          <span class="credits-progress__stat">{{ creditsUsedPercent }}% used</span>
        </div>
        <div class="credits-progress__bar">
          <div
            class="credits-progress__fill"
            :style="{ width: creditsUsedPercent + '%' }"
          ></div>
        </div>
      </div>
      <div class="subscription-actions">
        <button type="button" class="btn btn--primary" @click="billingStore.openPricingModal">
          {{ isPaidPlan ? 'Change plan' : 'Upgrade' }}
        </button>
        <button
          v-if="isPaidPlan"
          type="button"
          class="btn btn--secondary"
          :disabled="isOpeningPortal"
          @click="openPortal"
        >
          {{ isOpeningPortal ? 'Opening…' : 'Manage billing' }}
        </button>
      </div>
      <p v-if="billingStatus === 'success'" class="save-message">Payment successful! Your plan is active.</p>
      <p v-if="billingStatus === 'cancel'" class="save-message save-message--error">Checkout was cancelled.</p>
    </section>

    <!-- Account -->
    <section class="card settings-section">
      <h2 class="section-title">Account</h2>

      <!-- Delete Account -->
      <div class="account-action account-action--danger account-action--first">
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
import { ref, onMounted, computed } from 'vue';
import { useProfileStore } from '~/stores/profile';
import { useBillingStore } from '~/stores/billing';

definePageMeta({
  layout: 'default',
  ssr: false,
});

useHead({ title: 'Settings — HeyPostrr' });

const config = useRuntimeConfig();
const router = useRouter();
const route = useRoute();

const profileStore = useProfileStore();
const billingStore = useBillingStore();

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  creator: 'Creator',
  pro: 'Pro',
};

const planLabel = computed(() => {
  const planId = billingStore.subscription?.plan ?? 'free';
  return PLAN_LABELS[planId] ?? 'Free';
});

const planMonthlyCredits = computed(() => billingStore.subscription?.monthlyCredits ?? 100);

const isPaidPlan = computed(() => {
  const planId = billingStore.subscription?.plan;
  return planId === 'creator' || planId === 'pro';
});

const creditsUsedPercent = computed(() => {
  const max = planMonthlyCredits.value || 1;
  const used = max - billingStore.balance;
  return Math.max(0, Math.min(100, Math.round((used / max) * 100)));
});

const renewalLabel = computed(() => {
  const iso = billingStore.subscription?.currentPeriodEnd;
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
});

const isOpeningPortal = ref(false);

async function openPortal() {
  isOpeningPortal.value = true;
  try {
    await billingStore.openPortal();
  } finally {
    isOpeningPortal.value = false;
  }
}

const billingStatus = computed(() => route.query.billing as string | undefined);

// ── Delete Account ──
const isDeletingAccount = ref(false);
const deleteError = ref('');

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
    billingStore.loadSubscription(),
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
  overflow-wrap: anywhere;
  min-width: 0;
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

.credits-progress__hint {
  font-size: 0.75rem;
  color: #9ca3af;
  margin: 0.375rem 0 0;
}

.subscription-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
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
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
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

.account-action--first {
  border-top: none;
  padding-top: 0;
  margin-top: 0;
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
