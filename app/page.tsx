import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  CalendarDays,
  Check,
  ClipboardPlus,
  CreditCard,
  FileText,
  HeartPulse,
  MessageSquare,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

const features = [
  {
    number: "01",
    icon: CalendarDays,
    title: "Appointments that stay organised",
    description:
      "See the day at a glance, schedule visits, and keep appointment details close to the patient record.",
    tone: "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
  },
  {
    number: "02",
    icon: HeartPulse,
    title: "A clearer clinical picture",
    description:
      "Bring encounters, diagnoses, prescriptions, and observations together in one clinical workspace.",
    tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  },
  {
    number: "03",
    icon: CreditCard,
    title: "Billing with fewer loose ends",
    description:
      "Create invoices, record payments, follow outstanding balances, and manage medical-aid claims.",
    tone: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  },
  {
    number: "04",
    icon: MessageSquare,
    title: "Patients kept in the conversation",
    description:
      "Give patients a portal for appointment bookings, practice messages, invoices, and shared documents.",
    tone: "bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
  },
];

const capabilities = [
  "Patient records and care history",
  "Appointments and practitioner schedules",
  "Clinical encounters and prescriptions",
  "Invoices, payments, and claims",
  "Secure patient-practice messaging",
  "Practice staff and role permissions",
];

