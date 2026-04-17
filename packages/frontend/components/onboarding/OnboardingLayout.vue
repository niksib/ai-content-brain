<template>
  <div class="ob-stage">
    <div class="ob-stage__ambient ob-stage__ambient--tr" />
    <div class="ob-stage__ambient ob-stage__ambient--bl" />
    <div class="ob-stage__grain" />

    <div class="ob-zones">
      <div class="ob-zone-orb">
        <OnboardingOrb :state="orbState" />
      </div>

      <div class="ob-zone-bubble">
        <AgentBubble :text="bubbleText" :meta="bubbleMeta" />
      </div>

      <div class="ob-zone-interactive">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import OnboardingOrb from './OnboardingOrb.vue';
import AgentBubble from './AgentBubble.vue';

type OrbState = 'idle' | 'thinking' | 'speaking' | 'listening';

withDefaults(defineProps<{
  orbState?: OrbState;
  bubbleText: string;
  bubbleMeta?: string;
}>(), {
  orbState: 'idle',
});
</script>

<style scoped>
.ob-stage {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% -10%, #eae7ff 0%, transparent 60%),
    radial-gradient(circle at 120% 110%, #ffe7f2 0%, transparent 55%),
    #f7f9fb;
}

.ob-stage__ambient {
  position: absolute;
  pointer-events: none;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.5;
}

.ob-stage__ambient--tr {
  top: -15%;
  right: -20%;
  width: 60%;
  aspect-ratio: 1;
  background: rgba(139, 92, 246, 0.35);
}

.ob-stage__ambient--bl {
  bottom: -15%;
  left: -20%;
  width: 70%;
  aspect-ratio: 1;
  background: rgba(192, 132, 252, 0.4);
}

.ob-stage__grain {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.4;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.1 0 0 0 0 0.1 0 0 0 0 0.2 0 0 0 0.15 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  mix-blend-mode: multiply;
}

.ob-zones {
  position: relative;
  z-index: 2;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28px;
  padding: 40px 32px;
  max-width: 620px;
  margin: 0 auto;
}

.ob-zone-orb {
  display: flex;
  justify-content: center;
}

.ob-zone-bubble {
  display: flex;
  justify-content: center;
  width: 100%;
}

.ob-zone-interactive {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  width: 100%;
  max-width: 460px;
}

@media (max-width: 600px) {
  .ob-zones { padding: 28px 20px; gap: 22px; }
}
</style>
