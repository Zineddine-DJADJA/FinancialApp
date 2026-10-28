import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { monthGrid } from '../domain/calendar';
import { addDays, periodContaining, shiftPeriod } from '../domain/periods';
import type { ISODate } from '../domain/types';
import { IconButton } from '../ui/components';
import { useFormat } from '../state';

/**
 * Petit calendrier de choix de date, intégré à la saisie.
 * Remplace le sélecteur natif `<input type="date">`, dont le comportement varie
 * selon les navigateurs (il ne s'ouvrait pas toujours quand il était masqué).
 */
export function DatePicker({ value, max, onChange }: { value: ISODate; max: ISODate; onChange: (d: ISODate) => void }) {
  const { t } = useTranslation();
  const f = useFormat();
  const [monthStart, setMonthStart] = useState(() => periodContaining(value, 'month').start);

  const month = periodContaining(monthStart, 'month');
  const weekdays = Array.from({ length: 7 }, (_, i) => f.date(addDays('2026-10-26', i), { weekday: 'narrow' })); // 26/10/2026 = lundi
  const canGoNext = month.end <= max;

  return (
    <div className="card calendar date-picker">
      <div className="calendar__nav">
        <IconButton label={t('calendar.prevMonth')} onClick={() => setMonthStart(shiftPeriod(month, -1).start)}>
          <IconChevronLeft size={22} stroke={2.4} />
        </IconButton>
        <p className="calendar__month" aria-live="polite">{f.periodLabel(month)}</p>
        <IconButton label={t('calendar.nextMonth')} onClick={() => setMonthStart(shiftPeriod(month, 1).start)} disabled={!canGoNext}>
          <IconChevronRight size={22} stroke={2.4} />
        </IconButton>
      </div>
      <div className="calendar__grid" role="group" aria-label={f.periodLabel(month)}>
        {weekdays.map((w, i) => (
          <div key={i} className="calendar__weekday" aria-hidden="true">{w}</div>
        ))}
        {monthGrid(monthStart).flat().map((day, i) =>
          day ? (
            <button
              key={day}
              type="button"
              className={`calendar__day ${day === max ? 'calendar__day--today' : ''}`}
              aria-pressed={day === value}
              aria-label={f.dayLabel(day)}
              disabled={day > max}
              onClick={() => onChange(day)}
            >
              {Number(day.slice(8))}
            </button>
          ) : (
            <div key={`empty-${i}`} />
          ),
        )}
      </div>
    </div>
  );
}
