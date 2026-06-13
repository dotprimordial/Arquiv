export default function AnimatedLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#F9F9F8] animate-pulse">
      <div className="border-b border-zinc-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="h-6 w-32 bg-zinc-200 rounded" />
          <div className="flex items-center gap-3">
            <div className="h-8 w-24 bg-zinc-200 rounded-full" />
            <div className="h-10 w-10 bg-zinc-200 rounded-full" />
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-6 py-16 space-y-8">
        <div className="h-12 w-96 bg-zinc-200 rounded mx-auto" />
        <div className="h-4 w-64 bg-zinc-200 rounded mx-auto" />
        <div className="flex flex-wrap justify-center gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-12 w-32 bg-zinc-200 rounded-full" />)}
        </div>
        <div className="h-14 bg-zinc-200 rounded-full max-w-2xl mx-auto" />
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white border border-zinc-100 rounded-2xl p-6 space-y-4">
              <div className="h-4 w-24 bg-zinc-200 rounded" />
              <div className="h-6 w-3/4 bg-zinc-200 rounded" />
              <div className="h-4 w-full bg-zinc-200 rounded" />
              <div className="h-4 w-2/3 bg-zinc-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
