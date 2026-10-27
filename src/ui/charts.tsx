import { arc, area, curveMonotoneX, line, pie, type PieArcDatum } from 'd3-shape';
import { motion } from 'motion/react';
import { SPRING } from './components';

/**
 * Graphiques en SVG maison, dans le style du design system :
 * aplats pastel + contours encre, traits épais, pas de dégradés.
 * Les couleurs viennent des variables CSS, donc suivent le thème et le contraste.
 */

// ---------------------------------------------------------------------------
// Anneau de répartition

export interface DonutSlice {
  id: string;
  value: number;
  color: string;
}

export function Donut({ slices, size = 180, label, center }: { slices: DonutSlice[]; size?: number; label: string; center?: React.ReactNode }) {
  const r = size / 2;
  const arcs = pie<DonutSlice>()
    .sort(null)
    .value((d) => d.value)
    .padAngle(slices.length > 1 ? 0.03 : 0)(slices);
  const shape = arc<PieArcDatum<DonutSlice>>()
    .innerRadius(r * 0.58)
    .outerRadius(r - 2)
    .cornerRadius(4);

  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} viewBox={`${-r} ${-r} ${size} ${size}`} role="img" aria-label={label}>
        {arcs.map((a, i) => (
          <motion.path
            key={a.data.id}
            d={shape(a) ?? ''}
            fill={a.data.color}
            stroke="var(--line)"
            strokeWidth="var(--lw)"
            strokeLinejoin="round"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...SPRING, delay: i * 0.03 }}
          />
        ))}
      </svg>
      {center && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          {center}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Courbe cumulée : période courante (trait plein) vs précédente (pointillés)

export function CumulativeChart({
  current,
  previous,
  xLabels,
  lastIndex,
  formatY,
  label,
}: {
  /** Totaux par jour / par mois (non cumulés). */
  current: number[];
  previous: number[];
  /** Libellé affiché sous chaque point (chaîne vide = rien). */
  xLabels: string[];
  /** Dernier indice à tracer pour la période courante (aujourd'hui si elle est en cours). */
  lastIndex: number;
  formatY: (v: number) => string;
  label: string;
}) {
  const W = 340;
  const H = 190;
  const pad = { top: 12, right: 12, bottom: 28, left: 58 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const cumulate = (values: number[]) => values.reduce<number[]>((acc, v) => [...acc, (acc.at(-1) ?? 0) + v], []);
  const cur = cumulate(current).slice(0, lastIndex + 1);
  const prev = cumulate(previous);

  const max = niceMax(Math.max(1, ...cur, ...prev));
  const steps = Math.max(current.length, previous.length) - 1 || 1;
  const x = (i: number) => pad.left + (i / steps) * innerW;
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;

  const lineGen = line<number>().x((_, i) => x(i)).y(y).curve(curveMonotoneX);
  const areaGen = area<number>().x((_, i) => x(i)).y0(y(0)).y1(y).curve(curveMonotoneX);
  const ticks = [0, max / 2, max];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={label} style={{ display: 'block', overflow: 'visible' }}>
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={pad.left} x2={W - pad.right} y1={y(tick)} y2={y(tick)} stroke="var(--line)" strokeOpacity={0.2} strokeWidth={1} />
          <text x={pad.left - 8} y={y(tick)} dy="0.35em" textAnchor="end" fontSize={13} fontWeight={600} fill="var(--text-2)">
            {formatY(tick)}
          </text>
        </g>
      ))}
      {xLabels.map((l, i) =>
        l ? (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize={13} fontWeight={600} fill="var(--text-2)">
            {l}
          </text>
        ) : null,
      )}
      {prev.length > 1 && (
        <path d={lineGen(prev) ?? ''} fill="none" stroke="var(--text-2)" strokeWidth={2} strokeDasharray="5 5" strokeLinecap="round" />
      )}
      {cur.length > 1 && (
        <>
          <motion.path
            d={areaGen(cur) ?? ''}
            fill="var(--accent)"
            fillOpacity={0.6}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={SPRING}
          />
          <motion.path
            d={lineGen(cur) ?? ''}
            fill="none"
            stroke="var(--ink)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.6 }}
          />
        </>
      )}
      {cur.length > 0 && (
        <circle cx={x(cur.length - 1)} cy={y(cur.at(-1)!)} r={5.5} fill="var(--accent)" stroke="var(--ink)" strokeWidth={2.5} />
      )}
    </svg>
  );
}

/** Arrondit le maximum de l'axe à une valeur « ronde » (1, 2, 2.5, 5 × 10^n). */
export function niceMax(value: number): number {
  const exp = 10 ** Math.floor(Math.log10(value));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * exp >= value) return m * exp;
  return 10 * exp;
}

// ---------------------------------------------------------------------------
// Comparaison en barres-pilules

export function CompareBars({
  rows,
  label,
}: {
  rows: { label: string; value: number; display: string; current?: boolean }[];
  label: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div role="img" aria-label={label} className="stack" style={{ gap: 10 }}>
      {rows.map((r) => (
        <div key={r.label}>
          <div className="row small" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
            <span className="muted strong">{r.label}</span>
            <span className="num">{r.display}</span>
          </div>
          <div style={{ height: 26, borderRadius: 999, border: 'var(--lw) solid var(--line)', overflow: 'hidden', background: 'var(--bg)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(r.value > 0 ? 6 : 0, (r.value / max) * 100)}%` }}
              transition={SPRING}
              style={{
                height: '100%',
                borderRight: r.value > 0 ? 'var(--lw) solid var(--line)' : 'none',
                borderRadius: 999,
                background: r.current
                  ? 'var(--accent)'
                  : 'repeating-linear-gradient(45deg, var(--text-2) 0 2px, transparent 2px 7px)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
