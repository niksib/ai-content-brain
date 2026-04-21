<template>
  <div class="ob-summary">
    <OnboardingComposer
      v-if="!alreadyRefined"
      v-model="clarification"
      placeholder="If I got something wrong, describe it here…"
      :show-send="false"
      :disabled="loading"
      @recording-change="$emit('recording-change', $event)"
    />

    <p class="ob-summary__hint">
      {{
        alreadyRefined
          ? "You've already refined this once. You can keep editing on your Creator Profile."
          : "You can refine this anytime on your Creator Profile."
      }}
    </p>

    <div class="ob-summary__actions">
      <PrimaryCta :icon="Check" :disabled="loading" @click="onPrimary">
        {{ ctaLabel }}
      </PrimaryCta>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import OnboardingComposer from '../OnboardingComposer.vue';
import { Check } from 'lucide-vue-next';
import PrimaryCta from '../PrimaryCta.vue';

const props = defineProps<{
  summaryText: string;
  loading?: boolean;
  alreadyRefined?: boolean;
}>();

const emit = defineEmits<{
  save: [];
  clarify: [clarification: string];
  'recording-change': [isRecording: boolean];
}>();

const clarification = ref('');
const hasClarification = computed(() => clarification.value.trim().length > 0);

const ctaLabel = computed(() =>
  !props.alreadyRefined && hasClarification.value
    ? 'Update & go to dashboard'
    : 'Save & go to dashboard',
);

function onPrimary(): void {
  if (!props.alreadyRefined && hasClarification.value) {
    emit('clarify', clarification.value.trim());
    return;
  }
  emit('save');
}
</script>

<style scoped>
.ob-summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
}

.ob-summary__hint {
  font-size: 11.5px;
  color: #777587;
  padding: 0 4px;
  line-height: 1.5;
  margin: 0;
}

.ob-summary__actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ob-tertiary-link {
  background: none;
  border: 0;
  font-family: 'Inter', sans-serif;
  font-size: 12.5px;
  font-weight: 500;
  color: #777587;
  cursor: pointer;
  padding: 8px;
  align-self: center;
  transition: color 0.15s;
}

.ob-tertiary-link:hover:not(:disabled) { color: #191c1e; }
.ob-tertiary-link:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
