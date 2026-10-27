import { convertMinor } from './currency';
import { minorDigits } from './money';
import { profileName, type CurrencyCode, type Expense } from './types';

/**
 * Export CSV lisible par Excel, Numbers et Google Sheets.
 *
 * Format adapté à la langue : en français, séparateur « ; » et virgule décimale
 * (ce qu'attend Excel en France) ; en anglais, « , » et point décimal.
 * Le fichier commence par un BOM UTF-8 pour qu'Excel affiche bien les accents.
 */

export interface CsvOptions {
  locale: string;
  defaultCurrency: CurrencyCode;
  rates: Record<CurrencyCode, number>;
  /** Nom affiché d'une catégorie à partir de son id. */
  categoryName: (id: string) => string;
  headers: {
    date: string;
    amount: string;
    currency: string;
    converted: string;
    category: string;
    note: string;
    profile: string;
    id: string;
  };
}

export const CSV_BOM = '﻿';

export function csvFormat(locale: string): { separator: string; decimal: string } {
  return locale.startsWith('fr') ? { separator: ';', decimal: ',' } : { separator: ',', decimal: '.' };
}

/** Montant décimal sans séparateur de milliers (« 1234,50 »), pour rester un nombre dans le tableur. */
function decimal(minor: number, currency: CurrencyCode, mark: string): string {
  const digits = minorDigits(currency);
  const text = (minor / 10 ** digits).toFixed(digits);
  return mark === '.' ? text : text.replace('.', mark);
}

/** Échappe une cellule si elle contient le séparateur, un guillemet ou un retour à la ligne. */
function cell(value: string, separator: string): string {
  // Une cellule qui commence par = + - @ serait interprétée comme formule par le tableur.
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return safe.includes(separator) || /["\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Dépenses actives, de la plus ancienne à la plus récente. */
export function expensesToCsv(expenses: Expense[], o: CsvOptions): string {
  const { separator, decimal: mark } = csvFormat(o.locale);
  const h = o.headers;
  const lines = [
    [h.date, h.amount, h.currency, `${h.converted} (${o.defaultCurrency})`, h.category, h.note, h.profile, h.id],
  ];
  const rows = expenses
    .filter((e) => !e.deletedAt)
    .sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1));
  for (const e of rows) {
    const converted = convertMinor(e.amountMinor, e.currency, o.defaultCurrency, o.rates);
    lines.push([
      e.date,
      decimal(e.amountMinor, e.currency, mark),
      e.currency,
      converted === null ? '' : decimal(converted, o.defaultCurrency, mark),
      o.categoryName(e.categoryId),
      e.note ?? '',
      e.profile ? profileName(e.profile) : '',
      e.id,
    ]);
  }
  return CSV_BOM + lines.map((l) => l.map((v) => cell(v, separator)).join(separator)).join('\r\n') + '\r\n';
}
