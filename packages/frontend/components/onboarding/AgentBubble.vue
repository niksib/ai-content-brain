<template>
  <div class="ob-bubble" :key="text">
    <div v-if="meta" class="ob-bubble__meta">{{ meta }}</div>
    <span>{{ typed }}</span>
    <span v-if="!done" class="ob-bubble__caret" />
  </div>
</template>

<script setup lang="ts">
import { toRef } from 'vue';
import { useTypewriter } from '~/composables/useTypewriter';

const props = defineProps<{
  text: string;
  meta?: string;
  speed?: number;
}>();

const { typed, done } = useTypewriter(() => props.text, props.speed ?? 16);
</script>

<style scoped>
.ob-bubble {
  position: relative;
  max-width: 520px;
  padding: 18px 22px 20px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.85);
  border-radius: 22px;
  box-shadow:
    0 20px 50px -10px rgba(79, 70, 229, 0.1),
    0 4px 14px rgba(25, 28, 30, 0.05);
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  line-height: 1.55;
  color: #1a1c2a;
  letter-spacing: -0.005em;
  white-space: pre-line;
  animation: ob-bubble-in 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.ob-bubble::before {
  content: '';
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  width: 16px;
  height: 16px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.85);
  border-bottom: 0;
  border-right: 0;
  border-radius: 4px 0 0 0;
}

@keyframes ob-bubble-in {
  from { opacity: 0; transform: translateY(-6px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.ob-bubble__caret {
  display: inline-block;
  width: 2px;
  height: 1.05em;
  background: #4f46e5;
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: ob-caret-blink 0.8s steps(2) infinite;
}

@keyframes ob-caret-blink {
  50% { opacity: 0; }
}

.ob-bubble__meta {
  font-family: 'Manrope', sans-serif;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #4f46e5;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.ob-bubble__meta::before {
  content: '';
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: #6366f1;
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.3);
}

@media (max-width: 600px) {
  .ob-bubble { font-size: 15.5px; padding: 16px 18px 18px; border-radius: 20px; }
}
</style>
