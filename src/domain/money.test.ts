import { describe, expect, it } from 'vitest';
import { convertMinor, rebaseRates } from './currency';
import { minorToInput, parseToMinor } from './money';

describe('parseToMinor', () => {
  it('convertit sans erreur de flottant', () => {
    expect(parseToMinor('23.4', 'EUR')).toBe(2340);
    expect(parseToMinor('23,40', 'EUR')).toBe(2340);
    expect(parseToMinor('0.1', 'EUR')).toBe(10);
    expect(parseToMinor('19.99', 'EUR')).toBe(1999);
    expect(parseToMinor('1500', 'JPY')).toBe(1500);
    expect(parseToMinor('1.250', 'TND')).toBe(1250);
  });

  it('refuse les saisies invalides', () => {
    expect(parseToMinor('', 'EUR')).toBeNull();
    expect(parseToMinor('abc', 'EUR')).toBeNull();
    expect(parseToMinor('1.234', 'EUR')).toBeNull();
    expect(parseToMinor('-5', 'EUR')).toBeNull();
  });

  it('fait l\'aller-retour avec minorToInput', () => {
    expect(minorToInput(2340, 'EUR')).toBe('23.4');
    expect(minorToInput(2305, 'EUR')).toBe('23.05');
    expect(minorToInput(2300, 'EUR')).toBe('23');
    expect(minorToInput(1500, 'JPY')).toBe('1500');
  });
});

describe('convertMinor', () => {
  const rates = { USD: 0.9, JPY: 0.0062 };

  it('ne convertit pas la devise par défaut', () => {
    expect(convertMinor(1234, 'EUR', 'EUR', {})).toBe(1234);
  });

  it('applique le taux et les décimales de chaque devise', () => {
    expect(convertMinor(1000, 'USD', 'EUR', rates)).toBe(900); // 10 $ → 9 €
    expect(convertMinor(1000, 'JPY', 'EUR', rates)).toBe(620); // 1000 ¥ → 6,20 €
  });

  it('retourne null sans taux', () => {
    expect(convertMinor(1000, 'GBP', 'EUR', rates)).toBeNull();
  });
});

describe('rebaseRates', () => {
  it('ré-exprime les taux dans la nouvelle devise', () => {
    const rebased = rebaseRates({ USD: 0.9, GBP: 1.2 }, 'EUR', 'USD');
    expect(rebased.EUR).toBeCloseTo(1 / 0.9);
    expect(rebased.GBP).toBeCloseTo(1.2 / 0.9);
    expect(rebased.USD).toBeUndefined();
  });

  it('abandonne les taux si la nouvelle devise n\'a pas de taux', () => {
    expect(rebaseRates({ USD: 0.9 }, 'EUR', 'GBP')).toEqual({});
  });
});
