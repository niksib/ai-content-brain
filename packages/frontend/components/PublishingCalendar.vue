<template>
  <section class="card calendar-section">
    <!-- Header -->
    <div class="calendar-section__header">
      <div class="calendar-section__title-row">
        <h3 class="calendar-section__title">Content Calendar</h3>
        <div class="calendar-section__month-nav">
          <button class="calendar-nav-btn" @click="prevMonth">
            <ChevronLeft :size="18" />
          </button>
          <span class="calendar-section__month-label">{{ currentMonthLabel }}</span>
          <button class="calendar-nav-btn" @click="nextMonth">
            <ChevronRight :size="18" />
          </button>
        </div>
      </div>
      <div class="calendar-section__actions">
        <button type="button" class="calendar-schedule-btn" @click="emit('schedule')">
          <CalendarPlus :size="16" />
          Schedule post
        </button>
      </div>
    </div>

    <!-- Desktop: day names + grid -->
    <div class="cal-desktop">
      <div class="calendar-grid-header">
        <div v-for="day in dayNames" :key="day" class="calendar-day-name">{{ day }}</div>
      </div>
      <div class="calendar-body custom-scrollbar">
        <div class="calendar-grid">
          <div
            v-for="n in leadingDays"
            :key="`empty-${n}`"
            class="calendar-cell calendar-cell--inactive"
          />
          <div
            v-for="day in daysInMonth"
            :key="day.number"
            class="calendar-cell"
            :class="{
              'calendar-cell--today': day.isToday,
              'calendar-cell--weekend': day.isWeekend,
              'calendar-cell--empty': day.entries.length === 0 && !day.isToday,
              'calendar-cell--has-items': day.entries.length > 0,
            }"
          >
            <div class="calendar-cell__header">
              <span class="calendar-cell__number">{{ day.number }}</span>
              <span v-if="day.isToday" class="calendar-cell__today-label">Today</span>
            </div>
            <div v-if="day.entries.length > 0" class="calendar-cell__bubbles">
              <template v-for="entry in day.entries" :key="entry.key">
                <div
                  v-if="entry.kind === 'library'"
                  class="calendar-bubble"
                  :class="bubbleClass(entry.item)"
                  @click.stop="emit('navigate', entry.item)"
                >
                  <div class="calendar-bubble__meta">
                    <PlatformIcon :platform="(entry.item.platform as any)" :size="11" />
                    <span class="calendar-bubble__format">{{ formatLabel(entry.item.format) }}</span>
                    <span class="calendar-bubble__status">{{ entryTimeLabel(entry) || chipStatusLabel(entry.item) }}</span>
                  </div>
                  <p class="calendar-bubble__title">{{ ideaTitle(entry.item) }}</p>
                </div>
                <div
                  v-else
                  class="calendar-bubble calendar-bubble--standalone"
                  :class="[standaloneBubbleClass(entry.post), entry.post.status !== 'pending' ? 'calendar-bubble--readonly' : '']"
                  @click.stop="onStandaloneClick(entry.post)"
                >
                  <div class="calendar-bubble__meta">
                    <PlatformIcon :platform="(entry.post.platform as any)" :size="11" />
                    <span class="calendar-bubble__format">{{ standaloneFormatLabel(entry.post) }}</span>
                    <span class="calendar-bubble__status">{{ entryTimeLabel(entry) || standaloneStatusLabel(entry.post) }}</span>
                  </div>
                  <p class="calendar-bubble__title">{{ entry.post.text || '(empty)' }}</p>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile list view (< 640px) -->
    <div class="cal-mobile-list">
      <div
        v-for="day in daysInMonth"
        :key="'ml-' + day.number"
        class="cal-list-row"
        :class="{
          'cal-list-row--today': day.isToday,
          'cal-list-row--has-items': day.entries.length > 0,
        }"
      >
        <div class="cal-list-row__date">
          <span class="cal-list-row__num">{{ day.number }}</span>
          <span class="cal-list-row__dow">{{ day.dayName }}</span>
        </div>
        <div class="cal-list-row__entries">
          <template v-if="day.entries.length > 0">
            <div
              v-for="entry in day.entries"
              :key="entry.key"
              class="cal-list-bubble"
              :class="entry.kind === 'library' ? bubbleClass(entry.item) : [standaloneBubbleClass(entry.post), entry.post.status !== 'pending' ? 'calendar-bubble--readonly' : '']"
              @click.stop="entry.kind === 'library' ? emit('navigate', entry.item) : onStandaloneClick(entry.post)"
            >
              <PlatformIcon :platform="(entry.kind === 'library' ? entry.item.platform : entry.post.platform) as any" :size="10" />
              <span class="cal-list-bubble__text">{{ entry.kind === 'library' ? ideaTitle(entry.item) : (entry.post.text || '(empty)') }}</span>
              <span class="cal-list-bubble__time">{{ entryTimeLabel(entry) }}</span>
            </div>
          </template>
          <template v-else>
            <span class="cal-list-row__empty-today" v-if="day.isToday">Nothing scheduled</span>
            <span class="cal-list-row__empty" v-else>No posts planned</span>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ChevronLeft, ChevronRight, CalendarPlus } from 'lucide-vue-next';
