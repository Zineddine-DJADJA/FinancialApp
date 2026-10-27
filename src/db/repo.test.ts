import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PousseDB } from './db';
import {
  ProfileLockedError,
  buildBackup,
  deleteCategory,
  deleteExpense,
  importBackup,
  saveExpense,
  updateSettings,
} from './repo';

/** Scénario de bout en bout : le téléphone de Zizou et celui de Zuzu échangent leurs exports. */

let zizou: PousseDB;
let zuzu: PousseDB;
let n = 0;

beforeEach(async () => {
  n++;
  zizou = new PousseDB(`zizou-${n}`);
  zuzu = new PousseDB(`zuzu-${n}`);
  await Promise.all([zizou.open(), zuzu.open()]);
  await updateSettings({ profile: 'zizou' }, zizou);
  await updateSettings({ profile: 'zuzu' }, zuzu);
});

afterEach(async () => {
  await Promise.all([zizou.delete(), zuzu.delete()]);
});

const draft = (amountMinor: number, categoryId = 'food') => ({
  amountMinor,
  currency: 'EUR',
  categoryId,
  date: '2026-10-27',
});

const live = async (database: PousseDB) =>
  (await database.expenses.toArray()).filter((e) => !e.deletedAt).map((e) => e.amountMinor).sort();

const exportOf = async (database: PousseDB) => JSON.stringify(await buildBackup(database));

describe('échange entre deux téléphones', () => {
  it('fusionne sans doublons, même après plusieurs imports', async () => {
    await saveExpense(draft(1000), undefined, zizou);
    await saveExpense(draft(2000), undefined, zuzu);

    const fromZizou = await exportOf(zizou);
    const fromZuzu = await exportOf(zuzu);

    expect(await importBackup(fromZuzu, zizou)).toMatchObject({ added: 1, rejected: 0 });
    await importBackup(fromZizou, zuzu);
    // Ré-importer le même fichier ne crée rien.
    expect(await importBackup(fromZuzu, zizou)).toMatchObject({ added: 0, updated: 0 });

    expect(await live(zizou)).toEqual([1000, 2000]);
    expect(await live(zuzu)).toEqual([1000, 2000]);
    // Les catégories par défaut ont les mêmes ids : pas de doublon.
    expect(await zizou.categories.count()).toBe(7);
  });

  it('attribue chaque nouvelle dépense au profil du téléphone', async () => {
    const id = await saveExpense(draft(1000), undefined, zuzu);
    expect((await zuzu.expenses.get(id))?.profile).toBe('zuzu');
  });

  it('propage les modifications et suppressions faites par la propriétaire', async () => {
    const kept = await saveExpense(draft(1000), undefined, zuzu);
    const removed = await saveExpense(draft(500), undefined, zuzu);
    await importBackup(await exportOf(zuzu), zizou);

    await new Promise((r) => setTimeout(r, 5)); // garantit un updatedAt plus récent
    await saveExpense(draft(1500), kept, zuzu);
    await deleteExpense(removed, zuzu);
    await importBackup(await exportOf(zuzu), zizou);

    expect(await live(zizou)).toEqual([1500]);
  });

  it('interdit de modifier ou supprimer les dépenses de l\'autre', async () => {
    const id = await saveExpense(draft(1000), undefined, zuzu);
    await importBackup(await exportOf(zuzu), zizou);

    await expect(saveExpense(draft(1), id, zizou)).rejects.toThrow(ProfileLockedError);
    await expect(deleteExpense(id, zizou)).rejects.toThrow(ProfileLockedError);
    expect(await live(zizou)).toEqual([1000]);
  });

  it('rend le profil définitif', async () => {
    await expect(updateSettings({ profile: 'zuzu' }, zizou)).rejects.toThrow(ProfileLockedError);
    await updateSettings({ profile: 'zizou', theme: 'dark' }, zizou); // même profil : accepté
    expect((await zizou.settings.get('app'))?.profile).toBe('zizou');
  });

  it('réaffecte les dépenses d\'une catégorie supprimée', async () => {
    await saveExpense(draft(1000, 'leisure'), undefined, zizou);
    expect(await deleteCategory('leisure', 'other', zizou)).toBe(1);
    const [e] = await zizou.expenses.toArray();
    expect(e.categoryId).toBe('other');
    expect((await zizou.categories.get('leisure'))?.deletedAt).toBeDefined();
    await expect(deleteCategory('other', 'food', zizou)).rejects.toThrow();
  });
});
