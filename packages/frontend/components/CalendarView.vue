<template>
  <div class="calendar">
    <!-- Month header with navigation -->
    <div class="calendar__header">
      <button class="calendar__nav-btn" @click="prevMonth">&larr;</button>
      <span class="calendar__month-label">{{ monthLabel }} {{ currentYear }}</span>
      <button class="calendar__nav-btn" @click="nextMonth">&rarr;</button>
    </div>

    <!-- Day-of-week header -->
    <div class="calendar__weekdays">
      <span v-for="day in weekDays" :key="day" class="calendar__weekday">{{ day }}</span>
    </div>

    <!-- Calendar grid -->
    <div class="calendar__grid">
      <!-- Empty cells before first day -->
      <div
        v-for="blank in leadingBlanks"
        :key="'blank-' + blank"
        class="calendar__cell calendar__cell--blank"
      />

      <!-- Day cells -->
      <div
        v-for="day in daysInMonth"
        :key="day"
        class="calendar__cell"
        :class="{
          'calendar__cell--today': isToday(day),
          'calendar__cell--has-session': getSession(day),
        }"
        @click="handleDayClick(day)"
      >
        <span class="calendar__day-number">{{ day }}</span>
        <template v-if="getSession(day)">
          <span class="calendar__dot" />
          <span class="calendar__idea-count">{{ getSession(day)!.ideaCount }}</span>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CalendarSession } from '~/stores/dashboard';

const props = defineProps<{
  sessions: CalendarSession[];
  currentMonth: number;
  currentYear: number;
}>();

const emit = defineEmits<{
  navigate: [sessionId: string];
  'update:month': [year: number, month: number];
}>();

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const monthLabel = computed(() => monthNames[props.currentMonth]);

const daysInMonth = computed(() => {
  return new Date(props.currentYear, props.currentMonth + 1, 0).getDate();
});

const leadingBlanks = computed(() => {
  const firstDay = new Date(props.currentYear, props.currentMonth, 1).getDay();
  // Convert Sunday=0 to Monday-based: Mon=0, Sun=6
  return firstDay === 0 ? 6 : firstDay - 1;
});

// Build a map of day-number to session for quick lookup
const sessionByDay = computed(() => {
  const map = new Map<number, CalendarSession>();
  for (const session of props.sessions) {
    const date = new Date(session.sessionDate);
    if (
      date.getFullYear() === props.currentYear &&
      date.getMonth() === props.currentMonth
    ) {
      map.set(date.getDate(), session);
    }
  }
  return map;
});

function getSession(day: number): CalendarSession | undefined {
  return sessionByDay.value.get(day);
}

function isToday(day: number): boolean {
  const now = new Date();
  return (
    now.getFullYear() === props.currentYear &&
    now.getMonth() === props.currentMonth &&
    now.getDate() === day
  );
}

function handleDayClick(day: number): void {
  const session = getSession(day);
  if (session) {
    emit('navigate', session.id);
  }
}

function prevMonth(): void {
  let month = props.currentMonth - 1;
  let year = props.currentYear;
  if (month < 0) {
    month = 11;
    year--;
  }
  emit('update:month', year, month);
}

function nextMonth(): void {
  let month = props.currentMonth + 1;
  let year = props.currentYear;
  if (month > 11) {
    month = 0;
    year++;
  }
  emit('update:month', year, month);
}
</script>

<style scoped>
.calendar {
  max-width: 560px;
}

.calendar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.calendar__nav-btn {
  width: 36px;
  height: 36px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-size: 1rem;
  color: #374151;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.calendar__nav-btn:hover {
  border-color: #6366f1;
  color: #6366f1;
}

.calendar__month-label {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
}

.calendar__weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 0.25rem;
}

.calendar__weekday {
  text-align: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: #9ca3af;
  padding: 0.25rem 0;
}

.calendar__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.calendar__cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  position: relative;
  font-size: 0.875rem;
  color: #374151;
  gap: 2px;
}

.calendar__cell--blank {
  pointer-events: none;
}

.calendar__cell--today {
  background: #eef2ff;
  font-weight: 700;
  color: #4338ca;
}

.calendar__cell--has-session {
  cursor: pointer;
  transition: all 0.15s ease;
}

.calendar__cell--has-session:hover {
  background: #f0fdf4;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.calendar__day-number {
  font-size: 0.8125rem;
  line-height: 1;
}

.calendar__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
}

.calendar__idea-count {
  font-size: 0.625rem;
  color: #6b7280;
  line-height: 1;
}

@media (max-width: 480px) {
  .calendar__cell {
    font-size: 0.75rem;
  }
}
</style>
