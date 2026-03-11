import type { ReactNode } from 'react';

interface BarProps {
  /** Porcentaje de llenado (0–100) */
  pct: number;
  /** Clase Tailwind de color: bg-emerald-500, bg-amber-500, bg-rose-500, etc. */
  colorCls: string;
  leftLabel?: string;
  rightLabel?: string;
}

interface KpiCardProps {
  /** Título en mayúsculas pequeñas (ej: "INGRESOS DEL MES") */
  title: string;
  /** Valor principal formateado (ej: "S/ 1,234.00" o "12.5%") */
  value: string;
  /** Clase Tailwind para el color del valor */
  valueCls: string;
  /** Badge de variación (▲ 12% verde / ▼ 4% rojo) */
  badge?: { text: string; cls: string };
  /** Texto del período comparado ("vs mes anterior (S/ 500.00)") */
  vsNode?: ReactNode;
  /** Texto informativo pequeño debajo del valor */
  subtitle?: string;
  /** Barra de progreso opcional */
  bar?: BarProps;
  /** Contenido adicional debajo de la barra */
  children?: ReactNode;
}

/**
 * Tarjeta KPI reutilizable para el dashboard financiero.
 * Acepta valor, badge de variación, barra de progreso y contenido extra.
 */
export function KpiCard({
  title, value, valueCls,
  badge, vsNode, subtitle, bar, children,
}: KpiCardProps) {
  return (
    <div className="card rounded-2xl p-5">
      {/* Título */}
      <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">{title}</p>

      {/* Valor principal */}
      <p className={`text-3xl font-bold ${valueCls}`}>{value}</p>

      {/* Badge + período comparado */}
      {(badge || vsNode) && (
        <div className="flex items-center gap-2 mt-2">
          {badge  && <span className={`text-sm font-bold ${badge.cls}`}>{badge.text}</span>}
          {vsNode && <span className="text-xs text-slate-500">{vsNode}</span>}
        </div>
      )}

      {/* Subtítulo / fuente de datos */}
      {subtitle && (
        <p className="text-xs text-slate-500 mt-2">{subtitle}</p>
      )}

      {/* Barra de progreso */}
      {bar && (
        <>
          <div className="bar-track mt-3">
            <div
              className={`bar-fill ${bar.colorCls}`}
              style={{ width: `${Math.max(0, Math.min(bar.pct, 100))}%` }}
            />
          </div>
          {(bar.leftLabel || bar.rightLabel) && (
            <div className="flex justify-between text-xs text-slate-600 mt-1">
              <span>{bar.leftLabel}</span>
              <span>{bar.rightLabel}</span>
            </div>
          )}
        </>
      )}

      {/* Slot libre para contenido extra */}
      {children}
    </div>
  );
}
