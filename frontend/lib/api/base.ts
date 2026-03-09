/**
 * Normalized public API base URL.
 * Handles env values like "https://host/api" to avoid "/api/api/*" calls.
 */
export function getApiBaseUrl(): string {
  let rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  if (rawUrl.endsWith('/api')) {
    rawUrl = rawUrl.slice(0, -4);
  }
  if (rawUrl.endsWith('/')) {
    rawUrl = rawUrl.slice(0, -1);
  }
  if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
    rawUrl = `https://${rawUrl}`;
  }

  return rawUrl;
}

export const API_BASE_URL = getApiBaseUrl();
