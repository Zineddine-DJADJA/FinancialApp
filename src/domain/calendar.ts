import { convertMinor } from './currency';
import { addDays, periodContaining } from './periods';
import type { CurrencyCode, Expense, ISODate } from './types';

/**
 * Grille du calendrier mensuel : semaines du lundi au dimanche,
 * `null` pour les cases hors du mois.
 */
export function monthGrid(anyDayInMonth: ISODate): (ISODate | null)[][] {
  const month = periodContaining(anyDayInMonth, 'month');
  const firstWeek = periodContaining(month.start, 'week').start;
  const weeks: (ISODate | null)[][] = [];
  for (let day = firstWeek; day < month.end; ) {
    const week: (ISODate | null)[] = [];
    for (let i = 0; i < 7; i++, day = addDays(day, 1)) {
      week.push(day >= month.start && day < month.end ? day : null);
    }
    weeks.push(week);
  }
  return weeks;
}

/** Total par jour (devise par défaut) ; les dépenses sans taux sont ignorées. */
export function dailyTotals(
  expenses: Expense[],
  defaultCurrency: CurrencyCode,
  rates: Record<CurrencyCode, number>,
): Map<ISODate, number> {
  const totals = new Map<ISODate, number>();
  for (const e of expenses) {
    if (e.deletedAt) continue;
    const value = convertMinor(e.amountMinor, e.currency, defaultCurrency, rates);
    if (value === null) continue;
    totals.set(e.date, (totals.get(e.date) ?? 0) + value);
  }
  return totals;
}
