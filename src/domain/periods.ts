import type { ISODate } from './types';

/**
 * Calendrier en dates locales "YYYY-MM-DD".
 * Les calculs passent par l'UTC uniquement pour l'arithmétique des jours :
 * aucun décalage de fuseau ni de changement d'heure possible.
 */

export type PeriodKind = 'week' | 'month' | 'year';

/** Intervalle [start, end[ : `end` est exclu. */
export interface Period {
  kind: PeriodKind;
  start: ISODate;
  end: ISODate;
}

const DAY = 86_400_000;

function toUTC(date: ISODate): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUTC(time: number): ISODate {
  return new Date(time).toISOString().slice(0, 10);
}

function ymd(y: number, m: number, d = 1): ISODate {
  // Date.UTC normalise les débordements de mois (m = 12 → janvier suivant).
  return fromUTC(Date.UTC(y, m, d));
}

export function addDays(date: ISODate, days: number): ISODate {
  return fromUTC(toUTC(date) + days * DAY);
}

export function diffDays(from: ISODate, to: ISODate): number {
  return Math.round((toUTC(to) - toUTC(from)) / DAY);
}

/** Date du jour dans le fuseau de l'appareil. */
export function todayISO(now = new Date()): ISODate {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Période (semaine du lundi, mois ou année civile) contenant `date`. */
export function periodContaining(date: ISODate, kind: PeriodKind): Period {
  const [y, m] = date.split('-').map(Number);
  switch (kind) {
    case 'week': {
      const mondayOffset = (new Date(toUTC(date)).getUTCDay() + 6) % 7;
      const start = addDays(date, -mondayOffset);
      return { kind, start, end: addDays(start, 7) };
    }
    case 'month':
      return { kind, start: ymd(y, m - 1), end: ymd(y, m) };
    case 'year':
      return { kind, start: ymd(y, 0), end: ymd(y + 1, 0) };
  }
}

/** Décale une période de `n` crans (négatif = passé). */
export function shiftPeriod(period: Period, n: number): Period {
  const [y, m] = period.start.split('-').map(Number);
  switch (period.kind) {
    case 'week':
      return periodContaining(addDays(period.start, 7 * n), 'week');
    case 'month':
      return periodContaining(ymd(y, m - 1 + n), 'month');
    case 'year':
      return periodContaining(ymd(y + n, 0), 'year');
  }
}

export function isInPeriod(date: ISODate, period: Period): boolean {
  return date >= period.start && date < period.end;
}

/** Clé de regroupement pour la courbe : le jour (semaine, mois) ou le mois (année). */
export function bucketKey(date: ISODate, kind: PeriodKind): string {
  return kind === 'year' ? date.slice(0, 7) : date;
}

/** Toutes les clés de regroupement de la période, dans l'ordre. */
export function bucketsOf(period: Period): string[] {
  if (period.kind === 'year') {
    const year = period.start.slice(0, 4);
    return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
  }
  const length = diffDays(period.start, period.end);
  return Array.from({ length }, (_, i) => addDays(period.start, i));
}
