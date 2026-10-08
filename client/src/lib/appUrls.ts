/**
 * Production web origin — the deployable PWA/site. Single source for
 * external links (privacy, terms) and share deep-links, so the native
 * share sheet never leaks the webview origin (https://localhost/...).
 */
export const PROD_WEB_URL = "https://canadarepfinder.vercel.app";

/** Deep-ish link to the web app for a representative. */
export function repShareUrl(repId: string | number): string {
  return `${PROD_WEB_URL}/?rep=${repId}`;
}
