import { Hono } from "hono";
import { fileTypeFromBuffer } from "file-type";
import { requireAuth } from "../middleware/auth.middleware.js";
import { prisma } from "../lib/prisma.js";
import { getGcsService } from "../services/gcs.service.js";
import type { AppEnv } from "../types/hono.js";

export const mediaRoutes = new Hono<AppEnv>();

// POST /media/upload — upload one file to GCS, store metadata in DB
// Accepts multipart/form-data with field "file"
mediaRoutes.post("/media/upload", requireAuth, async (context) => {
  const user = context.get("user");

  const formData = await context.req.formData();
  const fileEntry = formData.get("file");

  if (!fileEntry || !(fileEntry instanceof File)) {
    return context.json({ error: "file field is required" }, 400);
  }

  const buffer = Buffer.from(await fileEntry.arrayBuffer());

  // Detect real MIME type from magic bytes — do not trust the Content-Type header
  const detected = await fileTypeFromBuffer(buffer);
  const mimeType = detected?.mime ?? fileEntry.type;

  const gcsService = getGcsService();

  const mimeError = gcsService.validateMimeType(mimeType);
  if (mimeError) {
    return context.json({ error: mimeError.message }, 400);
  }

  const sizeError = gcsService.validateFileSize(mimeType, buffer.length);
  if (sizeError) {
    return context.json({ error: sizeError.message }, 400);
  }

  const gcsPath = gcsService.buildGcsPath(user.id, mimeType);

  let publicUrl: string;
  try {
    publicUrl = await gcsService.upload(buffer, gcsPath, mimeType);
  } catch (uploadError) {
    console.error("[media/upload] GCS upload failed:", uploadError);
    return context.json({ error: "Upload failed. Please try again." }, 500);
  }

  let mediaFile;
  try {
    mediaFile = await prisma.mediaFile.create({
      data: {
        userId: user.id,
        url: publicUrl,
        gcsPath,
        mimeType,
        size: buffer.length,
      },
    });
  } catch (dbError) {
    // DB write failed — clean up the already-uploaded GCS object
    await gcsService.deleteFile(gcsPath);
    console.error("[media/upload] DB insert failed:", dbError);
    return context.json({ error: "Upload failed. Please try again." }, 500);
  }

  return context.json({
    id: mediaFile.id,
    url: mediaFile.url,
    mimeType: mediaFile.mimeType,
    size: mediaFile.size,
    width: mediaFile.width,
    height: mediaFile.height,
    duration: mediaFile.duration,
  }, 201);
});
