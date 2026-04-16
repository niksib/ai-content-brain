import { ref, type Ref } from 'vue';

export interface UploadedMediaFile {
  id: string;
  url: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  duration: number | null;
}

export interface UseMediaUploadReturn {
  isUploading: Ref<boolean>;
  progress: Ref<number>;
  error: Ref<string | null>;
  upload: (file: File) => Promise<UploadedMediaFile | null>;
  cancel: () => void;
}

export function useMediaUpload(): UseMediaUploadReturn {
  const config = useRuntimeConfig();
  const apiBaseUrl = config.public.apiBaseUrl as string;

  const isUploading = ref(false);
  const progress = ref(0);
  const error = ref<string | null>(null);
  let xhr: XMLHttpRequest | null = null;

  function cancel(): void {
    xhr?.abort();
    isUploading.value = false;
    progress.value = 0;
  }

  async function upload(file: File): Promise<UploadedMediaFile | null> {
    isUploading.value = true;
    progress.value = 0;
    error.value = null;

    const formData = new FormData();
    formData.append('file', file);

    return new Promise((resolve) => {
      xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          progress.value = Math.round((event.loaded / event.total) * 100);
        }
      });

      xhr.addEventListener('load', () => {
        isUploading.value = false;
        if (xhr!.status === 201) {
          try {
            const result = JSON.parse(xhr!.responseText) as UploadedMediaFile;
            resolve(result);
          } catch {
            error.value = 'Invalid response from server';
            resolve(null);
          }
        } else {
          try {
            const body = JSON.parse(xhr!.responseText) as { error?: string };
            error.value = body.error ?? `Upload failed (${xhr!.status})`;
          } catch {
            error.value = `Upload failed (${xhr!.status})`;
          }
          resolve(null);
        }
      });

      xhr.addEventListener('error', () => {
        isUploading.value = false;
        error.value = 'Network error — please check your connection and try again';
        resolve(null);
      });

      xhr.addEventListener('abort', () => {
        isUploading.value = false;
        progress.value = 0;
        resolve(null);
      });

      xhr.open('POST', `${apiBaseUrl}/api/media/upload`);
      xhr.withCredentials = true;
      xhr.send(formData);
    });
  }

  return { isUploading, progress, error, upload, cancel };
}
