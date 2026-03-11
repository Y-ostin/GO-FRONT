interface KpiTopCardProps {
  /** Título de la tarjeta */
  title: string;
  /** Valor principal (mes actual / año actual) */
  actual: string;
  /** Valor de comparación (mes anterior / meta) */
  anterior: string;
  /** Etiqueta bajo el valor actual */
  actualLabel: string;
  /** Etiqueta bajo el valor de comparación */
  anteriorLabel: string;
  /** Badge de variación */
  badge: { text: string; cls: string };
  /** Color del valor actual */
  valueCls?: string;
  /**
   * Cuando true, alinea el contenido a la derecha (útil para Margen
   * que ocupa el extremo derecho de la primera fila).
   */
  alignRight?: boolean;
}

/**
 * Tarjeta KPI de cabecera.
 * Layout: actual | anterior | badge (columnas proporcionales [1fr_1fr_auto]).
 * El badge toma solo el ancho que necesita; los valores no se parten en dos líneas.
 */
export function KpiTopCard({
  title, actual, anterior,
  actualLabel, anteriorLabel,
  badge, valueCls = 'text-white',
  alignRight = false,
}: KpiTopCardProps) {
  const isPositive = badge.text.startsWith('▲') || badge.text.startsWith('+');
  const badgeBg    = badge.text === '—'
    ? 'bg-slate-700 text-slate-300'
    : isPositive
    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
    : 'bg-rose-500/20    text-rose-400    border border-rose-500/30';

  return (
    <div className={`card rounded-2xl p-4 ${alignRight ? 'text-right' : ''}`}>
      {/* Título */}
      <p className="text-xs text-slate-400 uppercase tracking-widest mb-3 truncate">{title}</p>

      {/* Fila de 3 valores: [1fr | 1fr | auto]
          Los valores ocupan espacio proporcional, el badge toma solo lo que necesita */}
      <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-x-4 gap-y-1">

        {/* Valor actual */}
        <div className={alignRight ? 'text-left' : ''}>
          <p className={`text-[17px] leading-tight font-bold tabular-nums truncate ${valueCls}`}>
            {actual}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 truncate">{actualLabel}</p>
        </div>

        {/* Valor anterior / meta */}
        <div className={alignRight ? 'text-left' : ''}>
          <p className="text-[17px] leading-tight font-semibold tabular-nums text-slate-300 truncate">
            {anterior}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 truncate">{anteriorLabel}</p>
        </div>

        {/* Badge variación — siempre alineado al final */}
        <div className={`flex flex-col ${alignRight ? 'items-end' : 'items-center'}`}>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg whitespace-nowrap ${badgeBg}`}>
            {badge.text}
          </span>
          <p className="text-[11px] text-slate-500 mt-1">Variación</p>
        </div>

      </div>
    </div>
  );
}
