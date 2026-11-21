import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { updatePatientProfile } from "./actions";
import { ProfileSavedToast } from "./profile-saved-toast";

const inputClass = "mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#397f99] focus:ring-2 focus:ring-[#397f99]/15 dark:border-slate-700 dark:bg-slate-950";

function ProfileField({ label, name, value, type = "text" }: { label: string; name: string; value: string | null; type?: "text" | "tel" }) {
  return (
    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
      {label}
      <input id={name} className={inputClass} name={name} type={type} defaultValue={value ?? ""} />
    </label>
  );
}

export default async function PatientProfilePage({ searchParams }: { searchParams: Promise<{ updated?: string }> }) {
  const session = await getSessionContext();
  if (!session || session.userType !== "PATIENT") return null;
  const [{ updated }, patient, consents] = await Promise.all([
    searchParams,
    prisma.patient.findFirst({
      where: { id: session.userId, practiceId: session.practiceId },
      select: {
        firstName: true, lastName: true, email: true, dateOfBirth: true,
        preferredName: true, phone: true, alternatePhone: true, addressLine1: true,
        addressLine2: true, suburb: true, city: true, province: true, postalCode: true,
        country: true, preferredLanguage: true, emergencyContactName: true,
        emergencyContactRelationship: true, emergencyContactPhone: true, smsRemindersEnabled: true,
      },
    }),
    prisma.patientConsent.findMany({
      where: { practiceId: session.practiceId, patientId: session.userId },
      orderBy: { acceptedAt: "desc" },
      select: { noticeVersion: true, acceptedAt: true },
    }),
  ]);
  if (!patient) return null;

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 pb-12 pt-10 sm:px-6">
      <Link href="/portal" className="mt-15 inline-flex items-center gap-2 text-sm font-semibold text-[#397f99]"><ArrowLeft className="size-4" />Back to portal</Link>
      <div className="mt-4">
        <h1 className="font-montserrat text-3xl font-bold text-slate-950 dark:text-white">Profile and Consent</h1>
        <p className="mt-2 text-sm text-slate-500">Keep your contact and emergency details current, and manage optional SMS reminders.</p>
      </div>
      <ProfileSavedToast show={updated === "1"} />

      <form action={updatePatientProfile} className="mt-6 space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 sm:p-6">
          <h2 className="font-bold text-slate-950 dark:text-white">Account details</h2>
          <p className="mt-1 text-sm text-slate-500">For changes to your legal name, email, or date of birth, send a correction request to your practice.</p>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <div><dt className="text-xs font-semibold text-slate-500">Name on Account</dt><dd className="mt-1 text-sm font-medium">{patient.firstName} {patient.lastName}</dd></div>
            <div><dt className="text-xs font-semibold text-slate-500">Email</dt><dd className="mt-1 break-all text-sm font-medium">{patient.email}</dd></div>
            <div><dt className="text-xs font-semibold text-slate-500">Date of Birth</dt><dd className="mt-1 text-sm font-medium">{patient.dateOfBirth?.toLocaleDateString("en-ZA") ?? "Not recorded"}</dd></div>
          </dl>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 sm:p-6">
          <h2 className="font-bold text-slate-950 dark:text-white">Contact and Address</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <ProfileField label="Preferred name" name="preferredName" value={patient.preferredName} />
            <ProfileField label="Mobile phone" name="phone" value={patient.phone} type="tel" />
            <ProfileField label="Alternate phone" name="alternatePhone" value={patient.alternatePhone} type="tel" />
            <ProfileField label="Preferred language" name="preferredLanguage" value={patient.preferredLanguage} />
            <ProfileField label="Address line 1" name="addressLine1" value={patient.addressLine1} />
            <ProfileField label="Address line 2" name="addressLine2" value={patient.addressLine2} />
            <ProfileField label="Suburb" name="suburb" value={patient.suburb} />
            <ProfileField label="City or town" name="city" value={patient.city} />
            <ProfileField label="Province" name="province" value={patient.province} />
            <ProfileField label="Postal code" name="postalCode" value={patient.postalCode} />
            <ProfileField label="Country" name="country" value={patient.country} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 sm:p-6">
          <h2 className="font-bold text-slate-950 dark:text-white">Emergency Contact</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <ProfileField label="Name" name="emergencyContactName" value={patient.emergencyContactName} />
            <ProfileField label="Relationship" name="emergencyContactRelationship" value={patient.emergencyContactRelationship} />
            <ProfileField label="Phone" name="emergencyContactPhone" value={patient.emergencyContactPhone} type="tel" />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 sm:p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#397f99]" />
            <div>
              <h2 className="font-bold text-slate-950 dark:text-white">Optional SMS appointment reminders</h2>
              <p className="mt-1 text-sm text-slate-500">You can withdraw this preference at any time. Turning it off cancels pending reminders.</p>
              <label className="mt-4 flex items-start gap-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                <input className="mt-0.5 size-4 accent-[#397f99]" type="checkbox" name="smsRemindersEnabled" defaultChecked={patient.smsRemindersEnabled} />
                <span>I agree to receive appointment reminders by SMS at the mobile number above.</span>
              </label>
            </div>
          </div>
          {consents.length > 0 ? <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Privacy notice history</p><ul className="mt-2 space-y-1">{consents.map((consent) => <li key={consent.noticeVersion} className="text-sm text-slate-600 dark:text-slate-300">Notice {consent.noticeVersion} acknowledged {consent.acceptedAt.toLocaleDateString("en-ZA")}</li>)}</ul></div> : null}
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/portal/privacy" className="text-sm font-semibold text-[#397f99] hover:underline">Privacy requests and records export</Link>
          <button type="submit" className="inline-flex h-11 items-center justify-center rounded-lg bg-[#397f99] px-5 text-sm font-bold text-white">Save</button>
        </div>
      </form>
    </main>
  );
}
