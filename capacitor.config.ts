import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.marcelsabas.repfinderforcanada',
  appName: 'Canadian Rep Finder',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    allowNavigation: [
      'represent.opennorth.ca',
      '*.gc.ca',
      'www.ourcommons.ca',
      'sencanada.ca',
      'elections.ca',
    ]
  }
};

export default config;
