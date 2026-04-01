export default function Loading() {
  return (
    <div className="section-shell py-20">
      <div className="glass-panel p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-40 rounded-full bg-black/[0.06]" />
          <div className="h-12 max-w-2xl rounded-2xl bg-black/[0.06]" />
          <div className="h-32 rounded-[28px] bg-black/[0.03]" />
        </div>
      </div>
    </div>
  );
}
