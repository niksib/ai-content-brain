<template>
  <div class="ob-question">
    <div class="ob-chips-row">
      <OptionChip
        v-for="chip in question.chips"
        :key="chip"
        :selected="selected.includes(chip)"
        @toggle="toggle(chip)"
      >
        {{ chip }}
      </OptionChip>
    </div>

    <OnboardingComposer
      v-model="text"
      placeholder="Add your own take… (optional)"
      :show-send="false"
      @recording-change="$emit('recording-change', $event)"
    />

    <StepIndicator :current="index" :total="total" />

    <div class="ob-question__next">
      <NextButton :disabled="!canAdvance" @click="advance">
        {{ isLast ? 'Wrap up' : 'Next' }}
      </NextButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import OptionChip from '../OptionChip.vue';
import OnboardingComposer from '../OnboardingComposer.vue';
import StepIndicator from '../StepIndicator.vue';
import NextButton from '../NextButton.vue';
import type { OnboardingQuestion } from '../questions';

const props = defineProps<{
  question: OnboardingQuestion;
  index: number;
  total: number;
}>();

const emit = defineEmits<{
  next: [value: { selected: string[]; text: string }];
  'recording-change': [isRecording: boolean];
}>();

const selected = ref<string[]>([]);
const text = ref('');

watch(() => props.question.key, () => {
  selected.value = [];
  text.value = '';
});

const canAdvance = computed(() => selected.value.length > 0 || text.value.trim().length > 0);
const isLast = computed(() => props.index === props.total - 1);

function toggle(chip: string) {
  const idx = selected.value.indexOf(chip);
  if (idx >= 0) selected.value.splice(idx, 1);
  else selected.value.push(chip);
}

function advance() {
  if (!canAdvance.value) return;
  emit('next', { selected: [...selected.value], text: text.value.trim() });
}
</script>

<style scoped>
.ob-question {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ob-chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ob-question__next {
  display: flex;
  justify-content: flex-end;
}
</style>
