import { motion } from 'framer-motion';
import { glassPanel, premiumInput, springTransition, monthOptions } from '../utils/styles';

export default function PeriodFilterBar({
  filterMonth,
  filterYear,
  setFilterMonth,
  setFilterYear,
  yearOptions,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springTransition}
      className={`${glassPanel} flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between`}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Time Filter
        </p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-white">
          {monthOptions[filterMonth]?.label} {filterYear}
        </h2>
      </div>

      <div className="flex gap-3">
        <label className="min-w-36">
          <span className="sr-only">Month</span>
          <select
            className={`${premiumInput} w-full px-4 py-3 text-sm`}
            onChange={(event) => setFilterMonth(Number(event.target.value))}
            value={filterMonth}
          >
            {monthOptions.map((month) => (
              <option
                className="bg-[#111] text-white"
                key={month.value}
                value={month.value}
              >
                {month.label}
              </option>
            ))}
          </select>
        </label>

        <label className="w-28">
          <span className="sr-only">Year</span>
          <select
            className={`${premiumInput} w-full px-4 py-3 text-sm`}
            onChange={(event) => setFilterYear(Number(event.target.value))}
            value={filterYear}
          >
            {yearOptions.map((year) => (
              <option className="bg-[#111] text-white" key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
      </div>
    </motion.div>
  );
}
