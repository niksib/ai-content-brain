<template>
  <div class="app-layout">
    <header class="app-header">
      <div class="app-header__left">
        <NuxtLink to="/dashboard" class="app-brand">
          <span class="material-symbols-outlined app-brand__icon">auto_awesome</span>
          <span class="app-brand__name">Creator Hub</span>
        </NuxtLink>
        <nav class="app-nav">
          <NuxtLink to="/dashboard" class="app-nav__link" active-class="app-nav__link--active">
            Dashboard
          </NuxtLink>
          <NuxtLink to="/library" class="app-nav__link" active-class="app-nav__link--active">
            Library
          </NuxtLink>
          <NuxtLink to="/profile" class="app-nav__link" active-class="app-nav__link--active">
            Profile
          </NuxtLink>
        </nav>
      </div>
      <div class="app-header__right">
        <!-- credit-badge hidden per design -->
        <!-- <NuxtLink to="/profile" class="credit-badge" title="Credits">
          <span class="material-symbols-outlined" style="font-size:16px;">toll</span>
          <span class="credit-badge__count">{{ billingStore.balance }}</span>
        </NuxtLink> -->
        <button class="app-header__icon-btn" title="Notifications">
          <span class="material-symbols-outlined">notifications</span>
        </button>
        <button class="app-header__icon-btn" title="Settings">
          <span class="material-symbols-outlined">settings</span>
        </button>
        <button class="app-header__logout" @click="handleLogout" title="Sign out">
          <span class="material-symbols-outlined">logout</span>
        </button>
      </div>
    </header>
    <main class="app-main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useBillingStore } from '~/stores/billing';

const config = useRuntimeConfig();
const router = useRouter();
const billingStore = useBillingStore();

onMounted(() => {
  billingStore.loadBalance();
});

async function handleLogout() {
  try {
    await $fetch(`${config.public.apiBaseUrl}/api/auth/sign-out`, {
      method: 'POST',
      credentials: 'include',
    });
  } finally {
    const isAuthenticated = useState<boolean | null>('auth:authenticated');
    isAuthenticated.value = false;
    router.replace('/');
  }
}
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f7f9fb;
}

/* ─── Header ─── */
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  height: 72px;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(199, 196, 216, 0.3);
  box-shadow: 0 1px 0 rgba(25, 28, 30, 0.04);
}

.app-header__left {
  display: flex;
  align-items: center;
  gap: 3rem;
}

.app-header__right {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

/* ─── Brand ─── */
.app-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  flex-shrink: 0;
}

.app-brand__icon {
  color: #3525cd;
  font-size: 28px !important;
}

.app-brand__name {
  font-family: 'Manrope', sans-serif;
  font-size: 1.125rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #191c1e;
}

/* ─── Nav ─── */
.app-nav {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.app-nav__link {
  padding: 0.375rem 0.875rem;
  border-radius: 8px;
  font-size: 0.9375rem;
  font-weight: 500;
  color: #464555;
  text-decoration: none;
  transition: color 0.15s, background 0.15s;
}

.app-nav__link:hover {
  color: #3525cd;
  background: rgba(53, 37, 205, 0.06);
}

.app-nav__link--active,
.app-nav__link.router-link-active {
  color: #3525cd;
  font-weight: 700;
  border-bottom: 2px solid #3525cd;
  border-radius: 0;
  padding-bottom: calc(0.375rem - 2px);
}

/* ─── Credit badge ─── */
.credit-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3125rem 0.75rem;
  background: #e2dfff;
  border-radius: 20px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #3525cd;
  text-decoration: none;
  margin-right: 0.5rem;
  transition: background 0.15s;
}

.credit-badge:hover {
  background: #c3c0ff;
}

.credit-badge__count {
  font-variant-numeric: tabular-nums;
}

/* ─── Icon buttons ─── */
.app-header__icon-btn,
.app-header__logout {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #464555;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.app-header__icon-btn:hover,
.app-header__logout:hover {
  background: #f2f4f6;
  color: #191c1e;
}

/* ─── Main ─── */
.app-main {
  flex: 1;
}
</style>
