import Dexie, { type EntityTable } from 'dexie';
import { FALLBACK_CATEGORY_ID, type Category, type Expense, type Settings } from '../domain/types';

/**
 * Base IndexedDB locale (via Dexie). Aucune donnée ne quitte l'appareil,
 * sauf via l'export manuel.
 */
export class AppDB extends Dexie {
  expenses!: EntityTable<Expense, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  settings!: EntityTable<Settings, 'id'>;

  // Nom de base historique, conservé pour ne pas perdre les données déjà saisies.
  constructor(name = 'pousse') {
    super(name);
    this.version(1).stores({
      expenses: 'id, date, categoryId, updatedAt',
      categories: 'id, order',
      settings: 'id',
    });
    this.on('populate', (tx) => {
      // updatedAt = 0 : tout renommage fait sur l'un des deux téléphones l'emportera à la fusion.
      tx.table('categories').bulkAdd(DEFAULT_CATEGORIES.map((c, order) => ({ ...c, name: null, order, updatedAt: 0 })));
    });
  }
}

/** Catégories par défaut, avec des identifiants identiques sur tous les appareils. */
export const DEFAULT_CATEGORIES: Pick<Category, 'id' | 'icon' | 'color'>[] = [
  { id: 'food', icon: 'cart', color: '#A9D8B4' },
  { id: 'transport', icon: 'bus', color: '#C7B1DF' },
  { id: 'housing', icon: 'home', color: '#FFC94A' },
  { id: 'leisure', icon: 'confetti', color: '#F2A597' },
  { id: 'health', icon: 'heart', color: '#A8DCE0' },
  { id: 'shopping', icon: 'shirt', color: '#F7C6CC' },
  { id: FALLBACK_CATEGORY_ID, icon: 'dots', color: '#D9D2C3' },
];

export function defaultSettings(): Settings {
  const lang = navigator.language?.toLowerCase() ?? 'fr';
  return {
    id: 'app',
    defaultCurrency: lang.startsWith('en-us') ? 'USD' : lang.startsWith('en-gb') ? 'GBP' : 'EUR',
    rates: {},
    language: 'auto',
    theme: 'auto',
    contrast: 'auto',
  };
}

export const db = new AppDB();

/** Demande au navigateur de ne pas effacer les données en cas de manque d'espace. */
export function requestPersistentStorage(): void {
  navigator.storage?.persist?.().catch(() => {});
}
