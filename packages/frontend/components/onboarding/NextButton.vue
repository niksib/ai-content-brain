<template>
  <button
    type="button"
    class="ob-next-btn"
    :disabled="disabled"
    @click="$emit('click')"
  >
    <slot />
    <span class="material-symbols-outlined">arrow_forward</span>
  </button>
</template>

<script setup lang="ts">
defineProps<{ disabled?: boolean }>();
defineEmits<{ click: [] }>();
</script>

<style scoped>
.ob-next-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 18px;
  border: 0;
  border-radius: 999px;
  background: #191c1e;
  color: #fff;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
}

.ob-next-btn:hover:not(:disabled) { transform: translateY(-1px); }

.ob-next-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  transform: none;
}

.ob-next-btn .material-symbols-outlined { font-size: 16px; }
</style>
