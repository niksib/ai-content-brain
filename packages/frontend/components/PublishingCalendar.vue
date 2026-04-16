<template>
  <section class="calendar-section">
    <!-- Header -->
    <div class="calendar-section__header">
      <div class="calendar-section__header-left">
        <h3 class="calendar-section__title">Content Calendar</h3>
        <span class="calendar-section__badge">{{ currentMonthLabel }}</span>
      </div>
      <div class="calendar-section__nav">
        <button class="calendar-nav-btn" @click="prevMonth">
          <span class="material-symbols-outlined">chevron_left</span>
        </button>
        <button class="calendar-nav-btn" @click="nextMonth">
          <span class="material-symbols-outlined">chevron_right</span>
        </button>
      </div>
    </div>

    <!-- Day names -->
    <div class="calendar-grid-header">
      <div v-for="day in dayNames" :key="day" class="calendar-day-name">{{ day }}</div>
    </div>

    <!-- Calendar body -->
    <div class="calendar-body custom-scrollbar">
      <div class="calendar-grid">
        <!-- Empty leading cells -->
        <div
          v-for="n in leadingDays"
          :key="`empty-${n}`"
          class="calendar-cell calendar-cell--inactive"
        />

        <!-- Day cells -->
        <div
          v-for="day in daysInMonth"
          :key="day.number"
          class="calendar-cell"
          :class="{
            'calendar-cell--today': day.isToday,
            'calendar-cell--weekend': day.isWeekend,
            'calendar-cell--empty': day.items.length === 0 && !day.isToday,
            'calendar-cell--has-items': day.items.length > 0,
          }"
        >
          <!-- Day number -->
          <div class="calendar-cell__header">
            <span class="calendar-cell__number">{{ day.number }}</span>
            <span v-if="day.isToday" class="calendar-cell__today-label">Today</span>
          </div>

          <!-- Content bubbles -->
          <div v-if="day.items.length > 0" class="calendar-cell__bubbles">
            <div
              v-for="item in day.items.slice(0, 3)"
              :key="item.id"
              class="calendar-bubble"
              :class="bubbleClass(item)"
              @click.stop="emit('navigate', item)"
            >
              <div class="calendar-bubble__meta">
                <PlatformIcon :platform="(item.platform as any)" :size="11" />
                <span class="calendar-bubble__format">{{ formatLabel(item.format) }}</span>
                <span class="calendar-bubble__status">{{ chipStatusLabel(item) }}</span>
              </div>
              <p class="calendar-bubble__title">{{ item.contentIdea.angle }}</p>
            </div>
            <button
              v-if="day.items.length > 3 && sessionIdForDay(day)"
              type="button"
              class="calendar-bubble__overflow"
              @click.stop="emit('navigate-session', sessionIdForDay(day)!)"
            >
              +{{ day.items.length - 3 }} more
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { LibraryItem } from '~/stores/library';
import PlatformIcon from '~/components/PlatformIcon.vue';

const props = defineProps<{
  items: LibraryItem[];
  currentMonth: number;
  currentYear: number;
}>();

const emit = defineEmits<{
  navigate: [item: LibraryItem];
  'navigate-session': [sessionId: string];
  'update:month': [year: number, month: number];
}>();

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

    const items = props.items.filter((item) => {
      // scheduled → use scheduledAt, posted/ready → use createdAt
      const iso = item.contentIdea.publishStatus === 'scheduled' && item.contentIdea.scheduledAt
        ? item.contentIdea.scheduledAt
        : item.createdAt;
      const d = new Date(iso);
      return d.getFullYear() === props.currentYear &&
        d.getMonth() === props.currentMonth &&
        d.getDate() === number;
    });

    return { number, isToday, isWeekend, items };
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

function chipStatusLabel(item: LibraryItem): string {
  if (item.contentIdea.publishStatus === 'posted') return 'Posted';
  if (item.contentIdea.publishStatus === 'scheduled') return 'Sched';
  return 'Ready';
}

function chipClass(item: LibraryItem): string {
  if (item.contentIdea.publishStatus === 'posted') return 'calendar-chip--posted';
  if (item.contentIdea.publishStatus === 'scheduled') return 'calendar-chip--scheduled';
  return 'calendar-chip--ready';
}

function bubbleClass(item: LibraryItem): string {
  if (item.contentIdea.publishStatus === 'posted') return 'calendar-bubble--posted';
  if (item.contentIdea.publishStatus === 'scheduled') return 'calendar-bubble--scheduled';
  return 'calendar-bubble--ready';
}

function sessionIdForDay(day: { items: LibraryItem[] }): string | null {
  for (const item of day.items) {
    const sessionId = item.contentIdea.contentPlan?.chatSessionId;
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
  background: #ffffff;
  border-radius: 24px;
  padding: 2rem;
  box-shadow: 0 12px 32px -4px rgba(25, 28, 30, 0.06);
  border: 1px solid rgba(199, 196, 216, 0.12);
  overflow: hidden;
}

/* ── Header ── */
.calendar-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.calendar-section__header-left {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}

.calendar-section__title {
  font-family: 'Manrope', sans-serif;
  font-size: 1.375rem;
  font-weight: 700;
  color: #191c1e;
  margin: 0;
  letter-spacing: -0.01em;
}

.calendar-section__badge {
  padding: 0.25rem 0.75rem;
  background: rgba(53, 37, 205, 0.07);
  color: #3525cd;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.calendar-section__nav {
  display: flex;
  gap: 0.375rem;
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
  border-bottom: 1px solid rgba(199, 196, 216, 0.2);
  margin-bottom: 0;
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
  border-radius: 0;
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
  overflow: hidden;
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
</style>
