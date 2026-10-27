import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls } from 'motion/react';
import { IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { CategoryGlyph } from './icons';
import type { Category } from '../domain/types';
import './components.css';

/** Ressorts « Apple » : sans rebond par défaut, léger rebond après un geste lancé. */
export const SPRING = { type: 'spring', bounce: 0, duration: 0.35 } as const;
export const SPRING_MOMENTUM = { type: 'spring', bounce: 0.15, duration: 0.35 } as const;

/** Petit retour haptique (Android) ; ignoré là où l'API n'existe pas (iOS). */
export function haptic(ms = 10): void {
  navigator.vibrate?.(ms);
}

// ---------------------------------------------------------------------------

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger';
  block?: boolean;
};

export function Button({ variant = 'secondary', block, className = '', ...rest }: ButtonProps) {
  const classes = ['btn', variant !== 'secondary' && `btn--${variant}`, block && 'btn--block', className];
  return <button type="button" className={classes.filter(Boolean).join(' ')} {...rest} />;
}

export function IconButton({ label, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" className="icon-btn" aria-label={label} title={label} {...rest}>
      {children}
    </button>
  );
}

/** Carte blanche à contour fin, ou grand aplat vert (`panel`). */
export function Card({ panel, className = '', style, children }: { panel?: boolean; className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <div className={`card ${panel ? 'card--panel' : ''} ${className}`} style={style}>
      {children}
    </div>
  );
}

/** Petit cœur en pixel art rose, comme celui de la charte. Décoratif. */
export function PixelHeart({ size = 32 }: { size?: number }) {
  // 9 × 8 pixels : k = contour, p = rose, w = reflet.
  const rows = ['.kk...kk.', 'kppk.kppk', 'kpwpkpppk', 'kpwpppppk', 'kpppppppk', '.kpppppk.', '..kpppk..', '...kpk...'];
  const fill: Record<string, string> = { k: 'var(--ink)', p: 'var(--pink)', w: '#FFFFFF' };
  return (
    <svg width={size} height={(size * 8) / 9} viewBox="0 0 9 8" shapeRendering="crispEdges" aria-hidden="true">
      {rows.flatMap((row, y) =>
        [...row].map((c, x) => (fill[c] ? <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={fill[c]} /> : null)),
      )}
    </svg>
  );
}

/** En-tête d'écran : titre pixel noir, sous-titre pixel vert (« ONLINE / SHOPPING »). */
export function ScreenHeader({ title, subtitle, seed }: { title: string; subtitle?: string; seed?: number }) {
  return (
    <header className="screen__head">
      <PixelSparkles seed={seed} />
      <h1 className="screen__title pixel">{title}</h1>
      {subtitle && <p className="screen__subtitle pixel pixel--green">{subtitle}</p>}
    </header>
  );
}

/**
 * Petits carrés verts éparpillés, comme les pixels flottants de la charte.
 * Purement décoratif : masqué aux lecteurs d'écran.
 */
export function PixelSparkles({ seed = 0 }: { seed?: number }) {
  // [gauche %, haut %, taille px]
  const spots = [
    [70, 6, 10], [78, 52, 7], [86, 16, 12], [92, 70, 8], [97, 34, 7], [73, 88, 6],
  ].map(([x, y, s]) => [x - (seed % 3) * 4, y, s]);
  return (
    <span className="pixel-sparkles" aria-hidden="true">
      {spots.map(([x, y, s], i) => (
        // Deux pixels sur six en rose : une touche, pas plus.
        <span
          key={i}
          style={{ left: `${x}%`, top: `${y}%`, width: s, height: s, ...(i === 1 || i === 4 ? { background: 'var(--pink)' } : {}) }}
        />
      ))}
    </span>
  );
}

export function CategoryIcon({ category, size = 40 }: { category: Pick<Category, 'icon' | 'color'>; size?: number }) {
  return (
    <span className="cat-icon" style={{ background: category.color, width: size, height: size }} aria-hidden="true">
      <CategoryGlyph name={category.icon} size={Math.round(size * 0.55)} stroke={2} />
    </span>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Panneau du bas. Le bouton « retour » d'Android et la touche Échap le ferment.

const sheetStack: { id: string; close: () => void }[] = [];
let ignoreNextPop = false;

window.addEventListener('popstate', () => {
  if (ignoreNextPop) {
    ignoreNextPop = false;
    return;
  }
  sheetStack.pop()?.close();
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sheetStack.length) {
    e.preventDefault();
    history.back();
  }
});

export function Sheet({
  open,
  onClose,
  title,
  actions,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  const titleId = `${id}-title`;
  const dragControls = useDragControls();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const { t } = useTranslation();

  // Une entrée d'historique par panneau ouvert : le geste « retour » ferme le panneau.
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    sheetStack.push({ id, close: () => closeRef.current() });
    history.pushState({ sheet: id }, '');
    panelRef.current?.focus();
    return () => {
      const index = sheetStack.findIndex((s) => s.id === id);
      if (index !== -1) {
        // Fermé par l'interface (pas par « retour ») : on retire l'entrée d'historique.
        sheetStack.splice(index, 1);
        ignoreNextPop = true;
        history.back();
      }
      previousFocus?.focus?.();
    };
  }, [open, id]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            className="sheet-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            ref={panelRef}
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={SPRING}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.9 }}
            onDragEnd={(_, info) => {
              // Projection de l'élan : un petit geste rapide suffit à fermer.
              const projected = info.offset.y + info.velocity.y * 0.2;
              if (projected > 160) onClose();
            }}
          >
            <div className="sheet__grab" onPointerDown={(e) => dragControls.start(e)}>
              <div className="sheet__handle" />
              <div className="sheet__head">
                <h2 id={titleId} className="sheet__title pixel">
                  {title}
                </h2>
                <div style={{ display: 'flex', gap: 8 }}>
                  {actions}
                  <IconButton label={t('common.close')} onClick={onClose}>
                    <IconX size={22} stroke={2.2} />
                  </IconButton>
                </div>
              </div>
            </div>
            <div className="sheet__body">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// Toast avec action « Annuler » (on préfère annuler à confirmer).

interface ToastData {
  message: string;
  action?: { label: string; run: () => void };
}

const ToastContext = createContext<(t: ToastData) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastData & { key: number }) | null>(null);
  const timer = useRef<number>(undefined);

  const show = useCallback((data: ToastData) => {
    window.clearTimeout(timer.current);
    setToast({ ...data, key: Date.now() });
    timer.current = window.setTimeout(() => setToast(null), data.action ? 6000 : 3500);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.key}
              className="toast"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={SPRING}
            >
              <span>{toast.message}</span>
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action!.run();
                    setToast(null);
                  }}
                >
                  {toast.action.label}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
