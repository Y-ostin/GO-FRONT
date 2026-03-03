import ReactECharts from 'echarts-for-react';
import type { BreakdownSlice } from '../api/dashboard';

const CHART_COLORS = [
  '#6366f1','#10b981','#f59e0b','#f43f5e','#3b82f6','#a78bfa',
  '#34d399','#fb923c','#e879f9','#22d3ee','#84cc16','#fbbf24',
];

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
  let display: { name: string; value: number; itemStyle?: object }[] = [];

  if (data.length > MAX_SLICES) {
    const top  = data.slice(0, MAX_SLICES);
    const rest = data.slice(MAX_SLICES);
    const otrosVal = rest.reduce((a, s) => a + s.value, 0);
    display = top.map(s => ({ name: s.label, value: s.value }));
    if (otrosVal > 0)
      display.push({ name: `OTROS (${rest.length})`, value: otrosVal, itemStyle: { color: '#4b5563' } });
  } else {
    display = data.map(s => ({ name: s.label, value: s.value }));
  }

  const total = data.reduce((a, s) => a + s.value, 0);

  const option = {
    backgroundColor: 'transparent',
    color: CHART_COLORS,
    tooltip: {
      trigger: 'item',
      formatter: (p: { name: string; value: number; percent: number }) =>
        `${p.name}<br/><b>${fmt(p.value)}</b> (${p.percent}%)`,
    },
    legend: {
      orient: 'vertical',
      left: 'right',
      top: 'center',
      textStyle: { color: '#94a3b8', fontSize: 10 },
      formatter: (name: string) => name.length > 20 ? name.substring(0, 18) + '..' : name,
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
      },
      labelLine: { show: false },
      data: display.length > 0 ? display : [{ name: 'Sin datos', value: 1, itemStyle: { color: '#252840' } }],
    }],
    graphic: total === 0 ? {
      type: 'text',
      left: '35%', top: 'center',
      style: { text: 'Sin datos', textAlign: 'center', fill: '#94a3b8', fontSize: 12 },
    } : undefined,
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} theme="dark" />;
}
