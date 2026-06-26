import { motion } from 'framer-motion';
import { glassPanel } from '../utils/styles';

export default function EmptyState({ message = 'No financial data for this period.' }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`${glassPanel} flex min-h-[320px] items-center justify-center p-8 text-center`}
    >
      <div>
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[#0a0a0a]/60 text-zinc-500"
        >
          <svg
            aria-hidden="true"
            className="h-7 w-7"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            viewBox="0 0 24 24"
          >
            <path d="M4 19V5" />
            <path d="M4 19h16" />
            <path d="M8 15l3-3 3 2 5-7" />
          </svg>
        </motion.div>
        <p className="mt-5 text-sm font-medium text-zinc-400">{message}</p>
      </div>
    </motion.div>
  );
}
