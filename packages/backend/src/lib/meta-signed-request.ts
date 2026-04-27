import { createHmac, timingSafeEqual } from "node:crypto";

export interface SignedRequestPayload {
  user_id: string;
  algorithm: string;
  issued_at?: number;
  expires?: number;
  [key: string]: unknown;
}

function decodeBase64Url(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + padding, "base64");
}

/**
 * Validate and parse a Meta `signed_request` (HMAC-SHA256 of the encoded
 * payload, signed with the app secret). Returns null on any structural,
 * algorithm, or signature mismatch — caller must treat null as "reject".
 *
 * Meta sends `signed_request=<sig>.<payload>` as form-encoded body to the
 * Deauthorize and Data Deletion callback URLs.
 */
export function parseSignedRequest(
  signedRequest: string,
  appSecret: string,
): SignedRequestPayload | null {
  if (typeof signedRequest !== "string" || !appSecret) return null;

  const dotIndex = signedRequest.indexOf(".");
  if (dotIndex <= 0 || dotIndex === signedRequest.length - 1) return null;

  const encodedSig = signedRequest.slice(0, dotIndex);
  const encodedPayload = signedRequest.slice(dotIndex + 1);

  const expected = createHmac("sha256", appSecret).update(encodedPayload).digest();
  const provided = decodeBase64Url(encodedSig);

  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;

  let payload: SignedRequestPayload;
  try {
    payload = JSON.parse(decodeBase64Url(encodedPayload).toString("utf8"));
  } catch {
    return null;
  }

  if (payload.algorithm !== "HMAC-SHA256") return null;
  if (typeof payload.user_id !== "string" || payload.user_id.length === 0) return null;

  return payload;
}
