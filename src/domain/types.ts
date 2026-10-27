/**
 * Modèle de données de l'application.
 * Tout est stocké localement (IndexedDB) ; aucun serveur.
 */

/** Date calendaire locale au format YYYY-MM-DD (sans fuseau horaire). */
export type ISODate = string;

/** Code devise ISO 4217 (EUR, USD, DZD…). */
export type CurrencyCode = string;

export interface Expense {
  /** UUID v4 : sert de clé de déduplication lors de la fusion. */
  id: string;
  /** Montant en unités mineures (centimes) pour éviter les erreurs d'arrondi. */
  amountMinor: number;
  currency: CurrencyCode;
  categoryId: string;
  date: ISODate;
  note?: string;
  /** Qui a fait la dépense. Absent sur les dépenses saisies avant l'ajout des profils. */
  profile?: ProfileId;
  /** Horodatages en millisecondes. `updatedAt` départage deux versions lors d'une fusion. */
  createdAt: number;
  updatedAt: number;
  /** Suppression « douce » : la dépense reste en base pour que la suppression se propage à l'import. */
  deletedAt?: number;
}

export interface Category {
  /** Identifiant stable : les catégories par défaut ont le même id sur tous les appareils. */
  id: string;
  /** Nom saisi par l'utilisateur ; `null` = nom traduit par défaut. */
  name: string | null;
  icon: string;
  color: string;
  order: number;
  updatedAt: number;
  deletedAt?: number;
}

export type ThemePref = 'auto' | 'light' | 'dark';
export type ContrastPref = 'auto' | 'high';
export type LanguagePref = 'auto' | string;

export interface Settings {
  id: 'app';
  defaultCurrency: CurrencyCode;
  /** Taux manuels : 1 unité de la devise clé = `rate` unités de la devise par défaut. */
  rates: Record<CurrencyCode, number>;
  language: LanguagePref;
  theme: ThemePref;
  contrast: ContrastPref;
  /** Profil de la personne qui utilise ce téléphone ; `undefined` tant qu'il n'est pas choisi. */
  profile?: ProfileId;
}

/**
 * Les deux seuls profils possibles. La liste est volontairement fermée :
 * l'app est faite pour deux personnes, pas plus.
 */
export const PROFILES = [
  { id: 'zizou', name: 'Zizou' },
  { id: 'zuzu', name: 'Zuzu' },
] as const;

export type ProfileId = (typeof PROFILES)[number]['id'];

export function isProfileId(value: unknown): value is ProfileId {
  return PROFILES.some((p) => p.id === value);
}

export function profileName(id: ProfileId): string {
  return PROFILES.find((p) => p.id === id)!.name;
}

/** Format du fichier d'export / sauvegarde. */
export interface Backup {
  format: 'pousse-backup';
  version: 1;
  exportedAt: string;
  expenses: Expense[];
  categories: Category[];
  defaultCurrency?: CurrencyCode;
  rates?: Record<CurrencyCode, number>;
}

/** Catégorie de repli, impossible à supprimer. */
export const FALLBACK_CATEGORY_ID = 'other';
