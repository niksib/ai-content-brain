import { ref, watch } from 'vue';

export function useTypewriter(source: () => string, speed = 16) {
  const typed = ref('');
  const done = ref(false);
  let intervalId: ReturnType<typeof setInterval> | null = null;

  function clear() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  watch(
    source,
    (text) => {
      clear();
      typed.value = '';
      done.value = false;
      if (!text) {
        done.value = true;
        return;
      }
      let i = 0;
      intervalId = setInterval(() => {
        i++;
        typed.value = text.slice(0, i);
        if (i >= text.length) {
          clear();
          done.value = true;
        }
      }, speed);
    },
    { immediate: true }
  );

  return { typed, done };
}
