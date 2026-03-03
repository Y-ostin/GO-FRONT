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

export const dashboardApi = {
  getKPIs: (year: number, month: number) =>
    axios.get<KpiResponse>(`${API_BASE_URL}/api/kpis?year=${year}&month=${month}`),

  getBreakdown: (year: number, month: number) =>
    axios.get<BreakdownResponse>(`${API_BASE_URL}/api/kpis/breakdown?year=${year}&month=${month}`),

  getPeriods: () =>
    axios.get<Period[]>(`${API_BASE_URL}/api/kpis/periods`),
};

