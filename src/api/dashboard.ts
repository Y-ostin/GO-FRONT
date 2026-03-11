import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface KpiResponse {
  year: number;
  month: number;
  ingresos_actual: number;
  ingresos_anterior: number;
  ingresos_variacion: number;
  egresos_actual: number;
  egresos_anterior: number;
  egresos_variacion: number;
}

export interface BreakdownSlice {
  label: string;
  value: number;
}

export interface BreakdownResponse {
  ingresos: BreakdownSlice[];
  egresos: BreakdownSlice[];
}

export interface Period {
  year: number;
  month: number;
}

/** Un punto de tendencia mensual para el gráfico central */
export interface TrendPoint {
  year:      number;
  month:     number;
  ingresos:  number;
  egresos:   number;
  resultado: number;
}

export const dashboardApi = {
  getKPIs: (year: number, month: number) =>
    axios.get<KpiResponse>(`${API_BASE_URL}/api/kpis?year=${year}&month=${month}`),

  getBreakdown: (year: number, month: number) =>
    axios.get<BreakdownResponse>(`${API_BASE_URL}/api/kpis/breakdown?year=${year}&month=${month}`),

  getPeriods: () =>
    axios.get<Period[]>(`${API_BASE_URL}/api/kpis/periods`),

  /** Tendencia mensual para el gráfico de barras+línea.
   *  Si year=0 devuelve todos. Si month=0 devuelve todos los meses del año. */
  getTrend: (year: number) =>
    axios.get<TrendPoint[]>(`${API_BASE_URL}/api/kpis/trend?year=${year}`),
};

