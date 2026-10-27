import { describe, expect, it } from 'vitest';
import { CATEGORY_COLORS, ON_PASTEL, contrastRatio, themes } from './tokens';

/**
 * Garde-fou de lisibilité : si quelqu'un modifie une couleur et casse un contraste,
 * ce test échoue. Seuils WCAG : 4,5:1 (AA texte), 7:1 (AAA texte), 3:1 (éléments graphiques).
 * On vise AAA pour le texte principal dans tous les thèmes, et partout en contraste élevé.
 */
describe.each(Object.entries(themes))('thème %s', (name, t) => {
  const high = name.endsWith('High');
  const textMin = high ? 7 : 4.5;

  it.each([
    ['texte principal / fond', t.ink, t.bg, 7],
    ['texte principal / ligne', t.ink, t.surface, 7],
    ['texte principal / aplat vert', t.ink, t.panel, 7],
    ['texte secondaire / fond', t.text2, t.bg, textMin],
    ['texte secondaire / ligne', t.text2, t.surface, textMin],
    ['texte secondaire / aplat vert', t.text2, t.panel, textMin],
    ['hausse / fond', t.up, t.bg, textMin],
    ['hausse / aplat vert', t.up, t.panel, textMin],
    ['baisse / fond', t.down, t.bg, textMin],
    ['baisse / aplat vert', t.down, t.panel, textMin],
    ['bouton principal', t.onPrimary, t.primary, 7],
    ['sélection', t.onAccent, t.accent, 7],
    ['contours / fond', t.line, t.bg, 3],
    ['contours / ligne', t.line, t.surface, 3],
    ['bouton principal / fond', t.primary, t.bg, 3],
  ] as const)('%s ≥ %s', (_label, fg, bg, min) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(min);
  });
});

describe('couleurs de catégories', () => {
  it.each(CATEGORY_COLORS)('texte sur %s ≥ 7:1', (color) => {
    expect(contrastRatio(ON_PASTEL, color)).toBeGreaterThanOrEqual(7);
  });
});

describe('contrastRatio', () => {
  it('retrouve les valeurs de référence WCAG', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21);
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 1);
  });
});
