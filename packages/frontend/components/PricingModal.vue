<template>
  <Teleport v-if="billing.isPricingModalOpen" to="body">
    <div class="pricing-overlay" @click.self="close">
      <div class="pricing-modal" role="dialog" aria-modal="true">
        <button type="button" class="pricing-modal__close" @click="close" aria-label="Close">
          <X :size="18" />
        </button>

        <header class="pricing-modal__header">
          <p class="pricing-modal__eyebrow">Reached this month's limit</p>
          <h2 class="pricing-modal__title">Pick a plan to keep going</h2>
          <p class="pricing-modal__subtitle">Your allowance refills every billing cycle. Cancel anytime.</p>
        </header>

        <p v-if="errorMessage" class="pricing-modal__error">{{ errorMessage }}</p>

        <div class="pricing-modal__grid">
          <div
            v-for="plan in billing.plans"
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
                <CheckCircle :size="16" class="plan-card__check" />
                {{ PLAN_VOLUME_LABEL[plan.id] }}
              </li>
              <li class="plan-card__feature">
                <CheckCircle :size="16" class="plan-card__check" />
                Threads publishing
              </li>
              <li class="plan-card__feature">
                <CheckCircle :size="16" class="plan-card__check" />
                Full voice matching
              </li>
              <li v-if="plan.id !== 'free'" class="plan-card__feature">
                <CheckCircle :size="16" class="plan-card__check" />
                Schedule posts
              </li>
              <li v-if="plan.id === 'pro'" class="plan-card__feature">
                <CheckCircle :size="16" class="plan-card__check" />
                Priority support
              </li>
            </ul>

            <button
              class="plan-card__btn"
              :class="plan.id === 'creator' ? 'plan-card__btn--primary' : 'plan-card__btn--secondary'"
              :disabled="isCurrentPlan(plan.id) || !plan.purchasable || isSubmitting"
              @click="onSelect(plan.id)"
            >
              {{ ctaLabel(plan.id) }}
            </button>
          </div>
        </div>

        <div v-if="isPaidPlan" class="pricing-modal__portal">
          <button type="button" class="pricing-modal__portal-btn" :disabled="isSubmitting" @click="onManage">
            Manage subscription
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { X, CheckCircle } from 'lucide-vue-next';
import { useBillingStore, type PlanId } from '~/stores/billing';

// Plan volume labels: raw AI-credit budget plus a rough post estimate so users
// can map abstract credits to a concrete output. Numbers tuned per product copy.
const PLAN_VOLUME_LABEL: Record<PlanId, string> = {
  free: '100 AI-credits, about 5 posts',
  creator: '1,000 AI-credits, about 60 posts',
  pro: '2,000 AI-credits, about 120 posts',
};

const billing = useBillingStore();
const isSubmitting = ref(false);
const errorMessage = ref('');

const isPaidPlan = computed(() => {
  const planId = billing.subscription?.plan;
  return planId === 'creator' || planId === 'pro';
});

watch(
  () => billing.isPricingModalOpen,
  (open) => {
    if (!open) {
      errorMessage.value = '';
      isSubmitting.value = false;
    }
  },
);

function isCurrentPlan(planId: PlanId): boolean {
  return billing.subscription?.plan === planId;
}

function ctaLabel(planId: PlanId): string {
  if (isCurrentPlan(planId)) return 'Current plan';
  if (planId === 'free') return 'Free tier';
  const plan = billing.plans.find((p) => p.id === planId);
  if (plan && !plan.purchasable) return 'Unavailable';
  return 'Choose plan';
}

function close(): void {
  billing.closePricingModal();
}

