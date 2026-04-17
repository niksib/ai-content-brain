<template>
  <div class="ob-step-indicator">
    <span>{{ label ?? `Question ${current + 1} of ${total}` }}</span>
    <div class="ob-step-indicator__dots">
      <div
        v-for="i in total"
        :key="i"
        class="ob-step-dot"
        :class="{
          'ob-step-dot--done': i - 1 < current,
          'ob-step-dot--active': i - 1 === current,
        }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ current: number; total: number; label?: string }>();
</script>

<style scoped>
.ob-step-indicator {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #777587;
  padding: 0 4px;
}

.ob-step-indicator__dots { display: flex; gap: 6px; }

.ob-step-dot {
  width: 22px;
  height: 3px;
  border-radius: 999px;
  background: rgba(199, 196, 216, 0.5);
  transition: all 0.3s;
}

.ob-step-dot--done { background: #6366f1; }
.ob-step-dot--active {
  background: #4f46e5;
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.5);
}
</style>
