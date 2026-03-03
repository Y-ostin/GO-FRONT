import { useEffect, useRef, useState } from 'react';
import mqtt, { type MqttClient } from 'mqtt';
import { dashboardApi, type KpiResponse, type BreakdownSlice, type Period } from './api/dashboard';
import { EChartDonut } from './components/EChartPie';
import './index.css';

// ── Helpers ────────────────────────────────────────────────────────────────
const MONTHS = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function fmt(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return 'S/ 0.00';
  return 'S/ ' + Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return '0.0%';
  return Number(n).toFixed(1) + '%';
}
function varBadge(variacion: number, anterior: number, invertSign = false): { text: string; cls: string } {
  if (!anterior || anterior === 0) return { text: '—', cls: 'text-slate-500' };
  const isGood = invertSign ? variacion <= 0 : variacion >= 0;
  const arrow  = variacion >= 0 ? '▲' : '▼';
  return {
    text: `${arrow} ${Math.abs(variacion).toFixed(1)}%`,
    cls: isGood ? 'text-emerald-400' : 'text-rose-400',
  };
}

// ── Estado vacío por defecto ───────────────────────────────────────────────
const EMPTY_KPI: KpiResponse = {
  year: 0, month: 0,
  ingresos_actual: 0, ingresos_anterior: 0, ingresos_variacion: 0,
  egresos_actual:  0, egresos_anterior:  0, egresos_variacion:  0,
};

type MqttState = 'connecting' | 'connected' | 'error';

