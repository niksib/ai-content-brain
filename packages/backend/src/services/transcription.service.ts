import Groq, { toFile } from "groq-sdk";

const groq = new Groq();

export class TranscriptionService {
  async transcribe(
    audioBuffer: Buffer,
    mimeType: string
  ): Promise<string> {
    const extension = this.getExtensionFromMimeType(mimeType);
    const fileName = `recording.${extension}`;

    const file = await toFile(audioBuffer, fileName, { type: mimeType });

    const response = await groq.audio.transcriptions.create({
      model: "whisper-large-v3-turbo",
      file,
    });

    return response.text;
  }

  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExtension: Record<string, string> = {
      "audio/webm": "webm",
      "audio/mp4": "mp4",
      "audio/mpeg": "mp3",
      "audio/wav": "wav",
      "audio/ogg": "ogg",
      "audio/flac": "flac",
      "audio/x-m4a": "m4a",
    };

    return mimeToExtension[mimeType] || "webm";
  }
}

export const transcriptionService = new TranscriptionService();
