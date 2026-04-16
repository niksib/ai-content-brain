<template>
  <div class="page-title">
    <p v-if="label" class="page-title__label">{{ label }}</p>
    <h1 class="page-title__heading">{{ title }}</h1>
    <p v-if="subtitle" class="page-title__subtitle">{{ subtitle }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  label?: string;
  subtitle?: string;
}>();
</script>

<style scoped>
.page-title {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.page-title__label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #3525cd;
  margin: 0;
}

.page-title__heading {
  font-family: 'Manrope', sans-serif;
  font-size: 2.5rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #191c1e;
  margin: 0;
  line-height: 1.1;
}

.page-title__subtitle {
  font-size: 0.9375rem;
  color: #6b7280;
  margin: 0.375rem 0 0;
  font-weight: 500;
}
</style>
