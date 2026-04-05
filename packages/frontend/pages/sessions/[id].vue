<template>
  <div class="session-page">
    <h1>Session</h1>
    <p>Coming soon</p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
});

const route = useRoute();
const sessionId = computed(() => route.params.id as string);
</script>
