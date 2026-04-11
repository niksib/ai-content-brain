const THREADS_BASE_URL = "https://graph.threads.net/v1.0";
const THREADS_AUTH_URL = "https://threads.net/oauth/authorize";
const THREADS_TOKEN_URL = "https://graph.threads.net/oauth/access_token";
const THREADS_LONG_LIVED_URL = "https://graph.threads.net/access_token";
const THREADS_REFRESH_URL = "https://graph.threads.net/refresh_access_token";

export interface ThreadsTokenResponse {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
}

export interface ThreadsUserInfo {
  id: string;
  username: string;
  name: string;
  biography?: string;
  isPrivate: boolean;
}

export interface ThreadsInsights {
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  followersCount: number;
  views: number;
}

export interface ThreadsPublishResult {
  postId: string;
}

export class ThreadsApiService {
  buildAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: process.env.THREADS_APP_ID!,
      redirect_uri: process.env.THREADS_REDIRECT_URI!,
      scope: "threads_basic,threads_content_publish,threads_manage_insights",
      response_type: "code",
      state,
    });
    return `${THREADS_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForShortLivedToken(code: string): Promise<string> {
    const body = new URLSearchParams({
      client_id: process.env.THREADS_APP_ID!,
      client_secret: process.env.THREADS_APP_SECRET!,
      grant_type: "authorization_code",
      redirect_uri: process.env.THREADS_REDIRECT_URI!,
      code,
    });

    const response = await fetch(THREADS_TOKEN_URL, {
      method: "POST",
      body,
    });

    if (!response.ok) {
      throw new Error(`Threads token exchange failed: ${response.status}`);
    }

    const data = await response.json() as { access_token: string };
    return data.access_token;
  }

  async exchangeForLongLivedToken(shortLivedToken: string): Promise<ThreadsTokenResponse> {
    const params = new URLSearchParams({
      grant_type: "th_exchange_token",
      client_secret: process.env.THREADS_APP_SECRET!,
      access_token: shortLivedToken,
    });

    const response = await fetch(`${THREADS_LONG_LIVED_URL}?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Threads long-lived token exchange failed: ${response.status}`);
    }

    const data = await response.json() as { access_token: string; token_type: string; expires_in: number };
    return {
      accessToken: data.access_token,
      tokenType: data.token_type,
      expiresInSeconds: data.expires_in,
    };
  }

  async refreshToken(accessToken: string): Promise<ThreadsTokenResponse> {
    const params = new URLSearchParams({
      grant_type: "th_refresh_token",
      access_token: accessToken,
    });

    const response = await fetch(`${THREADS_REFRESH_URL}?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Threads token refresh failed: ${response.status}`);
    }

    const data = await response.json() as { access_token: string; token_type: string; expires_in: number };
    return {
      accessToken: data.access_token,
      tokenType: data.token_type,
      expiresInSeconds: data.expires_in,
    };
  }

  async getUserInfo(accessToken: string): Promise<ThreadsUserInfo> {
    const params = new URLSearchParams({
      fields: "id,username,name,biography,is_private",
      access_token: accessToken,
    });

    const response = await fetch(`${THREADS_BASE_URL}/me?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Threads user info fetch failed: ${response.status}`);
    }

    const data = await response.json() as {
      id: string;
      username: string;
      name: string;
      biography?: string;
      is_private: boolean;
    };

    return {
      id: data.id,
      username: data.username,
      name: data.name,
      biography: data.biography,
      isPrivate: data.is_private,
    };
  }

  async publishTextPost(
    threadsUserId: string,
    accessToken: string,
    text: string
  ): Promise<ThreadsPublishResult> {
    // Step 1: Create container
    const containerParams = new URLSearchParams({
      media_type: "TEXT",
      text,
      access_token: accessToken,
    });

    const containerResponse = await fetch(
      `${THREADS_BASE_URL}/${threadsUserId}/threads`,
      {
        method: "POST",
        body: containerParams,
      }
    );

    if (!containerResponse.ok) {
      throw new Error(`Threads container creation failed: ${containerResponse.status}`);
    }

    const containerData = await containerResponse.json() as { id: string };
    const containerId = containerData.id;

    // Step 2: Wait 30 seconds for media processing
    await new Promise((resolve) => setTimeout(resolve, 30_000));

    // Step 3: Publish container
    const publishParams = new URLSearchParams({
      creation_id: containerId,
      access_token: accessToken,
    });

    const publishResponse = await fetch(
      `${THREADS_BASE_URL}/${threadsUserId}/threads_publish`,
      {
        method: "POST",
        body: publishParams,
      }
    );

    if (!publishResponse.ok) {
      throw new Error(`Threads publish failed: ${publishResponse.status}`);
    }

    const publishData = await publishResponse.json() as { id: string };
    return { postId: publishData.id };
  }

  async getProfileInsights(
    threadsUserId: string,
    accessToken: string,
    sinceTimestamp: number,
    untilTimestamp: number
  ): Promise<ThreadsInsights> {
    const params = new URLSearchParams({
      metric: "likes,replies,reposts,quotes,followers_count,views",
      since: String(sinceTimestamp),
      until: String(untilTimestamp),
      access_token: accessToken,
    });

    const response = await fetch(
      `${THREADS_BASE_URL}/${threadsUserId}/threads_insights?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Threads insights fetch failed: ${response.status}`);
    }

    const data = await response.json() as {
      data: Array<{
        name: string;
        period: string;
        total_value?: { value: number };
        values?: Array<{ value: number; end_time: string }>;
      }>;
    };

    const getValue = (name: string): number => {
      const metric = data.data.find((m) => m.name === name);
      if (!metric) return 0;
      if (metric.total_value) return metric.total_value.value;
      if (metric.values) return metric.values.reduce((sum, v) => sum + v.value, 0);
      return 0;
    };

    return {
      likes: getValue("likes"),
      replies: getValue("replies"),
      reposts: getValue("reposts"),
      quotes: getValue("quotes"),
      followersCount: getValue("followers_count"),
      views: getValue("views"),
    };
  }

  calculateEngagementRate(insights: Omit<ThreadsInsights, "views">): number {
    if (insights.followersCount === 0) return 0;
    const interactions = insights.likes + insights.replies + insights.reposts + insights.quotes;
    return (interactions / insights.followersCount) * 100;
  }
}

export const threadsApiService = new ThreadsApiService();
