import type { CapacitorConfig } from '@capacitor/cli';

// Configuration de l'APK Android (voir README, section « Générer l'APK »).
const config: CapacitorConfig = {
  appId: 'com.financialapp.app',
  appName: 'FinancialApp',
  webDir: 'dist',
  backgroundColor: '#FFFFFF',
  android: {
    // Les données de l'app restent dans la WebView : pas de sauvegarde Google implicite.
    allowMixedContent: false,
  },
};

export default config;
