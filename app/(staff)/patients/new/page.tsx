import { requirePermission } from "@/lib/authorization/require-permission";
import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";
import { createPatient } from "../actions";

export default async function NewPatientPage() {
  await requirePermission("patient:create");

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-12 pt-28 sm:px-6">
      <Link
        href="/patients"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#397f99]"
      >
        <ArrowLeft className="size-4" />
        Back to patients
      </Link>

      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[#397f99]/10 text-[#397f99]">
              <UserPlus className="size-5" />
            </div>
            <div>
              <h1 className="font-montserrat text-2xl font-bold text-slate-950 dark:text-white">
                Add patient
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Create a patient record in the current practice.
              </p>
            </div>
          </div>
        </div>

        <form action={createPatient} className="space-y-5 p-5 sm:p-7">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              First name
              <input
                required
                name="firstName"
                autoComplete="given-name"
                placeholder="Piet"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal outline-none transition focus:border-[#397f99] focus:ring-2 focus:ring-[#397f99]/15 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Last name
              <input
                required
                name="lastName"
                autoComplete="family-name"
                placeholder="Pompies"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal outline-none transition focus:border-[#397f99] focus:ring-2 focus:ring-[#397f99]/15 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
          </div>

          <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Email address
            <input
              required
              type="email"
              name="email"
              autoComplete="email"
              placeholder="piet@pompies.co.za"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal outline-none transition focus:border-[#397f99] focus:ring-2 focus:ring-[#397f99]/15 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
            <Link
              href="/patients"
              className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-200"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="inline-flex h-10 items-center rounded-lg bg-[#397f99] px-4 text-sm font-semibold text-white transition hover:bg-[#2f718a]"
            >
              Create patient
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
