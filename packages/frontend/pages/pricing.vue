<template>
  <div class="pricing-page">
    <div class="pricing-hero">
      <p class="pricing-hero__label">Pricing</p>
      <h1 class="pricing-hero__title">Choose your plan</h1>
      <p class="pricing-hero__subtitle">Unlock the full power of AI-driven content creation.</p>
    </div>

    <div class="pricing-grid">
      <!-- Free plan -->
      <div class="plan-card">
        <div class="plan-card__header">
          <h3 class="plan-card__name">Free</h3>
          <div class="plan-card__price">
            <span class="plan-card__amount">$0</span>
            <span class="plan-card__period">/ month</span>
          </div>
        </div>
        <ul class="plan-card__features">
          <li class="plan-card__feature">
            <span class="material-symbols-outlined plan-card__check">check_circle</span>
            500 credits / month
          </li>
          <li class="plan-card__feature">
            <span class="material-symbols-outlined plan-card__check">check_circle</span>
            Up to 10 sessions
          </li>
          <li class="plan-card__feature plan-card__feature--muted">
            <span class="material-symbols-outlined plan-card__cross">cancel</span>
            Advanced AI features
          </li>
          <li class="plan-card__feature plan-card__feature--muted">
            <span class="material-symbols-outlined plan-card__cross">cancel</span>
            Priority support
          </li>
        </ul>
        <button class="plan-card__btn plan-card__btn--secondary" disabled>Current Plan</button>
      </div>

      <!-- Pro plan -->
      <div class="plan-card plan-card--featured">
        <div class="plan-card__badge">Most Popular</div>
        <div class="plan-card__header">
          <h3 class="plan-card__name">Pro</h3>
          <div class="plan-card__price">
            <span class="plan-card__amount">$29</span>
            <span class="plan-card__period">/ month</span>
          </div>
        </div>
        <ul class="plan-card__features">
          <li class="plan-card__feature">
            <span class="material-symbols-outlined plan-card__check">check_circle</span>
            5 000 credits / month
          </li>
          <li class="plan-card__feature">
            <span class="material-symbols-outlined plan-card__check">check_circle</span>
            Unlimited sessions
          </li>
          <li class="plan-card__feature">
            <span class="material-symbols-outlined plan-card__check">check_circle</span>
            Advanced AI features
          </li>
          <li class="plan-card__feature">
            <span class="material-symbols-outlined plan-card__check">check_circle</span>
            Priority support
          </li>
        </ul>
        <button class="plan-card__btn plan-card__btn--primary" disabled>Coming Soon</button>
      </div>

      <!-- Scale plan -->
      <div class="plan-card">
        <div class="plan-card__header">
          <h3 class="plan-card__name">Scale</h3>
          <div class="plan-card__price">
            <span class="plan-card__amount">$79</span>
            <span class="plan-card__period">/ month</span>
          </div>
        </div>
        <ul class="plan-card__features">
          <li class="plan-card__feature">
            <span class="material-symbols-outlined plan-card__check">check_circle</span>
            20 000 credits / month
          </li>
          <li class="plan-card__feature">
            <span class="material-symbols-outlined plan-card__check">check_circle</span>
            Unlimited sessions
          </li>
          <li class="plan-card__feature">
            <span class="material-symbols-outlined plan-card__check">check_circle</span>
            Advanced AI features
          </li>
          <li class="plan-card__feature">
            <span class="material-symbols-outlined plan-card__check">check_circle</span>
            Dedicated support
          </li>
        </ul>
        <button class="plan-card__btn plan-card__btn--secondary" disabled>Coming Soon</button>
      </div>
    </div>

    <div class="pricing-back">
      <NuxtLink to="/dashboard" class="pricing-back__link">
        <span class="material-symbols-outlined" style="font-size:18px;">arrow_back</span>
        Back to Dashboard
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
});

useSeoMeta({ title: 'Pricing — Creator Hub' });
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

/* Grid */
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

/* Plan card */
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

.plan-card--featured .plan-card__name {
  color: rgba(255, 255, 255, 0.85);
}

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

.plan-card--featured .plan-card__period {
  color: rgba(255, 255, 255, 0.6);
}

/* Features */
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

.plan-card--featured .plan-card__feature {
  color: rgba(255, 255, 255, 0.9);
}

.plan-card__feature--muted {
  color: #9ca3af;
}

.plan-card__check {
  font-size: 18px !important;
  color: #3525cd;
  flex-shrink: 0;
}

.plan-card--featured .plan-card__check {
  color: rgba(255, 255, 255, 0.9);
}

.plan-card__cross {
  font-size: 18px !important;
  color: #d1d5db;
  flex-shrink: 0;
}

/* Buttons */
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

.plan-card__btn--secondary {
  background: rgba(53, 37, 205, 0.07);
  color: #3525cd;
}

.plan-card--featured .plan-card__btn--secondary {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

/* Back link */
.pricing-back {
  text-align: center;
}

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

.pricing-back__link:hover {
  color: #3525cd;
}
</style>
