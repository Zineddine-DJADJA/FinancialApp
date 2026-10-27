import { isValidCurrency } from './money';
import { BACKUP_FORMAT, LEGACY_BACKUP_FORMATS, isProfileId, type Backup, type Category, type CurrencyCode, type Expense } from './types';

/**
 * Fusion des données lors d'un import.
 *
 * Règle : les enregistrements sont dédupliqués par `id`. Si les deux côtés
 * possèdent le même id, la version la plus récemment modifiée (`updatedAt`)
 * l'emporte. Les suppressions étant « douces » (`deletedAt`), elles se
 * propagent comme n'importe quelle modification.
 */

interface Versioned {
  id: string;
  updatedAt: number;
}

export interface MergeResult<T> {
  /** Enregistrements à écrire en base (nouveaux ou plus récents). */
  toPut: T[];
  added: number;
  updated: number;
  unchanged: number;
}

export function mergeRecords<T extends Versioned>(local: T[], incoming: T[]): MergeResult<T> {
  const localById = new Map(local.map((r) => [r.id, r]));

  // Un même fichier peut contenir un id en double : on garde la version la plus récente.
  const incomingById = new Map<string, T>();
  for (const r of incoming) {
    const seen = incomingById.get(r.id);
    if (!seen || r.updatedAt > seen.updatedAt) incomingById.set(r.id, r);
  }

  const result: MergeResult<T> = { toPut: [], added: 0, updated: 0, unchanged: 0 };
  for (const r of incomingById.values()) {
    const existing = localById.get(r.id);
    if (!existing) {
      result.toPut.push(r);
      result.added++;
    } else if (r.updatedAt > existing.updatedAt) {
      result.toPut.push(r);
      result.updated++;
    } else {
      result.unchanged++;
    }
  }
  return result;
}

export class BackupError extends Error {
  constructor(public code: 'invalid-json' | 'not-a-backup' | 'unsupported-version') {
    super(code);
  }
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isOptNum = (v: unknown) => v === undefined || v === null || isNum(v);

function asExpense(raw: unknown): Expense | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (
    !isStr(r.id) || !r.id ||
    !Number.isSafeInteger(r.amountMinor) || (r.amountMinor as number) < 0 ||
    !isStr(r.currency) || !isValidCurrency(r.currency) ||
    !isStr(r.categoryId) ||
    !isStr(r.date) || !/^\d{4}-\d{2}-\d{2}$/.test(r.date) ||
    !isNum(r.createdAt) || !isNum(r.updatedAt) ||
    !isOptNum(r.deletedAt) ||
    !(r.note === undefined || r.note === null || isStr(r.note)) ||
    !(r.profile === undefined || r.profile === null || isProfileId(r.profile))
  ) {
    return null;
  }
  const expense: Expense = {
    id: r.id,
    amountMinor: r.amountMinor as number,
    currency: r.currency,
    categoryId: r.categoryId,
    date: r.date,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
  if (isStr(r.note) && r.note) expense.note = r.note;
  if (isNum(r.deletedAt)) expense.deletedAt = r.deletedAt;
  if (isProfileId(r.profile)) expense.profile = r.profile;
  return expense;
}

function asCategory(raw: unknown): Category | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (
    !isStr(r.id) || !r.id ||
    !(r.name === null || isStr(r.name)) ||
    !isStr(r.icon) || !isStr(r.color) || !/^#[0-9a-fA-F]{6}$/.test(r.color) ||
    !isNum(r.order) || !isNum(r.updatedAt) || !isOptNum(r.deletedAt)
  ) {
    return null;
  }
  const category: Category = {
    id: r.id,
    name: r.name as string | null,
    icon: r.icon,
    color: r.color,
    order: r.order,
    updatedAt: r.updatedAt,
  };
  if (isNum(r.deletedAt)) category.deletedAt = r.deletedAt;
  return category;
}

export interface ParsedBackup {
  expenses: Expense[];
  categories: Category[];
  rates: Record<CurrencyCode, number>;
  /** Lignes ignorées car invalides. */
  rejected: number;
}

/** Lit et valide un fichier d'export ; les lignes invalides sont écartées, pas tout le fichier. */
export function parseBackup(text: string): ParsedBackup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError('invalid-json');
  }
  const b = data as Partial<Backup> | null;
  const knownFormat = b?.format === BACKUP_FORMAT || LEGACY_BACKUP_FORMATS.includes(String(b?.format));
  if (!b || !knownFormat || !Array.isArray(b.expenses)) {
    throw new BackupError('not-a-backup');
  }
  if (b.version !== 1) throw new BackupError('unsupported-version');

  let rejected = 0;
  const expenses: Expense[] = [];
  for (const raw of b.expenses) {
    const e = asExpense(raw);
    if (e) expenses.push(e);
    else rejected++;
  }
  const categories: Category[] = [];
  for (const raw of Array.isArray(b.categories) ? b.categories : []) {
    const c = asCategory(raw);
    if (c) categories.push(c);
    else rejected++;
  }
  const rates: Record<CurrencyCode, number> = {};
  if (b.rates && typeof b.rates === 'object') {
    for (const [code, rate] of Object.entries(b.rates)) {
      if (isValidCurrency(code) && isNum(rate) && rate > 0) rates[code] = rate;
    }
  }
  return { expenses, categories, rates, rejected };
}

/**
 * Taux importés : on n'écrase jamais un taux déjà saisi localement,
 * et on ne les reprend que si les deux appareils ont la même devise par défaut.
 */
export function mergeRates(
  local: Record<CurrencyCode, number>,
  incoming: Record<CurrencyCode, number>,
  sameDefault: boolean,
): Record<CurrencyCode, number> {
  if (!sameDefault) return local;
  return { ...incoming, ...local };
}

/**
 * Supprime une catégorie en réaffectant ses dépenses.
 * Les dépenses modifiées reçoivent un nouvel `updatedAt` pour que la réaffectation
 * se propage à l'autre appareil lors de la prochaine fusion.
 */
export function reassignExpenses(expenses: Expense[], fromId: string, toId: string, now: number): Expense[] {
  return expenses
    .filter((e) => e.categoryId === fromId)
    .map((e) => ({ ...e, categoryId: toId, updatedAt: now }));
}
