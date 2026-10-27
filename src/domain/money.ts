import type { CurrencyCode } from './types';

const digitsCache = new Map<string, number>();

/** Nombre de décimales d'une devise (2 pour EUR, 0 pour JPY, 3 pour TND…). */
export function minorDigits(currency: CurrencyCode): number {
  let digits = digitsCache.get(currency);
  if (digits === undefined) {
    try {
      digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
        .maximumFractionDigits ?? 2;
    } catch {
      digits = 2;
    }
    digitsCache.set(currency, digits);
  }
  return digits;
}

/**
 * Convertit une saisie décimale ("23.4", "23,40") en unités mineures (2340),
 * sans passer par des flottants. Retourne `null` si la saisie est invalide.
 */
export function parseToMinor(input: string, currency: CurrencyCode): number | null {
  const clean = input.trim().replace(',', '.');
  if (!/^\d+(\.\d*)?$/.test(clean)) return null;
  const digits = minorDigits(currency);
  const [whole, fraction = ''] = clean.split('.');
  if (fraction.length > digits) return null;
  const minor = Number(whole) * 10 ** digits + Number(fraction.padEnd(digits, '0') || 0);
  return Number.isSafeInteger(minor) ? minor : null;
}

/** Unités mineures → chaîne décimale brute ("23.4"), utilisée pour pré-remplir la saisie. */
export function minorToInput(minor: number, currency: CurrencyCode): string {
  const digits = minorDigits(currency);
  if (digits === 0) return String(minor);
  const whole = Math.floor(minor / 10 ** digits);
  const fraction = String(minor % 10 ** digits).padStart(digits, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : String(whole);
}

/** Formate un montant pour l'affichage, selon la langue de l'interface. */
export function formatMoney(
  minor: number,
  currency: CurrencyCode,
  locale: string,
  opts: { signDisplay?: 'auto' | 'always' | 'exceptZero' } = {},
): string {
  const digits = minorDigits(currency);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    signDisplay: opts.signDisplay ?? 'auto',
  }).format(minor / 10 ** digits);
}

/** Liste courte de devises proposées ; toute devise ISO reste saisissable dans les réglages. */
export const COMMON_CURRENCIES: CurrencyCode[] = [
  'EUR', 'USD', 'GBP', 'CHF', 'CAD', 'DZD', 'MAD', 'TND', 'JPY', 'CNY', 'AED', 'TRY',
];

/** Vérifie qu'un code devise est reconnu par le navigateur. */
export function isValidCurrency(code: string): boolean {
  if (!/^[A-Z]{3}$/.test(code)) return false;
  try {
    new Intl.NumberFormat('en', { style: 'currency', currency: code });
    return true;
  } catch {
    return false;
  }
}
