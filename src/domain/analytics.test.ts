import { describe, expect, it } from 'vitest';
import { analyzePeriod, type AnalysisContext } from './analytics';
import { periodContaining } from './periods';
import type { Expense } from './types';

let seq = 0;
function exp(date: string, amountMinor: number, categoryId = 'food', extra: Partial<Expense> = {}): Expense {
  seq++;
  return { id: `e${seq}`, amountMinor, currency: 'EUR', categoryId, date, createdAt: 0, updatedAt: 0, ...extra };
}

const ctx = (today: string, extra: Partial<AnalysisContext> = {}): AnalysisContext => ({
  defaultCurrency: 'EUR',
  rates: { USD: 0.5 },
  today,
  ...extra,
});

describe('analyzePeriod', () => {
  const october = periodContaining('2026-10-15', 'month');

  it('calcule le total, la répartition et la courbe', () => {
    const data = [
      exp('2026-10-01', 1000, 'food'),
      exp('2026-10-01', 500, 'transport'),
      exp('2026-10-20', 3000, 'food'),
      exp('2026-09-30', 9999, 'food'), // hors période
    ];
    const a = analyzePeriod(data, october, ctx('2026-12-01'));
    expect(a.total).toBe(4500);
    expect(a.count).toBe(3);
    expect(a.byCategory).toEqual([
      { categoryId: 'food', total: 4000, share: 4000 / 4500 },
      { categoryId: 'transport', total: 500, share: 500 / 4500 },
    ]);
    expect(a.series).toHaveLength(31);
    expect(a.series[0]).toEqual({ key: '2026-10-01', total: 1500 });
    expect(a.series[19]).toEqual({ key: '2026-10-20', total: 3000 });
  });

  it('regroupe par mois sur une année', () => {
    const a = analyzePeriod(
      [exp('2026-01-03', 100), exp('2026-01-28', 200), exp('2026-12-31', 50)],
      periodContaining('2026-06-01', 'year'),
      ctx('2027-02-01'),
    );
    expect(a.series).toHaveLength(12);
    expect(a.series[0]).toEqual({ key: '2026-01', total: 300 });
    expect(a.series[11]).toEqual({ key: '2026-12', total: 50 });
  });

  it('ignore les dépenses supprimées', () => {
    const a = analyzePeriod([exp('2026-10-02', 1000, 'food', { deletedAt: 1 })], october, ctx('2026-12-01'));
    expect(a.total).toBe(0);
  });

  it('convertit les devises et signale celles sans taux', () => {
    const a = analyzePeriod(
      [exp('2026-10-02', 1000, 'food', { currency: 'USD' }), exp('2026-10-03', 1000, 'food', { currency: 'GBP' })],
      october,
      ctx('2026-12-01'),
    );
    expect(a.total).toBe(500);
    expect(a.unconverted).toBe(1);
  });

  it('range les catégories inconnues dans « Autres »', () => {
    const a = analyzePeriod([exp('2026-10-02', 1000, 'ghost')], october, ctx('2026-12-01', { categoryIds: new Set(['food', 'other']) }));
    expect(a.byCategory[0].categoryId).toBe('other');
  });

  it('compare deux périodes complètes', () => {
    const a = analyzePeriod(
      [exp('2026-09-05', 1000), exp('2026-09-30', 1000), exp('2026-10-10', 3000)],
      october,
      ctx('2026-12-01'),
    );
    expect(a.comparison).toMatchObject({ current: 3000, previous: 2000, delta: 1000, pct: 0.5, partial: false });
  });

  it('compare « à date » pour une période en cours', () => {
    const a = analyzePeriod(
      [
        exp('2026-09-10', 1000),
        exp('2026-09-27', 500), // même jour relatif : inclus
        exp('2026-09-28', 4000), // après la date équivalente : exclu
        exp('2026-10-05', 1200),
      ],
      october,
      ctx('2026-10-27'),
    );
    expect(a.comparison).toMatchObject({ current: 1200, previous: 1500, delta: -300, partial: true, previousCutoff: '2026-09-27' });
    expect(a.comparison.pct).toBeCloseTo(-0.2);
  });

  it('borne la comparaison à la fin d\'un mois plus court', () => {
    const march = periodContaining('2026-03-01', 'month');
    const a = analyzePeriod([exp('2026-02-28', 700), exp('2026-03-31', 100)], march, ctx('2026-03-31'));
    expect(a.comparison.previousCutoff).toBe('2026-02-28');
    expect(a.comparison.previous).toBe(700);
  });

  it('n\'invente pas de pourcentage si la période précédente est vide', () => {
    const a = analyzePeriod([exp('2026-10-05', 1200)], october, ctx('2026-12-01'));
    expect(a.comparison.pct).toBeNull();
    expect(a.comparison.delta).toBe(1200);
  });
});
