<template>
  <div class="ob-connect">
    <PrimaryCta
      :icon="loading ? undefined : buttonIcon"
      :disabled="loading"
      @click="$emit('connect')"
    >
      <span v-if="loading" class="ob-connect__spinner" aria-hidden="true" />
      {{ buttonLabel }}
    </PrimaryCta>

    <button
      v-if="!alreadyConnected"
      type="button"
      class="ob-tertiary-link"
      :disabled="loading"
      @click="$emit('skip')"
    >
      Continue without Threads
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Link, ArrowRight } from 'lucide-vue-next';
import PrimaryCta from '../PrimaryCta.vue';

const props = defineProps<{
  loading?: boolean;
  alreadyConnected?: boolean;
}>();

defineEmits<{ connect: []; skip: [] }>();

const buttonIcon = computed(() => (props.alreadyConnected ? ArrowRight : Link));

const buttonLabel = computed(() => {
  if (props.loading) return 'Loading…';
  return props.alreadyConnected ? 'Continue' : 'Connect Threads';
});
</script>

<style scoped>
.ob-connect {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
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

.ob-tertiary-link:hover:not(:disabled) { color: #191c1e; }
.ob-tertiary-link:disabled { opacity: 0.5; cursor: not-allowed; }

.ob-connect__spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  animation: ob-connect-spin 0.7s linear infinite;
}

@keyframes ob-connect-spin {
  to { transform: rotate(360deg); }
}
</style>