import type { LibraryItem } from '~/stores/library';
import PlatformIcon from '~/components/PlatformIcon.vue';

export interface StandalonePostThreadEntry {
  text: string;
  mediaType?: 'IMAGE' | 'VIDEO';
  mediaUrl?: string;
}

export interface StandalonePost {
  id: string;
  platform: string;
  status: 'pending' | 'publishing' | 'published' | 'failed';
  text: string;
  isThread: boolean;
  mediaType: 'TEXT' | 'IMAGE' | 'VIDEO';
  mediaUrl: string | null;
  posts: StandalonePostThreadEntry[] | null;
  scheduledAt: string;
  publishedAt: string | null;
}

type DayEntry =
  | { kind: 'library'; key: string; item: LibraryItem }
  | { kind: 'standalone'; key: string; post: StandalonePost };

const props = defineProps<{
  items: LibraryItem[];
  standalonePosts?: StandalonePost[];
  currentMonth: number;
  currentYear: number;
}>();

const emit = defineEmits<{
  navigate: [item: LibraryItem];
  'navigate-session': [sessionId: string];
  'navigate-standalone': [post: StandalonePost];
  'update:month': [year: number, month: number];
  schedule: [];
}>();

function onStandaloneClick(post: StandalonePost): void {
  if (post.status !== 'pending') return;
  emit('navigate-standalone', post);
}

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const currentMonthLabel = computed(() => {
  return new Date(props.currentYear, props.currentMonth, 1)
    .toLocaleString('en-US', { month: 'long', year: 'numeric' });
});

const leadingDays = computed(() => {
  return new Date(props.currentYear, props.currentMonth, 1).getDay();
});

const daysInMonth = computed(() => {
  const total = new Date(props.currentYear, props.currentMonth + 1, 0).getDate();
  const today = new Date();
  const todayIsThisMonth =
    today.getFullYear() === props.currentYear && today.getMonth() === props.currentMonth;

  return Array.from({ length: total }, (_, i) => {
    const number = i + 1;
    const isToday = todayIsThisMonth && today.getDate() === number;
    // Day of week for the cell: offset by leadingDays
    const dayOfWeek = (leadingDays.value + i) % 7;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const libraryEntries: DayEntry[] = props.items
      .filter((item) => {
        const { publishStatus, scheduledAt, publishedAt } = item;
        let iso = item.createdAt;
        if (publishStatus === 'posted' && publishedAt) {
          iso = publishedAt;
        } else if (publishStatus === 'scheduled' && scheduledAt) {
          iso = scheduledAt;
        }
        const d = new Date(iso);
        return d.getFullYear() === props.currentYear &&
          d.getMonth() === props.currentMonth &&
          d.getDate() === number;
      })
      .map((item) => ({ kind: 'library', key: `library-${item.id}`, item }));

    const standaloneEntries: DayEntry[] = (props.standalonePosts ?? [])
      .filter((post) => {
        const iso = post.status === 'published' && post.publishedAt
          ? post.publishedAt
          : post.scheduledAt;
        const d = new Date(iso);
        return d.getFullYear() === props.currentYear &&
          d.getMonth() === props.currentMonth &&
          d.getDate() === number;
      })
      .map((post) => ({ kind: 'standalone', key: `standalone-${post.id}`, post }));

    const entries = [...libraryEntries, ...standaloneEntries];

    return { number, isToday, isWeekend, entries, dayName: dayNames[(leadingDays.value + i) % 7] };
  });
});

