<template>
  <div class="ob-analyze-feed">
    <div
      v-for="(step, i) in visibleSteps"
      :key="step"
      class="ob-analyze-row"
      :class="isSpinning(i) ? 'ob-analyze-row--progress' : 'ob-analyze-row--done'"
    >
      <div class="ob-analyze-row__icon">
        <Loader v-if="isSpinning(i)" :size="16" />
        <Check v-else :size="16" />
      </div>
      <span>{{ step }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { Loader, Check } from 'lucide-vue-next';

const props = withDefaults(
  defineProps<{ complete?: boolean; steps?: readonly string[]; stepDurationMs?: number }>(),
  {
    steps: () => [
      'Looking at your profile',
      'Reading your posts',
      'Working out your rhythm',
      'Picking up how you write',
    ],
    stepDurationMs: 5000,
  },
);
const emit = defineEmits<{ complete: [] }>();

const FINAL_HOLD_MS = 500;

const visibleCount = ref(1);
const finished = ref(false);
const timers: ReturnType<typeof setTimeout>[] = [];

const visibleSteps = computed(() => props.steps.slice(0, visibleCount.value));

function isSpinning(index: number): boolean {
  if (finished.value) return false;
  return index === visibleCount.value - 1;
}

function advance(): void {
  if (visibleCount.value >= props.steps.length) return;
  visibleCount.value += 1;
  if (visibleCount.value < props.steps.length) {
    timers.push(setTimeout(advance, props.stepDurationMs));
  }
}

onMounted(() => {
  timers.push(setTimeout(advance, props.stepDurationMs));
});

watch(
  () => props.complete,
  (isComplete) => {
    if (!isComplete || finished.value) return;
    visibleCount.value = props.steps.length;
    finished.value = true;
    timers.push(setTimeout(() => emit('complete'), FINAL_HOLD_MS));
  },
  { immediate: true },
);

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
  justify-content: center;
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
