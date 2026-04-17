<template>
  <div class="ob-done">
    <span class="material-symbols-outlined ob-done__spinner">progress_activity</span>
    Redirecting to dashboard…
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';

const emit = defineEmits<{ complete: [] }>();

onMounted(() => {
  setTimeout(() => emit('complete'), 1800);
});
</script>

<style scoped>
.ob-done {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
  padding: 12px;
  color: #777587;
  font-size: 13px;
}

.ob-done__spinner {
  font-size: 18px;
  animation: ob-done-spin 1s linear infinite;
  color: #6366f1;
}

@keyframes ob-done-spin { to { transform: rotate(360deg); } }
</style>
