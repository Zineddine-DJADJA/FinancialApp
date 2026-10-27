import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { IconTrash, IconX } from '@tabler/icons-react';
import { analyzePeriod } from '../domain/analytics';
import { convertMinor } from '../domain/currency';
import { periodContaining, todayISO } from '../domain/periods';
import { profileName, type Expense } from '../domain/types';
import { deleteExpense, restoreExpense } from '../db/repo';
import { Button, Card, CategoryIcon, IconButton, PixelHeart, SPRING, ScreenHeader, Segmented, haptic, useToast } from '../ui/components';
import { categoryName, useCategories, useFormat, useSettings, type CategoryIndex } from '../state';
import { ComparisonLine } from './Comparison';
import { CalendarView } from './CalendarView';
import { ProfileTag } from './profiles';

const PAGE = 120;
const TIP_KEY = 'pousse.tipHidden';
const VIEW_KEY = 'pousse.expensesView';

type View = 'list' | 'calendar';

function readView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'calendar' ? 'calendar' : 'list';
  } catch {
    return 'list';
  }
}

/** L'astuce reste masquée une fois fermée (mémorisée sur l'appareil). */
function readTipHidden(): boolean {
  try {
    return localStorage.getItem(TIP_KEY) === '1';
  } catch {
    return false;
  }
}

export function ExpensesScreen({
  expenses,
  onEdit,
  onAdd,
}: {
  expenses: Expense[];
  onEdit: (e: Expense) => void;
  /** Ouvre la saisie, éventuellement pour un jour précis (calendrier). */
  onAdd: (date?: string) => void;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const settings = useSettings();
  const categories = useCategories();
  const toast = useToast();
  const [limit, setLimit] = useState(PAGE);
  const [tipHidden, setTipHidden] = useState(readTipHidden);
  const [view, setView] = useState<View>(readView);

  function changeView(next: View) {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // Préférence non mémorisée : sans gravité.
    }
  }

  function hideTip() {
    setTipHidden(true);
    try {
      localStorage.setItem(TIP_KEY, '1');
    } catch {
      // Stockage indisponible : l'astuce reviendra au prochain lancement, sans gravité.
    }
  }

  const today = todayISO();
  const month = periodContaining(today, 'month');
  const analysis = useMemo(
    () =>
      analyzePeriod(expenses, month, {
        defaultCurrency: settings.defaultCurrency,
        rates: settings.rates,
        today,
        categoryIds: categories.ids,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expenses, settings, today],
  );

  const days = useMemo(() => {
    const groups: { date: string; items: Expense[] }[] = [];
    for (const e of expenses.slice(0, limit)) {
      const last = groups[groups.length - 1];
      if (last?.date === e.date) last.items.push(e);
      else groups.push({ date: e.date, items: [e] });
    }
    return groups;
  }, [expenses, limit]);

  async function remove(e: Expense) {
    haptic(15);
    await deleteExpense(e.id);
    toast({ message: t('expenses.deleted'), action: { label: t('common.undo'), run: () => void restoreExpense(e.id) } });
  }

  const dayTotal = (items: Expense[]) =>
    items.reduce((acc, e) => acc + (convertMinor(e.amountMinor, e.currency, settings.defaultCurrency, settings.rates) ?? 0), 0);

  return (
    <div className="screen">
      <ScreenHeader title={t('expenses.title')} subtitle={f.date(today, { month: 'long' })} />

      <Card panel className="card-pad" style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', top: 18, right: 20 }}>
          <PixelHeart size={26} />
        </span>
        <p className="small muted strong" style={{ margin: 0 }}>
          {t('expenses.monthTotal', { month: f.periodLabel(month) })}
        </p>
        <p className="hero num">{f.money(analysis.total, settings.defaultCurrency)}</p>
        <ComparisonLine analysis={analysis} currency={settings.defaultCurrency} />
        {analysis.unconverted > 0 && <p className="notice">{t('expenses.unconverted', { count: analysis.unconverted })}</p>}
      </Card>

      {expenses.length > 0 && !tipHidden && (
        <div className="notice row" style={{ marginTop: 16, paddingRight: 6 }}>
          <PixelHeart size={24} />
          <p className="grow" style={{ margin: 0 }}>{t('expenses.tip')}</p>
          <IconButton label={t('expenses.dismissTip')} onClick={hideTip}>
            <IconX size={20} stroke={2.2} />
          </IconButton>
        </div>
      )}

      {expenses.length === 0 && (
        <Card className="card-pad" style={{ marginTop: 20, textAlign: 'center' }}>
          <PixelHeart size={40} />
          <h2 className="pixel" style={{ margin: '4px 0 8px', fontSize: '1.375rem' }}>{t('expenses.emptyTitle')}</h2>
          <p className="muted" style={{ margin: '0 0 16px' }}>{t('expenses.emptyBody')}</p>
          <Button variant="primary" onClick={() => onAdd()}>
            {t('tabs.add')}
          </Button>
        </Card>
      )}

      {expenses.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <Segmented<View>
            label={t('expenses.view')}
            value={view}
            onChange={changeView}
            options={[
              { value: 'list', label: t('expenses.viewList') },
              { value: 'calendar', label: t('expenses.viewCalendar') },
            ]}
          />
        </div>
      )}

      {view === 'calendar' && expenses.length > 0 && (
        <CalendarView expenses={expenses} onAdd={onAdd} renderRow={(e) => (
          <ExpenseRow key={e.id} expense={e} categories={categories} onOpen={() => onEdit(e)} onDelete={() => remove(e)} />
        )} />
      )}

      {view === 'list' && days.map((day) => (
        <section key={day.date} aria-label={f.dayLabel(day.date)}>
          <h2 className="day-head">
            <span className="day-head__label">{f.dayLabel(day.date)}</span>
            <span className="num" aria-label={t('expenses.dayTotal', { amount: f.money(dayTotal(day.items), settings.defaultCurrency) })}>
              {f.money(dayTotal(day.items), settings.defaultCurrency)}
            </span>
          </h2>
          <AnimatePresence initial={false}>
            {day.items.map((e) => (
              <ExpenseRow key={e.id} expense={e} categories={categories} onOpen={() => onEdit(e)} onDelete={() => remove(e)} />
            ))}
          </AnimatePresence>
        </section>
      ))}

      {view === 'list' && expenses.length > limit && (
        <Button block onClick={() => setLimit((l) => l + PAGE)} style={{ marginTop: 8 }}>
          {t('expenses.showMore')}
        </Button>
      )}
    </div>
  );
}

