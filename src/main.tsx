import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import './ui/global.css';
import { installThemeStyles } from './ui/theme';
import './i18n';
import { requestPersistentStorage } from './db/db';
import { App } from './App';

// Le thème est posé avant le premier rendu : pas de flash de couleur au démarrage.
installThemeStyles();
requestPersistentStorage();

// Service worker (mode hors ligne) uniquement pour la version web ; l'APK embarque déjà tout.
if (!Capacitor.isNativePlatform()) {
  void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
}

createRoot(document.getElementById('root')!).render(<App />);
