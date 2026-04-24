export function useApiClient() {
  const config = useRuntimeConfig();
  const baseURL = config.public.apiBaseUrl as string;

  async function request<T>(
    path: string,
    options: RequestInit & { method?: string } = {},
  ): Promise<T> {
    const url = `${baseURL}${path}`;

    try {
      const response = await $fetch<T>(url, {
        method: options.method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        headers: options.headers as Record<string, string>,
        body: options.body as string | undefined,
        credentials: 'include',
      });

      return response;
    } catch (error: unknown) {
      const status = (error as { status?: number; response?: { status?: number } })?.status
        ?? (error as { response?: { status?: number } })?.response?.status;
      if (status === 402 && import.meta.client) {
        const { useBillingStore } = await import('~/stores/billing');
        useBillingStore().openPricingModal();
      }
      throw error;
    }
  }

  function get<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'GET' });
  }

  function post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  function put<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  function patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  function del<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'DELETE' });
  }

  return { get, post, put, patch, del, request };
}
