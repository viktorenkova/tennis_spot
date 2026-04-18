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

function resolveApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:4000/api/v1`;
  }

  return 'http://localhost:4000/api/v1';
}

function getFriendlyNetworkMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return 'РќРµ СѓРґР°Р»РѕСЃСЊ РІС‹РїРѕР»РЅРёС‚СЊ Р·Р°РїСЂРѕСЃ Рє СЃРµСЂРІРµСЂСѓ.';
  }

  const message = error.message.toLowerCase();

  if (
    message.includes('failed to fetch') ||
    message.includes('fetch failed') ||
    message.includes('networkerror') ||
    message.includes('load failed') ||
    message.includes('econnrefused')
  ) {
    return 'РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕРґРєР»СЋС‡РёС‚СЊСЃСЏ Рє СЃРµСЂРІРµСЂСѓ. РџСЂРѕРІРµСЂСЊС‚Рµ, С‡С‚Рѕ backend Р·Р°РїСѓС‰РµРЅ.';
  }

  return 'РќРµ СѓРґР°Р»РѕСЃСЊ РІС‹РїРѕР»РЅРёС‚СЊ Р·Р°РїСЂРѕСЃ Рє СЃРµСЂРІРµСЂСѓ.';
}

function formatFieldErrors(fields?: Record<string, string[]>) {
  if (!fields) {
    return null;
  }

  const messages = Object.values(fields)
    .flat()
    .filter(Boolean);

  if (!messages.length) {
    return null;
  }

  return Array.from(new Set(messages)).join(' ');
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { session?: DemoSession | null } = {},
): Promise<ApiEnvelope<T>> {
  const baseUrl = resolveApiBaseUrl();
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

    const rawText = await response.text();
    let payload: ApiEnvelope<T> | null = null;

    if (rawText) {
      try {
        payload = JSON.parse(rawText) as ApiEnvelope<T>;
      } catch {
        return {
          success: false,
          data: null,
          meta: {},
          error: {
            code: 'INVALID_RESPONSE',
            message: 'РЎРµСЂРІРµСЂ РІРµСЂРЅСѓР» РЅРµРїРѕРЅСЏС‚РЅС‹Р№ РѕС‚РІРµС‚. РћР±РЅРѕРІРёС‚Рµ СЃС‚СЂР°РЅРёС†Сѓ Рё РїРѕРїСЂРѕР±СѓР№С‚Рµ СЃРЅРѕРІР°.',
          },
        };
      }
    }

    if (payload) {
      if (payload.error) {
        payload.error.message = formatFieldErrors(payload.error.fields) ?? payload.error.message;
      }

      return payload;
    }

    return {
      success: false,
      data: null,
      meta: {},
      error: {
        code: 'INVALID_RESPONSE',
        message: 'РЎРµСЂРІРµСЂ РІРµСЂРЅСѓР» РїСѓСЃС‚РѕР№ РёР»Рё РЅРµРїРѕРЅСЏС‚РЅС‹Р№ РѕС‚РІРµС‚.',
      },
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      meta: {},
      error: {
        code: 'NETWORK_ERROR',
        message: getFriendlyNetworkMessage(error),
      },
    };
  }
}
