<template>
  <div class="chat-panel">
    <div ref="messagesContainer" class="chat-panel__messages">
      <ChatMessage
        v-for="(message, index) in messages"
        :key="message.id"
        :role="message.role"
        :content="message.content"
        :timestamp="message.createdAt"
      />
      <!-- Streaming assistant message (not yet in messages array) -->
      <ChatMessage
        v-if="isStreaming && currentStreamText"
        role="assistant"
        :content="currentStreamText"
        :is-streaming-message="true"
      />
    </div>

    <p v-if="streamError" class="chat-panel__error">
      {{ streamError }}
    </p>

    <ChatInput
      :disabled="isStreaming"
      @send="handleSend"
      @audio-ready="handleAudioReady"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import type { SessionMessage } from '~/stores/session';
import ChatMessage from '~/components/ChatMessage.vue';
import ChatInput from '~/components/ChatInput.vue';

const props = defineProps<{
  messages: SessionMessage[];
  isStreaming: boolean;
  currentStreamText: string;
  streamError: string | null;
}>();

const emit = defineEmits<{
  submit: [text: string];
  audioReady: [blob: Blob];
}>();

const messagesContainer = ref<HTMLElement | null>(null);

function scrollToBottom() {
  nextTick(() => {
    const container = messagesContainer.value;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  });
}

function handleSend(text: string) {
  emit('submit', text);
}

function handleAudioReady(blob: Blob) {
  emit('audioReady', blob);
}

// Auto-scroll when messages change or stream text updates
watch(() => props.messages.length, scrollToBottom);
watch(() => props.currentStreamText, scrollToBottom);
</script>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-right: 1px solid #e5e7eb;
  background: white;
  overflow: hidden;
}

.chat-panel__messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 0;
  scroll-behavior: smooth;
}

.chat-panel__error {
  color: #ef4444;
  font-size: 0.8125rem;
  text-align: center;
  margin: 0;
  padding: 0.5rem 1rem;
  background: #fef2f2;
}
</style>
