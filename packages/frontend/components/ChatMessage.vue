<template>
  <div class="chat-message" :class="`chat-message--${role}`">
    <div class="chat-message__bubble">
      <p class="chat-message__content">
        {{ content }}<span v-if="isStreamingMessage" class="cursor-blink">|</span>
      </p>
      <span v-if="timestamp" class="chat-message__time">{{ formattedTime }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  isStreamingMessage?: boolean;
}>(), {
  isStreamingMessage: false,
});

const formattedTime = computed(() => {
  if (!props.timestamp) return '';
  const date = new Date(props.timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
});
</script>

<style scoped>
.chat-message {
  display: flex;
  margin-bottom: 0.75rem;
  padding: 0 1rem;
}

.chat-message--user {
  justify-content: flex-end;
}

.chat-message--assistant {
  justify-content: flex-start;
}

.chat-message__bubble {
  max-width: 80%;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.chat-message--user .chat-message__bubble {
  background: #6366f1;
  color: white;
  border-bottom-right-radius: 4px;
}

.chat-message--assistant .chat-message__bubble {
  background: #f3f4f6;
  color: #1f2937;
  border-bottom-left-radius: 4px;
}

.chat-message__content {
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.5;
}

.chat-message__time {
  display: block;
  font-size: 0.6875rem;
  margin-top: 0.25rem;
  opacity: 0.6;
}

.chat-message--user .chat-message__time {
  text-align: right;
  color: rgba(255, 255, 255, 0.7);
}

.chat-message--assistant .chat-message__time {
  text-align: left;
  color: #9ca3af;
}

.cursor-blink {
  animation: blink 1s step-end infinite;
  color: #6366f1;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}
</style>