export function ExpenseRow({
  expense,
  categories,
  onOpen,
  onDelete,
}: {
  expense: Expense;
  categories: CategoryIndex;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const settings = useSettings();
  const category = categories.get(expense.categoryId);
  const name = categoryName(category, t);
  const foreign = expense.currency !== settings.defaultCurrency;
  const converted = foreign ? convertMinor(expense.amountMinor, expense.currency, settings.defaultCurrency, settings.rates) : null;

  return (
    <motion.div
      className="swipe"
      layout="position"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={SPRING}
    >
      <div className="swipe__behind" aria-hidden="true">
        <IconTrash size={22} stroke={2.2} />
        {t('common.delete')}
      </div>
      <motion.button
        type="button"
        className="card expense-row"
        onClick={onOpen}
        aria-label={[name, f.money(expense.amountMinor, expense.currency), expense.profile && profileName(expense.profile), expense.note].filter(Boolean).join(', ')}
        aria-description={t('expenses.swipeHint')}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.7, right: 0 }}
        dragSnapToOrigin
        onDragEnd={(_, info) => {
          // On projette l'élan : un coup sec vers la gauche suffit.
          if (info.offset.x + info.velocity.x * 0.2 < -140) onDelete();
        }}
      >
        <CategoryIcon category={category} />
        <span className="grow">
          <span className="strong ellipsis" style={{ display: 'block' }}>{name}</span>
          {(expense.note || expense.profile) && (
            <span className="row small muted" style={{ gap: 6, marginTop: 2 }}>
              {expense.profile && <ProfileTag profile={expense.profile} />}
              {expense.note && <span className="ellipsis">{expense.note}</span>}
            </span>
          )}
        </span>
        <span className="expense-row__amount">
          <span className="num" style={{ display: 'block' }}>{f.money(-expense.amountMinor, expense.currency)}</span>
          {foreign && (
            <span className="small muted" style={{ display: 'block' }}>
              {converted === null ? t('expenses.noRate') : t('expenses.approx', { amount: f.money(-converted, settings.defaultCurrency) })}
            </span>
          )}
        </span>
      </motion.button>
    </motion.div>
  );
}
