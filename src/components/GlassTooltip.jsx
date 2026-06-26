export default function GlassTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-[#0a0a0a]/80 px-4 py-3 backdrop-blur-xl shadow-2xl">
      {label && (
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {label}
        </p>
      )}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: entry.color || entry.fill || '#0ea5e9' }}
          />
          <span className="text-xs text-zinc-400">{entry.name}</span>
          <span className="ml-auto font-mono text-sm font-semibold text-white">
            {formatter ? formatter(entry.value) : entry.value?.toLocaleString('en-IN')}
          </span>
        </div>
      ))}
    </div>
  );
}
