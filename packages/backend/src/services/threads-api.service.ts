import { redactSecrets } from "../lib/redact.js";

export const THREADS_BASE_URL = "https://graph.threads.net/v1.0";
const THREADS_AUTH_URL = "https://threads.net/oauth/authorize";
const THREADS_TOKEN_URL = "https://graph.threads.net/oauth/access_token";
const THREADS_LONG_LIVED_URL = "https://graph.threads.net/access_token";
const THREADS_REFRESH_URL = "https://graph.threads.net/refresh_access_token";

// Threads Insights enforces a rolling 2-year window for time-bound queries:
// "since param is not valid. Metrics data is available for the last 2 years".
// Cumulative totals here are therefore "totals over the last ~2 years". For
// our deltas (day / week / month) the absolute value doesn't matter — only the
// difference between two recent snapshots — so clamping at 2 years is safe.
const THREADS_INSIGHTS_WINDOW_SECONDS = 2 * 365 * 24 * 60 * 60;

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
  profilePictureUrl?: string;
  isVerified: boolean;
}

export interface ThreadsInsights {
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  followersCount: number;
  views: number;
}

export interface ThreadsAccountSnapshotData {
  followersCount: number;
  likesTotal: number;
  repliesTotal: number;
  repostsTotal: number;
  quotesTotal: number;
  viewsTotal: number;
  clicksTotal: number;
  partial: boolean;
}

export interface ThreadsPostInsights {
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  shares: number;
}

export interface ThreadsUserPost {
  id: string;
  text: string;
  timestamp: string;
  permalink?: string;
}

export interface ThreadsPublishResult {
  postId: string;
}

export interface ThreadsPost {
  id: string;
  text: string;
  timestamp: string;
}

