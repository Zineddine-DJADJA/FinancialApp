/**
 * Design tokens — source unique des couleurs de l'app.
 *
 * Charte « ART.flora » : fond blanc, grands aplats vert tendre, boutons pilule noirs,
 * contours fins à l'encre, accents rose. En sombre : fond noir, aplats vert profond.
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
  /** Lignes de la liste, champs, touches. */
  surface: string;
  /** Grands aplats verts (carte du total, graphiques). */
  panel: string;
  /** Texte principal et pictogrammes. */
  ink: string;
  /** Texte secondaire (notes, légendes). */
  text2: string;
  /** Contours fins des lignes et contrôles. */
  line: string;
  /** Vert vif : sélection, bouton « + », aire de la courbe. */
  accent: string;
  onAccent: string;
  /** Bouton principal (pilule noire). */
  primary: string;
  onPrimary: string;
  /** Petits carrés décoratifs en pixel art. */
  pixel: string;
  /** Rose de la charte, utilisé avec parcimonie : pixels décoratifs, cœur. */
  pink: string;
  /** Fond rose pâle des encadrés d'information (comme le panneau rose de la charte). */
  pinkPanel: string;
  /** Hausse des dépenses (mauvais signe) / baisse (bon signe). */
  up: string;
  down: string;
  /** Voile derrière les panneaux modaux. */
  scrim: string;
  /** Épaisseur des contours (px). */
  lineWidth: number;
}

/** Texte posé sur les aplats pastel (catégories), identique dans tous les thèmes. */
export const ON_PASTEL = '#141712';

export const themes: Record<'light' | 'dark' | 'lightHigh' | 'darkHigh', ThemeTokens> = {
  light: {
    bg: '#FFFFFF',
    surface: '#FFFFFF',
    panel: '#E2F8B4',
    ink: '#141712',
    text2: '#4B5541',
    line: '#141712',
    accent: '#C5EC7C',
    onAccent: '#141712',
    primary: '#141712',
    onPrimary: '#FFFFFF',
    pixel: '#B5E26A',
    pink: '#F49AAA',
    pinkPanel: '#FDE4E8',
    up: '#B42B44',
    down: '#2F6B17',
    scrim: 'rgba(20, 23, 18, 0.45)',
    lineWidth: 1.5,
  },
  dark: {
    bg: '#0B0D0A',
    surface: '#151913',
    panel: '#22331A',
    ink: '#F4FAEA',
    text2: '#BCCAA8',
    line: '#8E9C7E',
    accent: '#C5EC7C',
    onAccent: '#141712',
    primary: '#C5EC7C',
    onPrimary: '#141712',
    pixel: '#5E8A36',
    pink: '#E07D90',
    pinkPanel: '#3B1F26',
    up: '#FF9DAB',
    down: '#A9E07F',
    scrim: 'rgba(0, 0, 0, 0.65)',
    lineWidth: 1.5,
  },
  // Contraste élevé : plein soleil, écran à faible luminosité, vue fatiguée.
  lightHigh: {
    bg: '#FFFFFF',
    surface: '#FFFFFF',
    panel: '#E9FAC6',
    ink: '#000000',
    text2: '#232A1C',
    line: '#000000',
    accent: '#B9E46A',
    onAccent: '#000000',
    primary: '#000000',
    onPrimary: '#FFFFFF',
    pixel: '#8CC84B',
    pink: '#E8798D',
    pinkPanel: '#FCE0E5',
    up: '#8A1428',
    down: '#1D4D0B',
    scrim: 'rgba(0, 0, 0, 0.6)',
    lineWidth: 2,
  },
  darkHigh: {
    bg: '#000000',
    surface: '#0E110C',
    panel: '#1B2913',
    ink: '#FFFFFF',
    text2: '#E3EED2',
    line: '#FFFFFF',
    accent: '#D2F592',
    onAccent: '#000000',
    primary: '#D2F592',
    onPrimary: '#000000',
    pixel: '#7DB34A',
    pink: '#F2A2B1',
    pinkPanel: '#2E141A',
    up: '#FFC2CB',
    down: '#C6F5A6',
    scrim: 'rgba(0, 0, 0, 0.8)',
    lineWidth: 2,
  },
};

/** Couleurs proposées pour les catégories (toujours avec du texte ON_PASTEL). */
export const CATEGORY_COLORS = [
  '#B5E26A', // vert tendre
  '#F7C6CC', // rose
  '#A9D8B4', // sauge
  '#C7B1DF', // lavande
  '#FFC94A', // moutarde
  '#F2A597', // saumon
  '#A8DCE0', // menthe
  '#D9D2C3', // grège
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
