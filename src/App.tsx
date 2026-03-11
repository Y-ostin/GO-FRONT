import { useDashboard, MONTHS, fmt, fmtPct, varBadge } from './hooks/useDashboard';
import { useMqtt } from './hooks/useMqtt';
import { KpiTopCard } from './components/KpiTopCard';
import { MqttBadge } from './components/MqttBadge';
import { PeriodSelector } from './components/PeriodSelector';
import { EChartDonut } from './components/EChartPie';
import { TrendChart } from './components/TrendChart';
import type { KpiResponse } from './api/dashboard';
import './index.css';

// ── Componente principal ───────────────────────────────────────────────────
export default function App() {
  const {
    kpi, setKpi,
    ingresos, egresos,
    trend,
    years, selYear, selMonth,
    lastUpdate, setLastUpdate,
    yearRef, monthRef,
    setSelYear, setSelMonth,
    loadAll,
  } = useDashboard();

  // ── Callback MQTT: actualiza datos cuando llega un mensaje ───────────────
  const handleMqttMessage = (raw: string) => {
    try {
      const data = JSON.parse(raw) as KpiResponse;
      if (yearRef.current === 0) { loadAll(0, 0); return; }
      if (monthRef.current === 0 && data.year === yearRef.current) {
        loadAll(yearRef.current, 0); return;
      }
      if (data.year === yearRef.current && data.month === monthRef.current) {
        setKpi(data);
        setLastUpdate(new Date().toLocaleTimeString('es-PE'));
      }
    } catch { /* payload no válido, ignorar */ }
  };

  const { mqttState, mqttMsg, mqttCount } = useMqtt({
    topic:     'ccip/dashboard',
    onMessage: handleMqttMessage,
  });

  // ── Valores derivados ────────────────────────────────────────────────────
  const resultado       = (kpi.ingresos_actual || 0) - (kpi.egresos_actual || 0);
  const margen          = kpi.ingresos_actual > 0 ? (resultado / kpi.ingresos_actual) * 100 : 0;
  const ratio           = kpi.ingresos_actual > 0 ? (kpi.egresos_actual / kpi.ingresos_actual) * 100 : 0;
  const isTodos    = selYear === 0;
  const isYearly   = selYear > 0 && selMonth === 0;
  const periodoStr = isTodos   ? 'Todos los períodos · resumen general'
    : isYearly ? `Año ${selYear} · resumen anual`
    : `${MONTHS[selMonth]} ${selYear}`;

  const ingV = varBadge(kpi.ingresos_variacion, kpi.ingresos_anterior, false);
  const egV  = varBadge(kpi.egresos_variacion,  kpi.egresos_anterior,  true);

  const ratioCls        = ratio  <= 80  ? 'text-emerald-400' : ratio <= 100 ? 'text-amber-400' : 'text-rose-400';
  const ratioLabel      = ratio  <= 80  ? '✓ Eficiencia saludable' : ratio <= 100 ? '⚠ Atención requerida' : '✗ Gastos superan ingresos';

  // Punto de equilibrio: ingresos necesarios para cubrir egresos exactamente
  const breakeven = kpi.egresos_actual > 0 ? kpi.egresos_actual : 0;
  const breakevenReached = kpi.ingresos_actual >= breakeven;
  // Top gasto: el mayor slice de egresos (primero del breakdown)
  const topGasto = egresos[0];

  return (
    <div className="min-h-screen p-4 md:p-5">

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <header className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          {/* Logo placeholder */}
          <div className="w-9 h-9 rounded-lg bg-[#252840] border border-[#334155] flex items-center justify-center text-slate-400 text-xs font-bold">
            CC
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight leading-tight">
              Dashboard Ejecutivo · Resultados Financieros
            </h1>
            <p className="text-xs text-slate-500">{periodoStr}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Fecha de actualización */}
          <span className="text-xs bg-[#252840] border border-[#334155] rounded-lg px-3 py-1.5 text-slate-300">
            Data actualizada · {lastUpdate}
          </span>
          <PeriodSelector
            years={years}
            selYear={selYear}
            selMonth={selMonth}
            onYearChange={y => { setSelYear(y); setSelMonth(0); }}
            onMonthChange={setSelMonth}
          />
          <MqttBadge state={mqttState} msg={mqttMsg} />
        </div>
      </header>

      {/* ══ FILA 1: 4 KPI TOP CARDS ═════════════════════════════════════════ */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">

        {/* Ingresos */}
        <KpiTopCard
          title="Ingresos mensuales (SOLES)"
          actual={fmt(kpi.ingresos_actual)}
          anterior={isTodos ? 'acumulado' : fmt(kpi.ingresos_anterior)}
          actualLabel="Mes actual (S./)"
          anteriorLabel={isTodos ? 'Total histórico' : isYearly ? 'Año anterior' : 'Mes anterior'}
          badge={ingV}
          valueCls="text-emerald-400"
        />

        {/* Gastos */}
        <KpiTopCard
          title="Gastos mensuales (SOLES)"
          actual={fmt(kpi.egresos_actual)}
          anterior={isTodos ? 'acumulado' : fmt(kpi.egresos_anterior)}
          actualLabel="Mes actual (S./)"
          anteriorLabel={isTodos ? 'Total histórico' : isYearly ? 'Año anterior' : 'Mes anterior'}
          badge={egV}
          valueCls="text-rose-400"
        />

        {/* Resultado */}
        <KpiTopCard
          title="Resultado (SOLES)"
          actual={fmt(resultado)}
          anterior={fmt(kpi.ingresos_anterior - kpi.egresos_anterior)}
          actualLabel="Mes actual (S./)"
          anteriorLabel={isYearly ? 'Año anterior' : 'Mes anterior'}
          badge={resultado >= 0
            ? { text: resultado >= 0 ? '✓ Superávit' : '⚠ Déficit', cls: 'text-emerald-400' }
            : { text: '⚠ Déficit', cls: 'text-rose-400' }
          }
          valueCls={resultado >= 0 ? 'text-emerald-400' : 'text-rose-400'}
        />

        {/* Margen */}
        <KpiTopCard
          title="Margen (%)"
          actual={fmtPct(margen)}
          anterior={(() => {
            const margenAnt = kpi.ingresos_anterior > 0
              ? ((kpi.ingresos_anterior - kpi.egresos_anterior) / kpi.ingresos_anterior) * 100
              : 0;
            return fmtPct(margenAnt);
          })()}
          actualLabel="Mes actual (%)"
          anteriorLabel={isYearly ? 'Año anterior' : 'Mes anterior'}
          badge={margen >= 20
            ? { text: `+${(margen).toFixed(1)}%`, cls: 'text-emerald-400' }
            : margen >= 0
            ? { text: `${margen.toFixed(1)}%`, cls: 'text-amber-400' }
            : { text: `${margen.toFixed(1)}%`, cls: 'text-rose-400' }
          }
          valueCls={margen >= 20 ? 'text-emerald-400' : margen >= 0 ? 'text-amber-400' : 'text-rose-400'}
          alignRight
        />

      </section>

      {/* ══ FILA 2: DONUT | TENDENCIA | DONUT ═══════════════════════════════ */}
      <section className="grid grid-cols-1 md:grid-cols-[minmax(220px,1fr)_minmax(0,2fr)_minmax(220px,1fr)] gap-3 mb-4">

        {/* Donut izquierdo — Ingresos por línea */}
        <div className="card rounded-2xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Ingresos por línea de negocio</p>
          <EChartDonut title="Ingresos" data={ingresos} height="300px" />
        </div>

        {/* Gráfico central — Tendencia barras + línea */}
        <div className="card rounded-2xl p-4">
          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-widest">
                Tendencia ingresos, gastos y resultados
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                {selYear === 0 ? 'Todos los períodos' : `Año ${selYear}`} ·
                <span className="text-emerald-500"> ▌ Ingresos</span>
                <span className="text-rose-500"> ▌ Egresos</span>
                <span className="text-amber-400"> ─ Resultado</span>
              </p>
            </div>
          </div>
          <TrendChart data={trend} height="300px" />
        </div>

        {/* Donut derecho — Composición de gastos */}
        <div className="card rounded-2xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Composición de gastos</p>
          <EChartDonut title="Gastos" data={egresos} height="300px" />
        </div>

      </section>

      {/* ══ FILA 3: 4 TARJETAS INFERIORES ══════════════════════════════════ */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">

        {/* Punto de equilibrio */}
        <div className="card rounded-2xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">Punto de equilibrio</p>
          <p className="text-xl font-bold text-white tabular-nums">{fmt(breakeven)}</p>
          <p className="text-xs text-slate-500 mt-1">
            Ingresos necesarios para cubrir egresos
          </p>
          <div className="mt-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
              breakevenReached
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}>
              {breakevenReached ? '✓ Alcanzado' : '✗ No alcanzado'}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-2">
            Mes previo (S./) {fmt(kpi.egresos_anterior)}
          </p>
        </div>

        {/* Alerta ejecutiva */}
        <div className={`card rounded-2xl p-4 border-l-4 ${
          resultado >= 0 ? 'border-l-emerald-500' : 'border-l-rose-500'
        }`}>
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">Alerta ejecutiva del mes</p>
          <p className={`text-xl font-bold tabular-nums ${resultado >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {fmt(Math.abs(resultado))}
          </p>
          <p className={`text-xs mt-1 font-semibold ${resultado >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {resultado >= 0 ? '✓ Superávit del período' : '⚠ Déficit del período'}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Mes previo (S./) {fmt(Math.abs(kpi.ingresos_anterior - kpi.egresos_anterior))}&nbsp;
            <span className={ingV.cls}>{ingV.text}</span>
          </p>
          {mqttCount > 0 && (
            <p className="text-xs text-slate-600 mt-1">{mqttCount} actualiz. MQTT recibidas</p>
          )}
        </div>

        {/* Top gasto del período */}
        <div className="card rounded-2xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">Mayor gasto del período</p>
          {topGasto ? (
            <>
              <p className="text-xl font-bold text-white tabular-nums">{fmt(topGasto.value)}</p>
              <p className="text-xs text-slate-300 mt-1 truncate font-medium">{topGasto.label}</p>
              <p className="text-xs text-slate-500 mt-1">
                {kpi.egresos_actual > 0
                  ? `${((topGasto.value / kpi.egresos_actual) * 100).toFixed(1)}% del total de gastos`
                  : 'Sin datos de egresos'}
              </p>
              {egresos[1] && (
                <p className="text-xs text-slate-600 mt-2 truncate">
                  2° <span className="text-slate-400">{egresos[1].label}</span>
                  {' · '}{fmt(egresos[1].value)}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-500 mt-2">Sin datos</p>
          )}
        </div>

        {/* Ratio Gasto / Ingreso */}
        <div className="card rounded-2xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">Ratio Gasto / Ingreso (%)</p>
          <div className="grid grid-cols-3 items-end gap-2">
            <div>
              <p className={`text-xl font-bold tabular-nums ${ratioCls}`}>{fmtPct(ratio)}</p>
              <p className="text-xs text-slate-500 mt-1">Mes actual</p>
            </div>
            <div>
              <p className="text-xl font-semibold tabular-nums text-slate-300">
                {kpi.ingresos_anterior > 0
                  ? fmtPct((kpi.egresos_anterior / kpi.ingresos_anterior) * 100)
                  : '—'}
              </p>
              <p className="text-xs text-slate-500 mt-1">{isYearly ? 'Año ant.' : 'Mes ant.'}</p>
            </div>
            <div className="flex flex-col items-center">
              <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                ratio <= 80
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : ratio <= 100
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}>
                {ratio <= 80 ? '✓ OK' : ratio <= 100 ? '⚠ Alto' : '✗ Crítico'}
              </span>
              <p className="text-xs text-slate-500 mt-1">Estado</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-2">{ratioLabel} · Ideal &lt; 80%</p>
        </div>

      </section>

      {/* ══ FOOTER ══════════════════════════════════════════════════════════ */}
      <footer className="text-xs text-slate-600 text-center py-2">
        GO-SERVICE · {periodoStr} · MQTT: ccip/dashboard · {lastUpdate}
      </footer>

    </div>
  );
}
