/**
 * Design tokens — source unique des couleurs de l'app.
 *
 * Les couleurs sont injectées en variables CSS au démarrage (voir theme.ts) et
 * leurs contrastes sont vérifiés par un test automatique (tokens.test.ts) :
 * c'est ce qui garantit la lisibilité en plein soleil comme dans le noir.
 *
 * 4 variantes : clair / sombre × contraste normal / élevé.
 */

export interface ThemeTokens {
  /** Fond de l'écran. */
  bg: string;
  /** Cartes, champs, touches. */
  surface: string;
  /** Texte principal et pictogrammes. */
  ink: string;
  /** Texte secondaire (notes, légendes). */
  text2: string;
  /** Contours des cartes et contrôles. */
  line: string;
  /** Aplat de sélection (onglet actif, segment choisi). */
  accent: string;
  onAccent: string;
  /** Barre de navigation. */
  nav: string;
  onNav: string;
  /** Bouton principal. */
  primary: string;
  onPrimary: string;
  /** Rebord coloré par défaut sous les cartes. */
  ledge: string;
  /** Hausse des dépenses (mauvais signe) / baisse (bon signe). */
  up: string;
  down: string;
  /** Voile derrière les panneaux modaux. */
  scrim: string;
  /** Épaisseur des contours (px). */
  lineWidth: number;
}

/** Texte posé sur les aplats pastel (catégories), identique dans tous les thèmes. */
export const ON_PASTEL = '#1A1F16';

export const themes: Record<'light' | 'dark' | 'lightHigh' | 'darkHigh', ThemeTokens> = {
  light: {
    bg: '#E3F4B0',
    surface: '#F7FCEA',
    ink: '#1A1F16',
    text2: '#3F4B2C',
    line: '#1A1F16',
    accent: '#B9E27A',
    onAccent: '#1A1F16',
    nav: '#7FB35A',
    onNav: '#1A1F16',
    primary: '#1A1F16',
    onPrimary: '#E3F4B0',
    ledge: '#B9E27A',
    up: '#962818',
    down: '#285F1C',
    scrim: 'rgba(26, 31, 22, 0.45)',
    lineWidth: 1.5,
  },
  dark: {
    bg: '#11180E',
    surface: '#1B2616',
    ink: '#EEF7D6',
    text2: '#B9C9A0',
    line: '#C9DAAE',
    accent: '#B9E27A',
    onAccent: '#1A1F16',
    nav: '#2B4520',
    onNav: '#EEF7D6',
    primary: '#B9E27A',
    onPrimary: '#1A1F16',
    ledge: '#4E7A32',
    up: '#FFA493',
    down: '#A6E08A',
    scrim: 'rgba(0, 0, 0, 0.6)',
    lineWidth: 1.5,
  },
  // Contraste élevé : plein soleil, écran à faible luminosité, vue fatiguée.
  lightHigh: {
    bg: '#E8F7BC',
    surface: '#FCFFF3',
    ink: '#0B0E08',
    text2: '#222B16',
    line: '#0B0E08',
    accent: '#B9E27A',
    onAccent: '#0B0E08',
    nav: '#8FC56A',
    onNav: '#0B0E08',
    primary: '#0B0E08',
    onPrimary: '#F2FBD8',
    ledge: '#0B0E08',
    up: '#7A1A0C',
    down: '#1A4A10',
    scrim: 'rgba(11, 14, 8, 0.6)',
    lineWidth: 2,
  },
  darkHigh: {
    bg: '#060904',
    surface: '#11180D',
    ink: '#FFFFFF',
    text2: '#E3EED2',
    line: '#FFFFFF',
    accent: '#C8EE8C',
    onAccent: '#0B0E08',
    nav: '#1E3316',
    onNav: '#FFFFFF',
    primary: '#C8EE8C',
    onPrimary: '#0B0E08',
    ledge: '#C8EE8C',
    up: '#FFC2B6',
    down: '#C2F5A8',
    scrim: 'rgba(0, 0, 0, 0.75)',
    lineWidth: 2,
  },
};

/** Couleurs proposées pour les catégories (toujours avec du texte ON_PASTEL). */
export const CATEGORY_COLORS = [
  '#A9D8B4', // sauge
  '#C7B1DF', // lavande
  '#FFC94A', // moutarde
  '#F2A597', // saumon
  '#A8DCE0', // menthe
  '#F7C6CC', // rose
  '#D9D2C3', // grège
  '#B9E27A', // vert tendre
  '#FFB37A', // abricot
  '#9EC1F2', // ciel
  '#E6C9A8', // sable
  '#E0D46A', // anis
];

/** Luminance relative WCAG 2.x d'une couleur #RRGGBB. */
export function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Rapport de contraste WCAG (1 à 21). */
export function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
