import { themes, type ThemeTokens } from './tokens';
import type { ContrastPref, ThemePref } from '../domain/types';

/**
 * Applique le thème : choix de l'utilisateur ou réglages du téléphone
 * (mode sombre automatique, « Augmenter le contraste »).
 * Le dernier choix est mémorisé localement pour éviter un flash au démarrage.
 */

const STORAGE_KEY = 'pousse.appearance';

function toCss(t: ThemeTokens): string {
  return [
    `--bg:${t.bg}`,
    `--surface:${t.surface}`,
    `--ink:${t.ink}`,
    `--text-2:${t.text2}`,
    `--line:${t.line}`,
    `--accent:${t.accent}`,
    `--on-accent:${t.onAccent}`,
    `--nav:${t.nav}`,
    `--on-nav:${t.onNav}`,
    `--primary:${t.primary}`,
    `--on-primary:${t.onPrimary}`,
    `--ledge:${t.ledge}`,
    `--up:${t.up}`,
    `--down:${t.down}`,
    `--scrim:${t.scrim}`,
    `--lw:${t.lineWidth}px`,
  ].join(';');
}

/** Injecte les variables CSS des 4 variantes une seule fois. */
export function installThemeStyles(): void {
  const style = document.createElement('style');
  style.textContent = [
    `:root,[data-mode="light"]{${toCss(themes.light)}}`,
    `[data-mode="dark"]{${toCss(themes.dark)}}`,
    `[data-mode="light"][data-contrast="high"]{${toCss(themes.lightHigh)}}`,
    `[data-mode="dark"][data-contrast="high"]{${toCss(themes.darkHigh)}}`,
  ].join('\n');
  document.head.prepend(style);
}

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
const contrastQuery = window.matchMedia('(prefers-contrast: more)');

let current: { theme: ThemePref; contrast: ContrastPref } = { theme: 'auto', contrast: 'auto' };

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
  if (saved) current = saved;
} catch {
  // Stockage indisponible (navigation privée) : on reste sur « auto ».
}

function resolve() {
  const root = document.documentElement;
  const mode = current.theme === 'auto' ? (darkQuery.matches ? 'dark' : 'light') : current.theme;
  const contrast = current.contrast === 'high' || contrastQuery.matches ? 'high' : 'normal';
  root.dataset.mode = mode;
  root.dataset.contrast = contrast;
  root.style.colorScheme = mode;
  // Couleur de la barre d'état (Android, iOS) assortie au fond.
  const t = themes[`${mode}${contrast === 'high' ? 'High' : ''}` as keyof typeof themes];
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', t.bg));
}

export function applyAppearance(theme: ThemePref, contrast: ContrastPref): void {
  current = { theme, contrast };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Pas grave : le réglage reste en base, seul le démarrage instantané est perdu.
  }
  resolve();
}

darkQuery.addEventListener('change', resolve);
contrastQuery.addEventListener('change', resolve);
resolve();
