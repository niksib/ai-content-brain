<template>
  <div class="ob-done">
    <span class="material-symbols-outlined ob-done__spinner">progress_activity</span>
    Saving your profile…
  </div>
</template>

<script setup lang="ts">
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
