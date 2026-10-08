import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.marcelsabas.repfinderforcanada',
  appName: 'RepFinder Canada',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    allowNavigation: [
      'represent.opennorth.ca',
      '*.gc.ca',
      'www.ourcommons.ca',
      'sencanada.ca',
      'elections.ca',
      'nominatim.openstreetmap.org'
    ]
    // No URL specified - app runs standalone on device
  },
  plugins: {
    // Hold the native splash until JS calls SplashScreen.hide() after the
    // app is ready, so there is no white flash against the dark background.
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#000000',
      androidScaleType: 'CENTER_CROP'
    },
    // Resize the whole webview (classic adjustResize) — matches this
    // min-h-screen flex shell; 'body' would not shrink 100vh layouts.
    Keyboard: {
      resize: 'native'
    }
  }
};

export default config;
