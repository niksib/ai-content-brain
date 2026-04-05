<template>
  <div class="app-layout">
    <header class="app-header">
      <NuxtLink to="/dashboard" class="app-name">Daily Content Brain</NuxtLink>
      <nav class="app-nav">
        <NuxtLink to="/library">Library</NuxtLink>
        <NuxtLink to="/profile" class="credit-indicator" title="Credits">
          <svg class="credit-icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.736 6.979C9.208 6.193 9.696 6 10 6c.304 0 .792.193 1.264.979a1 1 0 001.715-1.029C12.279 4.784 11.232 4 10 4s-2.279.784-2.979 1.95c-.285.475-.507 1.007-.652 1.55H6a1 1 0 000 2h.092a5.7 5.7 0 000 1H6a1 1 0 100 2h.369c.145.543.367 1.075.652 1.55C7.721 15.216 8.768 16 10 16s2.279-.784 2.979-1.95a1 1 0 10-1.715-1.029C10.792 13.807 10.304 14 10 14c-.304 0-.792-.193-1.264-.979A3.6 3.6 0 018.403 12H10a1 1 0 100-2H8.092a3.7 3.7 0 010-1H10a1 1 0 100-2H8.403c.123-.39.289-.744.333-.821z"/>
          </svg>
          <span class="credit-count">{{ billingStore.balance }}</span>
        </NuxtLink>
        <NuxtLink to="/profile">Profile</NuxtLink>
      </nav>
    </header>
    <main class="app-main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useBillingStore } from '~/stores/billing';

const billingStore = useBillingStore();

onMounted(() => {
  billingStore.loadBalance();
});
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  border-bottom: 1px solid #e5e7eb;
}

.app-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  text-decoration: none;
}

.app-nav {
  display: flex;
  gap: 1.25rem;
}

.app-nav a {
  color: #6b7280;
  text-decoration: none;
  font-size: 0.875rem;
}

.app-nav a:hover {
  color: #111827;
}

.credit-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: #f3f4f6;
  border-radius: 16px;
  font-weight: 500;
}

.credit-indicator:hover {
  background: #e5e7eb;
}

.credit-icon {
  color: #6366f1;
  flex-shrink: 0;
}

.credit-count {
  font-size: 0.8125rem;
  color: #374151;
  font-variant-numeric: tabular-nums;
}

.app-main {
  flex: 1;
  padding: 2rem;
}
</style>
