<template>
  <div class="bg-background font-body text-on-surface flex min-h-screen">
    <!-- Sidebar -->
    <aside class="h-screen w-64 border-r border-slate-200 bg-slate-100 flex flex-col py-6 shrink-0 sticky top-0">
      <div class="px-6 mb-8 flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl btn-primary-gradient flex items-center justify-center text-white">
          <span class="material-symbols-outlined">auto_awesome</span>
        </div>
        <div>
          <h1 class="text-lg font-bold text-slate-900 font-headline leading-tight">Postrr Studio</h1>
          <p class="text-[10px] uppercase tracking-widest text-on-surface-variant font-semibold">Creator Suite</p>
        </div>
      </div>

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
          to="/dashboard-v2"
          class="flex items-center gap-3 py-2.5 px-4 rounded-lg mx-2 transition-all"
          :class="$route.path === '/dashboard-v2' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-200/50'"
        >
          <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">grid_view</span>
          <span class="font-medium">Home</span>
        </NuxtLink>
        <NuxtLink to="/content-calendar" class="flex items-center gap-3 py-2.5 px-4 text-slate-600 mx-2 hover:bg-slate-200/50 rounded-lg transition-all">
          <span class="material-symbols-outlined">calendar_today</span>
          <span class="font-medium">Schedule</span>
        </NuxtLink>
        <NuxtLink to="/dashboard" class="flex items-center gap-3 py-2.5 px-4 text-slate-600 mx-2 hover:bg-slate-200/50 rounded-lg transition-all">
          <span class="material-symbols-outlined">insights</span>
          <span class="font-medium">Analytics</span>
        </NuxtLink>
        <NuxtLink to="/pricing" class="flex items-center gap-3 py-2.5 px-4 text-slate-600 mx-2 hover:bg-slate-200/50 rounded-lg transition-all">
          <span class="material-symbols-outlined">payments</span>
          <span class="font-medium">Monetization</span>
        </NuxtLink>
        <NuxtLink to="/profile" class="flex items-center gap-3 py-2.5 px-4 text-slate-600 mx-2 hover:bg-slate-200/50 rounded-lg transition-all">
          <span class="material-symbols-outlined">folder_open</span>
          <span class="font-medium">Assets</span>
        </NuxtLink>
      </nav>

      <div class="mt-auto space-y-1">
        <button class="w-full flex items-center gap-3 py-2.5 px-4 text-slate-600 mx-2 hover:bg-slate-200/50 rounded-lg transition-all text-left" @click="handleLogout">
          <span class="material-symbols-outlined">logout</span>
          <span class="font-medium">Logout</span>
        </button>
        <div class="px-6 mt-6 flex items-center gap-3 border-t border-slate-200 pt-6">
          <div class="w-8 h-8 rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center">
            <span class="text-xs font-bold text-indigo-700">{{ userInitials }}</span>
          </div>
          <div class="overflow-hidden">
            <p class="text-xs font-bold truncate">{{ profileStore.userName || 'You' }}</p>
            <p class="text-[10px] text-on-surface-variant truncate">{{ profileStore.userEmail }}</p>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main canvas -->
    <main class="flex-1 overflow-y-auto relative">
      <!-- Floating header -->
      <header class="sticky top-0 z-40 px-10 py-6 flex justify-between items-center bg-slate-50/70 backdrop-blur-xl">
        <div>
          <h2 class="text-3xl font-extrabold font-headline tracking-tighter text-slate-900">Dashboard</h2>
          <p class="text-on-surface-variant text-sm font-medium">{{ heroSubtitle }}</p>
        </div>
        <div class="flex items-center gap-4">
          <div class="relative">
            <input
              v-model="searchQuery"
              class="bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 text-sm w-64 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              placeholder="Search content..."
              type="text"
            />
            <span class="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-sm">search</span>
          </div>
          <button class="w-10 h-10 rounded-full hover:bg-slate-200 flex items-center justify-center text-on-surface-variant">
            <span class="material-symbols-outlined">notifications</span>
          </button>
          <button class="w-10 h-10 rounded-full hover:bg-slate-200 flex items-center justify-center text-on-surface-variant" @click="router.push('/profile')">
            <span class="material-symbols-outlined">settings</span>
          </button>
        </div>
      </header>

      <div class="px-10 py-4 space-y-12 pb-32">
        <!-- Ready to Publish -->
        <section>
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-primary">rocket_launch</span>
              <h3 class="text-xl font-bold font-headline">Ready to Publish</h3>
            </div>
            <NuxtLink to="/content-calendar" class="text-primary text-sm font-semibold hover:underline">View All Queue</NuxtLink>
          </div>

          <div v-if="libraryStore.isLoading" class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div v-for="n in 3" :key="n" class="glass-panel rounded-2xl p-6 border border-white/40 h-48 animate-pulse" />
          </div>

          <div v-else-if="readyToPublishItems.length === 0" class="glass-panel rounded-2xl p-10 border border-white/40 text-center">
            <span class="material-symbols-outlined text-on-surface-variant text-4xl">inbox</span>
            <p class="mt-3 text-on-surface-variant text-sm">No content queued yet — start a session to generate ideas.</p>
          </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              v-for="(item, index) in readyToPublishItems"
              :key="item.id"
              class="glass-panel group relative overflow-hidden rounded-2xl p-6 border border-white/40 cursor-pointer"
              style="box-shadow: 0 12px 32px -4px rgba(25, 28, 30, 0.06);"
              @click="openIdea(item)"
            >
              <div
                v-if="index === 0"
                class="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"
              />
              <div class="flex justify-between items-start mb-4">
                <span
                  class="px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider"
                  :class="badgeClass(item)"
                >{{ formatLabel(item.format) }}</span>
                <span class="text-on-surface-variant text-xs">{{ dueLabel(item) }}</span>
              </div>
              <h4 class="font-bold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">{{ item.contentIdea.angle }}</h4>
              <p class="text-sm text-on-surface-variant line-clamp-2 mb-4">{{ item.contentIdea.description }}</p>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1">
                  <PlatformIcon :platform="item.platform as any" :size="16" />
                  <span class="text-xs font-semibold text-on-surface-variant capitalize">{{ item.platform }}</span>
                </div>
                <span class="w-8 h-8 rounded-full bg-on-surface text-white flex items-center justify-center">
                  <span class="material-symbols-outlined text-sm">arrow_forward</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        <!-- Content Calendar -->
        <section>
          <div class="flex items-center justify-between mb-8">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-on-surface-variant">event_note</span>
              <h3 class="text-xl font-bold font-headline">Content Calendar</h3>
              <span class="ml-2 text-xs font-semibold text-on-surface-variant uppercase tracking-wide">{{ currentMonthLabel }}</span>
            </div>
            <div class="flex items-center gap-2">
              <button class="w-8 h-8 rounded-full border border-outline-variant flex items-center justify-center hover:bg-white" @click="goToPrevMonth">
                <span class="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <button class="w-8 h-8 rounded-full border border-outline-variant flex items-center justify-center hover:bg-white" @click="goToNextMonth">
                <span class="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>

          <div class="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm border border-slate-100">
            <div class="grid grid-cols-7 border-b border-slate-100">
              <div v-for="day in dayNames" :key="day" class="py-4 text-center text-xs font-bold text-on-surface-variant uppercase tracking-tighter">{{ day }}</div>
            </div>
            <div class="grid grid-cols-7">
              <div
                v-for="(cell, index) in calendarCells"
                :key="index"
                class="min-h-[140px] p-3 border-r border-b border-slate-100"
                :class="{
                  'bg-slate-50/20': cell.isOutsideMonth,
                  'ring-2 ring-primary ring-inset z-10 bg-indigo-50/30': cell.isToday,
                  'cursor-pointer hover:bg-slate-50': cell.number !== null && !cell.isOutsideMonth,
                }"
                @click="cell.session ? router.push(`/sessions/${cell.session.id}`) : null"
              >
                <span
                  class="text-xs font-bold"
                  :class="{
                    'text-slate-400 font-medium': cell.isOutsideMonth,
                    'text-primary': cell.isToday,
                  }"
                >{{ cell.number ?? '' }}</span>
                <div v-if="cell.session && cell.session.ideaCount > 0" class="mt-2 space-y-1">
                  <div
                    v-if="cell.session.postedCount > 0"
                    class="p-2 rounded text-[10px] font-semibold truncate"
                    :class="cell.isToday ? 'bg-primary text-white shadow-md' : 'bg-secondary-container text-on-secondary-container'"
                  >
                    {{ cell.session.postedCount }} posted
                  </div>
                  <div
                    v-if="cell.session.scheduledCount > 0"
                    class="p-2 rounded text-[10px] font-semibold truncate"
                    :class="cell.isToday ? 'bg-indigo-100 text-primary' : 'bg-indigo-50 border-l-2 border-primary text-primary'"
                  >
                    {{ cell.session.scheduledCount }} scheduled
                  </div>
                  <div
                    v-if="cell.session.ideaCount > cell.session.postedCount + cell.session.scheduledCount"
                    class="p-2 bg-slate-100 rounded text-[10px] font-semibold text-on-surface-variant truncate"
                  >
                    {{ cell.session.ideaCount - cell.session.postedCount - cell.session.scheduledCount }} ideas
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Bento grid: Recent assets + stats -->
        <section class="grid grid-cols-12 gap-6">
          <div class="col-span-12 md:col-span-8 bg-surface-container-low rounded-3xl p-8">
            <div class="flex items-center justify-between mb-8">
              <h3 class="text-xl font-bold font-headline">Recent Ideas</h3>
              <NuxtLink to="/content-calendar" class="text-primary text-xs font-semibold hover:underline">See all</NuxtLink>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div
                v-for="item in recentAssets"
                :key="item.id"
                class="aspect-square rounded-2xl overflow-hidden relative group cursor-pointer"
                :class="platformTileClass(item.platform)"
                @click="openIdea(item)"
              >
                <div class="absolute inset-0 flex flex-col justify-between p-4">
                  <PlatformIcon :platform="item.platform as any" :size="20" />
                  <div>
                    <p class="text-white/90 text-[10px] font-bold uppercase tracking-wider mb-1">{{ formatLabel(item.format) }}</p>
                    <p class="text-white text-sm font-semibold line-clamp-3 leading-tight">{{ item.contentIdea.angle }}</p>
                  </div>
                </div>
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              </div>

              <button
                class="aspect-square rounded-2xl bg-white flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-primary transition-colors cursor-pointer group"
                @click="handleStartSession"
              >
                <span class="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">add_circle</span>
                <span class="text-[10px] font-bold text-slate-400 mt-2 group-hover:text-primary">New Idea</span>
              </button>
            </div>
          </div>

          <div class="col-span-12 md:col-span-4 bg-primary text-white rounded-3xl p-8 relative overflow-hidden">
            <div class="absolute top-0 right-0 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
            <div class="relative z-10">
              <p class="text-indigo-100 text-sm font-medium mb-1">Total Posts</p>
              <h4 class="text-4xl font-extrabold font-headline mb-6">{{ totalPostsLabel }}</h4>
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-indigo-100">Published</span>
                  <span class="text-xs font-bold">{{ publishedCount }}</span>
                </div>
                <div class="w-full h-1.5 bg-indigo-900/30 rounded-full overflow-hidden">
                  <div class="h-full bg-white rounded-full transition-all" :style="{ width: publishProgressPercent + '%' }" />
                </div>
                <div class="flex items-center justify-between pt-4">
                  <span class="text-xs text-indigo-100">Scheduled</span>
                  <span class="text-xs font-bold">{{ scheduledCount }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-xs text-indigo-100">In Queue</span>
                  <span class="text-xs font-bold">{{ readyCount }}</span>
                </div>
              </div>
              <button
                class="w-full mt-10 py-3 bg-white text-primary rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors"
                @click="router.push('/content-calendar')"
              >
                Open Calendar
              </button>
            </div>
          </div>
        </section>
      </div>

      <!-- Floating AI command bar -->
      <div class="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-50" style="left: calc(50% + 8rem);">
        <div class="glass-panel border-t border-white/40 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-full p-2 flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-primary">
            <span class="material-symbols-outlined text-xl" style="font-variation-settings: 'FILL' 1;">auto_fix_high</span>
          </div>
          <input
            v-model="aiPrompt"
            class="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium placeholder:text-on-surface-variant/60 outline-none"
            placeholder="Ask AI to draft a post or plan your week..."
            type="text"
            @keydown.enter="handleAiSubmit"
          />
          <button
            class="bg-primary text-white px-5 py-2 rounded-full text-xs font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors disabled:opacity-60"
            :disabled="!aiPrompt.trim() || isStarting"
            @click="handleAiSubmit"
          >
            Start Session
            <span class="material-symbols-outlined text-xs">send</span>
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useDashboardStore, type CalendarSession } from '~/stores/dashboard';
import { useLibraryStore, type LibraryItem } from '~/stores/library';
import { useProfileStore } from '~/stores/profile';
import { useBillingStore } from '~/stores/billing';
import PlatformIcon from '~/components/PlatformIcon.vue';

