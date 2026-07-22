export default function Loading() {
  return (
    <main className="min-h-screen animate-pulse bg-black px-3 py-4 text-white sm:px-5 sm:py-6">
      <div className="mx-auto max-w-6xl space-y-5">
        {/* hero card skeleton */}
        <div className="overflow-hidden rounded-[28px] bg-[#1b1b1b]">
          <div className="h-40 bg-gradient-to-r from-[#8CA6DB] to-[#B993D6] opacity-40" />
          <div className="flex gap-6 px-6 py-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-4 w-20 rounded bg-white/10" />
            ))}
          </div>
        </div>
        {/* content card skeleton */}
        <div className="space-y-3 rounded-[28px] bg-[#1b1b1b] p-5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="size-9 shrink-0 rounded-full bg-white/10" />
              <div className="h-4 flex-1 rounded bg-white/10" />
              <div className="h-4 w-10 rounded bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
