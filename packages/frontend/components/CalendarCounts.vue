<template>
  <div class="calendar-counts">
    <span class="calendar-counts__line" :class="white ? 'calendar-counts__line--white' : 'calendar-counts__line--created'">{{ session.ideaCount }} created</span>
    <span v-if="session.postedCount > 0" class="calendar-counts__line" :class="white ? 'calendar-counts__line--white' : 'calendar-counts__line--posted'">{{ session.postedCount }} posted</span>
    <span v-if="session.scheduledCount > 0" class="calendar-counts__line" :class="white ? 'calendar-counts__line--white' : 'calendar-counts__line--scheduled'">{{ session.scheduledCount }} scheduled</span>
  </div>
</template>

<script setup lang="ts">
import type { CalendarSession } from '~/stores/dashboard';

defineProps<{
  session: CalendarSession;
  white?: boolean;
}>();
</script>

<style scoped>
.calendar-counts {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.calendar-counts__line {
  font-size: 0.6875rem;
  font-weight: 500;
  line-height: 1.3;
}

.calendar-counts__line--white {
  color: rgba(255, 255, 255, 0.9);
}

.calendar-counts__line--created {
  color: #6b7280;
}

.calendar-counts__line--posted {
  color: #065f46;
}

.calendar-counts__line--scheduled {
  color: #4338ca;
}
</style>
