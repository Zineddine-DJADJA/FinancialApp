import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PousseDB } from './db';
import { buildBackup, deleteCategory, deleteExpense, importBackup, saveExpense } from './repo';

/** Scénario de bout en bout : deux téléphones qui échangent leurs exports. */

let me: PousseDB;
let partner: PousseDB;
let n = 0;

beforeEach(async () => {
  n++;
  me = new PousseDB(`me-${n}`);
  partner = new PousseDB(`partner-${n}`);
  await Promise.all([me.open(), partner.open()]);
});

afterEach(async () => {
  await Promise.all([me.delete(), partner.delete()]);
});

const draft = (amountMinor: number, categoryId = 'food') => ({
  amountMinor,
  currency: 'EUR',
  categoryId,
  date: '2026-10-27',
});

const live = async (database: PousseDB) =>
  (await database.expenses.toArray()).filter((e) => !e.deletedAt).map((e) => e.amountMinor).sort();

describe('échange entre deux téléphones', () => {
  it('fusionne sans doublons, même après plusieurs imports', async () => {
    await saveExpense(draft(1000), undefined, me);
    await saveExpense(draft(2000), undefined, partner);

    const mine = JSON.stringify(await buildBackup(me));
    const theirs = JSON.stringify(await buildBackup(partner));

    expect(await importBackup(theirs, me)).toMatchObject({ added: 1, rejected: 0 });
    await importBackup(mine, partner);
    // Ré-importer le même fichier ne crée rien.
    expect(await importBackup(theirs, me)).toMatchObject({ added: 0, updated: 0 });

    expect(await live(me)).toEqual([1000, 2000]);
    expect(await live(partner)).toEqual([1000, 2000]);
    // Les catégories par défaut ont les mêmes ids : pas de doublon.
    expect(await me.categories.count()).toBe(7);
  });

  it('propage une modification et une suppression', async () => {
    const id = await saveExpense(draft(1000), undefined, me);
    const other = await saveExpense(draft(500), undefined, me);
    await importBackup(JSON.stringify(await buildBackup(me)), partner);

    await new Promise((r) => setTimeout(r, 5)); // garantit un updatedAt plus récent
    await saveExpense(draft(1500), id, partner);
    await deleteExpense(other, partner);
    await importBackup(JSON.stringify(await buildBackup(partner)), me);

    expect(await live(me)).toEqual([1500]);
  });

  it('réaffecte les dépenses d\'une catégorie supprimée', async () => {
    await saveExpense(draft(1000, 'leisure'), undefined, me);
    expect(await deleteCategory('leisure', 'other', me)).toBe(1);
    const [e] = await me.expenses.toArray();
    expect(e.categoryId).toBe('other');
    expect((await me.categories.get('leisure'))?.deletedAt).toBeDefined();
    await expect(deleteCategory('other', 'food', me)).rejects.toThrow();
  });
});
