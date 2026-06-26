import { motion } from 'framer-motion';
import { glassPanel, springTransition } from '../utils/styles';
import AnimatedOdometer from './AnimatedOdometer';

export default function StatPill({ label, value, danger = false, isCurrency = true }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springTransition}
      className={`${glassPanel} p-5`}
    >
      <div className="text-sm font-medium text-zinc-400">{label}</div>
      <div
        className={`mt-3 text-3xl font-semibold tabular-nums tracking-tight ${
          danger ? 'text-red-400' : 'text-white'
        }`}
      >
        {isCurrency ? <AnimatedOdometer value={value} /> : value}
      </div>
    </motion.section>
  );
}