definePageMeta({ layout: false });

const dashboardStore = useDashboardStore();
const libraryStore = useLibraryStore();
const profileStore = useProfileStore();
const billingStore = useBillingStore();
const router = useRouter();
const config = useRuntimeConfig();

const isStarting = ref(false);
const searchQuery = ref('');
const aiPrompt = ref('');

const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const FORMAT_LABELS: Record<string, string> = {
  text_post: 'Text Post',
  text_with_image: 'Post + Image',
  image_series: 'Image Series',
  video_script: 'Video',
  carousel: 'Carousel',
  stories: 'Story',
};

function formatLabel(format: string): string {
  return FORMAT_LABELS[format] ?? format;
}

const userInitials = computed(() => {
  const name = profileStore.userName || profileStore.userEmail;
  if (!name) return '?';
  const parts = name.split(/[\s@.]+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
});

const heroSubtitle = computed(() => {
  const name = profileStore.userName;
  if (!name) return 'Your content command center.';
  if (publishedCount.value === 0) return `Welcome back, ${name}. Ready to ship your first post?`;
  return `Welcome back, ${name}. ${publishedCount.value} posts published so far.`;
});

const publishedCount = computed(() =>
  libraryStore.items.filter((item) => item.contentIdea.publishStatus === 'posted').length
);

const scheduledCount = computed(() =>
  libraryStore.items.filter((item) => item.contentIdea.publishStatus === 'scheduled').length
);

const readyCount = computed(() =>
  libraryStore.items.filter((item) => !item.contentIdea.publishStatus).length
);

const totalPostsLabel = computed(() => {
  const total = libraryStore.items.length;
  if (total >= 1000) return `${(total / 1000).toFixed(1)}K`;
  return String(total);
});

const publishProgressPercent = computed(() => {
  const total = libraryStore.items.length;
  if (total === 0) return 0;
  return Math.min(100, Math.round((publishedCount.value / total) * 100));
});

const readyToPublishItems = computed((): LibraryItem[] => {
  const filtered = libraryStore.items
    .filter((item) => item.contentIdea.publishStatus !== 'posted')
    .slice(0, 3);
  return filtered;
});

const recentAssets = computed((): LibraryItem[] =>
  libraryStore.items.slice(0, 3)
);

function badgeClass(item: LibraryItem): string {
  if (item.contentIdea.publishStatus === 'scheduled') return 'bg-primary/10 text-primary';
  if (item.format === 'video_script') return 'bg-tertiary/10 text-tertiary';
  return 'bg-secondary-container text-on-secondary-container';
}

function dueLabel(item: LibraryItem): string {
  if (item.contentIdea.publishStatus === 'scheduled' && item.contentIdea.scheduledAt) {
    return new Date(item.contentIdea.scheduledAt).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  return 'Draft';
}

function platformTileClass(platform: string): string {
  const map: Record<string, string> = {
    threads: 'bg-gradient-to-br from-slate-900 to-slate-700',
    linkedin: 'bg-gradient-to-br from-blue-700 to-blue-500',
    tiktok: 'bg-gradient-to-br from-pink-600 to-rose-500',
    instagram: 'bg-gradient-to-br from-fuchsia-600 to-orange-500',
  };
  return map[platform] ?? 'bg-gradient-to-br from-indigo-600 to-indigo-400';
}

function openIdea(item: LibraryItem): void {
  const sessionId = item.contentIdea.contentPlan?.chatSessionId;
  if (sessionId) {
    router.push(`/sessions/${sessionId}?idea=${item.contentIdeaId}`);
  }
}

const currentMonthLabel = computed(() => {
  const date = new Date(dashboardStore.currentYear, dashboardStore.currentMonth, 1);
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
});

interface CalendarCell {
  number: number | null;
  isOutsideMonth: boolean;
  isToday: boolean;
  session: CalendarSession | null;
}

const calendarCells = computed((): CalendarCell[] => {
  const year = dashboardStore.currentYear;
  const month = dashboardStore.currentMonth;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Stitch design uses Mon-first weeks; JS getDay() is Sun-first
  const firstDayOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const today = new Date();
  const todayIsThisMonth = today.getFullYear() === year && today.getMonth() === month;

  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const cells: CalendarCell[] = [];

  for (let leadOffset = firstDayOffset - 1; leadOffset >= 0; leadOffset--) {
    cells.push({
      number: prevMonthLastDay - leadOffset,
      isOutsideMonth: true,
      isToday: false,
      session: null,
    });
  }

  for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber++) {
    const session = dashboardStore.sessions.find((candidate) => {
      const sessionDate = new Date(candidate.sessionDate);
      return (
        sessionDate.getUTCFullYear() === year &&
        sessionDate.getUTCMonth() === month &&
        sessionDate.getUTCDate() === dayNumber
      );
    }) ?? null;

    cells.push({
      number: dayNumber,
      isOutsideMonth: false,
      isToday: todayIsThisMonth && today.getDate() === dayNumber,
      session,
    });
  }

  // Pad to complete the final week
  while (cells.length % 7 !== 0) {
    const nextDayNumber = cells.length - firstDayOffset - daysInMonth + 1;
    cells.push({
      number: nextDayNumber,
      isOutsideMonth: true,
      isToday: false,
      session: null,
    });
  }

  return cells;
});

function goToPrevMonth(): void {
  const year = dashboardStore.currentYear;
  const month = dashboardStore.currentMonth;
  if (month === 0) {
    dashboardStore.loadMonth(year - 1, 11);
  } else {
    dashboardStore.loadMonth(year, month - 1);
  }
}

function goToNextMonth(): void {
  const year = dashboardStore.currentYear;
  const month = dashboardStore.currentMonth;
  if (month === 11) {
    dashboardStore.loadMonth(year + 1, 0);
  } else {
    dashboardStore.loadMonth(year, month + 1);
  }
}

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

async function handleAiSubmit(): Promise<void> {
  if (!aiPrompt.value.trim()) return;
  await handleStartSession();
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

onMounted(async () => {
  await Promise.all([
    dashboardStore.loadSessions(),
    libraryStore.loadLibrary(),
    profileStore.loadProfile(),
    billingStore.loadBalance(),
  ]);
});
</script>

<style scoped>
.glass-panel {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

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
</style>
