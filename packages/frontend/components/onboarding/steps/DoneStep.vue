<template>
  <div class="ob-done">
    <Loader :size="18" class="ob-done__spinner" />
    Saving your profile…
  </div>
</template>

<script setup lang="ts">
import { Loader } from 'lucide-vue-next';
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
  animation: ob-done-spin 1s linear infinite;
  color: #6366f1;
}

@keyframes ob-done-spin { to { transform: rotate(360deg); } }
</style>
