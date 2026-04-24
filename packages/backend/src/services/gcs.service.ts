import { Storage } from "@google-cloud/storage";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/quicktime"]);

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;   // 8 MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB

export interface UploadedFile {
  id: string;
  url: string;
  gcsPath: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  duration: number | null;
}

export interface MediaValidationError {
  field: string;
  message: string;
}

export class GcsService {
  private readonly storage: Storage;
  private readonly bucketName: string;

  constructor() {
    const keyJson = process.env.GCS_SERVICE_ACCOUNT_KEY;
    if (!keyJson) {
      throw new Error("GCS_SERVICE_ACCOUNT_KEY environment variable is not set");
    }
    this.bucketName = process.env.GCS_BUCKET_NAME!;
    if (!this.bucketName) {
      throw new Error("GCS_BUCKET_NAME environment variable is not set");
    }

    const credentials = JSON.parse(keyJson) as object;
    this.storage = new Storage({ credentials });
  }

  validateMimeType(mimeType: string): MediaValidationError | null {
    const isImage = ALLOWED_IMAGE_TYPES.has(mimeType);
    const isVideo = ALLOWED_VIDEO_TYPES.has(mimeType);
    if (!isImage && !isVideo) {
      return {
        field: "file",
        message: `Unsupported file type: ${mimeType}. Allowed: JPEG, PNG, MP4, MOV`,
      };
    }
    return null;
  }

  validateFileSize(mimeType: string, sizeBytes: number): MediaValidationError | null {
    const isVideo = ALLOWED_VIDEO_TYPES.has(mimeType);
    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (sizeBytes > maxBytes) {
      const maxMb = maxBytes / (1024 * 1024);
      return {
        field: "file",
        message: `File exceeds maximum size of ${maxMb} MB for ${isVideo ? "video" : "image"}`,
      };
    }
    return null;
  }

  buildGcsPath(userId: string, mimeType: string): string {
    const date = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
    const ext = mimeType === "image/png" ? "png"
      : mimeType === "image/jpeg" ? "jpg"
      : mimeType === "video/mp4" ? "mp4"
      : mimeType === "video/quicktime" ? "mov"
      : "bin";
    return `${userId}/${date}/${randomUUID()}.${ext}`;
  }

  async upload(
    buffer: Buffer,
    gcsPath: string,
    mimeType: string
  ): Promise<string> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(gcsPath);

    const isLargeFile = buffer.length > 5 * 1024 * 1024;

    await file.save(buffer, {
      contentType: mimeType,
      resumable: isLargeFile,
      metadata: { cacheControl: "public, max-age=31536000" },
    });

    return `https://storage.googleapis.com/${this.bucketName}/${gcsPath}`;
  }

  async deleteFile(gcsPath: string): Promise<void> {
    try {
      await this.storage.bucket(this.bucketName).file(gcsPath).delete();
    } catch {
      // Best-effort cleanup — do not throw
    }
  }
}

export function getExtensionForMime(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
  };
  return map[mimeType] ?? extname(mimeType);
}

// Lazy singleton — only instantiated when GCS env vars are present
let _gcsService: GcsService | null = null;

export function getGcsService(): GcsService {
  if (!_gcsService) {
    _gcsService = new GcsService();
  }
  return _gcsService;
}