const FORMAT_LABELS: Record<string, string> = {
  text_post: 'Post',
  text_with_image: 'Post+img',
  image_series: 'Images',
  video_script: 'Video',
  carousel: 'Carousel',
  stories: 'Story',
};

function formatLabel(format: string): string {
  return FORMAT_LABELS[format] ?? format;
}

const CALENDAR_ANGLE_LABELS: Record<string, string> = {
  hot_take: 'Hot Take',
  reframe: 'Reframe',
  specific_story: 'Specific Story',
  list_of_specifics: 'List of Specifics',
  numbers: 'Numbers',
  observation: 'Observation',
  curiosity_gap: 'Curiosity Gap',
  identity_snapshot: 'Identity Snapshot',
  comparison_frame: 'Comparison Frame',
  question_to_audience: 'Question to Audience',
};

function ideaTitle(item: LibraryItem): string {
  const t = (item.title ?? '').trim();
  if (t) return t;
  const a = item.angle;
  return CALENDAR_ANGLE_LABELS[a] ?? a;
}

function chipStatusLabel(item: LibraryItem): string {
  if (item.publishStatus === 'posted') return 'Posted';
  if (item.publishStatus === 'scheduled') return 'Sched';
  return 'Ready';
}

function bubbleClass(item: LibraryItem): string {
  if (item.publishStatus === 'posted') return 'calendar-bubble--posted';
  if (item.publishStatus === 'scheduled') return 'calendar-bubble--scheduled';
  return 'calendar-bubble--ready';
}

function standaloneBubbleClass(post: StandalonePost): string {
  if (post.status === 'published') return 'calendar-bubble--posted';
  if (post.status === 'failed') return 'calendar-bubble--ready';
  return 'calendar-bubble--scheduled';
}

function standaloneStatusLabel(post: StandalonePost): string {
  if (post.status === 'published') return 'Posted';
  if (post.status === 'failed') return 'Failed';
  if (post.status === 'publishing') return 'Sending';
  return 'Sched';
}

function entryTimeLabel(entry: DayEntry): string {
  let iso: string | null = null;
  if (entry.kind === 'library') {
    const { publishStatus, scheduledAt } = entry.item;
    // Posted items show the "Posted" status label, not the publication time.
    if (publishStatus === 'scheduled' && scheduledAt) iso = scheduledAt;
  } else {
    // Published items show the "Posted" status label, not the publication time.
    if (entry.post.status !== 'published') iso = entry.post.scheduledAt;
  }
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function standaloneFormatLabel(post: StandalonePost): string {
  if (post.isThread) return 'Thread';
  if (post.mediaType === 'VIDEO') return 'Video';
  if (post.mediaType === 'IMAGE') return 'Post+img';
  return 'Post';
}

function sessionIdForDay(day: { entries: DayEntry[] }): string | null {
  for (const entry of day.entries) {
    if (entry.kind !== 'library') continue;
    const sessionId = entry.item.contentPlan?.chatSessionId;
    if (sessionId) return sessionId;
  }
  return null;
}

function prevMonth(): void {
  let month = props.currentMonth - 1;
  let year = props.currentYear;
  if (month < 0) { month = 11; year--; }
  emit('update:month', year, month);
}

function nextMonth(): void {
  let month = props.currentMonth + 1;
  let year = props.currentYear;
  if (month > 11) { month = 0; year++; }
  emit('update:month', year, month);
}
</script>

<style scoped>
/* ── Section wrapper ── */
.calendar-section {
  overflow: hidden;
}

/* ── Header ── */
.calendar-section__header {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  margin-bottom: 1.5rem;
}

.calendar-section__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.calendar-section__actions {
  display: flex;
  align-items: center;
}

.calendar-section__title {
  font-family: 'Manrope', sans-serif;
  font-size: 1.375rem;
  font-weight: 700;
  color: #191c1e;
  margin: 0;
  letter-spacing: -0.01em;
}

.calendar-section__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.calendar-section__month-nav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.calendar-section__month-label {
  font-size: 0.875rem;
  font-weight: 700;
  color: #191c1e;
  min-width: 130px;
  text-align: center;
  letter-spacing: -0.01em;
}

.calendar-schedule-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  border: none;
  background: #3525cd;
  color: #fff;
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
  box-shadow: 0 4px 12px rgba(53, 37, 205, 0.22);
  margin-right: 0.25rem;
}

