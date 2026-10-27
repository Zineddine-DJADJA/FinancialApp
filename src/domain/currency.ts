import { minorDigits } from './money';
import type { CurrencyCode } from './types';

/**
 * Convertit un montant vers la devise par défaut avec les taux saisis à la main.
 * `rates[X]` = valeur d'une unité de X dans la devise par défaut.
 * Retourne `null` si aucun taux n'est connu : l'appelant le signale à l'utilisateur
 * plutôt que d'ignorer silencieusement la dépense.
 */
export function convertMinor(
  amountMinor: number,
  from: CurrencyCode,
  defaultCurrency: CurrencyCode,
  rates: Record<CurrencyCode, number>,
): number | null {
  if (from === defaultCurrency) return amountMinor;
  const rate = rates[from];
  if (!rate || !Number.isFinite(rate) || rate <= 0) return null;
  const major = amountMinor / 10 ** minorDigits(from);
  return Math.round(major * rate * 10 ** minorDigits(defaultCurrency));
}

/**
 * Ré-exprime les taux quand la devise par défaut change.
 * Ex. : défaut EUR, USD = 0.9 → nouveau défaut USD : EUR = 1/0.9.
 * Les taux qui ne peuvent pas être recalculés sont abandonnés.
 */
export function rebaseRates(
  rates: Record<CurrencyCode, number>,
  oldDefault: CurrencyCode,
  newDefault: CurrencyCode,
): Record<CurrencyCode, number> {
  if (oldDefault === newDefault) return { ...rates };
  const pivot = rates[newDefault];
  if (!pivot) return {};
  const result: Record<CurrencyCode, number> = { [oldDefault]: 1 / pivot };
  for (const [code, rate] of Object.entries(rates)) {
    if (code !== newDefault) result[code] = rate / pivot;
  }
  return result;
}
