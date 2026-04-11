import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.middleware.js";
import { transcriptionService } from "../services/transcription.service.js";

export const voiceRoutes = new Hono();

voiceRoutes.post("/voice/transcribe", requireAuth, async (context) => {
  const body = await context.req.parseBody();
  const audioFile = body["audio"];

  if (!audioFile || !(audioFile instanceof File)) {
    return context.json({ error: "audio file is required" }, 400);
  }

  const arrayBuffer = await audioFile.arrayBuffer();
  const audioBuffer = Buffer.from(arrayBuffer);
  const mimeType = audioFile.type || "audio/webm";

  try {
    const transcript = await transcriptionService.transcribe(
      audioBuffer,
      mimeType
    );

    return context.json({ transcript });
  } catch (error) {
    console.error("Transcription error:", error);
    return context.json(
      { error: "Transcription failed. Please try again." },
      500
    );
  }
});
