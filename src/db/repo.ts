import { db, defaultSettings, type PousseDB } from './db';
import { rebaseRates } from '../domain/currency';
import { mergeRates, mergeRecords, parseBackup, reassignExpenses } from '../domain/merge';
import { FALLBACK_CATEGORY_ID, type Backup, type Category, type Expense, type Settings } from '../domain/types';

/**
 * Opérations d'écriture. Toutes mettent à jour `updatedAt`, qui sert à
 * départager les versions lors de la fusion entre deux téléphones.
 */

export function newId(): string {
  if (crypto.randomUUID) return crypto.randomUUID();
  // Repli pour les contextes non sécurisés (ex. test sur IP locale en http).
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export async function getSettings(database: PousseDB = db): Promise<Settings> {
  return (await database.settings.get('app')) ?? defaultSettings();
}

export async function updateSettings(patch: Partial<Omit<Settings, 'id'>>, database: PousseDB = db): Promise<void> {
  const current = await getSettings(database);
  const next = { ...current, ...patch };
  // Changer de devise par défaut ré-exprime les taux saisis.
  if (patch.defaultCurrency && patch.defaultCurrency !== current.defaultCurrency && !patch.rates) {
    next.rates = rebaseRates(current.rates, current.defaultCurrency, patch.defaultCurrency);
  }
  await database.settings.put(next);
}

export type ExpenseDraft = Pick<Expense, 'amountMinor' | 'currency' | 'categoryId' | 'date' | 'note' | 'profile'>;

export async function saveExpense(draft: ExpenseDraft, id?: string, database: PousseDB = db): Promise<string> {
  const now = Date.now();
  const note = draft.note?.trim() || undefined;
  if (id) {
    const existing = await database.expenses.get(id);
    if (existing) {
      const updated: Expense = { ...existing, ...draft, note, updatedAt: now };
      if (!note) delete updated.note;
      await database.expenses.put(updated);
      return id;
    }
  }
  const expense: Expense = { id: newId(), ...draft, createdAt: now, updatedAt: now };
  if (note) expense.note = note;
  else delete expense.note;
  await database.expenses.add(expense);
  return expense.id;
}

export async function deleteExpense(id: string, database: PousseDB = db): Promise<void> {
  const now = Date.now();
  await database.expenses.update(id, { deletedAt: now, updatedAt: now });
}

export async function restoreExpense(id: string, database: PousseDB = db): Promise<void> {
  await database.expenses.where('id').equals(id).modify((e) => {
    delete e.deletedAt;
    e.updatedAt = Date.now();
  });
}

export async function saveCategory(
  data: Pick<Category, 'name' | 'icon' | 'color'>,
  id?: string,
  database: PousseDB = db,
): Promise<string> {
  const now = Date.now();
  if (id) {
    await database.categories.update(id, { ...data, updatedAt: now });
    return id;
  }
  const last = await database.categories.orderBy('order').last();
  const category: Category = { id: newId(), ...data, order: (last?.order ?? 0) + 1, updatedAt: now };
  await database.categories.add(category);
  return category.id;
}

/** Supprime une catégorie après avoir réaffecté ses dépenses à `targetId`. */
export async function deleteCategory(id: string, targetId: string, database: PousseDB = db): Promise<number> {
  if (id === FALLBACK_CATEGORY_ID) throw new Error('fallback category cannot be deleted');
  return database.transaction('rw', database.expenses, database.categories, async () => {
    const now = Date.now();
    const affected = await database.expenses.where('categoryId').equals(id).toArray();
    await database.expenses.bulkPut(reassignExpenses(affected, id, targetId, now));
    await database.categories.update(id, { deletedAt: now, updatedAt: now });
    return affected.length;
  });
}

export async function countExpensesInCategory(id: string, database: PousseDB = db): Promise<number> {
  return database.expenses.where('categoryId').equals(id).filter((e) => !e.deletedAt).count();
}

/** Export complet, suppressions comprises (nécessaires pour une fusion correcte). */
export async function buildBackup(database: PousseDB = db): Promise<Backup> {
  const [expenses, categories, settings] = await Promise.all([
    database.expenses.toArray(),
    database.categories.toArray(),
    getSettings(database),
  ]);
  return {
    format: 'pousse-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    expenses,
    categories,
    defaultCurrency: settings.defaultCurrency,
    rates: settings.rates,
  };
}

export interface ImportReport {
  added: number;
  updated: number;
  unchanged: number;
  rejected: number;
}

/** Importe un fichier d'export en le fusionnant avec les données locales. */
export async function importBackup(text: string, database: PousseDB = db): Promise<ImportReport> {
  const parsed = parseBackup(text);
  const fileDefault = (JSON.parse(text) as Partial<Backup>).defaultCurrency;

  return database.transaction('rw', database.expenses, database.categories, database.settings, async () => {
    const expenseMerge = mergeRecords(await database.expenses.toArray(), parsed.expenses);
    const categoryMerge = mergeRecords(await database.categories.toArray(), parsed.categories);
    await database.expenses.bulkPut(expenseMerge.toPut);
    await database.categories.bulkPut(categoryMerge.toPut);

    const settings = await getSettings(database);
    const rates = mergeRates(settings.rates, parsed.rates, fileDefault === settings.defaultCurrency);
    await database.settings.put({ ...settings, rates });

    return {
      added: expenseMerge.added,
      updated: expenseMerge.updated,
      unchanged: expenseMerge.unchanged,
      rejected: parsed.rejected,
    };
  });
}
