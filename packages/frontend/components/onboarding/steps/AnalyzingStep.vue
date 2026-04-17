<template>
  <div class="ob-analyze-feed">
    <div
      v-for="(step, i) in visibleSteps"
      :key="step.text"
      class="ob-analyze-row"
      :class="i === visibleSteps.length - 1 && !allDone ? 'ob-analyze-row--progress' : 'ob-analyze-row--done'"
    >
      <div class="ob-analyze-row__icon">
        <span class="material-symbols-outlined">
          {{ i === visibleSteps.length - 1 && !allDone ? 'progress_activity' : 'check' }}
        </span>
      </div>
      <span>{{ step.text }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';

const emit = defineEmits<{ complete: [] }>();

const steps = [
  { text: 'Looking at your profile', delay: 0 },
  { text: 'Reading your posts', delay: 1400 },
  { text: 'Working out your rhythm', delay: 3000 },
  { text: 'Picking up how you write', delay: 4800 },
];

const visibleCount = ref(0);
const allDone = ref(false);
const timers: ReturnType<typeof setTimeout>[] = [];

const visibleSteps = computed(() => steps.slice(0, visibleCount.value));

onMounted(() => {
  steps.forEach((s, i) => {
    timers.push(setTimeout(() => { visibleCount.value = i + 1; }, s.delay));
  });
  timers.push(setTimeout(() => { allDone.value = true; }, 6600));
  timers.push(setTimeout(() => emit('complete'), 7000));
});

onBeforeUnmount(() => {
  timers.forEach(clearTimeout);
});
</script>

<style scoped>
.ob-analyze-feed {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  max-width: 320px;
  margin: 0 auto;
  width: 100%;
}

.ob-analyze-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-size: 12px;
  color: #777587;
  width: 100%;
  animation: ob-analyze-in 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.ob-analyze-row--done { color: #464555; }

.ob-analyze-row__icon {
  width: 16px;
  height: 16px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.ob-analyze-row__icon .material-symbols-outlined { font-size: 16px; }

.ob-analyze-row--done .ob-analyze-row__icon { color: #6366f1; }

.ob-analyze-row--progress .ob-analyze-row__icon {
  animation: ob-spin 0.9s linear infinite;
  color: #6366f1;
}

@keyframes ob-spin { to { transform: rotate(360deg); } }

@keyframes ob-analyze-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
