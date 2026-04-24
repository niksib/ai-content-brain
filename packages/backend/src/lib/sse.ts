import type { Context } from "hono";

export interface SSEHandle {
  send: (event: string, data: unknown) => boolean;
  close: () => void;
  response: Response;
  isClosed: () => boolean;
}

export function createSSEStream(context: Context): SSEHandle {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  let closed = false;

  const markClosed = (reason?: unknown): void => {
    if (closed) return;
    closed = true;
    if (reason) {
      console.warn("[SSE] Stream closed early:", reason instanceof Error ? reason.message : reason);
    }
  };

  // If the client disconnects, writer.closed rejects. Cache that once.
  writer.closed.catch((err) => markClosed(err));

  const send = (event: string, data: unknown): boolean => {
    if (closed) return false;
    const payload =
      typeof data === "string"
        ? data.split("\n").map((line) => `data: ${line}`).join("\n")
        : `data: ${JSON.stringify(data)}`;
    try {
      writer.write(encoder.encode(`event: ${event}\n${payload}\n\n`)).catch(markClosed);
      return true;
    } catch (err) {
      markClosed(err);
      return false;
    }
  };

  const close = (): void => {
    if (closed) return;
    closed = true;
    writer.close().catch(() => {
      // Writer already errored — nothing to do.
    });
  };

  const response = new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });

  return { send, close, response, isClosed: () => closed };
}