.calendar-schedule-btn:hover {
  background: #4f46e5;
}

.calendar-schedule-btn:active {
  transform: scale(0.97);
}

.calendar-nav-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid #e0e3e5;
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #464555;
  transition: background 0.15s;
}

.calendar-nav-btn:hover {
  background: #f2f4f6;
}

/* ── Grid header (day names) ── */
.calendar-grid-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 0.25rem;
}

.calendar-day-name {
  text-align: center;
  padding: 0.5rem 0;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(70, 69, 85, 0.5);
}

/* ── Calendar body ── */
.calendar-body {
  overflow-x: auto;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.5rem;
  min-width: 700px;
}

/* ── Day cells ── */
.calendar-cell {
  min-height: 140px;
  padding: 0.625rem;
  background: #f7f9fb;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  border: 1px solid rgba(199, 196, 216, 0.3);
  border-radius: 12px;
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
}

.calendar-cell--inactive {
  background: rgba(242, 244, 246, 0.4);
  border-color: rgba(199, 196, 216, 0.1);
  pointer-events: none;
}

.calendar-cell--weekend {
  background: #f2f4f6;
}

.calendar-cell--today {
  background: rgba(53, 37, 205, 0.04);
  border-color: rgba(53, 37, 205, 0.35);
  box-shadow: 0 0 0 1px rgba(53, 37, 205, 0.12);
}

.calendar-cell--empty {
  background: #f7f9fb;
  border-style: dashed;
}

.calendar-cell--has-items {
  background: #ffffff;
  border-color: rgba(199, 196, 216, 0.4);
  box-shadow: 0 2px 8px rgba(25, 28, 30, 0.04);
  cursor: pointer;
}

.calendar-cell--has-items:hover {
  border-color: rgba(53, 37, 205, 0.25);
  box-shadow: 0 4px 16px rgba(25, 28, 30, 0.08);
}

/* ── Cell header ── */
.calendar-cell__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.375rem;
}

.calendar-cell__number {
  font-size: 0.75rem;
  font-weight: 700;
  color: #464555;
  line-height: 1;
}

.calendar-cell--today .calendar-cell__number {
  color: #3525cd;
  font-weight: 900;
  font-size: 0.875rem;
}

.calendar-cell__today-label {
  font-size: 0.5rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #3525cd;
  background: rgba(53, 37, 205, 0.08);
  padding: 0.125rem 0.375rem;
  border-radius: 9999px;
}

/* ── Bubbles container ── */
.calendar-cell__bubbles {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  overflow-y: auto;
  max-height: 9rem;
}

/* ── Content bubble ── */
.calendar-bubble {
  border-radius: 8px;
  padding: 0.375rem 0.5rem;
  cursor: pointer;
  transition: filter 0.15s, transform 0.1s;
}

.calendar-bubble:hover {
  filter: brightness(0.96);
  transform: translateY(-1px);
}

.calendar-bubble:active {
  transform: scale(0.98);
}

