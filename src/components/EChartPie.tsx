import ReactECharts from 'echarts-for-react';
import type { BreakdownSlice } from '../api/dashboard';

const CHART_COLORS = [
  '#6366f1','#10b981','#f59e0b','#f43f5e','#3b82f6','#a78bfa',
  '#34d399','#fb923c','#e879f9','#22d3ee','#84cc16','#fbbf24',
];
// Color fijo para el slice "Otros gastos agrupados"
const OTROS_COLOR = '#64748b';
const OTROS_PREFIX = '__OTROS__'; // prefijo interno para detectar el slice agrupado

function fmt(n: number): string {
  return 'S/ ' + Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Props {
  title: string;
  data: BreakdownSlice[];
  height?: string;
}

export function EChartDonut({ title, data, height = '300px' }: Props) {
  const MAX_SLICES = 10;

  // ── Separar top-N del resto agrupado ──────────────────────────────────────
  const top      = data.length > MAX_SLICES ? data.slice(0, MAX_SLICES) : data;
  const grouped  = data.length > MAX_SLICES ? data.slice(MAX_SLICES)    : [];
  const otrosVal = grouped.reduce((a, s) => a + s.value, 0);
  const total    = data.reduce((a, s) => a + s.value, 0);

  // Nombre que ECharts usará internamente para el slice agrupado
  const otrosName = `${OTROS_PREFIX}Otros gastos agrupados (${grouped.length})`;

  const display: { name: string; value: number; itemStyle?: object }[] = [
    ...top.map(s => ({ name: s.label, value: s.value })),
    ...(grouped.length > 0 && otrosVal > 0
      ? [{ name: otrosName, value: otrosVal, itemStyle: { color: OTROS_COLOR } }]
      : []),
  ];

  // ── Tooltip con desglose para el slice agrupado ───────────────────────────
  const tooltipFormatter = (p: { name: string; value: number; percent: number }) => {
    if (p.name.startsWith(OTROS_PREFIX)) {
      // Cabecera del grupo
      const displayName = p.name.replace(OTROS_PREFIX, '');
      let html = `<div style="font-weight:bold;margin-bottom:4px">${displayName}</div>`;
      html += `<div style="color:#cbd5e1;margin-bottom:6px">${fmt(p.value)} (${p.percent}%)</div>`;
      html += `<div style="border-top:1px solid #334155;padding-top:5px">`;
      // Desglose de cada ítem agrupado
      grouped.forEach(item => {
        const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0';
        const bar = Math.round((item.value / otrosVal) * 10); // mini-barra de contexto visual
        const barStr = '█'.repeat(bar) + '░'.repeat(10 - bar);
        html += `<div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:2px">` +
          `<span style="color:#94a3b8">• ${item.label}</span>` +
          `<span style="color:#e2e8f0;white-space:nowrap">${fmt(item.value)} <span style="color:#64748b">(${pct}%)</span></span>` +
          `</div>`;
        html += `<div style="color:#4f6ef7;font-size:9px;margin-bottom:3px">${barStr}</div>`;
      });
      html += `</div>`;
      return html;
    }
    // Slice normal
    return `<b>${p.name}</b><br/>${fmt(p.value)} (${p.percent}%)`;
  };

  // ── Formateador de leyenda: el slice OTROS muestra nombre limpio ──────────
  const legendFormatter = (name: string) => {
    const clean = name.startsWith(OTROS_PREFIX) ? name.replace(OTROS_PREFIX, '') : name;
    return clean.length > 22 ? clean.substring(0, 20) + '..' : clean;
  };

  const option = {
    backgroundColor: 'transparent',
    color: CHART_COLORS,
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1e2235',
      borderColor: '#334155',
      borderWidth: 1,
      padding: 10,
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: tooltipFormatter,
      extraCssText: 'max-width:280px; white-space:normal',
    },
    legend: {
      orient: 'vertical',
      left: 'right',
      top: 'center',
      textStyle: { color: '#94a3b8', fontSize: 10 },
      formatter: legendFormatter,
    },
    series: [{
      name: title,
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['35%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 6, borderColor: '#1a1d2b', borderWidth: 2 },
      label: { show: false },
      emphasis: {
        label: { show: true, fontSize: 14, fontWeight: 'bold', formatter: '{d}%' },
        itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' },
      },
      labelLine: { show: false },
      data: display.length > 0
        ? display
        : [{ name: 'Sin datos', value: 1, itemStyle: { color: '#252840' } }],
    }],
    graphic: total === 0 ? {
      type: 'text',
      left: '35%', top: 'center',
      style: { textAlign: 'center', fill: '#94a3b8', fontSize: 12, text: 'Sin datos' },
    } : undefined,
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} theme="dark" />;
}
