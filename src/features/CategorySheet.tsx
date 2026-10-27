import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconCheck, IconTrash } from '@tabler/icons-react';
import { FALLBACK_CATEGORY_ID, type Category } from '../domain/types';
import { countExpensesInCategory, deleteCategory, saveCategory } from '../db/repo';
import { Button, Field, Sheet, useToast } from '../ui/components';
import { CATEGORY_ICONS, CategoryGlyph } from '../ui/icons';
import { CATEGORY_COLORS } from '../ui/tokens';
import { categoryName, useCategories } from '../state';

/**
 * Création / modification d'une catégorie (nom, icône, couleur).
 * La suppression d'une catégorie utilisée impose de choisir où déplacer ses dépenses.
 */
export function CategorySheet({ open, editing, onClose }: { open: boolean; editing: Category | null; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const categories = useCategories();

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('cart');
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const [nameError, setNameError] = useState(false);
  const [deleting, setDeleting] = useState<{ count: number; target: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(editing ? categoryName(editing, t) : '');
    setIcon(editing?.icon ?? 'cart');
    setColor(editing?.color ?? CATEGORY_COLORS[categories.list.length % CATEGORY_COLORS.length]);
    setNameError(false);
    setDeleting(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(true);
      return;
    }
    // Nom inchangé d'une catégorie par défaut : on garde la traduction automatique.
    const defaultName = editing && editing.name === null ? categoryName(editing, t) : null;
    await saveCategory({ name: trimmed === defaultName ? null : trimmed, icon, color }, editing?.id);
    toast({ message: t('category.saved') });
    onClose();
  }

  async function askDelete() {
    if (!editing) return;
    const count = await countExpensesInCategory(editing.id);
    if (count === 0) return confirmDelete(FALLBACK_CATEGORY_ID);
    setDeleting({ count, target: FALLBACK_CATEGORY_ID });
  }

  async function confirmDelete(target: string) {
    if (!editing) return;
    await deleteCategory(editing.id, target);
    toast({ message: t('category.deleted') });
    onClose();
  }

  const isFallback = editing?.id === FALLBACK_CATEGORY_ID;
  const previewName = name.trim() || t('category.name');

  if (deleting && editing) {
    return (
      <Sheet open={open} onClose={onClose} title={t('category.deleteTitle', { name: categoryName(editing, t) })}>
        <p style={{ marginTop: 0 }}>{t('category.inUse', { count: deleting.count })}</p>
        <div className="row" style={{ flexWrap: 'wrap', gap: 10, marginBottom: 20 }} role="group">
          {categories.list
            .filter((c) => c.id !== editing.id)
            .map((c) => (
              <button
                key={c.id}
                type="button"
                className="chip chip--pastel"
                style={{ background: c.color }}
                aria-pressed={deleting.target === c.id}
                onClick={() => setDeleting({ ...deleting, target: c.id })}
              >
                <CategoryGlyph name={c.icon} size={20} />
                {categoryName(c, t)}
              </button>
            ))}
        </div>
        <Button variant="primary" block onClick={() => confirmDelete(deleting.target)}>
          {t('category.confirmDelete')}
        </Button>
        <Button variant="ghost" block style={{ marginTop: 10 }} onClick={() => setDeleting(null)}>
          {t('common.cancel')}
        </Button>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onClose={onClose} title={t(editing ? 'category.editTitle' : 'category.newTitle')}>
      <div className="row" style={{ justifyContent: 'center', margin: '4px 0 16px' }} aria-label={t('category.preview')}>
        <span className="chip chip--pastel" style={{ background: color, fontSize: '1.0625rem' }}>
          <CategoryGlyph name={icon} size={22} />
          {previewName}
        </span>
      </div>

      <Field label={t('category.name')}>
        <input
          className="input"
          value={name}
          maxLength={30}
          onChange={(e) => {
            setName(e.target.value);
            setNameError(false);
          }}
          aria-invalid={nameError}
        />
      </Field>
      {nameError && <p className="error" role="alert">{t('category.nameRequired')}</p>}

      <p className="section-label">{t('category.icon')}</p>
      <div className="grid-picker" role="group" aria-label={t('category.icon')}>
        {Object.keys(CATEGORY_ICONS).map((key) => (
          <button key={key} type="button" aria-pressed={icon === key} aria-label={key} onClick={() => setIcon(key)}>
            <CategoryGlyph name={key} size={24} />
          </button>
        ))}
      </div>

      <p className="section-label">{t('category.color')}</p>
      <div className="grid-picker" role="group" aria-label={t('category.color')}>
        {CATEGORY_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className="swatch"
            aria-pressed={color === c}
            aria-label={c}
            style={{ background: c, color: '#1A1F16' }}
            onClick={() => setColor(c)}
          >
            {color === c && <IconCheck size={24} stroke={3} />}
          </button>
        ))}
      </div>

      <Button variant="primary" block style={{ marginTop: 24 }} onClick={save}>
        {t('common.save')}
      </Button>

      {editing &&
        (isFallback ? (
          <p className="hint">{t('category.fallbackLocked')}</p>
        ) : (
          <Button variant="ghost" block className="btn--danger" style={{ marginTop: 10 }} onClick={askDelete}>
            <IconTrash size={20} aria-hidden="true" />
            {t('category.delete')}
          </Button>
        ))}
    </Sheet>
  );
}
