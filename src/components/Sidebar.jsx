import { motion } from 'framer-motion';
import { glassPanel, primaryButton, fastTapTransition, springTransition } from '../utils/styles';

export default function Sidebar({
  activeTab,
  onOpenTransaction,
  setActiveTab,
  isSidebarOpen,
}) {
  const tabs = ['Overview', 'Ledger', 'Analytics'];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-64 flex h-screen shrink-0 flex-col bg-black/40 backdrop-blur-xl border-r border-white/5 p-4 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out`}
    >
      <div className="px-2 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
          Finance OS
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
          Daily Money
        </h1>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        transition={fastTapTransition}
        className={`${primaryButton} mt-6 w-full px-4 py-3`}
        onClick={onOpenTransaction}
        type="button"
      >
        Log Expense
      </motion.button>

      <div className="mt-6 space-y-1">
        <nav className="space-y-1">
          {tabs.map((tab) => (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className={`relative w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition-all duration-300 ${
                activeTab === tab
                  ? 'text-white'
                  : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-200'
              }`}
              key={tab}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="sidebar-tab-indicator"
                  className="absolute inset-0 rounded-xl bg-white/5"
                  transition={springTransition}
                />
              )}
              <span className="relative z-10">{tab}</span>
            </motion.button>
          ))}
        </nav>
      </div>

      <div className={`${glassPanel} mt-auto p-4 space-y-1`}>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className={`relative w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition-all duration-300 ${
            activeTab === 'Trash' ? 'text-white' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-200'
          }`}
          onClick={() => setActiveTab('Trash')}
          type="button"
        >
          {activeTab === 'Trash' && (
            <motion.div
              layoutId="sidebar-tab-indicator"
              className="absolute inset-0 rounded-xl bg-white/5"
              transition={springTransition}
            />
          )}
          <span className="relative z-10">Trash Bin</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className={`relative w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition-all duration-300 ${
            activeTab === 'Settings' ? 'text-white' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-200'
          }`}
          onClick={() => setActiveTab('Settings')}
          type="button"
        >
          {activeTab === 'Settings' && (
            <motion.div
              layoutId="sidebar-tab-indicator"
              className="absolute inset-0 rounded-xl bg-white/5"
              transition={springTransition}
            />
          )}
          <span className="relative z-10">Settings</span>
        </motion.button>
      </div>
    </aside>
  );
}
