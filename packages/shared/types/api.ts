// ==================== ENUMS ====================

export type Platform = 'threads' | 'linkedin' | 'tiktok' | 'instagram';

export type ContentFormat = 'text_post' | 'video_script' | 'carousel' | 'stories';

export type IdeaStatus = 'proposed' | 'approved' | 'rejected' | 'producing' | 'completed';

export type SessionType = 'onboarding' | 'daily';

export type SessionStatus = 'active' | 'completed';

export type MessageRole = 'user' | 'assistant';

export type CreditTransactionType =
  | 'subscription_grant'
  | 'topup_purchase'
  | 'voice_processing'
  | 'content_plan'
  | 'content_production';

// ==================== SSE EVENTS ====================

export interface SSETokenEvent {
  type: 'token';
  content: string;
}

export interface SSEIdeaEvent {
  type: 'idea';
  idea: ContentIdeaDTO;
}

export interface SSEContentEvent {
  type: 'content';
  content: ProducedContentDTO;
}

export interface SSEDoneEvent {
  type: 'done';
}

export type SSEEvent = SSETokenEvent | SSEIdeaEvent | SSEContentEvent | SSEDoneEvent;

// ==================== SESSION ====================

export interface CreateSessionResponse {
  id: string;
  type: SessionType;
  status: SessionStatus;
  sessionDate: string;
  createdAt: string;
}

export interface SessionListItem {
  id: string;
  type: SessionType;
  status: SessionStatus;
  sessionDate: string;
  ideaCount: number;
  createdAt: string;
}

export interface SessionDetail {
  id: string;
  type: SessionType;
  status: SessionStatus;
  sessionDate: string;
  messages: ChatMessageDTO[];
  ideas: ContentIdeaDTO[];
  createdAt: string;
}

// ==================== MESSAGES ====================

export interface ChatMessageDTO {
  id: string;
  role: MessageRole;
  content: string;
  audioUrl: string | null;
  contentIdeaId: string | null;
  createdAt: string;
}

export interface SendMessageRequest {
  content: string;
  audioUrl?: string;
}

// ==================== CONTENT IDEAS ====================

export interface ContentIdeaDTO {
  id: string;
  platform: Platform;
  format: ContentFormat;
  angle: string;
  description: string;
  status: IdeaStatus;
  producedContent: ProducedContentDTO | null;
  createdAt: string;
}

// ==================== PRODUCED CONTENT ====================

export interface TextPostBody {
  text: string;
  hashtags: string[];
  imageSuggestion?: string;
}

export interface VideoScriptBody {
  hook: string;
  script: string;
  shootingBrief: string;
  caption: string;
  hashtags: string[];
  estimatedDuration: string;
}

export interface CarouselSlide {
  slideNumber: number;
  text: string;
  designDirection: string;
}

export interface CarouselBody {
  slides: CarouselSlide[];
  caption: string;
  hashtags: string[];
}

export interface StoriesBody {
  frames: StoriesFrame[];
  caption?: string;
}

export interface StoriesFrame {
  frameNumber: number;
  type: 'text' | 'poll' | 'question' | 'quiz';
  content: string;
  designDirection: string;
}

export type ProducedContentBody = TextPostBody | VideoScriptBody | CarouselBody | StoriesBody;

export interface ProducedContentDTO {
  id: string;
  platform: Platform;
  format: ContentFormat;
  body: ProducedContentBody;
  createdAt: string;
}

// ==================== BILLING ====================

export interface CreditBalanceDTO {
  balance: number;
  updatedAt: string;
}

export interface CreditTransactionDTO {
  id: string;
  amount: number;
  type: CreditTransactionType;
  reference: string | null;
  createdAt: string;
}

export interface CreateCheckoutRequest {
  priceId: string;
}

