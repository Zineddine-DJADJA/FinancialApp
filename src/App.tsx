import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MotionConfig } from 'motion/react';
import { IconChartDonut, IconList, IconPlus, IconSettings } from '@tabler/icons-react';
import type { Expense } from './domain/types';
import { ToastProvider } from './ui/components';
import { applyAppearance } from './ui/theme';
import { setLanguage } from './i18n';
import { useExpenses, useSettings } from './state';
import { ExpensesScreen } from './features/ExpensesScreen';
import { ExpenseSheet } from './features/ExpenseSheet';
import { AnalysisScreen } from './features/AnalysisScreen';
import { SettingsScreen } from './features/SettingsScreen';
import './app.css';

type Tab = 'expenses' | 'analysis' | 'settings';

export function App() {
  const { t } = useTranslation();
  const settings = useSettings();
  const expenses = useExpenses();
  const [tab, setTab] = useState<Tab>('expenses');
  const [sheet, setSheet] = useState<{ open: boolean; editing: Expense | null }>({ open: false, editing: null });

  // Les réglages pilotent thème, contraste et langue.
  useEffect(() => {
    applyAppearance(settings.theme, settings.contrast);
  }, [settings.theme, settings.contrast]);
  useEffect(() => {
    setLanguage(settings.language);
  }, [settings.language]);

  // Changer d'onglet ramène en haut de l'écran.
  // (Accolades obligatoires : les navigateurs récents renvoient une promesse depuis scrollTo.)
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab]);

  const openAdd = () => setSheet({ open: true, editing: null });
  const tabs: { id: Tab; label: string; Icon: typeof IconList }[] = [
    { id: 'expenses', label: t('tabs.expenses'), Icon: IconList },
    { id: 'analysis', label: t('tabs.analysis'), Icon: IconChartDonut },
    { id: 'settings', label: t('tabs.settings'), Icon: IconSettings },
  ];

  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <main>
          {expenses === undefined ? null : tab === 'expenses' ? (
            <ExpensesScreen expenses={expenses} onAdd={openAdd} onEdit={(e) => setSheet({ open: true, editing: e })} />
          ) : tab === 'analysis' ? (
            <AnalysisScreen expenses={expenses} />
          ) : (
            <SettingsScreen />
          )}
        </main>

        <nav className="tabbar" aria-label={t('tabs.label')}>
          {tabs.slice(0, 1).map(renderTab)}
          <button type="button" className="tabbar__add" aria-label={t('tabs.add')} onClick={openAdd}>
            <IconPlus size={30} stroke={2.6} />
          </button>
          {tabs.slice(1).map(renderTab)}
        </nav>

        <ExpenseSheet open={sheet.open} editing={sheet.editing} onClose={() => setSheet((s) => ({ ...s, open: false }))} />
      </ToastProvider>
    </MotionConfig>
  );

  function renderTab({ id, label, Icon }: (typeof tabs)[number]) {
    return (
      <button
        key={id}
        type="button"
        className="tabbar__item"
        aria-current={tab === id ? 'page' : undefined}
        onClick={() => setTab(id)}
      >
        <Icon size={24} stroke={2.2} aria-hidden="true" />
        {label}
      </button>
    );
  }
}
