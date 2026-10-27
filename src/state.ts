import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { db, defaultSettings } from './db/db';
import { FALLBACK_CATEGORY_ID, type Category, type Expense, type ISODate, type Settings } from './domain/types';
import { addDays, todayISO, type Period } from './domain/periods';
import { formatMoney } from './domain/money';

/** Hooks de lecture « en direct » : l'interface se met à jour à chaque écriture en base. */

const FALLBACK_SETTINGS = defaultSettings();

export function useSettings(): Settings {
  return useLiveQuery(() => db.settings.get('app'), []) ?? FALLBACK_SETTINGS;
}

/** Comme `useSettings`, mais indique aussi si la base a fini de charger (pour l'écran de choix du profil). */
export function useSettingsState(): { settings: Settings; loaded: boolean } {
  const result = useLiveQuery(async () => (await db.settings.get('app')) ?? null, [], 'loading' as const);
  if (result === 'loading') return { settings: FALLBACK_SETTINGS, loaded: false };
  return { settings: result ?? FALLBACK_SETTINGS, loaded: true };
}

export interface CategoryIndex {
  /** Catégories actives, dans l'ordre d'affichage. */
  list: Category[];
  /** Résout un id en catégorie active ; les ids inconnus ou supprimés tombent sur « Autres ». */
  get: (id: string) => Category;
  ids: Set<string>;
  /** Faux tant que la base n'a pas répondu (évite d'afficher « Autres » au démarrage). */
  loaded: boolean;
}

const PLACEHOLDER_OTHER: Category = {
  id: FALLBACK_CATEGORY_ID,
  name: null,
  icon: 'dots',
  color: '#D9D2C3',
  order: 999,
  updatedAt: 0,
};

export function useCategories(): CategoryIndex {
  const result = useLiveQuery(() => db.categories.orderBy('order').toArray(), []);
  const list = (result ?? []).filter((c) => !c.deletedAt);
  const byId = new Map(list.map((c) => [c.id, c]));
  const other = byId.get(FALLBACK_CATEGORY_ID) ?? PLACEHOLDER_OTHER;
  return { list, get: (id) => byId.get(id) ?? other, ids: new Set(byId.keys()), loaded: result !== undefined };
}

/** Dépenses actives, de la plus récente à la plus ancienne. `undefined` pendant le chargement. */
export function useExpenses(): Expense[] | undefined {
  return useLiveQuery(async () => {
    const all = await db.expenses.orderBy('date').reverse().toArray();
    return all
      .filter((e) => !e.deletedAt)
      .sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1));
  }, []);
}

export function categoryName(category: Category, t: TFunction): string {
  return category.name ?? t(`categoryNames.${category.id}`, { defaultValue: category.id });
}

/** Fonctions de formatage liées à la langue courante. */
export function useFormat() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;

  const money = (minor: number, currency: string, signed = false) =>
    formatMoney(minor, currency, locale, { signDisplay: signed ? 'exceptZero' : 'auto' });

  // Une décimale sous 10 % (« +0,4 % » plutôt que « 0 % »), aucune au-delà.
  const pct = (ratio: number) =>
    new Intl.NumberFormat(locale, {
      style: 'percent',
      maximumFractionDigits: Math.abs(ratio) < 0.1 ? 1 : 0,
      signDisplay: 'exceptZero',
    }).format(ratio);

  const date = (iso: ISODate, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));

  /** « Aujourd'hui », « Hier » ou « lundi 26 octobre ». */
  const dayLabel = (iso: ISODate) => {
    const today = todayISO();
    if (iso === today) return t('common.today');
    if (iso === addDays(today, -1)) return t('common.yesterday');
    const sameYear = iso.slice(0, 4) === today.slice(0, 4);
    const label = date(iso, { weekday: 'long', day: 'numeric', month: 'long', ...(sameYear ? {} : { year: 'numeric' }) });
    return label.charAt(0).toLocaleUpperCase(locale) + label.slice(1);
  };

  /** Libellé d'une période : « octobre 2026 », « 26 oct. – 1 nov. », « 2026 ». */
  const periodLabel = (p: Period) => {
    if (p.kind === 'year') return p.start.slice(0, 4);
    if (p.kind === 'month') return date(p.start, { month: 'long', year: 'numeric' });
    const last = addDays(p.end, -1);
    const sameMonth = p.start.slice(0, 7) === last.slice(0, 7);
    const from = date(p.start, sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'short' });
    return `${from} – ${date(last, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  /** Nom de la période précédente dans une phrase : « la semaine dernière », « septembre », « 2025 ». */
  const previousName = (previous: Period) => {
    if (previous.kind === 'week') return t('compare.lastWeek');
    if (previous.kind === 'month') {
      const sameYear = previous.start.slice(0, 4) === todayISO().slice(0, 4);
      return date(previous.start, sameYear ? { month: 'long' } : { month: 'long', year: 'numeric' });
    }
    return previous.start.slice(0, 4);
  };

  return { locale, money, pct, date, dayLabel, periodLabel, previousName };
}
