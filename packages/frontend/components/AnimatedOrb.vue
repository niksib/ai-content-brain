<template>
  <div
    class="animated-orb"
    :class="`animated-orb--${state}`"
    :style="orbStyle"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';

type OrbState = 'idle' | 'listening' | 'processing';

const props = withDefaults(defineProps<{
  state: OrbState;
  size?: number;
}>(), {
  size: 120,
});

const orbStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
}));
</script>

<style scoped>
.animated-orb {
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6, #a78bfa);
  position: relative;
  flex-shrink: 0;
}

.animated-orb::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: inherit;
  filter: blur(20px);
  opacity: 0;
  z-index: -1;
  transition: opacity 0.3s ease;
}

/* Idle: gentle slow pulse */
.animated-orb--idle {
  animation: orb-idle 3s ease-in-out infinite;
}

@keyframes orb-idle {
  0%, 100% {
    transform: scale(1.0);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.05);
    opacity: 1.0;
  }
}

/* Listening: faster pulse with glow */
.animated-orb--listening {
  animation: orb-listening 1.2s ease-in-out infinite;
  box-shadow: 0 0 40px rgba(99, 102, 241, 0.5), 0 0 80px rgba(139, 92, 246, 0.3);
}

.animated-orb--listening::before {
  opacity: 0.6;
  animation: orb-glow 1.2s ease-in-out infinite;
}

@keyframes orb-listening {
  0%, 100% {
    transform: scale(1.0);
  }
  50% {
    transform: scale(1.15);
  }
}

@keyframes orb-glow {
  0%, 100% {
    opacity: 0.3;
  }
  50% {
    opacity: 0.7;
  }
}

/* Processing: rotating gradient shimmer */
.animated-orb--processing {
  animation: orb-processing-rotate 2s linear infinite;
  background: conic-gradient(
    from 0deg,
    #6366f1,
    #8b5cf6,
    #c4b5fd,
    #a78bfa,
    #8b5cf6,
    #6366f1
  );
  box-shadow: 0 0 30px rgba(99, 102, 241, 0.4);
}

.animated-orb--processing::after {
  content: '';
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  animation: orb-processing-shimmer 1.5s ease-in-out infinite;
}

@keyframes orb-processing-rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes orb-processing-shimmer {
  0%, 100% {
    opacity: 0.8;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
