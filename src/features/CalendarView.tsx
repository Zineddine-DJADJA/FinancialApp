import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence } from 'motion/react';
import { IconChevronLeft, IconChevronRight, IconPlus } from '@tabler/icons-react';
import { dailyTotals, monthGrid } from '../domain/calendar';
import { minorDigits } from '../domain/money';
import { addDays, periodContaining, shiftPeriod, todayISO } from '../domain/periods';
import type { Expense, ISODate } from '../domain/types';
import { Button, Card, IconButton } from '../ui/components';
import { useFormat, useSettings } from '../state';

/**
 * Calendrier mensuel : chaque jour affiche son total, en vert plus soutenu
 * quand il dépasse la moyenne des jours dépensiers du mois.
 * Toucher un jour montre ses dépenses et permet d'en ajouter une à cette date.
 */
export function CalendarView({
  expenses,
  onAdd,
  renderRow,
}: {
  expenses: Expense[];
  onAdd: (date: ISODate) => void;
  renderRow: (e: Expense) => ReactNode;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const settings = useSettings();
  const today = todayISO();

  const [monthStart, setMonthStart] = useState(() => periodContaining(today, 'month').start);
  const [selected, setSelected] = useState<ISODate>(today);

  const grid = useMemo(() => monthGrid(monthStart), [monthStart]);
  const totals = useMemo(
    () => dailyTotals(expenses, settings.defaultCurrency, settings.rates),
    [expenses, settings.defaultCurrency, settings.rates],
  );

  // Seuil « jour chargé » : moyenne des jours avec dépenses dans le mois affiché.
  const month = periodContaining(monthStart, 'month');
  const monthValues = [...totals.entries()].filter(([d]) => d >= month.start && d < month.end).map(([, v]) => v);
  const average = monthValues.length ? monthValues.reduce((a, b) => a + b, 0) / monthValues.length : 0;

  const weekdays = grid[0].map((_, i) => f.date(addDays('2026-10-26', i), { weekday: 'narrow' })); // 26/10/2026 = lundi
  const compact = (minor: number) =>
    new Intl.NumberFormat(f.locale, { maximumFractionDigits: 0 }).format(minor / 10 ** minorDigits(settings.defaultCurrency));

  const dayExpenses = expenses.filter((e) => e.date === selected);
  const isCurrentMonth = monthStart === periodContaining(today, 'month').start;

  function goMonth(n: number) {
    const next = shiftPeriod(month, n);
    setMonthStart(next.start);
    setSelected(next.start <= today && today < next.end ? today : next.start);
  }

  return (
    <>
      <Card className="calendar" style={{ marginTop: 14 }}>
        <div className="calendar__nav">
          <IconButton label={t('calendar.prevMonth')} onClick={() => goMonth(-1)}>
            <IconChevronLeft size={22} stroke={2.4} />
          </IconButton>
          <h2 className="calendar__month">{f.periodLabel(month)}</h2>
          <IconButton label={t('calendar.nextMonth')} onClick={() => goMonth(1)} disabled={isCurrentMonth}>
            <IconChevronRight size={22} stroke={2.4} />
          </IconButton>
        </div>

        <div className="calendar__grid" role="grid" aria-label={f.periodLabel(month)}>
          {weekdays.map((w, i) => (
            <div key={i} className="calendar__weekday" aria-hidden="true">{w}</div>
          ))}
          {grid.flat().map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />;
            const total = totals.get(day) ?? 0;
            const classes = [
              'calendar__day',
              total > 0 && 'calendar__day--spent',
              total > 0 && total > average && 'calendar__day--high',
              day === today && 'calendar__day--today',
            ].filter(Boolean).join(' ');
            return (
              <button
                key={day}
                type="button"
                className={classes}
                aria-pressed={day === selected}
                aria-label={`${f.dayLabel(day)}${total ? `, ${f.money(total, settings.defaultCurrency)}` : ''}`}
                onClick={() => setSelected(day)}
              >
                <span>{Number(day.slice(8))}</span>
                {total > 0 && <span className="calendar__amount">{compact(total)}</span>}
              </button>
            );
          })}
        </div>
      </Card>

      <h2 className="day-head">
        <span className="day-head__label">{f.dayLabel(selected)}</span>
        <span className="num">{f.money(totals.get(selected) ?? 0, settings.defaultCurrency)}</span>
      </h2>
      <AnimatePresence initial={false}>{dayExpenses.map(renderRow)}</AnimatePresence>
      {dayExpenses.length === 0 && <p className="hint" style={{ textAlign: 'center', margin: '4px 0 12px' }}>{t('calendar.noExpense')}</p>}
      {selected <= today && (
        <Button block onClick={() => onAdd(selected)}>
          <IconPlus size={20} aria-hidden="true" />
          {t('calendar.addOnDay')}
        </Button>
      )}
    </>
  );
}
