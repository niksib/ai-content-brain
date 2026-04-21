<template>
  <div class="ob-fallback">
    <div class="ob-progress-card">
      <div class="ob-progress-card__label">Progress</div>
      <div class="ob-progress-card__bars">
        <div
          v-for="i in total"
          :key="i"
          class="ob-progress-card__bar"
          :class="{ 'ob-progress-card__bar--done': i - 1 < completed }"
        />
      </div>
      <div class="ob-progress-card__summary">{{ summary }}</div>
    </div>

    <PrimaryCta :icon="Play" @click="$emit('continue')">
      Continue from here
    </PrimaryCta>

    <button type="button" class="ob-tertiary-link" @click="$emit('restart')">
      Start fresh instead
    </button>
  </div>
</template>

<script setup lang="ts">
import { Play } from 'lucide-vue-next';
import PrimaryCta from '../PrimaryCta.vue';

withDefaults(defineProps<{
  completed?: number;
  total?: number;
  summary?: string;
}>(), {
  completed: 2,
  total: 4,
  summary: '✓ Niche · ✓ Audience · then we were on tone.',
});

defineEmits<{ continue: []; restart: [] }>();
</script>

<style scoped>
.ob-fallback {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ob-progress-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(199, 196, 216, 0.5);
  border-radius: 14px;
}

.ob-progress-card__label {
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #777587;
}

.ob-progress-card__bars { display: flex; gap: 4px; }

.ob-progress-card__bar {
  flex: 1;
  height: 4px;
  border-radius: 999px;
  background: rgba(199, 196, 216, 0.5);
}

.ob-progress-card__bar--done { background: #6366f1; }

.ob-progress-card__summary {
  font-size: 12.5px;
  color: #464555;
  line-height: 1.5;
}

.ob-tertiary-link {
  background: none;
  border: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 12.5px;
  font-weight: 500;
  color: #777587;
  cursor: pointer;
  transition: color 0.15s;
}

.ob-tertiary-link:hover { color: #191c1e; }
</style>
