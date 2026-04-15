<template>
  <!-- ── Content Calendar ── -->
  <section class="calendar-section">
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

    <div class="calendar-grid">
      <!-- Day headers -->
      <div v-for="day in dayNames" :key="day" class="calendar-day-name">{{ day }}</div>

      <!-- Empty leading cells -->
      <div
        v-for="n in leadingDays"
        :key="`empty-${n}`"
        class="calendar-cell calendar-cell--empty"
      />

      <!-- Day cells -->
      <div
        v-for="day in daysInMonth"
        :key="day.number"
        class="calendar-cell"
        :class="{
          'calendar-cell--today': day.isToday,
          'calendar-cell--has-posts': day.items.length > 0 && !day.isToday,
          'calendar-cell--empty-day': day.items.length === 0 && !day.isToday,
        }"
        :style="{ cursor: day.items.length > 0 || day.isToday ? 'pointer' : undefined }"
      >
        <div class="calendar-cell__header">
          <span class="calendar-cell__number">{{ day.number }}</span>
          <span v-if="day.isToday" class="calendar-cell__today-badge">Today</span>
        </div>

        <div v-if="day.items.length > 0" class="calendar-cell__chips">
          <div
            v-for="item in day.items"
            :key="item.id"
            class="calendar-cell__chip"
            :class="`calendar-cell__chip--${item.contentIdea.publishStatus}`"
            @click.stop="emit('navigate', item)"
          >
            <PlatformIcon :platform="item.platform" :size="12" />
            <span class="calendar-cell__chip-title">{{ item.contentIdea.angle }}</span>
          </div>
        </div>

        <span v-else-if="!day.isToday" class="material-symbols-outlined calendar-cell__add-icon">add</span>
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
  'update:month': [year: number, month: number];
}>();

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];


const currentMonthLabel = computed(() => {
  return new Date(props.currentYear, props.currentMonth, 1)
    .toLocaleString('en-US', { month: 'long', year: 'numeric' });
});

const leadingDays = computed(() => {
  return new Date(props.currentYear, props.currentMonth, 1).getDay(); // 0 = Sunday
});

const daysInMonth = computed(() => {
  const total = new Date(props.currentYear, props.currentMonth + 1, 0).getDate();
  const today = new Date();
  const todayIsThisMonth =
    today.getFullYear() === props.currentYear && today.getMonth() === props.currentMonth;

  return Array.from({ length: total }, (_, i) => {
    const number = i + 1;
    const isToday = todayIsThisMonth && today.getDate() === number;
    const items = props.items.filter((item) => {
      const iso = item.contentIdea.publishStatus === 'scheduled' && item.contentIdea.scheduledAt
        ? item.contentIdea.scheduledAt
        : item.createdAt;
      const d = new Date(iso);
      return d.getFullYear() === props.currentYear &&
        d.getMonth() === props.currentMonth &&
        d.getDate() === number;
    });
    return { number, isToday, items };
  });
});

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
/* ── Taken exactly from dashboard.vue calendar section ── */

.calendar-section {
  background: #ffffff;
  border-radius: 32px;
  padding: 2.5rem;
  box-shadow: 0 12px 32px -4px rgba(25, 28, 30, 0.06);
  border: 1px solid rgba(241, 241, 241, 0.8);
}

.calendar-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.calendar-section__header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.calendar-section__title {
  font-family: 'Manrope', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: #191c1e;
  margin: 0;
}

.calendar-section__badge {
  padding: 0.3rem 0.875rem;
  background: rgba(53, 37, 205, 0.07);
  color: #3525cd;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.calendar-section__nav {
  display: flex;
  gap: 0.5rem;
}

.calendar-nav-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid #e5e7eb;
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

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.625rem;
}

.calendar-day-name {
  text-align: center;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #9ca3af;
  padding-bottom: 0.75rem;
}

.calendar-cell {
  min-height: 120px;
  border-radius: 16px;
  padding: 1rem;
  cursor: default;
  display: flex;
  flex-direction: column;
  transition: background 0.15s, border-color 0.15s;
  position: relative;
  overflow: hidden;
}

.calendar-cell--empty {
  background: #fafafa;
  opacity: 0.35;
  pointer-events: none;
}

.calendar-cell--empty-day {
  background: #f7f9fb;
  border: 1.5px dashed #d1d5db;
}

.calendar-cell--empty-day:hover {
  border-color: rgba(53, 37, 205, 0.4);
}

.calendar-cell--has-posts {
  background: #f2f4f6;
  cursor: pointer !important;
}

.calendar-cell--has-posts:hover {
  background: rgba(53, 37, 205, 0.05);
}

.calendar-cell--today {
  background: #3525cd;
  color: #fff;
  box-shadow: 0 8px 24px rgba(53, 37, 205, 0.35);
  z-index: 2;
  cursor: pointer;
  outline: 3px solid rgba(53, 37, 205, 0.4);
  outline-offset: 2px;
}

.calendar-cell--today:hover {
  background: #2f1fb5;
}

.calendar-cell__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.calendar-cell__number {
  font-weight: 700;
  font-size: 0.9375rem;
  color: inherit;
}

.calendar-cell--today .calendar-cell__number {
  font-size: 1.25rem;
  font-weight: 900;
}

.calendar-cell__today-badge {
  font-size: 0.625rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
}

.calendar-cell__add-icon {
  color: #d1d5db;
  font-size: 24px !important;
  margin: auto;
}

/* ── Post chips ── */

.calendar-cell__chips {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  overflow: hidden;
}

.calendar-cell__chip {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.375rem;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  transition: opacity 0.15s;
}

.calendar-cell__chip:hover {
  opacity: 0.75;
}

.calendar-cell__chip--scheduled {
  background: #eef2ff;
}

.calendar-cell__chip--posted {
  background: #f0fdf4;
}

.calendar-cell__chip-title {
  font-size: 0.625rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.calendar-cell__chip--scheduled .calendar-cell__chip-title {
  color: #4338ca;
}

.calendar-cell__chip--posted .calendar-cell__chip-title {
  color: #166534;
}
</style>
