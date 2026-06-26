export default function GradientOrbs({ scrollY = 0 }) {
  const offset = scrollY * 0.05;
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute top-0 left-0 w-96 h-96 bg-cyan-900/20 blur-[120px] rounded-full"
        style={{ transform: `translate(${offset * 0.3}px, ${offset}px)` }}
      />
      <div
        className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-900/20 blur-[120px] rounded-full"
        style={{ transform: `translate(${-offset * 0.3}px, ${-offset}px)` }}
      />
    </div>
  );
}
