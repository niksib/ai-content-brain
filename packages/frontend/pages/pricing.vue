<template>
  <div class="pricing-page">
    <div class="pricing-hero">
      <p class="pricing-hero__label">Pricing</p>
      <h1 class="pricing-hero__title">Choose your plan</h1>
      <p class="pricing-hero__subtitle">Monthly credits refill on every billing cycle. Unused credits don't roll over.</p>
    </div>

    <p v-if="errorMessage" class="pricing-error">{{ errorMessage }}</p>

    <div class="pricing-grid">
      <div
        v-for="plan in plans"
        :key="plan.id"
        class="plan-card"
        :class="{ 'plan-card--featured': plan.id === 'creator' }"
      >
        <div v-if="plan.id === 'creator'" class="plan-card__badge">Most Popular</div>
        <div class="plan-card__header">
          <h3 class="plan-card__name">{{ plan.name }}</h3>
          <div class="plan-card__price">
            <span class="plan-card__amount">${{ plan.priceUsd }}</span>
            <span class="plan-card__period">/ month</span>
          </div>
        </div>

        <ul class="plan-card__features">
          <li class="plan-card__feature">
            <CheckCircle :size="18" class="plan-card__check" />
            {{ plan.monthlyCredits.toLocaleString() }} credits / month
          </li>
          <li class="plan-card__feature">
            <CheckCircle :size="18" class="plan-card__check" />
            Threads publishing
          </li>
          <li class="plan-card__feature">
            <CheckCircle :size="18" class="plan-card__check" />
            Full voice matching
          </li>
          <li v-if="plan.id !== 'free'" class="plan-card__feature">
            <CheckCircle :size="18" class="plan-card__check" />
            Schedule posts
          </li>
          <li v-if="plan.id === 'pro'" class="plan-card__feature">
            <CheckCircle :size="18" class="plan-card__check" />
            Priority support
          </li>
        </ul>

        <button
          class="plan-card__btn"
          :class="plan.id === 'creator' ? 'plan-card__btn--primary' : 'plan-card__btn--secondary'"
          :disabled="isCurrentPlan(plan.id) || isSubmitting"
          @click="onSelect(plan.id)"
        >
          {{ ctaLabel(plan.id) }}
        </button>
      </div>
    </div>

    <div v-if="subscription && subscription.plan !== 'free'" class="pricing-portal">
      <button type="button" class="pricing-portal__btn" :disabled="isSubmitting" @click="onManage">
        Manage subscription
      </button>
      <span v-if="subscription.cancelAtPeriodEnd" class="pricing-portal__note">
        Cancels on {{ periodEndLabel }}
      </span>
    </div>

    <div class="pricing-back">
      <NuxtLink to="/dashboard" class="pricing-back__link">
        <ArrowLeft :size="18" />
        Back to Dashboard
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { CheckCircle, ArrowLeft } from 'lucide-vue-next';
import { useBillingStore, type PlanId } from '~/stores/billing';

definePageMeta({ layout: 'default' });
useSeoMeta({ title: 'Pricing — HeyPostrr' });

const billing = useBillingStore();
const isSubmitting = ref(false);
const errorMessage = ref('');

const plans = computed(() => billing.plans);
const subscription = computed(() => billing.subscription);

const periodEndLabel = computed(() => {
  const iso = subscription.value?.currentPeriodEnd;
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
});

function isCurrentPlan(planId: PlanId): boolean {
  return subscription.value?.plan === planId;
}

function ctaLabel(planId: PlanId): string {
  if (isCurrentPlan(planId)) return 'Current plan';
  if (planId === 'free') return 'Free tier';
  return 'Choose plan';
}

async function onSelect(planId: PlanId): Promise<void> {
  if (isCurrentPlan(planId) || planId === 'free') return;
  errorMessage.value = '';
  isSubmitting.value = true;
  try {
    await billing.startCheckout(planId);
  } catch (error: unknown) {
    const apiError = (error as { data?: { error?: string } })?.data?.error;
    errorMessage.value = apiError ?? 'Failed to start checkout. Please try again.';
  } finally {
    isSubmitting.value = false;
  }
}

