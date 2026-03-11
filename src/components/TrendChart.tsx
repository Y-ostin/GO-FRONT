import ReactECharts from 'echarts-for-react';
import type { TrendPoint } from '../api/dashboard';

const MONTHS_SHORT = [
  '', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000)
    return 'S/ ' + (n / 1_000_000).toFixed(2) + 'M';
  if (Math.abs(n) >= 1_000)
    return 'S/ ' + (n / 1_000).toFixed(1) + 'K';
  return 'S/ ' + Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2 });
}

interface Props {
  data:   TrendPoint[];
  height?: string;
}

/**
 * Gráfico de tendencia mensual:
 *   - 2 barras verticales lado a lado: Ingresos (verde) y Egresos (rojo)
 *   - 1 línea transversal suavizada: Resultado neto (ámbar)
 *   - Tooltip compartido por todos los elementos del eje X
 */
export function TrendChart({ data, height = '380px' }: Props) {
  // Si no hay datos, mostrar estado vacío
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-slate-500 text-sm"
        style={{ height }}
      >
        Sin datos de tendencia para el período seleccionado
      </div>
    );
  }

  const labels    = data.map(d => `${MONTHS_SHORT[d.month]} ${d.year}`);
  const ingresos  = data.map(d => d.ingresos);
  const egresos   = data.map(d => d.egresos);
  const resultado = data.map(d => d.resultado);

  const option = {
    backgroundColor: 'transparent',
    grid: { top: 36, right: 24, bottom: 48, left: 72, containLabel: false },

    // ── Ejes ────────────────────────────────────────────────────────────────
    xAxis: {
      type: 'category',
      data: labels,
      axisLine:  { lineStyle: { color: '#334155' } },
      axisTick:  { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 11, interval: 0, rotate: labels.length > 8 ? 30 : 0 },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine:  { show: false },
      axisTick:  { show: false },
      axisLabel: { color: '#64748b', fontSize: 10, formatter: (v: number) => fmt(v) },
      splitLine: { lineStyle: { color: '#1e2235', type: 'dashed' } },
    },

    // ── Tooltip compartido por eje ─────────────────────────────────────────
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e2235',
      borderColor: '#334155',
      borderWidth: 1,
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      axisPointer: {
        type: 'shadow',
        shadowStyle: { color: 'rgba(99,102,241,0.06)' },
      },
      formatter: (params: { seriesName: string; value: number; axisValue: string }[]) => {
        const label = params[0]?.axisValue ?? '';
        let html = `<div style="font-weight:bold;margin-bottom:6px;color:#cbd5e1">${label}</div>`;
        for (const p of params) {
          const dot =
            p.seriesName === 'Ingresos'  ? '🟢' :
            p.seriesName === 'Egresos'   ? '🔴' : '🟡';
          const color =
            p.seriesName === 'Ingresos'  ? '#10b981' :
            p.seriesName === 'Egresos'   ? '#f43f5e' : '#f59e0b';
          html += `<div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:3px">` +
            `<span style="color:${color}">${dot} ${p.seriesName}</span>` +
            `<span style="color:#e2e8f0;font-weight:bold">${fmt(p.value)}</span>` +
            `</div>`;
        }
        return html;
      },
    },

    // ── Leyenda ────────────────────────────────────────────────────────────
    legend: {
      top: 0,
      right: 0,
      textStyle: { color: '#94a3b8', fontSize: 11 },
      itemWidth: 14,
      itemHeight: 10,
    },

    // ── Series ────────────────────────────────────────────────────────────
    series: [
      {
        name: 'Ingresos',
        type: 'bar',
        barMaxWidth: 32,
        barGap: '10%',
        data: ingresos,
        itemStyle: {
          color: '#10b981',
          borderRadius: [4, 4, 0, 0],
        },
        emphasis: { itemStyle: { color: '#34d399' } },
      },
      {
        name: 'Egresos',
        type: 'bar',
        barMaxWidth: 32,
        data: egresos,
        itemStyle: {
          color: '#f43f5e',
          borderRadius: [4, 4, 0, 0],
        },
        emphasis: { itemStyle: { color: '#fb7185' } },
      },
      {
        name: 'Resultado',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        data: resultado,
        lineStyle: { color: '#f59e0b', width: 2.5 },
        itemStyle: { color: '#f59e0b', borderWidth: 2, borderColor: '#1a1d2b' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(245,158,11,0.18)' },
              { offset: 1, color: 'rgba(245,158,11,0.00)' },
            ],
          },
        },
        // Lídea de referencia en 0 (break-even)
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: '#475569', type: 'dashed', width: 1 },
          data: [{ yAxis: 0, label: { formatter: 'Break-even', color: '#64748b', fontSize: 10 } }],
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} theme="dark" />;
}
