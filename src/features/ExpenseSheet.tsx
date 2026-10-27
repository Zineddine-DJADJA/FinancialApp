import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconBackspace, IconCalendar, IconTrash } from '@tabler/icons-react';
import { minorDigits, minorToInput, parseToMinor } from '../domain/money';
import { addDays, todayISO } from '../domain/periods';
import type { Expense } from '../domain/types';
import { deleteExpense, restoreExpense, saveExpense } from '../db/repo';
import { Button, Sheet, haptic, useToast } from '../ui/components';
import { CategoryGlyph } from '../ui/icons';
import { categoryName, useCategories, useFormat, useSettings } from '../state';

/**
 * Saisie rapide : montant au pavé numérique → catégorie → Enregistrer.
 * La date vaut « aujourd'hui » par défaut. Sert aussi à la modification.
 */
export function ExpenseSheet({ open, editing, onClose }: { open: boolean; editing: Expense | null; onClose: () => void }) {
  const { t } = useTranslation();
  const f = useFormat();
  const settings = useSettings();
  const categories = useCategories();
  const toast = useToast();

  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(settings.defaultCurrency);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<{ amount?: boolean; category?: boolean }>({});

  // Réinitialise le formulaire à chaque ouverture.
  useEffect(() => {
    if (!open) return;
    setAmount(editing ? minorToInput(editing.amountMinor, editing.currency) : '');
    setCurrency(editing?.currency ?? settings.defaultCurrency);
    setCategoryId(editing?.categoryId ?? null);
    setDate(editing?.date ?? todayISO());
    setNote(editing?.note ?? '');
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const decimalSeparator = new Intl.NumberFormat(f.locale).formatToParts(1.5).find((p) => p.type === 'decimal')?.value ?? ',';
  const digits = minorDigits(currency);

  function press(key: string) {
    haptic(5);
    setErrors((e) => ({ ...e, amount: false }));
    setAmount((current) => {
      if (key === 'back') return current.slice(0, -1);
      if (key === '.') return digits === 0 || current.includes('.') ? current : (current || '0') + '.';
      const [, fraction] = current.split('.');
      if (fraction !== undefined && fraction.length >= digits) return current;
      if (current === '0') return key;
      if (current.replace('.', '').length >= 9) return current;
      return current + key;
    });
  }

  // Clavier physique (ordinateur) : chiffres, virgule, retour arrière, Entrée.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || e.metaKey || e.ctrlKey) return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === ',' || e.key === '.') press('.');
      else if (e.key === 'Backspace') press('back');
      else if (e.key === 'Enter') void submit();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  async function submit() {
    const amountMinor = parseToMinor(amount || '0', currency);
    const nextErrors = { amount: !amountMinor, category: !categoryId };
    setErrors(nextErrors);
    if (nextErrors.amount || nextErrors.category) {
      haptic(30);
      return;
    }
    await saveExpense({ amountMinor: amountMinor!, currency, categoryId: categoryId!, date, note }, editing?.id);
    haptic(12);
    toast({ message: t(editing ? 'expenses.updated' : 'expenses.added') });
    onClose();
  }

  async function remove() {
    if (!editing) return;
    const id = editing.id;
    await deleteExpense(id);
    toast({ message: t('expenses.deleted'), action: { label: t('common.undo'), run: () => void restoreExpense(id) } });
    onClose();
  }

  const shownAmount = amount ? amount.replace('.', decimalSeparator) : '0';
  const currencies = [...new Set([settings.defaultCurrency, ...Object.keys(settings.rates), currency])];
  const today = todayISO();
  const yesterday = addDays(today, -1);
  const isOtherDate = date !== today && date !== yesterday;

  return (
    <Sheet open={open} onClose={onClose} title={t(editing ? 'form.editTitle' : 'form.newTitle')}>
      {/* Montant */}
      <div className="amount-panel" aria-live="polite">
        <span className="sr-only">{t('form.amount')}</span>
        <span className="amount-display__value num">{shownAmount}</span>
        <label className="sr-only" htmlFor="currency">{t('form.currency')}</label>
        <select id="currency" className="currency-select" value={currency} onChange={(e) => {
          setCurrency(e.target.value);
          setAmount('');
        }}>
          {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {errors.amount && <p className="error" role="alert" style={{ textAlign: 'center' }}>{t('form.errorAmount')}</p>}

      {/* Catégories : une seule ligne défilante pour garder le pavé visible */}
      <p className="section-label" style={{ marginTop: 8 }}>{t('form.category')}</p>
      <div className="chip-scroll" role="group" aria-label={t('form.category')}>
        {categories.list.map((c) => (
          <button
            key={c.id}
            type="button"
            className="chip chip--pastel"
            style={{ background: c.color }}
            aria-pressed={categoryId === c.id}
            onClick={() => {
              haptic(5);
              setCategoryId(c.id);
              setErrors((e) => ({ ...e, category: false }));
            }}
          >
            <CategoryGlyph name={c.icon} size={20} />
            {categoryName(c, t)}
          </button>
        ))}
      </div>
      {errors.category && <p className="error" role="alert">{t('form.errorCategory')}</p>}

      {/* Date */}
      <div className="chip-scroll" role="group" aria-label={t('form.date')}>
        <button type="button" className="chip" aria-pressed={date === today} onClick={() => setDate(today)}>
          {t('common.today')}
        </button>
        <button type="button" className="chip" aria-pressed={date === yesterday} onClick={() => setDate(yesterday)}>
          {t('common.yesterday')}
        </button>
        <span className="chip date-input" style={isOtherDate ? { outline: '3px solid var(--ink)', outlineOffset: 2 } : undefined}>
          <IconCalendar size={20} aria-hidden="true" />
          {isOtherDate ? f.date(date, { day: 'numeric', month: 'short', year: 'numeric' }) : t('form.otherDate')}
          <input
            type="date"
            aria-label={t('form.otherDate')}
            value={date}
            max="2100-12-31"
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
        </span>
      </div>

      {/* Note */}
      <label className="field" style={{ marginTop: 6 }}>
        <span>{t('form.note')}</span>
        <input
          className="input"
          value={note}
          maxLength={120}
          placeholder={t('form.notePlaceholder')}
          enterKeyHint="done"
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
      </label>

      {/* Pavé numérique intégré : pas de clavier système qui masquerait la moitié de l'écran */}
      <div className="keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
          <button key={k} type="button" onClick={() => press(k)}>{k}</button>
        ))}
        <button type="button" onClick={() => press('.')} aria-label={t('form.decimal')} disabled={digits === 0}>
          {decimalSeparator}
        </button>
        <button type="button" onClick={() => press('0')}>0</button>
        <button type="button" onClick={() => press('back')} aria-label={t('form.backspace')}>
          <IconBackspace size={26} stroke={2} />
        </button>
      </div>

      <Button variant="primary" block onClick={submit}>
        {t('common.save')}
      </Button>
      {editing && (
        <Button variant="ghost" block className="btn--danger" style={{ marginTop: 10 }} onClick={remove}>
          <IconTrash size={20} aria-hidden="true" />
          {t('form.delete')}
        </Button>
      )}
    </Sheet>
  );
}
