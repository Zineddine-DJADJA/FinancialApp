import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconChevronRight, IconDownload, IconPlus, IconUpload, IconX } from '@tabler/icons-react';
import { COMMON_CURRENCIES, isValidCurrency } from '../domain/money';
import { BackupError } from '../domain/merge';
import type { Category, ContrastPref, ThemePref } from '../domain/types';
import { importBackup, updateSettings } from '../db/repo';
import { Button, Card, CategoryIcon, IconButton, Segmented, useToast } from '../ui/components';
import { LANGUAGES } from '../i18n';
import { categoryName, useCategories, useSettings } from '../state';
import { CategorySheet } from './CategorySheet';
import { exportBackup } from './backup';

export function SettingsScreen() {
  const { t } = useTranslation();
  const settings = useSettings();
  const categories = useCategories();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [categorySheet, setCategorySheet] = useState<{ open: boolean; editing: Category | null }>({ open: false, editing: null });
  const [newCurrency, setNewCurrency] = useState('');

  const base = settings.defaultCurrency;
  const allCurrencies = [...new Set([...COMMON_CURRENCIES, base, ...Object.keys(settings.rates)])];
  const addable = allCurrencies.filter((c) => c !== base && !(c in settings.rates));

  async function onImport(file: File | undefined) {
    if (!file) return;
    try {
      const report = await importBackup(await file.text());
      const parts = [t('settings.importDone', { ...report })];
      if (report.rejected) parts.push(t('settings.importRejected', { count: report.rejected }));
      toast({ message: parts.join(' ') });
    } catch (e) {
      const code = e instanceof BackupError ? e.code : 'generic';
      toast({ message: t(`settings.importErrors.${code}`) });
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function onExport() {
    const result = await exportBackup();
    if (result !== 'cancelled') toast({ message: t('settings.exported') });
  }

  function setRate(code: string, value: string) {
    const rate = Number(value.replace(',', '.'));
    if (!Number.isFinite(rate) || rate <= 0) return;
    void updateSettings({ rates: { ...settings.rates, [code]: rate } });
  }

  function removeRate(code: string) {
    const rates = { ...settings.rates };
    delete rates[code];
    void updateSettings({ rates });
  }

  return (
    <div className="screen">
      <header className="screen__head">
        <h1 className="screen__title pixel">{t('settings.title')}</h1>
      </header>

      {/* Apparence */}
      <h2 className="section-label">{t('settings.appearance')}</h2>
      <Card className="card-pad stack">
        <div className="stack" style={{ gap: 8 }}>
          <span className="strong">{t('settings.theme')}</span>
          <Segmented<ThemePref>
            label={t('settings.theme')}
            value={settings.theme}
            onChange={(theme) => void updateSettings({ theme })}
            options={[
              { value: 'auto', label: t('settings.themeAuto') },
              { value: 'light', label: t('settings.themeLight') },
              { value: 'dark', label: t('settings.themeDark') },
            ]}
          />
        </div>
        <div className="stack" style={{ gap: 8 }}>
          <span className="strong">{t('settings.contrast')}</span>
          <Segmented<ContrastPref>
            label={t('settings.contrast')}
            value={settings.contrast}
            onChange={(contrast) => void updateSettings({ contrast })}
            options={[
              { value: 'auto', label: t('settings.contrastAuto') },
              { value: 'high', label: t('settings.contrastHigh') },
            ]}
          />
          <p className="hint" style={{ margin: 0 }}>{t('settings.contrastHint')}</p>
        </div>
        <label className="field">
          <span className="strong" style={{ color: 'var(--ink)', fontSize: '1rem' }}>{t('settings.language')}</span>
          <select className="input" value={settings.language} onChange={(e) => void updateSettings({ language: e.target.value })}>
            <option value="auto">{t('settings.languageAuto')}</option>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </label>
      </Card>

      {/* Devises */}
      <h2 className="section-label">{t('settings.currency')}</h2>
      <Card className="card-pad stack">
        <label className="field">
          <span className="strong" style={{ color: 'var(--ink)', fontSize: '1rem' }}>{t('settings.defaultCurrency')}</span>
          <select className="input" value={base} onChange={(e) => void updateSettings({ defaultCurrency: e.target.value })}>
            {allCurrencies.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <p className="hint" style={{ margin: 0 }}>{t('settings.defaultCurrencyHint')}</p>

        <span className="strong" style={{ marginTop: 8 }}>{t('settings.rates')}</span>
        {Object.entries(settings.rates).map(([code, rate]) => (
          <div key={`${base}-${code}`} className="row">
            <span className="num grow">1 {code} =</span>
            <input
              className="input rate-input"
              inputMode="decimal"
              defaultValue={String(rate)}
              aria-label={t('settings.rateLabel', { code, base })}
              onBlur={(e) => setRate(code, e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            />
            <span className="num">{base}</span>
            <IconButton label={t('settings.removeRate', { code })} onClick={() => removeRate(code)}>
              <IconX size={20} stroke={2.2} />
            </IconButton>
          </div>
        ))}
        <div className="row">
          <select
            className="input grow"
            value={newCurrency}
            aria-label={t('settings.addCurrencyLabel')}
            onChange={(e) => setNewCurrency(e.target.value)}
          >
            <option value="">{t('settings.addCurrencyLabel')}</option>
            {addable.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <Button
            disabled={!newCurrency}
            onClick={() => {
              if (!isValidCurrency(newCurrency)) return;
              void updateSettings({ rates: { ...settings.rates, [newCurrency]: 1 } });
              setNewCurrency('');
            }}
          >
            <IconPlus size={20} aria-hidden="true" />
            {t('settings.addCurrency')}
          </Button>
        </div>
        <p className="hint" style={{ margin: 0 }}>{t('settings.ratesHint')}</p>
      </Card>

      {/* Catégories */}
      <h2 className="section-label">{t('settings.categories')}</h2>
      <Card>
        {categories.list.map((c) => (
          <button key={c.id} type="button" className="settings-row" onClick={() => setCategorySheet({ open: true, editing: c })}>
            <CategoryIcon category={c} size={36} />
            <span className="grow ellipsis strong">{categoryName(c, t)}</span>
            <IconChevronRight size={20} aria-hidden="true" />
          </button>
        ))}
        <button type="button" className="settings-row" onClick={() => setCategorySheet({ open: true, editing: null })}>
          <span className="cat-icon" style={{ width: 36, height: 36, background: 'var(--accent)' }} aria-hidden="true">
            <IconPlus size={20} stroke={2.4} />
          </span>
          <span className="grow strong">{t('settings.addCategory')}</span>
        </button>
      </Card>

      {/* Données */}
      <h2 className="section-label">{t('settings.data')}</h2>
      <Card className="card-pad stack">
        <Button variant="primary" block onClick={onExport}>
          <IconUpload size={20} aria-hidden="true" />
          {t('settings.export')}
        </Button>
        <p className="hint" style={{ margin: 0 }}>{t('settings.exportHint')}</p>
        <Button block onClick={() => fileInput.current?.click()}>
          <IconDownload size={20} aria-hidden="true" />
          {t('settings.import')}
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => void onImport(e.target.files?.[0])}
        />
        <p className="hint" style={{ margin: 0 }}>{t('settings.importHint')}</p>
      </Card>

      {/* À propos */}
      <h2 className="section-label">{t('settings.about')}</h2>
      <p className="hint">{t('settings.privacy')}</p>
      <p className="hint">{t('settings.version', { version: __APP_VERSION__ })}</p>

      <CategorySheet
        open={categorySheet.open}
        editing={categorySheet.editing}
        onClose={() => setCategorySheet((s) => ({ ...s, open: false }))}
      />
    </div>
  );
}
