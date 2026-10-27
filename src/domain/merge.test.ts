import { describe, expect, it } from 'vitest';
import { BackupError, mergeRates, mergeRecords, parseBackup, reassignExpenses } from './merge';
import type { Expense } from './types';

const base: Expense = {
  id: 'a',
  amountMinor: 1000,
  currency: 'EUR',
  categoryId: 'food',
  date: '2026-10-01',
  createdAt: 1,
  updatedAt: 1,
};
const e = (over: Partial<Expense>): Expense => ({ ...base, ...over });

describe('mergeRecords', () => {
  it('ajoute les nouvelles dépenses et ignore les doublons identiques', () => {
    const r = mergeRecords([e({ id: 'a' })], [e({ id: 'a' }), e({ id: 'b' })]);
    expect(r.toPut.map((x) => x.id)).toEqual(['b']);
    expect(r).toMatchObject({ added: 1, updated: 0, unchanged: 1 });
  });

  it('garde la version la plus récente', () => {
    const local = [e({ id: 'a', amountMinor: 1000, updatedAt: 5 })];
    const newer = mergeRecords(local, [e({ id: 'a', amountMinor: 2000, updatedAt: 9 })]);
    expect(newer.toPut).toEqual([e({ id: 'a', amountMinor: 2000, updatedAt: 9 })]);
    expect(newer.updated).toBe(1);

    const older = mergeRecords(local, [e({ id: 'a', amountMinor: 3000, updatedAt: 2 })]);
    expect(older.toPut).toEqual([]);
  });

  it('propage les suppressions', () => {
    const r = mergeRecords([e({ id: 'a', updatedAt: 1 })], [e({ id: 'a', updatedAt: 2, deletedAt: 2 })]);
    expect(r.toPut[0].deletedAt).toBe(2);
  });

  it('ne ressuscite pas une dépense supprimée localement', () => {
    const r = mergeRecords([e({ id: 'a', updatedAt: 5, deletedAt: 5 })], [e({ id: 'a', updatedAt: 1 })]);
    expect(r.toPut).toEqual([]);
  });

  it('dédoublonne au sein du fichier importé', () => {
    const r = mergeRecords([], [e({ id: 'a', updatedAt: 1 }), e({ id: 'a', updatedAt: 3, note: 'v3' }), e({ id: 'a', updatedAt: 2 })]);
    expect(r.toPut).toHaveLength(1);
    expect(r.toPut[0].note).toBe('v3');
  });

  it('est symétrique : fusionner A dans B ou B dans A donne le même état', () => {
    const A = [e({ id: 'x', updatedAt: 1 }), e({ id: 'y', updatedAt: 4, amountMinor: 1 })];
    const B = [e({ id: 'y', updatedAt: 2, amountMinor: 2 }), e({ id: 'z', updatedAt: 1 })];
    const apply = (local: Expense[], incoming: Expense[]) => {
      const map = new Map(local.map((x) => [x.id, x]));
      for (const x of mergeRecords(local, incoming).toPut) map.set(x.id, x);
      return [...map.values()].sort((p, q) => p.id.localeCompare(q.id));
    };
    expect(apply(A, B)).toEqual(apply(B, A));
  });
});

describe('parseBackup', () => {
  const file = (over: object = {}) =>
    JSON.stringify({ format: 'pousse-backup', version: 1, exportedAt: '', expenses: [base], categories: [], ...over });

  it('lit un export valide', () => {
    const r = parseBackup(file({ rates: { USD: 0.9, XXX1: 2 } }));
    expect(r.expenses).toEqual([base]);
    expect(r.rates).toEqual({ USD: 0.9 });
    expect(r.rejected).toBe(0);
  });

  it('écarte les lignes invalides sans rejeter le fichier', () => {
    const r = parseBackup(file({ expenses: [base, { ...base, id: 'b', amountMinor: 10.5 }, { ...base, id: 'c', date: '01/10/2026' }] }));
    expect(r.expenses).toHaveLength(1);
    expect(r.rejected).toBe(2);
  });

  it('conserve le profil et refuse un profil inconnu', () => {
    const r = parseBackup(file({ expenses: [{ ...base, profile: 'zuzu' }, { ...base, id: 'b', profile: 'paul' }, { ...base, id: 'c' }] }));
    expect(r.expenses.map((x) => x.profile)).toEqual(['zuzu', undefined]);
    expect(r.rejected).toBe(1);
  });

  it('refuse les fichiers qui ne sont pas des sauvegardes', () => {
    expect(() => parseBackup('pas du json')).toThrow(BackupError);
    expect(() => parseBackup('{"hello":1}')).toThrow(/not-a-backup/);
    expect(() => parseBackup(file({ version: 99 }))).toThrow(/unsupported-version/);
  });
});

describe('mergeRates', () => {
  it('ne remplace jamais un taux local', () => {
    expect(mergeRates({ USD: 0.9 }, { USD: 0.8, GBP: 1.2 }, true)).toEqual({ USD: 0.9, GBP: 1.2 });
    expect(mergeRates({ USD: 0.9 }, { GBP: 1.2 }, false)).toEqual({ USD: 0.9 });
  });
});

describe('reassignExpenses', () => {
  it('réaffecte et date la modification', () => {
    const r = reassignExpenses([e({ id: 'a', categoryId: 'fun' }), e({ id: 'b' })], 'fun', 'other', 42);
    expect(r).toEqual([e({ id: 'a', categoryId: 'other', updatedAt: 42 })]);
  });
});
