<template>
  <div class="bg-background font-body text-on-surface flex h-screen overflow-hidden">
    <!-- Mobile overlay backdrop -->
    <Transition name="fade">
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 bg-black/40 z-30 lg:hidden"
        @click="sidebarOpen = false"
      />
    </Transition>

    <!-- Sidebar -->
    <aside
      class="sidebar fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200 bg-slate-100 flex flex-col py-6 overflow-y-auto transition-transform duration-300 lg:relative lg:translate-x-0 lg:shrink-0"
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <NuxtLink to="/dashboard" class="px-6 mb-8 flex items-center gap-2.5 no-underline" @click="sidebarOpen = false">
        <div
          class="shrink-0 rounded-full relative overflow-hidden"
          style="width:28px;height:28px;background:linear-gradient(135deg,#4f46e5,#8b5cf6,#c084fc);box-shadow:0 4px 12px rgba(79,70,229,0.3);"
        >
          <div
            class="absolute inset-0 rounded-full"
            style="inset:4px;background:radial-gradient(circle at 35% 30%,rgba(255,255,255,0.7),transparent 50%);"
          />
        </div>
        <span style="font-family:'Manrope',sans-serif;font-weight:800;font-size:22px;letter-spacing:-0.02em;color:#111827;">HeyPostrr</span>
      </NuxtLink>

      <nav class="flex-1 space-y-1">
        <div class="px-4 mb-4">
          <button
            class="w-full py-3 px-4 btn-primary-gradient text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 disabled:opacity-60"
            :disabled="isStarting"
            @click="handleStartSession"
          >
            <span v-if="isStarting" class="btn-spinner"></span>
            <Plus v-else :size="16" />
            {{ isStarting ? 'Starting...' : 'Start New Session' }}
          </button>
        </div>

        <NuxtLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="flex items-center gap-3 py-2.5 px-4 rounded-lg mx-2 transition-all no-underline"
          :class="isActive(link.to) ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-200/50'"
          @click="sidebarOpen = false"
        >
          <component :is="link.icon" :size="18" />
          <span class="font-medium">{{ link.label }}</span>
        </NuxtLink>

        <NuxtLink
          v-if="profileStore.isAdmin"
          to="/admin/users"
          class="flex items-center gap-3 py-2.5 px-4 rounded-lg mx-2 transition-all no-underline"
          :class="isActive('/admin') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-200/50'"
          @click="sidebarOpen = false"
        >
          <Shield :size="18" />
          <span class="font-medium">Admin</span>
        </NuxtLink>
      </nav>

      <div class="mt-auto px-2 space-y-1">
        <button
          class="w-full flex items-center gap-3 py-2.5 px-4 text-slate-600 hover:bg-slate-200/50 rounded-lg transition-all text-left"
          @click="handleLogout"
        >
          <LogOut :size="18" />
          <span class="font-medium">Logout</span>
        </button>
        <NuxtLink
          to="/settings"
          class="mt-4 flex items-center gap-3 border-t border-slate-200 pt-4 px-4 py-3 rounded-lg no-underline hover:bg-slate-200/40 transition-colors"
          @click="sidebarOpen = false"
        >
          <div class="w-8 h-8 rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center shrink-0">
            <img v-if="threadsProfilePic" :src="threadsProfilePic" class="w-full h-full object-cover" />
            <span v-else class="text-xs font-bold text-indigo-700">{{ userInitials }}</span>
          </div>
          <div class="overflow-hidden min-w-0">
            <p class="text-xs font-bold truncate text-slate-900">{{ profileStore.userName || 'You' }}</p>
          </div>
        </NuxtLink>
      </div>
    </aside>

    <!-- Main canvas -->
    <main class="flex-1 min-w-0 overflow-y-auto relative">
      <!-- Mobile header bar with hamburger -->
      <div class="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 lg:hidden">
        <button
          aria-label="Open menu"
          class="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors touch-target"
          @click="sidebarOpen = true"
        >
          <Menu :size="22" />
        </button>
        <span style="font-family:'Manrope',sans-serif;font-weight:800;font-size:18px;letter-spacing:-0.02em;color:#111827;">HeyPostrr</span>
      </div>

      <ClientOnly>
        <slot />
      </ClientOnly>
    </main>

    <PricingModal />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, type Component } from 'vue';
import { Plus, LogOut, LayoutGrid, CalendarDays, User, Menu, Shield } from 'lucide-vue-next';
import { useDashboardStore } from '~/stores/dashboard';
import { useBillingStore } from '~/stores/billing';
import { useProfileStore } from '~/stores/profile';
import PricingModal from '~/components/PricingModal.vue';

const config = useRuntimeConfig();
const router = useRouter();
const route = useRoute();
const dashboardStore = useDashboardStore();
const billingStore = useBillingStore();
const profileStore = useProfileStore();

const isStarting = ref(false);
const sidebarOpen = ref(false);
const threadsProfilePic = ref<string | null>(null);

interface NavLink {
  to: string;
  label: string;
  icon: Component;
}

const navLinks: NavLink[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { to: '/content-calendar', label: 'Content Calendar', icon: CalendarDays },
  { to: '/creator-profile', label: 'Creator Profile', icon: User },
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
  if (billingStore.balance < 2) {
    billingStore.openPricingModal();
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
    await $fetch(`${config.public.apiBaseUrl}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: {},
    });
  } catch {
    // Swallow — we still reset client state and reload below.
  }
  const isAuthenticated = useState<boolean | null>('auth:authenticated');
  isAuthenticated.value = false;
  const authCheckedAt = useState<number>('auth:checked-at');
  authCheckedAt.value = Date.now();
  window.location.assign('/');
}

onMounted(async () => {
  billingStore.loadBalance();
  profileStore.loadProfile();
  try {
    const res = await $fetch<{ account: { profilePictureUrl: string | null } | null }>(
      `${config.public.apiBaseUrl}/api/threads/account`,
      { credentials: 'include' },
    );
    threadsProfilePic.value = res.account?.profilePictureUrl ?? null;
  } catch { /* no threads account */ }
});
</script>

<style scoped>
.btn-primary-gradient {
  background: linear-gradient(135deg, #3525cd 0%, #4f46e5 100%);
}

.touch-target {
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
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
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #4F46E5, #9333ea);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
</style>
