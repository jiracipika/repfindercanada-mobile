/**
 * Single source of truth for the app version.
 *
 * The native shell reports its own version via CapApp.getInfo(); this value
 * is the web/PWA fallback (and is kept in sync with package.json).
 */
export const APP_VERSION = '3.2.0';
