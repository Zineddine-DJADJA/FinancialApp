import { describe, expect, it } from 'vitest';
import { CSV_BOM, expensesToCsv, type CsvOptions } from './csv';
import { dailyTotals, monthGrid } from './calendar';
import type { Expense } from './types';

const base: Expense = { id: 'a', amountMinor: 123450, currency: 'EUR', categoryId: 'food', date: '2026-10-02', createdAt: 1, updatedAt: 1 };
const e = (over: Partial<Expense>): Expense => ({ ...base, ...over });

const options = (locale: string): CsvOptions => ({
  locale,
  defaultCurrency: 'EUR',
  rates: { USD: 0.5 },
  categoryName: (id) => ({ food: 'Alimentation', fun: 'Loisirs; sorties' })[id] ?? id,
  headers: { date: 'Date', amount: 'Montant', currency: 'Devise', converted: 'Montant converti', category: 'Catégorie', note: 'Note', profile: 'Profil', id: 'ID' },
});

describe('expensesToCsv', () => {
  it('produit un CSV « à la française » lisible par Excel', () => {
    const csv = expensesToCsv([e({ note: 'Marché', profile: 'zuzu' })], options('fr'));
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    const [head, row] = csv.slice(1).trim().split('\r\n');
    expect(head).toBe('Date;Montant;Devise;Montant converti (EUR);Catégorie;Note;Profil;ID');
    expect(row).toBe('2026-10-02;1234,50;EUR;1234,50;Alimentation;Marché;Zuzu;a');
  });

  it('utilise virgule et point en anglais', () => {
    const csv = expensesToCsv([e({ currency: 'USD', amountMinor: 1000 })], options('en'));
    expect(csv.split('\r\n')[1]).toBe('2026-10-02,10.00,USD,5.00,Alimentation,,,a');
  });

  it('échappe séparateurs, guillemets et formules', () => {
    const csv = expensesToCsv([e({ categoryId: 'fun', note: '=SOMME(A1) "test"' })], options('fr'));
    const row = csv.split('\r\n')[1];
    expect(row).toContain('"Loisirs; sorties"');
    expect(row).toContain('"\'=SOMME(A1) ""test"""');
  });

  it('ignore les dépenses supprimées, trie par date et laisse vide un montant sans taux', () => {
    const csv = expensesToCsv(
      [e({ id: 'b', date: '2026-10-05', currency: 'GBP' }), e({ id: 'c', date: '2026-10-01' }), e({ id: 'd', deletedAt: 3 })],
      options('fr'),
    );
    const rows = csv.trim().split('\r\n').slice(1);
    expect(rows.map((r) => r.split(';').at(-1))).toEqual(['c', 'b']);
    expect(rows[1].split(';')[3]).toBe('');
  });
});

describe('monthGrid', () => {
  it('aligne le mois sur des semaines du lundi', () => {
    const grid = monthGrid('2026-10-15'); // 1er octobre 2026 = jeudi
    expect(grid[0]).toEqual([null, null, null, '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
    expect(grid.at(-1)).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', null]);
    expect(grid.flat().filter(Boolean)).toHaveLength(31);
  });
});

describe('dailyTotals', () => {
  it('additionne par jour en devise par défaut', () => {
    const totals = dailyTotals(
      [e({ amountMinor: 100 }), e({ id: 'b', amountMinor: 1000, currency: 'USD' }), e({ id: 'c', deletedAt: 1 }), e({ id: 'd', currency: 'GBP' })],
      'EUR',
      { USD: 0.5 },
    );
    expect(totals.get('2026-10-02')).toBe(600);
  });
});
