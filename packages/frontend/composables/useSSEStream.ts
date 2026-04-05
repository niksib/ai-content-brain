import { ref } from 'vue';

interface SSEIdea {
  id: string;
  text: string;
  [key: string]: unknown;
}

export function useSSEStream() {
  const tokens = ref('');
  const ideas = ref<SSEIdea[]>([]);
  const isStreaming = ref(false);
  const error = ref<string | null>(null);
  const sdkSessionId = ref<string | null>(null);

  let abortController: AbortController | null = null;

  function reset(): void {
    tokens.value = '';
    ideas.value = [];
    isStreaming.value = false;
    error.value = null;
    sdkSessionId.value = null;

    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  }

  function parseSSEEvents(chunk: string): Array<{ event: string; data: string }> {
    const events: Array<{ event: string; data: string }> = [];
    const blocks = chunk.split('\n\n');

    for (const block of blocks) {
      if (!block.trim()) continue;

      let eventType = 'message';
      let dataLines: string[] = [];

      const lines = block.split('\n');
      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trim());
        }
      }

      if (dataLines.length > 0) {
        events.push({ event: eventType, data: dataLines.join('\n') });
      }
    }

    return events;
  }

  async function streamMessage(url: string, body: object): Promise<void> {
    if (abortController) {
      abortController.abort();
    }

    abortController = new AbortController();
    isStreaming.value = true;
    error.value = null;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null — streaming not supported');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events (delimited by double newline)
        const lastDoubleNewline = buffer.lastIndexOf('\n\n');
        if (lastDoubleNewline === -1) continue;

        const complete = buffer.slice(0, lastDoubleNewline + 2);
        buffer = buffer.slice(lastDoubleNewline + 2);

        const events = parseSSEEvents(complete);

        for (const sseEvent of events) {
          handleSSEEvent(sseEvent.event, sseEvent.data);
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        const events = parseSSEEvents(buffer);
        for (const sseEvent of events) {
          handleSSEEvent(sseEvent.event, sseEvent.data);
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      const message = err instanceof Error ? err.message : 'Stream connection failed';
      error.value = message;
      console.error('SSE stream error:', err);
    } finally {
      isStreaming.value = false;
      abortController = null;
    }
  }

  function handleSSEEvent(eventType: string, data: string): void {
    switch (eventType) {
      case 'token': {
        try {
          const parsed = JSON.parse(data);
          tokens.value += parsed.token ?? parsed.text ?? data;
        } catch {
          // Plain text token
          tokens.value += data;
        }
        break;
      }

      case 'idea': {
        try {
          const parsed = JSON.parse(data);
          ideas.value.push(parsed);
        } catch {
          console.warn('Failed to parse idea event:', data);
        }
        break;
      }

      case 'done': {
        try {
          const parsed = JSON.parse(data);
          if (parsed.sdkSessionId) {
            sdkSessionId.value = parsed.sdkSessionId;
          }
          if (parsed.sessionId) {
            sdkSessionId.value = parsed.sessionId;
          }
        } catch {
          // No session ID in done event
        }
        break;
      }

      case 'error': {
        error.value = data;
        break;
      }

      default:
        // Unknown event type, ignore
        break;
    }
  }

  return {
    tokens,
    ideas,
    isStreaming,
    error,
    sdkSessionId,
    streamMessage,
    reset,
  };
}
