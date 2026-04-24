import { ref } from 'vue';
import { useBillingStore } from '~/stores/billing';

interface SSEIdea {
  id: string;
  text: string;
  [key: string]: unknown;
}

export function useSSEStream() {
  const tokens = ref('');
  const ideas = ref<SSEIdea[]>([]);
  const pendingIdeas = ref(0);
  // activePendingIdeas drives skeleton visibility.
  // Incremented synchronously on idea_pending, decremented via setTimeout
  // so Vue always renders at least one frame with the skeleton visible.
  const activePendingIdeas = ref(0);
  const updatingIdeaIds = ref<Set<string>>(new Set());
  const updatedIdeas = ref<SSEIdea[]>([]);
  const isStreaming = ref(false);
  const error = ref<string | null>(null);
  const sdkSessionId = ref<string | null>(null);
  const costUsd = ref<number | null>(null);

  let abortController: AbortController | null = null;

  function reset(): void {
    tokens.value = '';
    ideas.value = [];
    pendingIdeas.value = 0;
    activePendingIdeas.value = 0;
    updatingIdeaIds.value = new Set();
    updatedIdeas.value = [];
    isStreaming.value = false;
    error.value = null;
    sdkSessionId.value = null;
    costUsd.value = null;

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
          dataLines.push(line.slice(5).replace(/^ /, ''));
        }
      }

      if (dataLines.length > 0) {
        events.push({ event: eventType, data: dataLines.join('\n') });
      }
    }

    return events;
  }

  async function streamMessage(url: string, body: object, method = 'POST'): Promise<void> {
    if (!import.meta.client) return;
    if (abortController) {
      abortController.abort();
    }

    abortController = new AbortController();
    isStreaming.value = true;
    error.value = null;

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
        signal: abortController.signal,
      });

      if (!response.ok) {
        if (response.status === 402) {
          useBillingStore().openPricingModal();
        }
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
        tokens.value += data;
        break;
      }

      case 'idea_pending': {
        pendingIdeas.value += 1;
        activePendingIdeas.value += 1; // show skeleton immediately
        break;
      }

      case 'idea': {
        try {
          const parsed = JSON.parse(data);
          ideas.value.push(parsed);
          // Delay decrement so skeleton is visible for at least one render frame
          // even if idea_pending and idea arrive in the same SSE buffer chunk
          setTimeout(() => {
            activePendingIdeas.value = Math.max(0, activePendingIdeas.value - 1);
          }, 600);
        } catch {
          console.warn('Failed to parse idea event:', data);
        }
        break;
      }

      case 'idea_updating': {
        try {
          const parsed = JSON.parse(data);
          if (parsed.ideaId) {
            updatingIdeaIds.value = new Set([...updatingIdeaIds.value, parsed.ideaId]);
          }
        } catch {
          // ignore
        }
        break;
      }

      case 'idea_updated': {
        try {
          const parsed = JSON.parse(data);
          updatedIdeas.value.push(parsed);
          updatingIdeaIds.value = new Set(
            [...updatingIdeaIds.value].filter((id) => id !== parsed.id),
          );
        } catch {
          console.warn('Failed to parse idea_updated event:', data);
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
          if (parsed.costUsd !== undefined) {
            costUsd.value = parsed.costUsd;
          }
        } catch {
          // No data in done event
        }
        break;
      }

      case 'error': {
        try {
          const parsed = JSON.parse(data);
          error.value = parsed.message ?? data;
        } catch {
          error.value = data;
        }
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
    pendingIdeas,
    activePendingIdeas,
    updatingIdeaIds,
    updatedIdeas,
    isStreaming,
    error,
    sdkSessionId,
    costUsd,
    streamMessage,
    reset,
  };
}
