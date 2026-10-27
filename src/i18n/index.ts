import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './locales/fr.json';
import en from './locales/en.json';

/**
 * Multilingue. Pour ajouter une langue :
 *   1. copier locales/fr.json en locales/xx.json et traduire les valeurs ;
 *   2. l'importer ci-dessous et l'ajouter à `resources` et `LANGUAGES`.
 */
export const LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
] as const;

const resources = {
  fr: { translation: fr },
  en: { translation: en },
};

/** Langue effective : choix de l'utilisateur, sinon langue du téléphone, sinon français. */
export function resolveLanguage(pref: string): string {
  if (pref !== 'auto' && pref in resources) return pref;
  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag.toLowerCase().split('-')[0];
    if (base in resources) return base;
  }
  return 'fr';
}

export function setLanguage(pref: string): void {
  const lng = resolveLanguage(pref);
  if (i18n.language !== lng) void i18n.changeLanguage(lng);
  document.documentElement.lang = lng;
}

void i18n.use(initReactI18next).init({
  resources,
  lng: resolveLanguage('auto'),
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
});
document.documentElement.lang = i18n.language;

export default i18n;
