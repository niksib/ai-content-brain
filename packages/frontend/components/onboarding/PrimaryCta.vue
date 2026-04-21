<template>
  <button
    type="button"
    class="ob-primary-cta"
    :disabled="disabled"
    @click="$emit('click')"
  >
    <component :is="icon" v-if="icon" :size="20" />
    <slot />
  </button>
</template>

<script setup lang="ts">
import type { Component } from 'vue';
defineProps<{ disabled?: boolean; icon?: Component }>();
defineEmits<{ click: [] }>();
</script>

<style scoped>
.ob-primary-cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px 24px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, #4f46e5, #8b5cf6);
  color: #fff;
  font-family: 'Manrope', sans-serif;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.005em;
  cursor: pointer;
  box-shadow:
    0 10px 24px -4px rgba(79, 70, 229, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: transform 0.15s, box-shadow 0.2s;
  width: 100%;
}

.ob-primary-cta:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow:
    0 14px 30px -4px rgba(79, 70, 229, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.ob-primary-cta:active:not(:disabled) { transform: translateY(0); }

.ob-primary-cta:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
}

</style>
