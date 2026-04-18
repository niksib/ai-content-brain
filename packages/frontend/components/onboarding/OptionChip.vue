<template>
  <button
    type="button"
    class="ob-chip"
    :class="{ 'ob-chip--selected': selected }"
    @click="$emit('toggle')"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
defineProps<{ selected: boolean }>();
defineEmits<{ toggle: [] }>();
</script>

<style scoped>
.ob-chip {
  padding: 10px 16px;
  border-radius: 999px;
  border: 1.5px solid rgba(199, 196, 216, 0.6);
  background: rgba(255, 255, 255, 0.7);
  font-family: 'Inter', sans-serif;
  font-size: 13.5px;
  font-weight: 500;
  color: #464555;
  transition: all 0.15s;
  text-align: center;
  line-height: 1.35;
  cursor: pointer;
  white-space: nowrap;
}

.ob-chip:hover {
  border-color: #8b5cf6;
  color: #4f46e5;
  background: #f5f3ff;
}

.ob-chip--selected {
  background: #4f46e5;
  border-color: #4f46e5;
  color: #fff;
  box-shadow: 0 4px 14px -2px rgba(79, 70, 229, 0.35);
}

.ob-chip--selected:hover {
  background: #4f46e5;
  color: #fff;
}
</style>
