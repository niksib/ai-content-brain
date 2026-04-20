import { ref, onUnmounted } from 'vue';

export function useVoiceRecorder() {
  const isRecording = ref(false);
  const audioBlob = ref<Blob | null>(null);
  const duration = ref(0);

  let mediaRecorder: MediaRecorder | null = null;
  let recordedChunks: Blob[] = [];
  let durationInterval: ReturnType<typeof setInterval> | null = null;

  function clearDurationInterval() {
    if (durationInterval !== null) {
      clearInterval(durationInterval);
      durationInterval = null;
    }
  }

  async function startRecording(): Promise<void> {
    if (!import.meta.client) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      recordedChunks = [];
      audioBlob.value = null;
      duration.value = 0;

      mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        audioBlob.value = new Blob(recordedChunks, { type: 'audio/webm' });
        clearDurationInterval();

        // Stop all tracks to release the microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      isRecording.value = true;

      durationInterval = setInterval(() => {
        duration.value++;
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  function stopRecording(): void {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      isRecording.value = false;
    }
  }

  onUnmounted(() => {
    stopRecording();
    clearDurationInterval();
  });

  return {
    isRecording,
    audioBlob,
    duration,
    startRecording,
    stopRecording,
  };
}