export default function Home() {
  return (
    <main className="overflow-hidden bg-white text-slate-950 dark:bg-[#0b121a] dark:text-white">
      <section className="relative isolate min-h-[690px] overflow-hidden bg-[#071827] pt-28 text-white sm:min-h-[760px] sm:pt-32">
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_75%_30%,rgba(34,211,238,0.25),transparent_32%),radial-gradient(ellipse_at_88%_78%,rgba(30,144,255,0.2),transparent_35%),linear-gradient(120deg,#06111f_0%,#0b2537_52%,#12384a_100%)]" />
        <div className="absolute -right-36 top-32 -z-10 size-[560px] rounded-full border border-white/10 sm:right-[4%] sm:top-24 sm:size-[650px]" />
        <div className="absolute right-[12%] top-48 -z-10 hidden size-[430px] rounded-full border border-white/10 lg:block" />
        <div className="absolute right-[23%] top-[43%] -z-10 hidden size-3 rounded-full bg-cyan-300 shadow-[0_0_36px_12px_rgba(103,232,249,0.4)] lg:block" />

        <div className="mx-auto grid w-full max-w-[1280px] items-center gap-12 px-6 pb-20 sm:px-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-8 lg:pb-28">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-100/20 bg-white/5 px-4 py-2 text-sm font-medium text-cyan-100 backdrop-blur">
              <span className="size-2 rounded-full bg-cyan-300" />
              The connected workspace for modern care
            </div>
            <h1 className="mt-7 font-montserrat text-5xl leading-[1.02] font-bold tracking-tight sm:text-6xl lg:text-[72px]">
              More time for care.
              <span className="mt-2 block text-cyan-300">Less time chasing details.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300 sm:text-xl">
              MediCore brings appointments, patient records, clinical work, and practice administration into one straightforward platform.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/sign-in"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-cyan-300 px-7 font-semibold text-[#062031] transition hover:-translate-y-0.5 hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071827]"
              >
                Sign in to MediCore <ArrowRight className="size-4" />
              </Link>
              <Link
                href="#features"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/25 px-7 font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Explore the platform <ArrowDown className="size-4" />
              </Link>
            </div>
            <p className="mt-5 text-sm text-slate-400">
              For healthcare teams and the patients they care for.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-[500px] lg:ml-auto">
            <div className="absolute -inset-8 rounded-[40px] bg-cyan-300/10 blur-3xl" />
            <div className="relative rounded-[28px] border border-white/15 bg-[#10283a]/90 p-4 shadow-2xl shadow-black/30 backdrop-blur sm:p-5">
              <div className="flex items-center justify-between border-b border-white/10 px-2 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-300/15 text-cyan-200">
                    <HeartPulse className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Practice overview</p>
                    <p className="mt-0.5 text-xs text-slate-400">A connected day at a glance</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-200">Today</span>
              </div>

              <div className="grid grid-cols-2 gap-3 py-4">
                {[
                  { icon: CalendarDays, label: "Appointments", value: "Your schedule" },
                  { icon: UsersRound, label: "Patients", value: "Care history" },
                  { icon: ClipboardPlus, label: "Clinical", value: "Patient notes" },
                  { icon: CreditCard, label: "Billing", value: "Invoices & claims" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                    <Icon className="size-5 text-cyan-200" />
                    <p className="mt-4 text-sm font-semibold">{label}</p>
                    <p className="mt-1 text-xs text-slate-400">{value}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-cyan-300 px-4 py-3.5 text-[#062031]">
                <div className="flex size-9 items-center justify-center rounded-full bg-white/55">
                  <Check className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">One place for the moving parts</p>
                  <p className="mt-0.5 text-xs text-[#164457]">Designed around day-to-day practice work</p>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-5 hidden items-center gap-3 rounded-2xl border border-white/10 bg-[#163247] px-4 py-3 shadow-xl sm:flex">
              <div className="flex size-9 items-center justify-center rounded-full bg-emerald-300/15 text-emerald-200"><ShieldCheck className="size-5" /></div>
              <div><p className="text-xs font-semibold">Role-aware access</p><p className="mt-0.5 text-[11px] text-slate-400">Built into the workspace</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50 py-7 dark:border-white/10 dark:bg-[#0e1922]">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-center gap-x-8 gap-y-3 px-6 text-sm font-medium text-slate-600 dark:text-slate-300 sm:justify-between sm:px-12">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Connected practice essentials</span>
          <span className="flex items-center gap-2"><CalendarDays className="size-4 text-[#397f99]" />Appointments</span>
          <span className="flex items-center gap-2"><HeartPulse className="size-4 text-[#397f99]" />Clinical records</span>
          <span className="flex items-center gap-2"><CreditCard className="size-4 text-[#397f99]" />Billing</span>
          <span className="flex items-center gap-2"><UsersRound className="size-4 text-[#397f99]" />Patient portal</span>
        </div>
      </section>

      <section id="features" className="scroll-mt-24 px-6 py-24 sm:px-12 sm:py-28">
        <div className="mx-auto max-w-[1280px]">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#397f99]">One connected platform</p>
            <h2 className="mt-4 font-montserrat text-3xl leading-tight font-bold sm:text-5xl">The tools your practice uses, working together.</h2>
            <p className="mt-5 text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
              Move through the day with less switching between systems. MediCore connects the administrative work with the patient information that gives it context.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {features.map(({ number, icon: Icon, title, description, tone }) => (
              <article key={number} className="group rounded-2xl border border-slate-200 bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-[#397f99]/40 hover:shadow-xl hover:shadow-slate-900/5 dark:border-white/10 dark:bg-white/[0.035] dark:hover:shadow-black/20">
                <div className="flex items-center justify-between">
                  <span className={`flex size-12 items-center justify-center rounded-2xl ${tone}`}><Icon className="size-5" /></span>
                  <span className="font-mono text-xs text-slate-400">{number}</span>
                </div>
                <h3 className="mt-7 text-lg font-bold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f3f7f8] px-6 py-20 dark:bg-[#101d27] sm:px-12 sm:py-24">
        <div className="mx-auto grid max-w-[1280px] gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#397f99]">Made for the whole practice</p>
            <h2 className="mt-4 font-montserrat text-3xl leading-tight font-bold sm:text-4xl">Everyone gets a clearer way to do their part.</h2>
            <p className="mt-5 max-w-xl leading-7 text-slate-600 dark:text-slate-300">
              From the front desk to the clinical team, role-based workspaces keep the right tools close at hand. Patients have their own place to stay connected with the practice.
            </p>
            <Link href="/sign-in" className="mt-7 inline-flex items-center gap-2 font-semibold text-[#276b85] transition hover:gap-3 dark:text-cyan-300">
              Continue to your workspace <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {capabilities.map((capability) => (
              <div key={capability} className="flex min-h-[76px] items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-4 dark:border-white/10 dark:bg-white/[0.035]">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"><Check className="size-4" /></span>
                <span className="text-sm font-semibold leading-5">{capability}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 sm:px-12 sm:py-24">
        <div className="relative mx-auto max-w-[1280px] overflow-hidden rounded-[28px] bg-[#09263a] px-6 py-12 text-white sm:px-12 sm:py-14">
          <div className="absolute -right-20 -top-36 size-96 rounded-full border border-white/10" />
          <div className="absolute -right-4 -top-20 size-64 rounded-full border border-white/10" />
          <div className="relative flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-sm font-semibold text-cyan-200"><FileText className="size-4" />A more connected day starts here</div>
              <h2 className="mt-4 font-montserrat text-3xl leading-tight font-bold sm:text-4xl">Bring your practice into one view.</h2>
              <p className="mt-3 max-w-xl leading-7 text-slate-300">Sign in to continue to your MediCore workspace or patient portal.</p>
            </div>
            <Link href="/sign-in" className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-cyan-300 px-6 font-semibold text-[#062031] transition hover:bg-cyan-200">
              Get started <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 px-6 py-7 dark:border-white/10 sm:px-12">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between dark:text-slate-400">
          <span className="font-montserrat font-bold text-slate-700 dark:text-slate-200">Medi<span className="text-[#397f99]">Core</span></span>
          <span>Connected care, built around your patients.</span>
          <Link href="/sign-in" className="font-semibold text-[#397f99] hover:underline">Sign in</Link>
        </div>
      </footer>
    </main>
  );
}
