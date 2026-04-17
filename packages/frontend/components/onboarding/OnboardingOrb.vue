<template>
  <div class="ob-orb-wrap" :class="`ob-orb-wrap--${state}`">
    <div class="ob-orb-glow" />
    <div class="ob-orb" :class="`ob-orb--${state}`">
      <div class="ob-orb-overlay" />
      <div v-if="state === 'thinking'" class="ob-orb-thinking-ring" />
    </div>
  </div>
</template>

<script setup lang="ts">
type OrbState = 'idle' | 'thinking' | 'speaking' | 'listening';

withDefaults(defineProps<{ state?: OrbState }>(), { state: 'idle' });
</script>

<style scoped>
.ob-orb-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 220px;
  height: 220px;
}

.ob-orb-glow {
  position: absolute;
  inset: 0;
  background: rgba(53, 37, 205, 0.1);
  border-radius: 50%;
  filter: blur(60px);
  transform: scale(1.5);
  pointer-events: none;
  animation: ob-orb-glow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes ob-orb-glow {
  0%, 100% { opacity: 0.6; transform: scale(1.5); }
  50%      { opacity: 1;   transform: scale(1.7); }
}

.ob-orb {
  position: relative;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  overflow: hidden;
  border: 4px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
  background: linear-gradient(-45deg, #4f46e5, #8b5cf6, #c084fc, #e0e7ff);
  background-size: 400% 400%;
  animation: ob-orb-fluid 10s ease infinite;
}

@keyframes ob-orb-fluid {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.ob-orb-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.05);
  mix-blend-mode: overlay;
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  pointer-events: none;
}

.ob-orb--idle {
  animation: ob-orb-fluid 10s ease infinite, ob-orb-state-idle 4s ease-in-out infinite;
}
@keyframes ob-orb-state-idle {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.02); }
}

.ob-orb--speaking {
  animation: ob-orb-fluid 6s ease infinite, ob-orb-state-speaking 1.6s ease-in-out infinite;
}
@keyframes ob-orb-state-speaking {
  0%, 100% { transform: scale(1); }
  25%      { transform: scale(1.04); }
  50%      { transform: scale(0.99); }
  75%      { transform: scale(1.03); }
}

.ob-orb--listening {
  animation: ob-orb-fluid 3s ease infinite, ob-orb-state-listening 1s ease-in-out infinite;
}
@keyframes ob-orb-state-listening {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.05); }
}

.ob-orb-wrap--listening .ob-orb-glow {
  background: rgba(139, 92, 246, 0.25);
  animation: ob-orb-glow-listening 1s ease-in-out infinite;
}
@keyframes ob-orb-glow-listening {
  0%, 100% { opacity: 0.7; transform: scale(1.7); }
  50%      { opacity: 1;   transform: scale(1.95); }
}

.ob-orb--thinking {
  animation: ob-orb-fluid 5s ease infinite;
  opacity: 0.95;
}

.ob-orb-thinking-ring {
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  pointer-events: none;
  background: conic-gradient(from 0deg, transparent 0deg, rgba(139, 92, 246, 0.85) 180deg, transparent 360deg);
  mask: radial-gradient(circle, transparent 60%, #000 62%, #000 100%);
  -webkit-mask: radial-gradient(circle, transparent 60%, #000 62%, #000 100%);
  animation: ob-ring-spin 2.4s linear infinite;
}
@keyframes ob-ring-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 600px) {
  .ob-orb-wrap, .ob-orb { width: 170px; height: 170px; }
}
</style>
