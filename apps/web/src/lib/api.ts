'use client';

import { DemoSession } from './session';

export type ApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  meta: Record<string, unknown>;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  } | null;
};

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { session?: DemoSession | null } = {},
): Promise<ApiEnvelope<T>> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.session?.accessToken) {
    headers.set('Authorization', `Bearer ${options.session.accessToken}`);
  }

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
      cache: 'no-store',
    });

    const data = (await response.json()) as ApiEnvelope<T>;
    return data;
  } catch (error) {
    return {
      success: false,
      data: null,
      meta: {},
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network request failed.',
      },
    };
  }
}
