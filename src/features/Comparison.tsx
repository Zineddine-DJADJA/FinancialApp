import { useTranslation } from 'react-i18next';
import { IconArrowDownRight, IconArrowUpRight, IconEqual } from '@tabler/icons-react';
import type { PeriodAnalysis } from '../domain/analytics';
import { shiftPeriod } from '../domain/periods';
import { useFormat } from '../state';

/**
 * « +142,10 € · +12 % — par rapport à septembre, à la même date ».
 * Le sens est porté par une flèche ET la couleur (lisible pour les daltoniens).
 */
export function ComparisonLine({ analysis, currency }: { analysis: PeriodAnalysis; currency: string }) {
  const { t } = useTranslation();
  const f = useFormat();
  const { delta, pct, partial, previous } = analysis.comparison;
  const period = f.previousName(shiftPeriod(analysis.period, -1));

  if (previous === 0) {
    return <p className="small muted" style={{ margin: '6px 0 0' }}>{t('compare.noPrevious', { period: analysis.period.kind === 'week' ? t('compare.noPreviousWeek') : t('compare.inPeriod', { period }) })}</p>;
  }

  const Icon = delta > 0 ? IconArrowUpRight : delta < 0 ? IconArrowDownRight : IconEqual;
  const tone = delta > 0 ? 'up' : delta < 0 ? 'down' : 'muted';

  return (
    <div style={{ marginTop: 6 }}>
      <div className={`row ${tone}`} style={{ gap: 6, fontWeight: 700 }}>
        <Icon size={20} stroke={2.4} aria-hidden="true" />
        <span className="num">
          {delta === 0 ? t('compare.same', { period }) : `${f.money(delta, currency, true)} · ${pct === null ? '' : f.pct(pct)}`}
        </span>
      </div>
      {delta !== 0 && (
        <p className="small muted" style={{ margin: '2px 0 0' }}>
          {t(partial ? 'compare.vsToDate' : 'compare.vs', { period })}
        </p>
      )}
    </div>
  );
}
