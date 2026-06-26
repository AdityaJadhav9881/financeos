import { memo } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { CHART_COLORS, formatCurrency, staggerContainer, staggerItem } from '../utils/styles';
import GlassTooltip from './GlassTooltip';

const CategoryPieChart = memo(function CategoryPieChart({ data = [], emptyText = 'No expense data yet.' }) {
  const total = data.reduce((sum, item) => sum + (item.value || 0), 0);

  if (!total) {
    return (
      <div className="flex h-60 items-center justify-center text-sm font-medium text-zinc-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_240px] lg:items-center">
      <div style={{ height: '360px', minHeight: '360px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={false}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<GlassTooltip formatter={(v) => formatCurrency(v)} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="space-y-3"
      >
        {data.map((item, index) => (
          <motion.div
            variants={staggerItem}
            className="flex items-center justify-between gap-3"
            key={item.name}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
              />
              <span className="truncate text-sm font-medium text-zinc-200">
                {item.name}
              </span>
            </div>
            <span className="font-mono text-sm font-semibold text-zinc-400">
              {formatCurrency(item.value)}
            </span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
});

export default CategoryPieChart;
