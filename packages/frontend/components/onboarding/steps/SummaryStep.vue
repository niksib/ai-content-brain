<template>
  <div class="ob-summary">
    <div class="ob-summary-card">
      <div class="ob-summary-card__label">Niche</div>
      <div class="ob-summary-card__value">AI dev tools for indie builders</div>
      <div class="ob-summary-card__label">Audience</div>
      <div class="ob-summary-card__value">Solo devs & small-team founders shipping AI products</div>
      <div class="ob-summary-card__label">Tone</div>
      <div class="ob-summary-card__value">Direct · technical · dry humor</div>
      <div class="ob-summary-card__label">Focus</div>
      <div class="ob-summary-card__value">Build in public, ship MVP this month</div>
    </div>

    <OnboardingComposer
      v-model="clarification"
      placeholder="Anything to add or correct? (optional)"
      :show-send="false"
      @recording-change="$emit('recording-change', $event)"
    />

    <p class="ob-summary__hint">
      You can refine this anytime on your Creator Profile.
    </p>

    <PrimaryCta icon="check" @click="$emit('save', clarification.trim())">
      Save &amp; go to dashboard
    </PrimaryCta>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import OnboardingComposer from '../OnboardingComposer.vue';
import PrimaryCta from '../PrimaryCta.vue';

defineEmits<{
  save: [clarification: string];
  'recording-change': [isRecording: boolean];
}>();

const clarification = ref('');
</script>

<style scoped>
.ob-summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ob-summary-card {
  padding: 16px 18px;
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(199, 196, 216, 0.5);
  border-radius: 16px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px 14px;
  align-items: start;
  font-size: 13px;
}

.ob-summary-card__label {
  font-family: 'Manrope', sans-serif;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #4f46e5;
  padding-top: 1px;
}

.ob-summary-card__value {
  color: #191c1e;
  font-size: 13px;
  line-height: 1.45;
}

.ob-summary__hint {
  font-size: 11.5px;
  color: #777587;
  padding: 0 4px;
  line-height: 1.5;
  margin: 0;
}
</style>
