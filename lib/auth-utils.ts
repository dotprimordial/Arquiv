/**
 * Get the proper redirect URL for OAuth and auth callbacks
 * Uses APP_URL from environment if available, otherwise falls back to window.location.origin
 * (window.location.origin can be wrong behind proxies/load balancers)
 */
export function getAuthRedirectUrl(path: string = '/auth/callback'): string {
  // Try environment variable first (set in .env.local / .env.production)
  const appUrl = typeof window !== 'undefined' 
    ? (window as Window & { __APP_URL?: string }).__APP_URL || process.env.NEXT_PUBLIC_APP_URL
    : process.env.NEXT_PUBLIC_APP_URL;

  if (appUrl) {
    return `${appUrl}${path}`;
  }

  // Fallback to window.location.origin
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path}`;
  }

  // Last resort (shouldn't happen in browser)
  return `http://localhost:3000${path}`;
}
