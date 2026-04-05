export function useVoiceService() {
  const config = useRuntimeConfig();
  const baseURL = config.public.apiBaseUrl as string;

  async function transcribeAudio(audioBlob: Blob): Promise<string> {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");

    const response = await $fetch<{ transcript: string }>(
      `${baseURL}/voice/transcribe`,
      {
        method: "POST",
        body: formData,
        credentials: "include",
      }
    );

    return response.transcript;
  }

  return { transcribeAudio };
}