/* Status color variants */
.calendar-bubble--posted {
  background: #e6faf8;
  border: 1px solid #86f2e4;
}

.calendar-bubble--scheduled {
  background: #eeecff;
  border: 1px solid #c7c2ff;
}

.calendar-bubble--ready {
  background: #fff4ef;
  border: 1px solid #ffd1bd;
}

.calendar-bubble--readonly { cursor: default; }
.calendar-bubble--readonly:hover { filter: none; transform: none; }

/* Bubble meta: platform icon + format + status badge */
.calendar-bubble__meta {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-bottom: 0.2rem;
}

.calendar-bubble__format {
  font-size: 0.5625rem;
  font-weight: 700;
  color: #777587;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.calendar-bubble__status {
  font-size: 0.5rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  flex-shrink: 0;
}

.calendar-bubble--posted .calendar-bubble__status { color: #006f66; }
.calendar-bubble--scheduled .calendar-bubble__status { color: #3323cc; }
.calendar-bubble--ready .calendar-bubble__status { color: #7b2f00; }

/* Bubble title */
.calendar-bubble__title {
  font-size: 0.6875rem;
  font-weight: 600;
  color: #191c1e;
  line-height: 1.35;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Overflow badge — button opening the first hidden item's session */
.calendar-bubble__overflow {
  display: block;
  width: 100%;
  font-family: inherit;
  font-size: 0.5625rem;
  font-weight: 700;
  color: #777587;
  text-align: center;
  padding: 0.25rem 0.375rem;
  background: #f2f4f6;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.calendar-bubble__overflow:hover {
  background: #e2dfff;
  color: #3525cd;
  border-color: rgba(53, 37, 205, 0.2);
}

.calendar-bubble__overflow:active {
  transform: scale(0.97);
}

/* ── Custom scrollbar ── */
.custom-scrollbar::-webkit-scrollbar {
  height: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #c7c4d8;
  border-radius: 10px;
}

/* ── Responsive ── */
.cal-desktop { display: block; }
.cal-mobile-list { display: none; }

@media (max-width: 899px) {
  .calendar-section__header { gap: 0.25rem; }

  .calendar-section__month-label {
    min-width: auto;
    padding: 0 0.25rem;
  }

  .calendar-nav-btn {
    width: 28px;
    height: 28px;
  }

  .cal-desktop { display: none; }
  .cal-mobile-list { display: block; }

  .cal-list-row {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid #f3f4f6;
  }

  .cal-list-row--today { background: rgba(53, 37, 205, 0.04); border-radius: 10px; border-bottom: none; margin-bottom: 0.25rem; }
  .cal-list-row--has-items { cursor: pointer; }

  .cal-list-row__date {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 36px;
    padding-top: 0.125rem;
  }

  .cal-list-row__num {
    font-size: 1rem;
    font-weight: 700;
    color: #191c1e;
    line-height: 1.1;
  }

  .cal-list-row--today .cal-list-row__num { color: #3525cd; font-weight: 900; }

  .cal-list-row__dow {
    font-size: 0.6rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #9ca3af;
  }

  .cal-list-row__entries {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    min-width: 0;
  }

  .cal-list-bubble {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.5rem;
    border-radius: 8px;
    cursor: pointer;
  }

  .cal-list-bubble__text {
    font-size: 0.8125rem;
    font-weight: 500;
    color: #191c1e;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cal-list-bubble__time {
    font-size: 0.625rem;
    font-weight: 600;
    color: #777587;
    flex-shrink: 0;
    white-space: nowrap;
  }

  .cal-list-more {
    font-size: 0.75rem;
    color: #777587;
    font-weight: 600;
    padding-left: 0.25rem;
  }

  .cal-list-row__empty-today {
    font-size: 0.8125rem;
    color: #9ca3af;
    font-style: italic;
    padding-top: 0.125rem;
  }

  .cal-list-row__empty {
    font-size: 0.75rem;
    color: #d1d5db;
    font-style: italic;
    padding-top: 0.125rem;
  }
}

</style>
