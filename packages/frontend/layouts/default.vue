<template>
  <div class="bg-background font-body text-on-surface flex min-h-screen">
    <!-- Sidebar -->
    <aside class="h-screen w-64 border-r border-slate-200 bg-slate-100 flex flex-col py-6 shrink-0 sticky top-0">
      <NuxtLink to="/dashboard" class="px-6 mb-8 flex items-center gap-2 no-underline">
        <img src="~/assets/waving-hand.svg" class="w-9 h-9 block shrink-0" alt="" />
        <span class="brand-wordmark">Postrr</span>
      </NuxtLink>

      <nav class="flex-1 space-y-1">
        <div class="px-4 mb-4">
          <button
            class="w-full py-3 px-4 btn-primary-gradient text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 disabled:opacity-60"
            :disabled="isStarting"
            @click="handleStartSession"
          >
            <span v-if="isStarting" class="btn-spinner"></span>
            <span v-else class="material-symbols-outlined text-sm">add</span>
            {{ isStarting ? 'Starting...' : 'Create New Post' }}
          </button>
        </div>

        <NuxtLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="flex items-center gap-3 py-2.5 px-4 rounded-lg mx-2 transition-all no-underline"
          :class="isActive(link.to) ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-200/50'"
        >
          <span
            class="material-symbols-outlined"
            :style="isActive(link.to) ? 'font-variation-settings: \'FILL\' 1;' : undefined"
          >{{ link.icon }}</span>
          <span class="font-medium">{{ link.label }}</span>
        </NuxtLink>
      </nav>

      <div class="mt-auto space-y-1">
        <button
          class="w-full flex items-center gap-3 py-2.5 px-4 text-slate-600 mx-2 hover:bg-slate-200/50 rounded-lg transition-all text-left"
          @click="handleLogout"
        >
          <span class="material-symbols-outlined">logout</span>
          <span class="font-medium">Logout</span>
        </button>
        <NuxtLink
          to="/profile"
          class="px-6 mt-6 flex items-center gap-3 border-t border-slate-200 pt-6 no-underline hover:bg-slate-200/30 -mx-2 px-8 py-3"
        >
          <div class="w-8 h-8 rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center shrink-0">
            <span class="text-xs font-bold text-indigo-700">{{ userInitials }}</span>
          </div>
          <div class="overflow-hidden">
            <p class="text-xs font-bold truncate text-slate-900">{{ profileStore.userName || 'You' }}</p>
            <p class="text-[10px] text-on-surface-variant truncate">{{ profileStore.userEmail }}</p>
          </div>
        </NuxtLink>
      </div>
    </aside>

    <!-- Main canvas -->
    <main class="flex-1 min-w-0 overflow-y-auto relative">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useDashboardStore } from '~/stores/dashboard';
import { useBillingStore } from '~/stores/billing';
import { useProfileStore } from '~/stores/profile';

const config = useRuntimeConfig();
const router = useRouter();
const route = useRoute();
const dashboardStore = useDashboardStore();
const billingStore = useBillingStore();
const profileStore = useProfileStore();

const isStarting = ref(false);

interface NavLink {
  to: string;
  label: string;
  icon: string;
}

const navLinks: NavLink[] = [
  { to: '/dashboard', label: 'Home', icon: 'grid_view' },
  { to: '/content-calendar', label: 'Schedule', icon: 'calendar_today' },
  { to: '/dashboard-v2', label: 'Studio', icon: 'dashboard_customize' },
  { to: '/pricing', label: 'Monetization', icon: 'payments' },
  { to: '/profile', label: 'Profile', icon: 'person' },
];

function isActive(targetPath: string): boolean {
  return route.path === targetPath || route.path.startsWith(`${targetPath}/`);
}

const userInitials = computed(() => {
  const name = profileStore.userName || profileStore.userEmail;
  if (!name) return '?';
  const parts = name.split(/[\s@.]+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
});

async function handleStartSession(): Promise<void> {
  if (billingStore.balance === 0) {
    router.push('/pricing');
    return;
  }
  isStarting.value = true;
  try {
    const sessionId = await dashboardStore.startTodaySession();
    router.push(`/sessions/${sessionId}`);
  } finally {
    isStarting.value = false;
  }
}

async function handleLogout(): Promise<void> {
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

onMounted(() => {
  billingStore.loadBalance();
  profileStore.loadProfile();
});
</script>

<style scoped>
.btn-primary-gradient {
  background: linear-gradient(135deg, #3525cd 0%, #4f46e5 100%);
}

.btn-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.no-underline { text-decoration: none; }

.brand-wordmark {
  font-family: 'Manrope', sans-serif;
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #4F46E5, #9333ea);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
</style>
