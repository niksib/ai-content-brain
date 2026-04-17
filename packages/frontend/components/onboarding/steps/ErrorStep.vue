<template>
  <div class="ob-fallback">
    <div class="ob-retry-banner">
      <div class="ob-retry-banner__msg">
        <span class="material-symbols-outlined">error_outline</span>
        Network error · progress preserved
      </div>
      <button type="button" class="ob-retry-banner__btn" @click="$emit('retry')">
        <span class="material-symbols-outlined">refresh</span>
        Retry
      </button>
    </div>

    <button type="button" class="ob-tertiary-link" @click="$emit('restart')">
      Start over
    </button>
  </div>
</template>

<script setup lang="ts">
defineEmits<{ retry: []; restart: [] }>();
</script>

<style scoped>
.ob-fallback {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ob-retry-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px 10px 14px;
  border-radius: 14px;
  background: #fff3ee;
  border: 1px solid #ffd7c2;
  color: #7a3910;
  font-size: 12.5px;
  font-weight: 500;
}

.ob-retry-banner__msg {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ob-retry-banner__msg .material-symbols-outlined {
  font-size: 18px;
  color: #c26a2a;
}

.ob-retry-banner__btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: #fff;
  border: 1px solid #ffd7c2;
  border-radius: 999px;
  font-family: 'Manrope', sans-serif;
  font-size: 11.5px;
  font-weight: 700;
  color: #7a3910;
  cursor: pointer;
}

.ob-retry-banner__btn .material-symbols-outlined { font-size: 14px; }

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
