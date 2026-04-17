<template>
  <div class="ob-fallback">
    <div class="ob-fallback__categories">
      <div v-for="(c, i) in categories" :key="c" class="ob-fallback__chip">
        {{ i + 1 }}. {{ c }}
      </div>
    </div>

    <PrimaryCta icon="play_arrow" @click="$emit('start')">Let's go</PrimaryCta>

    <button type="button" class="ob-tertiary-link" @click="$emit('retry')">
      ← Try connecting Threads again
    </button>
  </div>
</template>

<script setup lang="ts">
import PrimaryCta from '../PrimaryCta.vue';

defineEmits<{ start: []; retry: [] }>();

const categories = ['Niche', 'Audience', 'Goal', 'Style'];
</script>

<style scoped>
.ob-fallback {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ob-fallback__categories {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.ob-fallback__chip {
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(199, 196, 216, 0.5);
  font-size: 12px;
  font-weight: 500;
  color: #464555;
  font-family: 'Manrope', sans-serif;
}

.ob-tertiary-link {
  background: none;
  border: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  gap: 4px;
  font-family: 'Inter', sans-serif;
  font-size: 12.5px;
  font-weight: 500;
  color: #777587;
  cursor: pointer;
  transition: color 0.15s;
}

.ob-tertiary-link:hover { color: #191c1e; }
</style>
