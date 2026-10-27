import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { analyzePeriod } from '../domain/analytics';
import { minorDigits } from '../domain/money';
import { diffDays, periodContaining, shiftPeriod, todayISO, type PeriodKind } from '../domain/periods';
import { PROFILES, profileName, type Expense, type ProfileId } from '../domain/types';
import { Card, CategoryIcon, IconButton, ScreenHeader, Segmented } from '../ui/components';
import { CompareBars, CumulativeChart, Donut } from '../ui/charts';
import { categoryName, useCategories, useFormat, useSettings } from '../state';
import { ComparisonLine } from './Comparison';
import { PROFILE_COLORS } from './profiles';

export function AnalysisScreen({ expenses }: { expenses: Expense[] }) {
  const { t } = useTranslation();
  const f = useFormat();
  const settings = useSettings();
  const categories = useCategories();
  const today = todayISO();

  const [kind, setKind] = useState<PeriodKind>('month');
  const [offset, setOffset] = useState(0);
  const [who, setWho] = useState<'all' | ProfileId>('all');
  const period = shiftPeriod(periodContaining(today, kind), offset);
  const previousPeriod = shiftPeriod(period, -1);
  const currency = settings.defaultCurrency;

  const { analysis, previous, byPerson } = useMemo(() => {
    const ctx = { defaultCurrency: currency, rates: settings.rates, today, categoryIds: categories.ids };
    // Filtre « Tous / Zizou / Zuzu » appliqué à toutes les analyses de l'écran.
    const scoped = who === 'all' ? expenses : expenses.filter((e) => e.profile === who);
    // Répartition par personne sur la période (toujours sur l'ensemble des dépenses).
    const byPerson = [
      ...PROFILES.map((p) => ({ id: p.id as ProfileId | null, name: p.name, total: analyzePeriod(expenses.filter((e) => e.profile === p.id), period, ctx).total })),
      { id: null, name: '', total: analyzePeriod(expenses.filter((e) => !e.profile), period, ctx).total },
    ];
    return { analysis: analyzePeriod(scoped, period, ctx), previous: analyzePeriod(scoped, previousPeriod, ctx), byPerson };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, period.start, kind, settings, today, categories.list.length, who]);

  // Pour les axes : montants arrondis, sans décimales.
  const compact = (minor: number) =>
    new Intl.NumberFormat(f.locale, { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }).format(
      minor / 10 ** minorDigits(currency),
    );

  const xLabels = analysis.series.map((s, i) => {
    if (kind === 'year') return f.date(`${s.key}-01`, { month: 'narrow' });
    if (kind === 'week') return f.date(s.key, { weekday: 'narrow' });
    return i % 7 === 0 ? String(i + 1) : '';
  });
  const lastIndex = analysis.comparison.partial
    ? kind === 'year'
      ? Number(today.slice(5, 7)) - 1
      : diffDays(period.start, today)
    : analysis.series.length - 1;

  const shares = analysis.byCategory.map((s) => ({ ...s, category: categories.get(s.categoryId) }));
  const isCurrent = offset === 0;

  return (
    <div className="screen">
      <ScreenHeader title={t('analysis.title')} seed={1} />

      <Segmented
        label={t('analysis.kind')}
        value={kind}
        onChange={(k) => {
          setKind(k);
          setOffset(0);
        }}
        options={[
          { value: 'week', label: t('analysis.week') },
          { value: 'month', label: t('analysis.month') },
          { value: 'year', label: t('analysis.year') },
        ]}
      />

      <div style={{ marginTop: 10 }}>
        <Segmented<'all' | ProfileId>
          label={t('profile.filter')}
          value={who}
          onChange={setWho}
          options={[{ value: 'all', label: t('profile.all') }, ...PROFILES.map((p) => ({ value: p.id, label: p.name }))]}
        />
      </div>
      {/* Les données de l'autre n'arrivent que par import : on l'explique si elles manquent. */}
      {who !== 'all' && who !== settings.profile && !expenses.some((e) => e.profile === who) && (
        <p className="notice">{t('profile.noDataYet', { name: profileName(who) })}</p>
      )}

      <nav className="period-nav" aria-label={t('analysis.kind')}>
        <IconButton label={t('analysis.prev')} onClick={() => setOffset((o) => o - 1)}>
          <IconChevronLeft size={24} stroke={2.4} />
        </IconButton>
        <button
          type="button"
          className="period-nav__label"
          onClick={() => setOffset(0)}
          disabled={isCurrent}
          aria-label={isCurrent ? undefined : `${f.periodLabel(period)} — ${t('analysis.backToToday')}`}
        >
          {f.periodLabel(period)}
        </button>
        <IconButton label={t('analysis.next')} onClick={() => setOffset((o) => o + 1)} disabled={isCurrent}>
          <IconChevronRight size={24} stroke={2.4} />
        </IconButton>
      </nav>

      <Card panel className="card-pad">
        <p className="small muted strong" style={{ margin: 0 }}>{t('analysis.count', { count: analysis.count })}</p>
        <p className="hero num">{f.money(analysis.total, currency)}</p>
        <ComparisonLine analysis={analysis} currency={currency} />
        <div style={{ marginTop: 16 }}>
          <CompareBars
            label={t('analysis.barsLabel', {
              previous: f.money(analysis.comparison.previous, currency),
              current: f.money(analysis.comparison.current, currency),
            })}
            rows={[
              { label: f.periodLabel(previousPeriod), value: analysis.comparison.previous, display: f.money(analysis.comparison.previous, currency) },
              { label: f.periodLabel(period), value: analysis.comparison.current, display: f.money(analysis.comparison.current, currency), current: true },
            ]}
          />
        </div>
        {analysis.unconverted > 0 && <p className="notice">{t('expenses.unconverted', { count: analysis.unconverted })}</p>}
      </Card>

      {analysis.count === 0 ? (
        <p className="notice" style={{ marginTop: 20, textAlign: 'center' }}>{t('analysis.empty')}</p>
      ) : (
        <>
          {who === 'all' && (
            <Card className="card-pad" style={{ marginTop: 16 }}>
              <h2 className="chart-title">{t('profile.byPerson')}</h2>
              <CompareBars
                label={byPerson.map((p) => `${p.name || t('profile.unassigned')} ${f.money(p.total, currency)}`).join(', ')}
                rows={byPerson
                  .filter((p) => p.id || p.total > 0)
                  .map((p) => ({
                    label: p.id ? p.name : t('profile.unassigned'),
                    value: p.total,
                    display: f.money(p.total, currency),
                    color: p.id ? PROFILE_COLORS[p.id] : undefined,
                  }))}
              />
            </Card>
          )}

          <Card className="card-pad" style={{ marginTop: 16 }}>
            <h2 className="chart-title">{t('analysis.byCategory')}</h2>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
              <Donut
                label={t('analysis.donutLabel', {
                  list: shares.map((s) => `${categoryName(s.category, t)} ${f.pct(s.share).replace('+', '')}`).join(', '),
                })}
                slices={shares.map((s) => ({ id: s.categoryId, value: s.total, color: s.category.color }))}
                center={<span className="num" style={{ fontSize: '1.0625rem' }}>{compact(analysis.total)}</span>}
              />
            </div>
            <ul className="legend">
              {shares.map((s) => (
                <li key={s.categoryId}>
                  <CategoryIcon category={s.category} size={32} />
                  <span className="grow ellipsis strong">{categoryName(s.category, t)}</span>
                  <span className="num">{f.money(s.total, currency)}</span>
                  <span className="num muted" style={{ minWidth: '3.2em', textAlign: 'right' }}>
                    {Math.round(s.share * 100)} %
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="card-pad" style={{ marginTop: 16 }}>
            <h2 className="chart-title">{t('analysis.evolution')}</h2>
            <CumulativeChart
              current={analysis.series.map((s) => s.total)}
              previous={previous.series.map((s) => s.total)}
              xLabels={xLabels}
              lastIndex={lastIndex}
              formatY={compact}
              label={t('analysis.lineLabel', {
                current: f.money(analysis.total, currency),
                previous: f.money(previous.total, currency),
              })}
            />
            <div className="chart-legend" aria-hidden="true">
              <span>
                <svg width="22" height="8"><line x1="1" y1="4" x2="21" y2="4" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" /></svg>
                {t('analysis.current')}
              </span>
              <span>
                <svg width="22" height="8"><line x1="1" y1="4" x2="21" y2="4" stroke="var(--text-2)" strokeWidth="2" strokeDasharray="4 4" /></svg>
                {t('analysis.previous')}
              </span>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
