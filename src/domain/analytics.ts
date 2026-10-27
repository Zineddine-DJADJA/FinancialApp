import { convertMinor } from './currency';
import { bucketKey, bucketsOf, diffDays, isInPeriod, shiftPeriod, addDays, type Period } from './periods';
import { FALLBACK_CATEGORY_ID, type CurrencyCode, type Expense, type ISODate } from './types';

export interface AnalysisContext {
  defaultCurrency: CurrencyCode;
  rates: Record<CurrencyCode, number>;
  today: ISODate;
  /** Catégories existantes ; une dépense rattachée à une catégorie inconnue tombe dans « Autres ». */
  categoryIds?: Set<string>;
}

export interface CategoryShare {
  categoryId: string;
  total: number;
  /** Part du total entre 0 et 1. */
  share: number;
}

export interface Comparison {
  /** Total courant pris en compte (jusqu'à aujourd'hui si la période est en cours). */
  current: number;
  previous: number;
  delta: number;
  /** Variation relative (0.12 = +12 %) ; `null` si la période précédente vaut 0. */
  pct: number | null;
  /** Vrai si la période est en cours et que l'on compare « à date ». */
  partial: boolean;
  /** Dernier jour inclus côté période précédente. */
  previousCutoff: ISODate;
}

export interface PeriodAnalysis {
  period: Period;
  /** Montants en unités mineures de la devise par défaut. */
  total: number;
  count: number;
  byCategory: CategoryShare[];
  series: { key: string; total: number }[];
  comparison: Comparison;
  /** Dépenses ignorées faute de taux de change. */
  unconverted: number;
}

interface Converted {
  date: ISODate;
  categoryId: string;
  value: number;
}

function convertAll(expenses: Expense[], ctx: AnalysisContext, from: ISODate, to: ISODate) {
  const items: Converted[] = [];
  let unconverted = 0;
  for (const e of expenses) {
    if (e.deletedAt || e.date < from || e.date >= to) continue;
    const value = convertMinor(e.amountMinor, e.currency, ctx.defaultCurrency, ctx.rates);
    if (value === null) {
      unconverted++;
      continue;
    }
    const categoryId =
      ctx.categoryIds && !ctx.categoryIds.has(e.categoryId) ? FALLBACK_CATEGORY_ID : e.categoryId;
    items.push({ date: e.date, categoryId, value });
  }
  return { items, unconverted };
}

const sum = (items: Converted[]) => items.reduce((acc, i) => acc + i.value, 0);

/**
 * Analyse complète d'une période : total, répartition, courbe, comparaison.
 *
 * Comparaison : si la période est en cours, on compare la même portion
 * (ex. 1er→27 octobre vs 1er→27 septembre), bornée à la fin de la période
 * précédente (31 mars vs 28 février → 1er→28 février). Sinon, périodes complètes.
 */
export function analyzePeriod(expenses: Expense[], period: Period, ctx: AnalysisContext): PeriodAnalysis {
  const previous = shiftPeriod(period, -1);
  const { items, unconverted } = convertAll(expenses, ctx, period.start, period.end);
  const { items: prevItems } = convertAll(expenses, ctx, previous.start, previous.end);

  const total = sum(items);

  const totals = new Map<string, number>();
  for (const i of items) totals.set(i.categoryId, (totals.get(i.categoryId) ?? 0) + i.value);
  const byCategory = [...totals.entries()]
    .map(([categoryId, t]) => ({ categoryId, total: t, share: total > 0 ? t / total : 0 }))
    .sort((a, b) => b.total - a.total);

  const buckets = new Map(bucketsOf(period).map((k) => [k, 0]));
  for (const i of items) {
    const key = bucketKey(i.date, period.kind);
    buckets.set(key, (buckets.get(key) ?? 0) + i.value);
  }
  const series = [...buckets.entries()].map(([key, t]) => ({ key, total: t }));

  const partial = isInPeriod(ctx.today, period);
  let current = total;
  let previousCutoff = addDays(previous.end, -1);
  if (partial) {
    current = sum(items.filter((i) => i.date <= ctx.today));
    const sameOffset = addDays(previous.start, diffDays(period.start, ctx.today));
    if (sameOffset < previousCutoff) previousCutoff = sameOffset;
  }
  const previousTotal = sum(prevItems.filter((i) => i.date <= previousCutoff));
  const delta = current - previousTotal;

  return {
    period,
    total,
    count: items.length,
    byCategory,
    series,
    unconverted,
    comparison: {
      current,
      previous: previousTotal,
      delta,
      pct: previousTotal > 0 ? delta / previousTotal : null,
      partial,
      previousCutoff,
    },
  };
}