async function onSelect(planId: PlanId): Promise<void> {
  if (isCurrentPlan(planId) || planId === 'free') return;
  errorMessage.value = '';
  isSubmitting.value = true;
  try {
    await billing.startCheckout(planId);
  } catch (error: unknown) {
    const apiError = (error as { data?: { error?: string } })?.data?.error;
    if (apiError === 'This plan is not purchasable') {
      errorMessage.value = 'Subscription temporarily unavailable. Please try again later or contact support.';
    } else {
      errorMessage.value = apiError ?? 'Failed to start checkout. Please try again.';
    }
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
</script>

<style scoped>
.pricing-overlay {
  position: fixed;
  inset: 0;
  background: rgba(25, 28, 30, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1.5rem;
  overflow-y: auto;
}

.pricing-modal {
  position: relative;
  width: 100%;
  max-width: 1040px;
  background: #fff;
  border-radius: 24px;
  padding: 2.5rem 2.5rem 2rem;
  box-shadow: 0 20px 60px rgba(25, 28, 30, 0.2);
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.pricing-modal__close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: #f3f4f6;
  color: #464555;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.pricing-modal__close:hover { background: #e5e7eb; }

.pricing-modal__header {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pricing-modal__eyebrow {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #3525cd;
  margin: 0;
}

.pricing-modal__title {
  font-family: 'Manrope', sans-serif;
  font-size: 1.875rem;
  font-weight: 800;
  letter-spacing: -0.025em;
  color: #191c1e;
  margin: 0;
}

.pricing-modal__subtitle {
  font-size: 0.9375rem;
  color: #464555;
  margin: 0;
}

.pricing-modal__error {
  text-align: center;
  color: #dc2626;
  font-size: 0.875rem;
  margin: 0;
}

.pricing-modal__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  align-items: stretch;
}

@media (max-width: 900px) {
  .pricing-modal__grid {
    grid-template-columns: 1fr;
    max-width: 400px;
    margin: 0 auto;
    width: 100%;
  }
}

.plan-card {
  position: relative;
  background: #fff;
  border: 1px solid rgba(199, 196, 216, 0.4);
  border-radius: 20px;
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  box-shadow: 0 2px 8px rgba(25, 28, 30, 0.03);
}

.plan-card--featured {
  background: linear-gradient(135deg, #3525cd 0%, #4f46e5 100%);
  border-color: transparent;
  box-shadow: 0 12px 32px rgba(53, 37, 205, 0.25);
  color: #fff;
}

.plan-card__badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: #fff;
  color: #3525cd;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  white-space: nowrap;
  box-shadow: 0 2px 6px rgba(53, 37, 205, 0.15);
}

.plan-card__header {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.plan-card__name {
  font-family: 'Manrope', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  color: inherit;
}

.plan-card--featured .plan-card__name { color: rgba(255, 255, 255, 0.85); }

.plan-card__price { display: flex; align-items: baseline; gap: 0.25rem; }

.plan-card__amount {
  font-family: 'Manrope', sans-serif;
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: inherit;
}

.plan-card__period { font-size: 0.8125rem; color: #464555; opacity: 0.7; }
.plan-card--featured .plan-card__period { color: rgba(255, 255, 255, 0.65); }

.plan-card__features {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  flex: 1;
}

.plan-card__feature {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: #191c1e;
}

.plan-card--featured .plan-card__feature { color: rgba(255, 255, 255, 0.9); }

.plan-card__check { color: #3525cd; flex-shrink: 0; }
.plan-card--featured .plan-card__check { color: rgba(255, 255, 255, 0.9); }

.plan-card__btn {
  padding: 0.625rem 1.25rem;
  border-radius: 9999px;
  border: none;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
}

.plan-card__btn:disabled { cursor: not-allowed; opacity: 0.55; }

.plan-card__btn--primary { background: #fff; color: #3525cd; }
.plan-card__btn--primary:hover:not(:disabled) { background: #f3f4ff; }

.plan-card__btn--secondary { background: rgba(53, 37, 205, 0.08); color: #3525cd; }
.plan-card__btn--secondary:hover:not(:disabled) { background: rgba(53, 37, 205, 0.15); }

.pricing-modal__portal { text-align: center; }

.pricing-modal__portal-btn {
  padding: 0.5rem 1.25rem;
  border-radius: 9999px;
  border: 1px solid #d1d5db;
  background: #fff;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #111827;
  cursor: pointer;
}

.pricing-modal__portal-btn:hover:not(:disabled) { background: #f9fafb; }
</style>
