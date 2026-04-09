import type { Context } from "hono";

export function createSSEStream(context: Context) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const send = (event: string, data: unknown) => {
    const payload =
      typeof data === "string"
        ? data.split("\n").map((line) => `data: ${line}`).join("\n")
        : `data: ${JSON.stringify(data)}`;
    writer.write(encoder.encode(`event: ${event}\n${payload}\n\n`));
  };

  const close = () => {
    writer.close();
  };

  const response = new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });

  return { send, close, response };
}
