import { MONTHS } from '../hooks/useDashboard';

interface PeriodSelectorProps {
  years: number[];
  selYear: number;
  selMonth: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
}

const SELECT_CLS =
  'rounded-lg px-3 py-2 text-sm bg-[#0f1117] border border-[#252840] ' +
  'text-slate-200 focus:outline-none focus:border-[#4f6ef7] cursor-pointer';

/**
 * Selectores de Año / Mes para el header del dashboard.
 */
export function PeriodSelector({
  years, selYear, selMonth,
  onYearChange, onMonthChange,
}: PeriodSelectorProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Selector de año */}
      <select
        value={selYear}
        onChange={e => onYearChange(Number(e.target.value))}
        className={`min-w-[110px] ${SELECT_CLS}`}
      >
        <option value={0}>— Todos —</option>
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>

      {/* Selector de mes */}
      <select
        value={selMonth}
        onChange={e => onMonthChange(Number(e.target.value))}
        className={`min-w-[130px] ${SELECT_CLS}`}
        disabled={selYear === 0}
      >
        <option value={0}>Todo el año</option>
        {MONTHS.slice(1).map((m, i) => (
          <option key={i + 1} value={i + 1}>{m}</option>
        ))}
      </select>
    </div>
  );
}
