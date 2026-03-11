import { useCallback, useEffect, useRef, useState } from 'react';
import { dashboardApi, type KpiResponse, type BreakdownSlice, type Period, type TrendPoint } from '../api/dashboard';

// ── Constantes reutilizables ──────────────────────────────────────────────
export const MONTHS = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const EMPTY_KPI: KpiResponse = {
  year: 0, month: 0,
  ingresos_actual: 0, ingresos_anterior: 0, ingresos_variacion: 0,
  egresos_actual:  0, egresos_anterior:  0, egresos_variacion:  0,
};

// ── Helpers de formato ────────────────────────────────────────────────────
export function fmt(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return 'S/ 0.00';
  return 'S/ ' + Number(n).toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return '0.0%';
  return Number(n).toFixed(1) + '%';
}

export function varBadge(
  variacion: number,
  anterior: number,
  invertSign = false,
): { text: string; cls: string } {
  if (!anterior || anterior === 0) return { text: '—', cls: 'text-slate-500' };
  const isGood = invertSign ? variacion <= 0 : variacion >= 0;
  const arrow  = variacion >= 0 ? '▲' : '▼';
  return {
    text: `${arrow} ${Math.abs(variacion).toFixed(1)}%`,
    cls:  isGood ? 'text-emerald-400' : 'text-rose-400',
  };
}

// ── Hook principal ─────────────────────────────────────────────────────────
export function useDashboard() {
  const [kpi,       setKpi]       = useState<KpiResponse>(EMPTY_KPI);
  const [ingresos,  setIngresos]  = useState<BreakdownSlice[]>([]);
  const [egresos,   setEgresos]   = useState<BreakdownSlice[]>([]);
  const [years,     setYears]     = useState<number[]>([]);
  const [selYear,   setSelYear]   = useState(new Date().getFullYear());
  const [selMonth,  setSelMonth]  = useState(new Date().getMonth() + 1);
  const [lastUpdate, setLastUpdate] = useState('—');
  const [trend, setTrend]           = useState<TrendPoint[]>([]);

  // Refs para evitar stale closures en el handler MQTT
  const yearRef  = useRef(selYear);
  const monthRef = useRef(selMonth);
  yearRef.current  = selYear;
  monthRef.current = selMonth;

  const loadAll = useCallback((year: number, month: number) => {
    dashboardApi.getKPIs(year, month)
      .then(r => {
        setKpi(r.data);
        setLastUpdate(new Date().toLocaleTimeString('es-PE'));
      })
      .catch(e => console.error('[useDashboard] /api/kpis', e));

    dashboardApi.getBreakdown(year, month)
      .then(r => {
        setIngresos(r.data.ingresos ?? []);
        setEgresos(r.data.egresos ?? []);
      })
      .catch(e => console.error('[useDashboard] /api/kpis/breakdown', e));

    // Tendencia: siempre carga todos los meses del año seleccionado
    // (si year=0, pide tendencia general; el backend decide cómo responder)
    dashboardApi.getTrend(year)
      .then(r => setTrend(r.data ?? []))
      .catch(() => setTrend([])); // endpoint opcional — no bloquea el resto
  }, []);

  // Carga períodos disponibles al montar
  useEffect(() => {
    dashboardApi.getPeriods()
      .then(r => {
        const data: Period[] = r.data ?? [];
        const uniqueYears = [...new Set(data.map(p => p.year))].sort((a, b) => b - a);
        setYears(uniqueYears);

        const nowYear  = new Date().getFullYear();
        const nowMonth = new Date().getMonth() + 1;
        const initYear = uniqueYears.includes(nowYear) ? nowYear : (uniqueYears[0] ?? nowYear);
        setSelYear(initYear);
        setSelMonth(nowMonth);
        loadAll(initYear, nowMonth);
      })
      .catch(() => loadAll(selYear, selMonth));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recarga al cambiar selección
  useEffect(() => {
    loadAll(selYear, selMonth);
  }, [selYear, selMonth, loadAll]);

  return {
    kpi, setKpi,
    ingresos, egresos,
    trend,
    years, selYear, selMonth,
    lastUpdate, setLastUpdate,
    yearRef, monthRef,
    setSelYear, setSelMonth,
    loadAll,
  };
}
