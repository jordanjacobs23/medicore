import Link from "next/link";

type DashboardCard = {
  label: string;
  value: string | number;
};

type DashboardAction = {
  href: string;
  label: string;
};

export function StaffDashboard({
  title,
  description,
  cards,
  actions,
}: {
  title: string;
  description: string;
  cards: DashboardCard[];
  actions: DashboardAction[];
}) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl overflow-hidden px-4 pb-12 pt-28 sm:px-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-500">
            MediCore workspace
          </p>
          <h1 className="mt-2 font-montserrat text-4xl font-bold text-dark-100 dark:text-light-900">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">{description}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.label}
            className="rounded-xl border border-border bg-white p-5 shadow-sm dark:bg-card"
          >
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-dark-100 dark:text-light-900">
              {card.value}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