export class ThreadsApiService {
  buildAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: process.env.THREADS_APP_ID!,
      redirect_uri: process.env.THREADS_REDIRECT_URI!,
      scope: "threads_basic,threads_content_publish,threads_keyword_search,threads_manage_insights,threads_manage_replies,threads_profile_discovery,threads_read_replies",
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
      fields: "id,username,name,threads_biography,threads_profile_picture_url,is_verified",
      access_token: accessToken,
    });

    const response = await fetch(`${THREADS_BASE_URL}/me?${params.toString()}`);

    if (!response.ok) {
      const errorBody = redactSecrets(await response.text());
      throw new Error(`Threads user info fetch failed: ${response.status} — ${errorBody}`);
    }

    const data = await response.json() as {
      id: string;
      username: string;
      name: string;
      threads_biography?: string;
      threads_profile_picture_url?: string;
      is_verified?: boolean;
    };

    return {
      id: data.id,
      username: data.username,
      name: data.name,
      biography: data.threads_biography,
      profilePictureUrl: data.threads_profile_picture_url,
      isVerified: data.is_verified ?? false,
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

  private async pollContainerStatus(
    containerId: string,
    accessToken: string,
    maxAttempts = 30,
    intervalMs = 10_000
  ): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));

      const statusUrl = new URL(`${THREADS_BASE_URL}/${containerId}`);
      statusUrl.searchParams.set("fields", "status,error_message");
      statusUrl.searchParams.set("access_token", accessToken);

      const response = await fetch(statusUrl.toString());
      if (!response.ok) continue;

      const data = await response.json() as { status: string; error_message?: string };

      if (data.status === "FINISHED") return;
      if (data.status === "ERROR") {
        throw new Error(`Media processing failed: ${data.error_message ?? "unknown error"}`);
      }
      // IN_PROGRESS or PUBLISHED_BUT_INVISIBLE → keep polling
    }

    throw new Error("Media container processing timed out after 5 minutes");
  }

  async publishSingleMediaPost(
    threadsUserId: string,
    accessToken: string,
    text: string,
    mediaType: "IMAGE" | "VIDEO",
    mediaUrl: string
  ): Promise<ThreadsPublishResult> {
    const containerParams = new URLSearchParams({
      media_type: mediaType,
      text,
      access_token: accessToken,
    });
    containerParams.set(mediaType === "IMAGE" ? "image_url" : "video_url", mediaUrl);

    const containerResponse = await fetch(
      `${THREADS_BASE_URL}/${threadsUserId}/threads`,
      { method: "POST", body: containerParams }
    );

    if (!containerResponse.ok) {
      const errorBody = redactSecrets(await containerResponse.text().catch(() => ""));
      throw new Error(`Media container creation failed (${containerResponse.status}): ${errorBody}`);
    }

    const containerData = await containerResponse.json() as { id: string };

    await this.pollContainerStatus(containerData.id, accessToken);

    const publishParams = new URLSearchParams({
      creation_id: containerData.id,
      access_token: accessToken,
    });

    const publishResponse = await fetch(
      `${THREADS_BASE_URL}/${threadsUserId}/threads_publish`,
      { method: "POST", body: publishParams }
    );

    if (!publishResponse.ok) {
      const errorBody = redactSecrets(await publishResponse.text().catch(() => ""));
      throw new Error(`Media publish failed (${publishResponse.status}): ${errorBody}`);
    }

    const publishData = await publishResponse.json() as { id: string };
    return { postId: publishData.id };
  }

  async publishCarousel(
    threadsUserId: string,
    accessToken: string,
    text: string,
    mediaItems: Array<{ mediaType: "IMAGE" | "VIDEO"; mediaUrl: string }>
  ): Promise<ThreadsPublishResult> {
    // Step 1: Create item containers
    const itemContainerIds: string[] = [];

    for (const item of mediaItems) {
      const itemParams = new URLSearchParams({
        media_type: item.mediaType,
        is_carousel_item: "true",
        access_token: accessToken,
      });
      itemParams.set(item.mediaType === "IMAGE" ? "image_url" : "video_url", item.mediaUrl);

      const itemResponse = await fetch(
        `${THREADS_BASE_URL}/${threadsUserId}/threads`,
        { method: "POST", body: itemParams }
      );

      if (!itemResponse.ok) {
        const errorBody = redactSecrets(await itemResponse.text().catch(() => ""));
        throw new Error(`Carousel item container creation failed (${itemResponse.status}): ${errorBody}`);
      }

      const itemData = await itemResponse.json() as { id: string };
      itemContainerIds.push(itemData.id);
    }

    // Step 2: Create carousel container
    const carouselParams = new URLSearchParams({
      media_type: "CAROUSEL",
      children: itemContainerIds.join(","),
      text,
      access_token: accessToken,
    });

    const carouselResponse = await fetch(
      `${THREADS_BASE_URL}/${threadsUserId}/threads`,
      { method: "POST", body: carouselParams }
    );

    if (!carouselResponse.ok) {
      const errorBody = redactSecrets(await carouselResponse.text().catch(() => ""));
      throw new Error(`Carousel container creation failed (${carouselResponse.status}): ${errorBody}`);
    }

    const carouselData = await carouselResponse.json() as { id: string };

    // Step 3: Poll until ready
    await this.pollContainerStatus(carouselData.id, accessToken);

    // Step 4: Publish
    const publishParams = new URLSearchParams({
      creation_id: carouselData.id,
      access_token: accessToken,
    });

    const publishResponse = await fetch(
      `${THREADS_BASE_URL}/${threadsUserId}/threads_publish`,
      { method: "POST", body: publishParams }
    );

    if (!publishResponse.ok) {
      const errorBody = redactSecrets(await publishResponse.text().catch(() => ""));
      throw new Error(`Carousel publish failed (${publishResponse.status}): ${errorBody}`);
    }

    const publishData = await publishResponse.json() as { id: string };
    return { postId: publishData.id };
  }

  async publishThreadChain(
    threadsUserId: string,
    accessToken: string,
    posts: Array<{ text: string; mediaItems?: Array<{ mediaType: "IMAGE" | "VIDEO"; mediaUrl: string }> }>
  ): Promise<{ postIds: string[] }> {
    if (posts.length === 0) throw new Error("Posts array cannot be empty");

    // Single post fast path — reuses text/single-media/carousel helpers
    if (posts.length === 1) {
      const single = posts[0];
      const items = single.mediaItems ?? [];
      if (items.length >= 2) {
        const result = await this.publishCarousel(threadsUserId, accessToken, single.text, items);
        return { postIds: [result.postId] };
      }
      if (items.length === 1) {
        const result = await this.publishSingleMediaPost(
          threadsUserId,
          accessToken,
          single.text,
          items[0].mediaType,
          items[0].mediaUrl
        );
        return { postIds: [result.postId] };
      }
      const result = await this.publishTextPost(threadsUserId, accessToken, single.text);
      return { postIds: [result.postId] };
    }

    const postIds: string[] = [];

    for (let index = 0; index < posts.length; index++) {
      const current = posts[index];
      const prevPostId = index > 0 ? postIds[index - 1] : null;

      if (index > 0) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      const containerParams = new URLSearchParams({
        text: current.text,
        access_token: accessToken,
      });

      // Threads API does not support carousel inside a thread reply; if a
      // reply has multiple mediaItems, publish only the first.
      const firstItem = current.mediaItems?.[0];
      const hasMedia = Boolean(firstItem);
      if (firstItem) {
        containerParams.set("media_type", firstItem.mediaType);
        containerParams.set(
          firstItem.mediaType === "IMAGE" ? "image_url" : "video_url",
          firstItem.mediaUrl
        );
      } else {
        containerParams.set("media_type", "TEXT");
      }

      if (prevPostId) {
        containerParams.set("reply_to_id", prevPostId);
      }

      const containerResponse = await fetch(
        `${THREADS_BASE_URL}/${threadsUserId}/threads`,
        { method: "POST", body: containerParams }
      );

      if (!containerResponse.ok) {
        const errorBody = redactSecrets(await containerResponse.text().catch(() => ""));
        throw new Error(
          `Thread post ${index + 1}/${posts.length} container failed (${containerResponse.status}): ${errorBody}. Successful post IDs so far: ${postIds.join(", ") || "none"}`
        );
      }

      const containerData = await containerResponse.json() as { id: string };

      // Media posts need status polling; text posts just need a short settle
      if (hasMedia) {
        await this.pollContainerStatus(containerData.id, accessToken);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 5_000));
      }

      const publishParams = new URLSearchParams({
        creation_id: containerData.id,
        access_token: accessToken,
      });

      const publishResponse = await fetch(
        `${THREADS_BASE_URL}/${threadsUserId}/threads_publish`,
        { method: "POST", body: publishParams }
      );

      if (!publishResponse.ok) {
        const errorBody = redactSecrets(await publishResponse.text().catch(() => ""));
        throw new Error(
          `Thread post ${index + 1}/${posts.length} publish failed (${publishResponse.status}): ${errorBody}. Successful post IDs so far: ${postIds.join(", ") || "none"}`
        );
      }

      const publishData = await publishResponse.json() as { id: string };
      postIds.push(publishData.id);
      console.log(`[ThreadsApi] Thread post ${index + 1}/${posts.length} published → ${publishData.id}`);
    }

    return { postIds };
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

  async fetchUserPosts(
    threadsUserId: string,
    accessToken: string,
    limit: number = 30
  ): Promise<ThreadsPost[]> {
    const params = new URLSearchParams({
      fields: "id,text,timestamp,is_reply",
      limit: String(limit),
      access_token: accessToken,
    });

    const response = await fetch(
      `${THREADS_BASE_URL}/${threadsUserId}/threads?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Threads posts fetch failed: ${response.status}`);
    }

    const data = await response.json() as {
      data: Array<{ id: string; text?: string; timestamp: string; is_reply?: boolean }>;
    };

    return data.data
      .filter((post) => !post.is_reply && post.text && post.text.trim().length > 0)
      .map((post) => ({
        id: post.id,
        text: post.text!.trim(),
        timestamp: post.timestamp,
      }));
  }

  calculateEngagementRate(insights: Omit<ThreadsInsights, "views">): number {
    if (insights.followersCount === 0) return 0;
    const interactions = insights.likes + insights.replies + insights.reposts + insights.quotes;
    return (interactions / insights.followersCount) * 100;
  }

  // Fetches a full account snapshot: cumulative totals since 2024-04-13 plus
  // current followers count. Two requests because `followers_count` ignores
  // since/until while the time-bound metrics require it. Marks partial=true
  // when any metric fetch fails so callers can flag the snapshot in the UI.
  async fetchAccountSnapshot(
    threadsUserId: string,
    accessToken: string
  ): Promise<ThreadsAccountSnapshotData> {
    const untilTimestamp = Math.floor(Date.now() / 1000);
    // 60s buffer so we don't end up just past the API's 2-year boundary.
    const sinceTimestamp = untilTimestamp - THREADS_INSIGHTS_WINDOW_SECONDS + 60;
    let partial = false;

    const totals = {
      likes: 0,
      replies: 0,
      reposts: 0,
      quotes: 0,
      views: 0,
      clicks: 0,
    };

    try {
      const cumulativeParams = new URLSearchParams({
        metric: "likes,replies,reposts,quotes,views,clicks",
        since: String(sinceTimestamp),
        until: String(untilTimestamp),
        access_token: accessToken,
      });

      const cumulativeResponse = await fetch(
        `${THREADS_BASE_URL}/${threadsUserId}/threads_insights?${cumulativeParams.toString()}`
      );

      if (!cumulativeResponse.ok) {
        const errorBody = redactSecrets(await cumulativeResponse.text().catch(() => "(unreadable)"));
        throw new Error(`status ${cumulativeResponse.status} — ${errorBody}`);
      }

      const cumulativeData = await cumulativeResponse.json() as {
        data: Array<{
          name: string;
          total_value?: { value: number };
          values?: Array<{ value: number }>;
          link_total_values?: Array<{ value: number }>;
        }>;
      };

      for (const metric of cumulativeData.data ?? []) {
        const value = this.extractMetricValue(metric);
        if (metric.name in totals) {
          (totals as Record<string, number>)[metric.name] = value;
        }
      }
    } catch (cumulativeError) {
      console.error(
        "[ThreadsApi] Cumulative totals fetch failed:",
        redactSecrets(cumulativeError)
      );
      partial = true;
    }

    let followersCount = 0;
    try {
      const followersParams = new URLSearchParams({
        metric: "followers_count",
        access_token: accessToken,
      });

      const followersResponse = await fetch(
        `${THREADS_BASE_URL}/${threadsUserId}/threads_insights?${followersParams.toString()}`
      );

      if (!followersResponse.ok) {
        const errorBody = redactSecrets(await followersResponse.text().catch(() => "(unreadable)"));
        throw new Error(`status ${followersResponse.status} — ${errorBody}`);
      }

      const followersData = await followersResponse.json() as {
        data: Array<{ name: string; total_value?: { value: number } }>;
      };
      followersCount = followersData.data?.[0]?.total_value?.value ?? 0;
    } catch (followersError) {
      console.error(
        "[ThreadsApi] Followers count fetch failed:",
        redactSecrets(followersError)
      );
      partial = true;
    }

    return {
      followersCount,
      likesTotal: totals.likes,
      repliesTotal: totals.replies,
      repostsTotal: totals.reposts,
      quotesTotal: totals.quotes,
      viewsTotal: totals.views,
      clicksTotal: totals.clicks,
      partial,
    };
  }

  // Walks /me/threads pagination either fully (cursor=null) or until it hits
  // the previously-stored latest post ID. Returns the new posts (above the
  // cursor) along with the new latest ID. Replies are returned with isReply=
  // true so callers can decide whether to skip them — most should. When the
  // cap is hit without finding the cursor we signal cursorStale=true so the
  // caller can reset and do a full re-sync next tick.
  async fetchUserPostsSince(
    threadsUserId: string,
    accessToken: string,
    cursorPostId: string | null,
    maxPages: number = 20
  ): Promise<{
    newPosts: Array<{ id: string; isReply: boolean; publishedAt: Date; text: string }>;
    latestPostId: string | null;
    cursorStale: boolean;
  }> {
    const initialUrl = new URL(`${THREADS_BASE_URL}/${threadsUserId}/threads`);
    initialUrl.searchParams.set("fields", "id,text,timestamp,is_reply");
    initialUrl.searchParams.set("limit", "100");
    initialUrl.searchParams.set("access_token", accessToken);

    let nextUrl: string | null = initialUrl.toString();
    const newPosts: Array<{ id: string; isReply: boolean; publishedAt: Date; text: string }> = [];
    let latestPostId: string | null = null;
    let cursorFound = false;

    for (let page = 0; page < maxPages && nextUrl; page++) {
      const response = await fetch(nextUrl);
      if (!response.ok) {
        const errorBody = redactSecrets(await response.text().catch(() => "(unreadable)"));
        throw new Error(`Threads /me/threads page ${page + 1} failed: ${response.status} — ${errorBody}`);
      }

      const data = await response.json() as {
        data: Array<{ id: string; text?: string; timestamp: string; is_reply?: boolean }>;
        paging?: { next?: string };
      };

      for (const post of data.data ?? []) {
        if (latestPostId === null) latestPostId = post.id;

        if (cursorPostId !== null && post.id === cursorPostId) {
          cursorFound = true;
          break;
        }

        newPosts.push({
          id: post.id,
          isReply: post.is_reply === true,
          publishedAt: new Date(post.timestamp),
          text: post.text ?? "",
        });
      }

      if (cursorFound) break;
      nextUrl = data.paging?.next ?? null;
    }

    return {
      newPosts,
      latestPostId,
      cursorStale: cursorPostId !== null && !cursorFound,
    };
  }

  async fetchPostInsights(
    threadsPostId: string,
    accessToken: string
  ): Promise<ThreadsPostInsights> {
    const url = new URL(`${THREADS_BASE_URL}/${threadsPostId}/insights`);
    url.searchParams.set("metric", "views,likes,replies,reposts,quotes,shares");
    url.searchParams.set("access_token", accessToken);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Threads post insights fetch failed: ${response.status}`);
    }

    const data = await response.json() as {
      data: Array<{ name: string; values?: Array<{ value: number }> }>;
    };

    const metrics: Record<string, number> = {};
    for (const metric of data.data ?? []) {
      metrics[metric.name] = metric.values?.[0]?.value ?? 0;
    }

    return {
      views: metrics.views ?? 0,
      likes: metrics.likes ?? 0,
      replies: metrics.replies ?? 0,
      reposts: metrics.reposts ?? 0,
      quotes: metrics.quotes ?? 0,
      shares: metrics.shares ?? 0,
    };
  }

  private extractMetricValue(metric: {
    total_value?: { value: number };
    values?: Array<{ value: number }>;
    link_total_values?: Array<{ value: number }>;
  }): number {
    if (metric.total_value) return metric.total_value.value;
    if (metric.values) return metric.values.reduce((sum, entry) => sum + entry.value, 0);
    if (metric.link_total_values) {
      return metric.link_total_values.reduce((sum, entry) => sum + entry.value, 0);
    }
    return 0;
  }
}

export const threadsApiService = new ThreadsApiService();
