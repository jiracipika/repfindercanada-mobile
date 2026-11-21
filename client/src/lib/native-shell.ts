import { useEffect } from "react";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

/**
 * Glue between the web app and the native Capacitor shell. Everything here
 * is a no-op on web/PWA unless the platform genuinely supports it.
 */

// ---------------------------------------------------------------------------
// Theme-synced chrome (status bar style, Android webview backdrop, PWA
// theme-color meta). Called at startup and from the header theme toggle.
// ---------------------------------------------------------------------------

export function syncChromeToTheme(dark: boolean): void {
  // PWA browser chrome follows the toggle too (index.html only sets the
  // initial value from storage before first paint). Values match
  // --background in client/src/index.css (Civic Field Guide).
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", dark ? "#0a0a0f" : "#f6f6f8");

  if (!Capacitor.isNativePlatform()) return;
  StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {});
  if (Capacitor.getPlatform() === "android") {
    StatusBar.setBackgroundColor({ color: dark ? "#0a0a0f" : "#f6f6f8" }).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Splash — the native splash is held (launchAutoHide: false in
// capacitor.config) until the app reaches its first ready state, then fades.
// ---------------------------------------------------------------------------

export function hideLaunchSplash(fadeOutDuration = 300): void {
  if (!Capacitor.isNativePlatform()) return;
  SplashScreen.hide({ fadeOutDuration }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Haptics — two deliberate call sites: save-rep success (light impact) and
// tab-bar selection change. No-ops on web.
// ---------------------------------------------------------------------------

export function hapticLight(): void {
  if (!Capacitor.isNativePlatform()) return;
  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
}

export function hapticSelectionChanged(): void {
  if (!Capacitor.isNativePlatform()) return;
  Haptics.selectionChanged().catch(() => {});
}

// ---------------------------------------------------------------------------
// Android hardware back button — LIFO stack of open-surface dismissers.
// Sheets (BottomSheet) register while open; the App-level backButton
// listener pops: (1) dismiss topmost sheet, (2) navigate back to Find,
// (3) default exit.
// ---------------------------------------------------------------------------

type DismissHandler = () => void;
const dismissStack: DismissHandler[] = [];

/** Register a closer for the current top-most surface. Returns unregister. */
export function registerBackDismiss(handler: DismissHandler): () => void {
  dismissStack.push(handler);
  return () => {
    const index = dismissStack.indexOf(handler);
    if (index !== -1) dismissStack.splice(index, 1);
  };
}

/** Wire the hardware back button. Call once from the app root (native only). */
export function useAndroidBackButton(location: string, setLocation: (to: string) => void): void {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;
    let handle: PluginListenerHandle | undefined;

    void CapApp.addListener("backButton", () => {
      // 1. Close the top-most open sheet/modal, if any.
      const top = dismissStack[dismissStack.length - 1];
      if (top) {
        top();
        return;
      }
      // 2. Off the Find tab (or on a sub-route) — go back to Find.
      if (location !== "/") {
        setLocation("/");
        return;
      }
      // 3. At the root with nothing to close — default exit.
      void CapApp.exitApp();
    }).then((h) => {
      if (cancelled) h.remove();
      else handle = h;
    });

    return () => {
      cancelled = true;
      handle?.remove();
    };
  }, [location, setLocation]);
}