async function onManage(): Promise<void> {
  errorMessage.value = '';
  isSubmitting.value = true;
  try {
    await billing.openPortal();
  } catch (error: unknown) {
    const apiError = (error as { data?: { error?: string } })?.data?.error;
    errorMessage.value = apiError ?? 'Failed to open portal.';
  } finally {
    isSubmitting.value = false;
  }
}

onMounted(async () => {
  await Promise.all([billing.loadPlans(), billing.loadSubscription()]);
});
</script>

<style scoped>
.pricing-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 3rem 2rem 4rem;
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.pricing-hero {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.pricing-hero__label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #3525cd;
  margin: 0;
}

.pricing-hero__title {
  font-family: 'Manrope', sans-serif;
  font-size: 2.5rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #191c1e;
  margin: 0;
}

.pricing-hero__subtitle {
  font-size: 1rem;
  color: #464555;
  margin: 0;
}

.pricing-error {
  text-align: center;
  color: #dc2626;
  font-size: 0.875rem;
  margin: 0;
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  align-items: start;
}

@media (max-width: 900px) {
  .pricing-grid {
    grid-template-columns: 1fr;
    max-width: 420px;
    margin: 0 auto;
    width: 100%;
  }
}

.plan-card {
  position: relative;
  background: #fff;
  border: 1px solid rgba(199, 196, 216, 0.3);
  border-radius: 24px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  box-shadow: 0 4px 16px rgba(25, 28, 30, 0.05);
}

.plan-card--featured {
  background: linear-gradient(135deg, #3525cd 0%, #4f46e5 100%);
  border-color: transparent;
  box-shadow: 0 20px 48px rgba(53, 37, 205, 0.3);
  color: #fff;
}

.plan-card__badge {
  position: absolute;
  top: -14px;
  left: 50%;
  transform: translateX(-50%);
  background: #fff;
  color: #3525cd;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.3rem 0.875rem;
  border-radius: 9999px;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(53, 37, 205, 0.15);
}

.plan-card__header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.plan-card__name {
  font-family: 'Manrope', sans-serif;
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0;
  color: inherit;
}

.plan-card--featured .plan-card__name { color: rgba(255, 255, 255, 0.85); }

.plan-card__price {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
}

.plan-card__amount {
  font-family: 'Manrope', sans-serif;
  font-size: 2.25rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: inherit;
}

.plan-card__period {
  font-size: 0.875rem;
  color: #464555;
  opacity: 0.7;
}

.plan-card--featured .plan-card__period { color: rgba(255, 255, 255, 0.6); }

.plan-card__features {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.plan-card__feature {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  font-size: 0.875rem;
  color: #191c1e;
}

.plan-card--featured .plan-card__feature { color: rgba(255, 255, 255, 0.9); }

.plan-card__check { color: #3525cd; flex-shrink: 0; }
.plan-card--featured .plan-card__check { color: rgba(255, 255, 255, 0.9); }

.plan-card__btn {
  padding: 0.75rem 1.5rem;
  border-radius: 9999px;
  border: none;
  font-size: 0.9375rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.plan-card__btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.plan-card__btn--primary {
  background: #fff;
  color: #3525cd;
}
.plan-card__btn--primary:hover:not(:disabled) { background: #f3f4ff; }

.plan-card__btn--secondary {
  background: rgba(53, 37, 205, 0.07);
  color: #3525cd;
}
.plan-card__btn--secondary:hover:not(:disabled) { background: rgba(53, 37, 205, 0.14); }

.pricing-portal {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.pricing-portal__btn {
  padding: 0.625rem 1.5rem;
  border-radius: 9999px;
  border: 1px solid #d1d5db;
  background: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
  cursor: pointer;
}

.pricing-portal__btn:hover:not(:disabled) { background: #f9fafb; }

.pricing-portal__note {
  font-size: 0.8125rem;
  color: #6b7280;
}

.pricing-back { text-align: center; }

.pricing-back__link {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  color: #464555;
  font-size: 0.9375rem;
  font-weight: 500;
  text-decoration: none;
  transition: color 0.15s;
}

.pricing-back__link:hover { color: #3525cd; }
</style>
