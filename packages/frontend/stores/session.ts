import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useApiClient } from '~/services/api';
import { useSSEStream } from '~/composables/useSSEStream';

export interface Session {
  id: string;
  userId: string;
  status: 'active' | 'completed';
  sdkSessionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface ProducedContentBody {
  // text_post (Threads, LinkedIn)
  text?: string;
  hashtags?: string[];

  // video_script (TikTok, Reels)
  script?: Array<{ timestamp: string; text: string }>;
  shootingBrief?: string;
  deliveryNotes?: string;
  caption?: string;

  // carousel (Instagram)
  slides?: Array<{ slideNumber: number; text: string; designNotes?: string }>;

  // stories (Instagram)
  stories?: Array<{
    storyNumber: number;
    textOverlay: string;
    background?: string;
    interactiveElement?: string;
  }>;
  notes?: string;
}

export interface ProducedContent {
  id: string;
  contentIdeaId: string;
  platform: string;
  format: string;
  body: ProducedContentBody;
  createdAt: string;
}

export interface SessionIdea {
  id: string;
  sessionId: string;
  platform: string;
  format: string;
  angle: string;
  description?: string;
  producedContent?: ProducedContent | null;
  status: 'proposed' | 'approved' | 'rejected' | 'producing' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export type PageState = 'recording' | 'chat';

export const useSessionStore = defineStore('session', () => {
  const apiClient = useApiClient();
  const config = useRuntimeConfig();
  const baseURL = config.public.apiBaseUrl as string;

  const session = ref<Session | null>(null);
  const messages = ref<SessionMessage[]>([]);
  const ideas = ref<SessionIdea[]>([]);
  const pageState = ref<PageState>('recording');
  const isStreaming = ref(false);
  const currentStreamText = ref('');
  const selectedIdeaId = ref<string | null>(null);

  const sseStream = useSSEStream();

  async function createOrLoadSession(sessionId?: string): Promise<void> {
    try {
      if (sessionId) {
        const response = await apiClient.get<{ session: Session }>(`/api/sessions/${sessionId}`);
        session.value = response.session;
      } else {
        const response = await apiClient.post<{ session: Session }>('/api/sessions');
        session.value = response.session;
      }
    } catch (error) {
      console.error('Failed to create or load session:', error);
      throw error;
    }
  }

  async function loadMessages(): Promise<void> {
    if (!session.value) return;
    const response = await apiClient.get<{ messages: SessionMessage[] }>(
      `/api/sessions/${session.value.id}/messages`,
    );
    messages.value = response.messages;

    // If we already have messages, we're in chat mode
    if (messages.value.length > 0) {
      pageState.value = 'chat';
    }
  }

  async function loadIdeas(): Promise<void> {
    if (!session.value) return;
    const response = await apiClient.get<{ ideas: SessionIdea[] }>(
      `/api/sessions/${session.value.id}/ideas`,
    );
    ideas.value = response.ideas;
  }

  async function sendMessage(text: string): Promise<void> {
    if (!session.value) return;

    // Add user message to the list immediately
    const userMessage: SessionMessage = {
      id: `temp-${Date.now()}`,
      sessionId: session.value.id,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    messages.value.push(userMessage);

    // Switch to chat mode on first message
    if (pageState.value === 'recording') {
      pageState.value = 'chat';
    }

    // Reset stream state
    sseStream.reset();
    currentStreamText.value = '';
    isStreaming.value = true;

    try {
      const body: Record<string, unknown> = { content: text };
      if (session.value.sdkSessionId) {
        body.sdkSessionId = session.value.sdkSessionId;
      }

      await sseStream.streamMessage(
        `${baseURL}/api/sessions/${session.value.id}/message`,
        body,
      );

      // Capture streamed text as assistant message
      const assistantContent = sseStream.tokens.value;
      if (assistantContent) {
        const assistantMessage: SessionMessage = {
          id: `temp-${Date.now()}-assistant`,
          sessionId: session.value.id,
          role: 'assistant',
          content: assistantContent,
          createdAt: new Date().toISOString(),
        };
        messages.value.push(assistantMessage);
      }

      // Capture any new ideas from the stream
      if (sseStream.ideas.value.length > 0) {
        for (const rawIdea of sseStream.ideas.value) {
          const idea: SessionIdea = {
            id: (rawIdea as Record<string, unknown>).id as string ?? `idea-${Date.now()}`,
            sessionId: session.value.id,
            platform: (rawIdea as Record<string, unknown>).platform as string ?? '',
            format: (rawIdea as Record<string, unknown>).format as string ?? '',
            angle: (rawIdea as Record<string, unknown>).angle as string ?? (rawIdea as Record<string, unknown>).text as string ?? '',
            description: (rawIdea as Record<string, unknown>).description as string | undefined,
            status: ((rawIdea as Record<string, unknown>).status as SessionIdea['status']) ?? 'proposed',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          ideas.value.push(idea);
        }
      }

      // Update SDK session ID if returned
      if (sseStream.sdkSessionId.value && session.value) {
        session.value.sdkSessionId = sseStream.sdkSessionId.value;
      }
    } catch (error) {
      // Remove optimistic user message on failure
      const messageIndex = messages.value.indexOf(userMessage);
      if (messageIndex !== -1) {
        messages.value.splice(messageIndex, 1);
      }
      console.error('Failed to send message:', error);
      throw error;
    } finally {
      // Reset streaming state
      currentStreamText.value = '';
      isStreaming.value = false;
    }
  }

  async function approveIdea(ideaId: string): Promise<void> {
    if (!session.value) return;
    try {
      await apiClient.patch(`/api/ideas/${ideaId}/approve`);
      const idea = ideas.value.find((item) => item.id === ideaId);
      if (idea) {
        idea.status = 'approved';
      }
    } catch (error) {
      console.error('Failed to approve idea:', error);
      throw error;
    }
  }

  async function rejectIdea(ideaId: string): Promise<void> {
    if (!session.value) return;
    try {
      await apiClient.patch(`/api/ideas/${ideaId}/reject`);
      const idea = ideas.value.find((item) => item.id === ideaId);
      if (idea) {
        idea.status = 'rejected';
      }
    } catch (error) {
      console.error('Failed to reject idea:', error);
      throw error;
    }
  }

  async function loadIdea(ideaId: string): Promise<SessionIdea | null> {
    if (!session.value) return null;
    const response = await apiClient.get<{ idea: SessionIdea }>(
      `/api/ideas/${ideaId}`,
    );
    return response.idea;
  }

  function resetSession(): void {
    session.value = null;
    messages.value = [];
    ideas.value = [];
    pageState.value = 'recording';
    isStreaming.value = false;
    currentStreamText.value = '';
    selectedIdeaId.value = null;
    sseStream.reset();
  }

  return {
    session,
    messages,
    ideas,
    pageState,
    isStreaming,
    currentStreamText,
    selectedIdeaId,
    streamTokens: sseStream.tokens,
    streamError: sseStream.error,
    createOrLoadSession,
    loadMessages,
    loadIdeas,
    sendMessage,
    approveIdea,
    rejectIdea,
    loadIdea,
    resetSession,
  };
});
