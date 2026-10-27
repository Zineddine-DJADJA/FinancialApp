import { describe, expect, it } from 'vitest';
import { bucketsOf, periodContaining, shiftPeriod, todayISO } from './periods';

describe('periodContaining', () => {
  it('commence la semaine le lundi', () => {
    // 27/10/2026 est un mardi.
    expect(periodContaining('2026-10-27', 'week')).toEqual({ kind: 'week', start: '2026-10-26', end: '2026-11-02' });
    // Un dimanche appartient à la semaine commencée le lundi précédent.
    expect(periodContaining('2026-11-01', 'week').start).toBe('2026-10-26');
  });

  it('gère les semaines à cheval sur deux années', () => {
    expect(periodContaining('2027-01-01', 'week')).toEqual({ kind: 'week', start: '2026-12-28', end: '2027-01-04' });
  });

  it('calcule mois et année', () => {
    expect(periodContaining('2026-02-15', 'month')).toEqual({ kind: 'month', start: '2026-02-01', end: '2026-03-01' });
    expect(periodContaining('2026-12-31', 'month').end).toBe('2027-01-01');
    expect(periodContaining('2026-06-01', 'year')).toEqual({ kind: 'year', start: '2026-01-01', end: '2027-01-01' });
  });
});

describe('shiftPeriod', () => {
  it('navigue entre les périodes', () => {
    const jan = periodContaining('2026-01-10', 'month');
    expect(shiftPeriod(jan, -1).start).toBe('2025-12-01');
    expect(shiftPeriod(jan, 13).start).toBe('2027-02-01');
    expect(shiftPeriod(periodContaining('2026-10-27', 'week'), -1).start).toBe('2026-10-19');
    expect(shiftPeriod(periodContaining('2026-10-27', 'year'), 1).start).toBe('2027-01-01');
  });
});

describe('bucketsOf', () => {
  it('découpe en jours ou en mois', () => {
    expect(bucketsOf(periodContaining('2026-10-27', 'week'))).toHaveLength(7);
    expect(bucketsOf(periodContaining('2024-02-10', 'month'))).toHaveLength(29); // bissextile
    const months = bucketsOf(periodContaining('2026-05-05', 'year'));
    expect(months[0]).toBe('2026-01');
    expect(months[11]).toBe('2026-12');
  });
});

describe('todayISO', () => {
  it('utilise la date locale', () => {
    expect(todayISO(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