// ── Componente principal ───────────────────────────────────────────────────
export default function App() {
  const [kpi,         setKpi]         = useState<KpiResponse>(EMPTY_KPI);
  const [ingresos,    setIngresos]    = useState<BreakdownSlice[]>([]);
  const [egresos,     setEgresos]     = useState<BreakdownSlice[]>([]);
  const [years,       setYears]       = useState<number[]>([]);
  const [selYear,     setSelYear]     = useState<number>(new Date().getFullYear());
  const [selMonth,    setSelMonth]    = useState<number>(new Date().getMonth() + 1);
  const [mqttState,   setMqttState]   = useState<MqttState>('connecting');
  const [mqttMsg,     setMqttMsg]     = useState('');
  const [mqttCount,   setMqttCount]   = useState(0);
  const [lastUpdate,  setLastUpdate]  = useState('—');
  const clientRef = useRef<MqttClient | null>(null);
  // Refs para acceder al estado actual dentro del closure MQTT sin re-crear
  const yearRef  = useRef(selYear);
  const monthRef = useRef(selMonth);
  yearRef.current  = selYear;
  monthRef.current = selMonth;

  // ── Carga datos KPI + Breakdown ──────────────────────────────────────────
  const loadAll = (year: number, month: number) => {
    dashboardApi.getKPIs(year, month)
      .then(r => { setKpi(r.data); setLastUpdate(new Date().toLocaleTimeString('es-PE')); })
      .catch(e => console.error('/api/kpis', e));

    dashboardApi.getBreakdown(year, month)
      .then(r => { setIngresos(r.data.ingresos ?? []); setEgresos(r.data.egresos ?? []); })
      .catch(e => console.error('/api/kpis/breakdown', e));
  };

  // ── Cargar períodos disponibles al montar ────────────────────────────────
  useEffect(() => {
    dashboardApi.getPeriods().then(r => {
      const data: Period[] = r.data ?? [];
      const uniqueYears = [...new Set(data.map(p => p.year))].sort((a, b) => b - a);
      setYears(uniqueYears);

      const nowYear  = new Date().getFullYear();
      const nowMonth = new Date().getMonth() + 1;
      const initYear = uniqueYears.includes(nowYear) ? nowYear : (uniqueYears[0] ?? nowYear);
      setSelYear(initYear);
      setSelMonth(nowMonth);
      loadAll(initYear, nowMonth);
    }).catch(() => loadAll(selYear, selMonth));
  }, []);

  // ── Recargar al cambiar filtros ──────────────────────────────────────────
  useEffect(() => { loadAll(selYear, selMonth); }, [selYear, selMonth]);

  // ── MQTT ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const url  = import.meta.env.VITE_MQTT_URL  || 'wss://s9a612f1.ala.eu-central-1.emqxsl.com:8084/mqtt';
    const user = import.meta.env.VITE_MQTT_USER || 'ccip-admin';
    const pass = import.meta.env.VITE_MQTT_PASS || '12345678';

    const client = mqtt.connect(url, {
      clientId: 'ccip-dash-' + Math.random().toString(36).substring(2, 10),
      username: user, password: pass,
      clean: true, reconnectPeriod: 5000,
      rejectUnauthorized: false,
    });
    clientRef.current = client;

    client.on('connect',   () => { setMqttState('connected'); client.subscribe('ccip/dashboard'); });
    client.on('reconnect', () => setMqttState('connecting'));
    client.on('close',     () => { setMqttState('error'); setMqttMsg('Desconectado'); });
    client.on('error',     (e) => { setMqttState('error'); setMqttMsg(e.message.substring(0, 30)); });
    client.on('message',   (_t, payload) => {
      try {
        const data = JSON.parse(payload.toString()) as KpiResponse;
        setMqttCount(c => c + 1);
        if (yearRef.current === 0) { loadAll(0, 0); return; }
        if (monthRef.current === 0 && data.year === yearRef.current) { loadAll(yearRef.current, 0); return; }
        if (data.year === yearRef.current && data.month === monthRef.current) {
          setKpi(data);
          setLastUpdate(new Date().toLocaleTimeString('es-PE'));
        }
      } catch { /* skip parse errors */ }
    });

    return () => { client.end(); };
  }, []);

  // ── Valores derivados ────────────────────────────────────────────────────
  const resultado       = (kpi.ingresos_actual || 0) - (kpi.egresos_actual || 0);
  const margen          = kpi.ingresos_actual > 0 ? (resultado / kpi.ingresos_actual) * 100 : 0;
  const ratio           = kpi.ingresos_actual > 0 ? (kpi.egresos_actual  / kpi.ingresos_actual) * 100 : 0;
  const barResultadoPct = kpi.ingresos_actual > 0 ? Math.min((kpi.egresos_actual / kpi.ingresos_actual) * 100, 100) : 50;

  const isTodos  = selYear === 0;
  const isYearly = selYear > 0 && selMonth === 0;
  const vsLabel  = isTodos ? 'acumulado total' : isYearly ? 'vs año anterior' : 'vs mes anterior';
  const periodoStr = isTodos  ? 'Todos los períodos · resumen general'
    : isYearly ? `Año ${selYear} · resumen anual`
    : `${MONTHS[selMonth]} ${selYear}`;

  const ingV = varBadge(kpi.ingresos_variacion, kpi.ingresos_anterior, false);
  const egV  = varBadge(kpi.egresos_variacion,  kpi.egresos_anterior,  true);

  // MQTT dot/label classes
  const dotCls  = mqttState === 'connected'  ? 'w-2 h-2 rounded-full bg-emerald-400 inline-block dot-pulse'
    : mqttState === 'connecting' ? 'w-2 h-2 rounded-full bg-amber-400 inline-block dot-pulse'
    :                               'w-2 h-2 rounded-full bg-rose-500 inline-block';
  const lblCls  = mqttState === 'connected'  ? 'text-emerald-400 text-xs'
    : mqttState === 'connecting' ? 'text-amber-400 text-xs'
    :                               'text-rose-400 text-xs';
  const lblText = mqttState === 'connected'  ? 'MQTT activo'
    : mqttState === 'connecting' ? 'Conectando…'
    : (mqttMsg || 'Error MQTT');

  // Barra ternary helpers
  const resultadoBarCls = barResultadoPct <= 80 ? 'bg-emerald-500' : barResultadoPct <= 100 ? 'bg-amber-500' : 'bg-rose-500';
  const margenBarCls    = margen >= 20 ? 'bg-emerald-500' : margen >= 0 ? 'bg-amber-500' : 'bg-rose-500';
  const ratioBarCls     = ratio  <= 80 ? 'bg-emerald-500' : ratio  <= 100 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className="min-h-screen p-4 md:p-6">

      {/* ── HEADER ── */}
      <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">CCIP · Dashboard Financiero</h1>
          <p className="text-sm text-slate-400 mt-0.5">Métricas ejecutivas mensuales · tiempo real vía MQTT</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Selector año */}
          <select
            value={selYear}
            onChange={e => { setSelYear(Number(e.target.value)); setSelMonth(0); }}
            className="rounded-lg px-3 py-2 text-sm min-w-[110px] bg-[#0f1117] border border-[#252840] text-slate-200 focus:outline-none focus:border-[#4f6ef7] cursor-pointer"
          >
            <option value={0}>— Todos —</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {/* Selector mes */}
          <select
            value={selMonth}
            onChange={e => setSelMonth(Number(e.target.value))}
            className="rounded-lg px-3 py-2 text-sm min-w-[130px] bg-[#0f1117] border border-[#252840] text-slate-200 focus:outline-none focus:border-[#4f6ef7] cursor-pointer"
          >
            <option value={0}>Todo el año</option>
            {MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          {/* Estado MQTT */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className={dotCls} />
            <span className={lblCls}>{lblText}</span>
          </div>
        </div>
      </header>

      {/* ── FILA 1: Ingresos / Egresos ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* Ingresos */}
        <div id="cardIngresos" className="card rounded-2xl p-5">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Ingresos del mes</p>
          <p className="text-3xl font-bold text-emerald-400">{fmt(kpi.ingresos_actual)}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-sm font-bold ${ingV.cls}`}>{ingV.text}</span>
            <span className="text-xs text-slate-500">
              {vsLabel} (<span className="text-slate-400">{isTodos ? 'total' : fmt(kpi.ingresos_anterior)}</span>)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">cicsa_charge_areas · COALESCE(invoice_date, created_at)</p>
        </div>

        {/* Egresos */}
        <div id="cardEgresos" className="card rounded-2xl p-5">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Egresos del mes</p>
          <p className="text-3xl font-bold text-rose-400">{fmt(kpi.egresos_actual)}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-sm font-bold ${egV.cls}`}>{egV.text}</span>
            <span className="text-xs text-slate-500">
              {vsLabel} (<span className="text-slate-400">{isTodos ? 'total' : fmt(kpi.egresos_anterior)}</span>)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">general_expenses · COALESCE(operation_date, created_at)</p>
        </div>
      </section>

      {/* ── FILA 2: Resultado / Margen ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* Resultado neto */}
        <div id="cardResultado" className="card rounded-2xl p-5">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Resultado neto</p>
          <p className={`text-3xl font-bold ${resultado >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {fmt(resultado)}
          </p>
          <p className="text-xs text-slate-500 mt-1">{resultado >= 0 ? '✓ Superávit' : '⚠ Déficit'}</p>
          <div className="bar-track mt-3">
            <div className={`bar-fill ${resultadoBarCls}`} style={{ width: `${barResultadoPct}%` }} />
          </div>
          <div className="flex justify-between text-xs text-slate-600 mt-1">
            <span>Egresos</span><span>Ingresos</span>
          </div>
        </div>

        {/* Margen bruto */}
        <div id="cardMargen" className="card rounded-2xl p-5">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Margen bruto</p>
          <p className={`text-3xl font-bold ${margen >= 20 ? 'text-emerald-400' : margen >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
            {fmtPct(margen)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Resultado / Ingresos × 100</p>
          <div className="bar-track mt-3">
            <div className={`bar-fill ${margenBarCls}`} style={{ width: `${Math.max(0, Math.min(margen, 100))}%` }} />
          </div>
        </div>
      </section>

      {/* ── FILA 3: Período / Ratio ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* Período info */}
        <div className="card rounded-2xl p-5">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-3">Período seleccionado</p>
          <p className="text-lg font-semibold text-white">{periodoStr}</p>
          <p className="text-xs text-slate-500 mt-1">
            Última actualización: <span className="text-slate-300">{lastUpdate}</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Mensajes MQTT recibidos: <span className="text-slate-300">{mqttCount}</span>
          </p>
        </div>

        {/* Ratio gasto/ingreso */}
        <div className="card rounded-2xl p-5">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-3">Ratio Gasto / Ingreso</p>
          <p className={`text-3xl font-bold ${ratio <= 80 ? 'text-emerald-400' : ratio <= 100 ? 'text-amber-400' : 'text-rose-400'}`}>
            {fmtPct(ratio)}
          </p>
          <p className={`text-xs mt-1 ${ratio <= 80 ? 'text-emerald-400' : ratio <= 100 ? 'text-amber-400' : 'text-rose-400'}`}>
            {ratio <= 80 ? '✓ Eficiencia saludable' : ratio <= 100 ? '⚠ Atención requerida' : '✗ Gastos superan ingresos'}
          </p>
          <div className="bar-track mt-3">
            <div className={`bar-fill ${ratioBarCls}`} style={{ width: `${Math.min(ratio, 100)}%` }} />
          </div>
          <p className="text-xs text-slate-600 mt-1">Ideal: menos de 80%</p>
        </div>
      </section>

      {/* ── FILA 4: Gráficas donut ── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="card rounded-2xl p-5">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-3">Ingresos por línea de negocio</p>
          <EChartDonut title="Ingresos por Línea" data={ingresos} />
        </div>
        <div className="card rounded-2xl p-5">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-3">Composición de gastos</p>
          <EChartDonut title="Composición de Gastos" data={egresos} />
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="text-xs text-slate-600 text-center mt-4">
        GO-SERVICE · {periodoStr} · MQTT: ccip/dashboard
      </footer>
    </div>
  );
}
