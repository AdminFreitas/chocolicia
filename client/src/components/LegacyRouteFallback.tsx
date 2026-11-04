const line = "rounded bg-[#5A3428]/10";
const gold = "rounded bg-[#D9A83E]/35";

export default function LegacyRouteFallback() {
  return (
    <div className="min-h-screen bg-[#FFF9F0] text-[#5A3428]" role="status" aria-label="Carregando página" aria-busy="true">
      <header className="bg-[#3A241D] px-4 py-4 md:px-6 md:py-5 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="h-7 w-36 rounded bg-[#FFF9F0]/20" />
          <div className="h-4 w-28 rounded bg-[#FFF9F0]/15" />
        </div>
      </header>
      <main>
        <section className="bg-[#F3E5D0]/50 px-4 py-10 md:px-6 md:py-16 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-4xl">
            <div className={`${gold} mb-4 h-3 w-36`} />
            <div className={`${line} h-12 max-w-3xl md:h-16`} />
            <div className={`${line} mt-5 h-4 max-w-2xl`} />
            <div className={`${line} mt-2 h-4 max-w-xl`} />
            <div className="mt-7 flex flex-wrap gap-3">
              <div className={`${gold} h-12 w-56`} />
              <div className={`${line} h-12 w-40`} />
            </div>
          </div>
        </section>
        <section className="px-4 py-12 md:px-6 md:py-16 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-4xl">
            <div className={`${line} mb-8 h-9 max-w-xl`} />
            <div className="grid gap-4 md:grid-cols-2 md:gap-6 lg:gap-8">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="rounded-2xl border border-[#D9A83E]/20 bg-[#FFF9F0] p-5 md:p-6">
                  <div className={`${line} h-7 max-w-64`} />
                  <div className={`${line} mt-4 h-4 w-full`} />
                  <div className={`${line} mt-2 h-4 w-4/5`} />
                  <div className={`${line} mt-2 h-4 w-2/3`} />
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="bg-[#F3E5D0]/65 px-4 py-12 md:px-6 md:py-16 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-4xl">
            <div className={`${line} mb-8 h-9 max-w-lg`} />
            {[0, 1, 2].map((item) => <div key={item} className={`${line} mb-3 h-14 w-full rounded-xl`} />)}
          </div>
        </section>
      </main>
      <footer className="border-t border-[#FFF9F0]/10 bg-[#3A241D] px-4 py-10 pb-24 text-[#FFF9F0]/70 md:px-6 md:py-12 md:pb-12 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="h-5 w-48 rounded bg-[#FFF9F0]/15" />
            <div className="h-4 w-36 rounded bg-[#FFF9F0]/10" />
          </div>
          <div className="h-4 w-56 rounded bg-[#FFF9F0]/10" />
        </div>
      </footer>
      <div className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-[#25D366]/50 shadow-xl" aria-hidden="true" />
    </div>
  );
}
