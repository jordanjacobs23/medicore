import Link from "next/link";
import { ArrowRight, CalendarDays, ShieldCheck } from "lucide-react";

const Home = () => {
  return (
    <main>
      <section className="sticky top-0 flex min-h-svh items-center overflow-hidden bg-[#081a33] pt-20 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_36%,rgba(56,189,248,0.32),transparent_25%),radial-gradient(circle_at_78%_70%,rgba(30,144,255,0.3),transparent_32%),linear-gradient(115deg,#071326_0%,#102d4f_48%,#1e4e72_100%)]" />
        <div className="absolute inset-y-0 right-[-12%] hidden w-[62%] rounded-[50%] border border-white/10 bg-white/3 lg:block" />
        <div className="absolute right-[9%] top-[22%] hidden size-[330px] rounded-full border border-white/15 lg:block" />
        <div className="absolute right-[13%] top-[32%] hidden size-[220px] rounded-full border border-white/20 lg:block" />
        <div className="absolute right-[19%] top-[24%] hidden size-3 rounded-full bg-cyan-300 shadow-[0_0_40px_12px_rgba(103,232,249,0.35)] lg:block" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#071326]/95 via-[#071326]/70 to-transparent" />

        <div className="relative mx-auto w-full max-w-[1280px] px-6 sm:px-12">
          <div className="max-w-[690px]">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm text-blue-100 backdrop-blur-sm">
              <ShieldCheck className="size-4 text-cyan-300" />
              Connected care, built around your patients
            </div>

            <h1 className="font-montserrat text-5xl leading-[0.98] font-bold tracking-tight sm:text-6xl lg:text-[78px]">
              Healthcare that feels
              <span className="block text-cyan-300">simpler.</span>
            </h1>

            <p className="mt-7 max-w-[610px] text-lg leading-8 text-slate-200 sm:text-xl">
              MediCore brings appointments, clinical records, telehealth, and patient communication together in one secure platform.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/book-appointment"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-7 font-semibold text-[#081a33] transition-transform hover:-translate-y-0.5"
              >
                <CalendarDays className="size-5" />
                Book an appointment
              </Link>
              <Link
                href="/solutions"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/45 px-7 font-semibold text-white transition-colors hover:bg-white/10"
              >
                Explore solutions
                <ArrowRight className="size-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 min-h-[120vh] bg-light-850 px-6 py-24 text-dark-100 dark:bg-dark-100 dark:text-light-900 sm:px-12">
        <div className="mx-auto max-w-[1280px]">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-500">One connected platform</p>
          <h2 className="mt-4 max-w-3xl font-montserrat text-4xl font-bold sm:text-5xl">
            Better care starts with less complexity.
          </h2>
        </div>
      </section>
    </main>
  );
};

export default Home;
