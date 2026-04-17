<template>
  <div class="ob-connect">
    <PrimaryCta icon="link" @click="$emit('connect')">Connect Threads</PrimaryCta>

    <button type="button" class="ob-tertiary-link" @click="$emit('skip')">
      Continue without Threads
    </button>
  </div>
</template>

<script setup lang="ts">
import PrimaryCta from '../PrimaryCta.vue';

defineEmits<{ connect: []; skip: [] }>();
</script>

<style scoped>
.ob-connect {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
