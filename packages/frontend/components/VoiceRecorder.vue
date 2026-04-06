<template>
  <div class="text-composer">
    <div class="text-composer__field" :class="{ 'text-composer__field--focused': isFocused }">
      <textarea
        ref="textareaRef"
        v-model="textInput"
        class="text-composer__textarea"
        placeholder="Type your answer…"
        :disabled="disabled"
        rows="3"
        @focus="isFocused = true"
        @blur="isFocused = false"
        @keydown.enter.meta.exact.prevent="submitText"
        @keydown.enter.ctrl.exact.prevent="submitText"
        @input="autoResize"
      />
      <button
        type="button"
        class="text-composer__send"
        :disabled="disabled || !textInput.trim()"
        @click="submitText"
        title="Send (⌘↵)"
      >
        <span class="material-symbols-outlined" style="font-size:20px;font-variation-settings:'FILL' 1,'wght' 500,'GRAD' 0,'opsz' 24;">send</span>
      </button>
    </div>
    <p class="text-composer__hint">Press ⌘↵ or Ctrl↵ to send</p>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';

withDefaults(defineProps<{
  disabled?: boolean;
}>(), {
  disabled: false,
});

const emit = defineEmits<{
  submit: [text: string];
}>();

const textInput = ref('');
const isFocused = ref(false);
const textareaRef = ref<HTMLTextAreaElement | null>(null);

function autoResize() {
  const el = textareaRef.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
}

function submitText() {
  const text = textInput.value.trim();
  if (!text) return;
  emit('submit', text);
  textInput.value = '';
  nextTick(() => {
    if (textareaRef.value) textareaRef.value.style.height = 'auto';
  });
}
</script>

<style scoped>
.text-composer {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}

.text-composer__field {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  padding: 1rem 1rem 1rem 1.25rem;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1.5px solid rgba(199, 196, 216, 0.4);
  border-radius: 20px;
  box-shadow: 0 4px 24px rgba(53, 37, 205, 0.06), 0 1px 4px rgba(25, 28, 30, 0.04);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.text-composer__field--focused {
  border-color: #3525cd;
  box-shadow: 0 0 0 3px rgba(53, 37, 205, 0.1), 0 4px 24px rgba(53, 37, 205, 0.08);
}

.text-composer__textarea {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  font-family: 'Inter', sans-serif;
  font-size: 0.9375rem;
  line-height: 1.6;
  color: #191c1e;
  min-height: 48px;
  max-height: 200px;
  overflow-y: auto;
}

.text-composer__textarea::placeholder {
  color: #a09faf;
}

.text-composer__textarea:disabled {
  opacity: 0.5;
}

.text-composer__send {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #3525cd, #4f46e5);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(53, 37, 205, 0.3);
  transition: opacity 0.15s, transform 0.1s, box-shadow 0.15s;
}

.text-composer__send:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(53, 37, 205, 0.38);
}

.text-composer__send:active:not(:disabled) {
  transform: translateY(0);
}

.text-composer__send:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  box-shadow: none;
}

.text-composer__hint {
  font-size: 0.75rem;
  color: #a09faf;
  text-align: right;
  margin: 0;
  padding-right: 0.25rem;
}
</style>
