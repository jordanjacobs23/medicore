import {
  Activity,
  AlertTriangle,
  Dna,
  HeartPulse,
  Microscope,
  Pill,
  ShieldPlus,
  Syringe,
} from "lucide-react";
import type {
  FamilyHistory,
  Immunization,
  LabResult,
  MedicationStatement,
  PatientAllergy,
  PatientCondition,
  PatientMedicalAid,
  VitalSign,
} from "@prisma/client";
import {
  AllergySeverity,
  AllergyStatus,
  ImmunizationStatus,
  LabResultStatus,
  MedicationStatus,
  PatientConditionStatus,
  VitalSignKind,
} from "@prisma/client";
import type { ReactNode } from "react";
import { PatientChartDialog } from "@/components/patient-chart-dialog";
import {
  createFamilyHistory,
  createImmunization,
  createLabResult,
  createMedicationStatement,
  createPatientAllergy,
  createPatientCondition,
  createPatientMedicalAid,
  createVitalSign,
  updateLabResultRelease,
  switchPatientMedicalAid,
} from "@/app/(staff)/patients/chart-actions";

type Props = {
  patientId: string;
  showMedicalAid: boolean;
  showClinicalRecords: boolean;
  canManageMedicalAid: boolean;
  canAddClinicalRecords: boolean;
  canAddVitals: boolean;
  medicalAids: PatientMedicalAid[];
  conditions: PatientCondition[];
  allergies: PatientAllergy[];
  medicationHistory: MedicationStatement[];
  immunizations: Immunization[];
  familyHistory: FamilyHistory[];
  labResults: LabResult[];
  vitalSigns: VitalSign[];
};

const inputClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#397f99] focus:ring-2 focus:ring-[#397f99]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white";
const textareaClass =
  "min-h-20 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#397f99] focus:ring-2 focus:ring-[#397f99]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

const formatDate = (date: Date | null | undefined) =>
  date
    ? new Intl.DateTimeFormat("en", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date)
    : "—";

const formatDateTime = (date: Date | null | undefined) =>
  date
    ? new Intl.DateTimeFormat("en", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date)
    : "—";

const readable = (value: string) =>
  value.toLowerCase().replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block space-y-1.5 text-xs font-semibold text-slate-500 ${className}`}>
      {label}
      {children}
    </label>
  );
}

function InputField({
  label,
  name,
  type = "text",
  required = false,
  step,
  min,
  max,
  placeholder,
}: {
  label: string;
  name: string;
  type?: "text" | "date" | "datetime-local" | "number";
  required?: boolean;
  step?: string;
  min?: string;
  max?: string;
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <input
        className={inputClass}
        name={name}
        type={type}
        required={required}
        step={step}
        min={min}
        max={max}
        placeholder={placeholder}
      />
    </Field>
  );
}

function SelectField({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: readonly string[];
  defaultValue?: string;
}) {
  return (
    <Field label={label}>
      <select className={inputClass} name={name} defaultValue={defaultValue ?? options[0]}>
        {options.map((option) => (
          <option key={option} value={option}>
            {readable(option)}
          </option>
        ))}
      </select>
    </Field>
  );
}

function NotesField() {
  return (
    <Field label="Notes" className="sm:col-span-2">
      <textarea className={textareaClass} name="notes" rows={2} />
    </Field>
  );
}

function SubmitButton({ children = "Add record" }: { children?: string }) {
  return (
    <button
      type="submit"
      className="inline-flex h-9 items-center justify-center rounded-lg bg-[#397f99] px-3 text-xs font-bold text-white transition hover:bg-[#2f718a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#397f99]/40"
    >
      {children}
    </button>
  );
}

function AddRecord({ title, children }: { title: string; children: ReactNode }) {
  return (
    <PatientChartDialog title={title}>{children}</PatientChartDialog>
  );
}

function ChartSection({
  title,
  count,
  icon: Icon,
  addForm,
  children,
  className = "",
}: {
  title: string;
  count: number;
  icon: typeof Activity;
  addForm?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={`min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3.5 dark:border-slate-800 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <Icon aria-hidden="true" className="size-4 shrink-0 text-[#397f99]" />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-slate-900 dark:text-white">{title}</h2>
            <p className="text-[11px] text-slate-400">{count} {count === 1 ? "record" : "records"}</p>
          </div>
        </div>
        {addForm}
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800/80">{children}</div>
    </article>
  );
}

function EmptyRecords({ text }: { text: string }) {
  return <p className="px-5 py-8 text-center text-sm text-slate-400">{text}</p>;
}

function TrendCard({
  kind,
  unit,
  records,
}: {
  kind: VitalSignKind;
  unit: string;
  records: VitalSign[];
}) {
  const points = [...records]
    .sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime())
    .slice(-12);
  const isBloodPressure = kind === VitalSignKind.BLOOD_PRESSURE;
  const values = points.flatMap((point) =>
    isBloodPressure
      ? [point.systolic?.toNumber(), point.diastolic?.toNumber()].filter(
          (value): value is number => value !== undefined,
        )
      : point.value === null
        ? []
        : [point.value.toNumber()],
  );
  if (values.length === 0) return null;

  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const span = maximum - minimum || Math.max(Math.abs(maximum) * 0.1, 1);
  const lower = minimum - span * 0.1;
  const upper = maximum + span * 0.1;
  const x = (index: number) => (points.length < 2 ? 160 : 14 + (index * 292) / (points.length - 1));
  const y = (value: number) => 60 - ((value - lower) / (upper - lower)) * 48;
  const line = (series: (number | undefined)[]) =>
    series
      .map((value, index) => (value === undefined ? null : `${x(index)},${y(value)}`))
      .filter((value): value is string => value !== null)
      .join(" ");
  const systolicSeries = points.map((point) => point.systolic?.toNumber());
  const diastolicSeries = points.map((point) => point.diastolic?.toNumber());
  const valueSeries = points.map((point) => point.value?.toNumber());
  const latest = points.at(-1)!;
  const latestValue = isBloodPressure
    ? `${latest.systolic?.toString() ?? "—"}/${latest.diastolic?.toString() ?? "—"}`
    : latest.value?.toString() ?? "—";

  return (
    <div className="rounded-lg border border-slate-100 p-3 dark:border-slate-800">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {readable(kind)}{unit ? ` · ${unit}` : ""}
          </h3>
          <p className="mt-1 text-lg font-bold tabular-nums text-slate-950 dark:text-white">
            {latestValue}{unit && !isBloodPressure ? ` ${unit}` : ""}
          </p>
        </div>
        <p className="text-right text-[10px] text-slate-400">Latest<br />{formatDate(latest.measuredAt)}</p>
      </div>
      <svg
        className="mt-2 h-20 w-full overflow-visible"
        viewBox="0 0 320 76"
        role="img"
        aria-label={`${readable(kind)} trend with ${points.length} measurements`}
      >
        {[18, 38, 58].map((lineY) => (
          <line key={lineY} x1="12" x2="308" y1={lineY} y2={lineY} stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeDasharray="3 4" />
        ))}
        {isBloodPressure ? (
          <>
            <polyline points={line(systolicSeries)} fill="none" stroke="#397f99" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points={line(diastolicSeries)} fill="none" stroke="#8c69b1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ) : (
          <polyline points={line(valueSeries)} fill="none" stroke="#397f99" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
      <div className="flex items-center justify-between text-[10px] text-slate-400">
        <span>{formatDate(points[0].measuredAt)}</span>
        {isBloodPressure && (
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1"><i className="size-1.5 rounded-full bg-[#397f99]" />Systolic</span>
            <span className="flex items-center gap-1"><i className="size-1.5 rounded-full bg-[#8c69b1]" />Diastolic</span>
          </span>
        )}
        <span>{formatDate(points.at(-1)!.measuredAt)}</span>
      </div>
    </div>
  );
}

function VitalTrends({ vitalSigns, canAddVitals, patientId }: { vitalSigns: VitalSign[]; canAddVitals: boolean; patientId: string }) {
  const groups = new Map<string, VitalSign[]>();
  for (const vital of vitalSigns) {
    const key = `${vital.kind}:${vital.unit ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), vital]);
  }

  const kindOptions = Object.values(VitalSignKind);
  const addForm = canAddVitals ? (
    <AddRecord title="vital measurement">
      <form action={createVitalSign.bind(null, patientId)} className="grid gap-3 sm:grid-cols-2">
        <SelectField label="Vital sign" name="kind" options={kindOptions} />
        <InputField label="Measurement" name="value" type="number" step="any" />
        <InputField label="Systolic pressure" name="systolic" type="number" step="any" />
        <InputField label="Diastolic pressure" name="diastolic" type="number" step="any" />
        <InputField label="Unit" name="unit" placeholder="e.g. kg, cm, mmHg" />
        <InputField label="Measured at" name="measuredAt" type="datetime-local" />
        <InputField label="Method" name="method" />
        <InputField label="Body site" name="bodySite" />
        <NotesField />
        <div className="sm:col-span-2">
          <p className="mb-3 text-[11px] text-slate-400">Use measurement for single values. Blood pressure uses systolic and diastolic.</p>
          <SubmitButton>Add measurement</SubmitButton>
        </div>
      </form>
    </AddRecord>
  ) : null;

  return (
    <ChartSection title="Longitudinal vital trends" count={vitalSigns.length} icon={HeartPulse} addForm={addForm} className="lg:col-span-3">
      {vitalSigns.length === 0 ? (
        <EmptyRecords text="No vital measurements recorded yet." />
      ) : (
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {[...groups.entries()].map(([key, records]) => {
            const [kind, unit] = key.split(":");
            return <TrendCard key={key} kind={kind as VitalSignKind} unit={unit} records={records} />;
          })}
        </div>
      )}
    </ChartSection>
  );
}

export function PatientChart({
  patientId,
  showMedicalAid,
  showClinicalRecords,
  canManageMedicalAid,
  canAddClinicalRecords,
  canAddVitals,
  medicalAids,
  conditions,
  allergies,
  medicationHistory,
  immunizations,
  familyHistory,
  labResults,
  vitalSigns,
}: Props) {
  const medicalAidForm = canManageMedicalAid ? (
    <AddRecord title="medical-aid details">
      <form action={createPatientMedicalAid.bind(null, patientId)} className="grid gap-3 sm:grid-cols-2">
        <InputField label="Medical-aid scheme" name="schemeName" required />
        <InputField label="Scheme code" name="schemeCode" />
        <InputField label="Plan" name="planName" />
        <InputField label="Membership number" name="membershipNumber" required />
        <InputField label="Dependant code" name="dependantCode" />
        <InputField label="Principal member" name="principalMemberName" />
        <InputField label="Relationship to principal" name="relationshipToPrincipal" />
        <InputField label="Pre-authorization number" name="preAuthorizationNumber" />
        <InputField label="Valid from" name="validFrom" type="date" />
        <InputField label="Valid through" name="validThrough" type="date" />
        <p className="self-end pb-3 text-xs font-normal text-slate-500">
          New cover is saved as not primary. Use “Make primary” after saving to switch cover.
        </p>
        <NotesField />
        <div className="sm:col-span-2"><SubmitButton>Add cover</SubmitButton></div>
      </form>
    </AddRecord>
  ) : null;

  const conditionForm = canAddClinicalRecords ? (
    <AddRecord title="condition">
      <form action={createPatientCondition.bind(null, patientId)} className="grid gap-3 sm:grid-cols-2">
        <InputField label="Condition" name="name" required />
        <SelectField label="Status" name="status" options={Object.values(PatientConditionStatus)} defaultValue={PatientConditionStatus.ACTIVE} />
        <InputField label="Code system" name="codeSystem" placeholder="e.g. ICD-10" />
        <InputField label="Code" name="code" />
        <InputField label="Onset date" name="onsetDate" type="date" />
        <InputField label="Resolved date" name="resolvedDate" type="date" />
        <NotesField />
        <div className="sm:col-span-2"><SubmitButton>Add condition</SubmitButton></div>
      </form>
    </AddRecord>
  ) : null;

  const allergyForm = canAddClinicalRecords ? (
    <AddRecord title="allergy">
      <form action={createPatientAllergy.bind(null, patientId)} className="grid gap-3 sm:grid-cols-2">
        <InputField label="Allergen or substance" name="substance" required />
        <InputField label="Reaction" name="reaction" />
        <SelectField label="Severity" name="severity" options={Object.values(AllergySeverity)} defaultValue={AllergySeverity.UNKNOWN} />
        <SelectField label="Status" name="status" options={Object.values(AllergyStatus)} defaultValue={AllergyStatus.ACTIVE} />
        <InputField label="Onset date" name="onsetDate" type="date" />
        <NotesField />
        <div className="sm:col-span-2"><SubmitButton>Add allergy</SubmitButton></div>
      </form>
    </AddRecord>
  ) : null;

  const medicationForm = canAddClinicalRecords ? (
    <AddRecord title="medication">
      <form action={createMedicationStatement.bind(null, patientId)} className="grid gap-3 sm:grid-cols-2">
        <InputField label="Medication" name="medication" required />
        <InputField label="Strength" name="strength" />
        <InputField label="Dose" name="dosage" />
        <InputField label="Route" name="route" />
        <InputField label="Frequency" name="frequency" />
        <SelectField label="Status" name="status" options={Object.values(MedicationStatus)} defaultValue={MedicationStatus.ACTIVE} />
        <InputField label="Started" name="startedAt" type="date" />
        <InputField label="Ended" name="endedAt" type="date" />
        <InputField label="Source" name="source" placeholder="e.g. patient reported" />
        <InputField label="Instructions" name="instructions" />
        <NotesField />
        <div className="sm:col-span-2"><SubmitButton>Add medication</SubmitButton></div>
      </form>
    </AddRecord>
  ) : null;

  const immunizationForm = canAddClinicalRecords ? (
    <AddRecord title="immunization">
      <form action={createImmunization.bind(null, patientId)} className="grid gap-3 sm:grid-cols-2">
        <InputField label="Vaccine" name="vaccine" required />
        <InputField label="Product" name="productName" />
        <InputField label="Manufacturer" name="manufacturer" />
        <InputField label="Lot number" name="lotNumber" />
        <InputField label="Dose number" name="doseNumber" />
        <SelectField label="Status" name="status" options={Object.values(ImmunizationStatus)} defaultValue={ImmunizationStatus.COMPLETED} />
        <InputField label="Route" name="route" />
        <InputField label="Site" name="site" />
        <InputField label="Administered at" name="administeredAt" type="datetime-local" />
        <InputField label="Next due" name="nextDueAt" type="date" />
        <NotesField />
        <div className="sm:col-span-2"><SubmitButton>Add immunization</SubmitButton></div>
      </form>
    </AddRecord>
  ) : null;

  const familyHistoryForm = canAddClinicalRecords ? (
    <AddRecord title="family history">
      <form action={createFamilyHistory.bind(null, patientId)} className="grid gap-3 sm:grid-cols-2">
        <InputField label="Family relationship" name="relationship" required placeholder="e.g. mother, sibling" />
        <InputField label="Condition" name="condition" required />
        <InputField label="Age at onset" name="ageAtOnset" type="number" min="0" max="130" step="1" />
        <InputField label="Code system" name="codeSystem" />
        <InputField label="Code" name="code" />
        <NotesField />
        <div className="sm:col-span-2"><SubmitButton>Add family history</SubmitButton></div>
      </form>
    </AddRecord>
  ) : null;

  const labForm = canAddClinicalRecords ? (
    <AddRecord title="lab result">
      <form action={createLabResult.bind(null, patientId)} className="grid gap-3 sm:grid-cols-2">
        <InputField label="Test" name="testName" required />
        <InputField label="Result" name="resultValue" required />
        <InputField label="Numeric result" name="numericValue" type="number" step="any" />
        <InputField label="Unit" name="unit" />
        <SelectField label="Status" name="status" options={Object.values(LabResultStatus)} defaultValue={LabResultStatus.FINAL} />
        <InputField label="Reference range" name="referenceRange" />
        <InputField label="Interpretation" name="interpretation" />
        <InputField label="Collected at" name="collectedAt" type="datetime-local" />
        <InputField label="Resulted at" name="resultAt" type="datetime-local" />
        <InputField label="Code system" name="codeSystem" />
        <InputField label="Code" name="code" />
        <NotesField />
        <div className="sm:col-span-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <label className="flex items-start gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <input type="checkbox" name="releaseToPatient" className="mt-0.5 size-4 accent-[#397f99]" />
            <span>Release this result to the patient portal after saving. Only final, amended, or corrected results are eligible.</span>
          </label>
        </div>
        <div className="sm:col-span-2"><SubmitButton>Add lab result</SubmitButton></div>
      </form>
    </AddRecord>
  ) : null;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-montserrat text-lg font-bold text-slate-950 dark:text-white">Patient chart</h2>
        <p className="mt-1 text-sm text-slate-500">Longitudinal health records and patient-reported history.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {showMedicalAid && (
          <ChartSection title="Medical-aid details" count={medicalAids.length} icon={ShieldPlus} addForm={medicalAidForm}>
            <p className="px-4 pt-4 text-xs text-slate-500 sm:px-5">
              Switching primary cover keeps earlier cover records and does not change existing claims.
            </p>
            {medicalAids.length === 0 ? <EmptyRecords text="No medical-aid cover recorded yet." /> : medicalAids.map((record) => (
              <div key={record.id} className="px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{record.schemeName}{record.planName ? ` · ${record.planName}` : ""}</p>
                    {record.schemeCode && <p className="mt-1 text-xs text-slate-500">Scheme code {record.schemeCode}</p>}
                    <p className="mt-1 text-xs text-slate-500">Membership {record.membershipNumber}{record.dependantCode ? ` · Dependant ${record.dependantCode}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${record.isPrimary ? "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300" : "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300"}`}>
                      {record.isPrimary ? "Primary" : "Not primary"}
                    </span>
                    {canManageMedicalAid && !record.isPrimary && (
                      <form action={switchPatientMedicalAid.bind(null, patientId, record.id)}>
                        <button type="submit" className="text-xs font-semibold text-[#397f99] hover:underline">
                          Make primary
                        </button>
                      </form>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">{record.principalMemberName ?? "Principal member not recorded"}{record.relationshipToPrincipal ? ` · ${record.relationshipToPrincipal}` : ""}</p>
                <p className="mt-1 text-xs text-slate-400">Cover {formatDate(record.validFrom)} to {formatDate(record.validThrough)}{record.preAuthorizationNumber ? ` · Pre-auth ${record.preAuthorizationNumber}` : ""}</p>
                {record.notes && <p className="mt-2 text-xs text-slate-500">{record.notes}</p>}
              </div>
            ))}
          </ChartSection>
        )}

        {showClinicalRecords && (
          <>
            <ChartSection title="Conditions" count={conditions.length} icon={Activity} addForm={conditionForm}>
              {conditions.length === 0 ? <EmptyRecords text="No conditions recorded yet." /> : conditions.map((record) => (
                <div key={record.id} className="flex items-start justify-between gap-3 px-4 py-4 sm:px-5">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{record.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{record.codeSystem && record.code ? `${record.codeSystem} ${record.code} · ` : ""}Onset {formatDate(record.onsetDate)}{record.resolvedDate ? ` · Resolved ${formatDate(record.resolvedDate)}` : ""}</p>
                    {record.notes && <p className="mt-2 text-xs text-slate-500">{record.notes}</p>}
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">{readable(record.status)}</span>
                </div>
              ))}
            </ChartSection>

            <ChartSection title="Allergies" count={allergies.length} icon={AlertTriangle} addForm={allergyForm}>
              {allergies.length === 0 ? <EmptyRecords text="No allergies recorded yet." /> : allergies.map((record) => (
                <div key={record.id} className="flex items-start justify-between gap-3 px-4 py-4 sm:px-5">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{record.substance}</p>
                    <p className="mt-1 text-xs text-slate-500">{record.reaction || "Reaction not recorded"} · {readable(record.severity)}</p>
                    {record.notes && <p className="mt-2 text-xs text-slate-500">{record.notes}</p>}
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">{readable(record.status)}</span>
                </div>
              ))}
            </ChartSection>

            <ChartSection title="Medication history" count={medicationHistory.length} icon={Pill} addForm={medicationForm}>
              {medicationHistory.length === 0 ? <EmptyRecords text="No medication history recorded yet." /> : medicationHistory.map((record) => (
                <div key={record.id} className="px-4 py-4 sm:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{record.medication}{record.strength ? ` · ${record.strength}` : ""}</p>
                      <p className="mt-1 text-xs text-slate-500">{[record.dosage, record.route, record.frequency].filter(Boolean).join(" · ") || "Dose details not recorded"}</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-bold text-slate-400">{readable(record.status)}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{formatDate(record.startedAt)} to {formatDate(record.endedAt)}{record.source ? ` · ${record.source}` : ""}</p>
                  {record.instructions && <p className="mt-2 text-xs text-slate-500">{record.instructions}</p>}
                  {record.notes && <p className="mt-1 text-xs text-slate-500">{record.notes}</p>}
                </div>
              ))}
            </ChartSection>

            <ChartSection title="Immunizations" count={immunizations.length} icon={Syringe} addForm={immunizationForm}>
              {immunizations.length === 0 ? <EmptyRecords text="No immunizations recorded yet." /> : immunizations.map((record) => (
                <div key={record.id} className="px-4 py-4 sm:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{record.vaccine}{record.doseNumber ? ` · Dose ${record.doseNumber}` : ""}</p>
                      <p className="mt-1 text-xs text-slate-500">{record.productName || record.manufacturer || "Product details not recorded"}{record.route ? ` · ${record.route}` : ""}{record.site ? ` · ${record.site}` : ""}</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-bold text-slate-400">{readable(record.status)}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">Given {formatDate(record.administeredAt)}{record.nextDueAt ? ` · Next due ${formatDate(record.nextDueAt)}` : ""}{record.lotNumber ? ` · Lot ${record.lotNumber}` : ""}</p>
                  {record.notes && <p className="mt-2 text-xs text-slate-500">{record.notes}</p>}
                </div>
              ))}
            </ChartSection>

            <ChartSection title="Family history" count={familyHistory.length} icon={Dna} addForm={familyHistoryForm}>
              {familyHistory.length === 0 ? <EmptyRecords text="No family history recorded yet." /> : familyHistory.map((record) => (
                <div key={record.id} className="px-4 py-4 sm:px-5">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{record.condition}</p>
                  <p className="mt-1 text-xs text-slate-500">{record.relationship}{record.ageAtOnset !== null ? ` · Onset at age ${record.ageAtOnset}` : ""}{record.codeSystem && record.code ? ` · ${record.codeSystem} ${record.code}` : ""}</p>
                  {record.notes && <p className="mt-2 text-xs text-slate-500">{record.notes}</p>}
                </div>
              ))}
            </ChartSection>

            <ChartSection title="Lab results" count={labResults.length} icon={Microscope} addForm={labForm}>
              {labResults.length === 0 ? <EmptyRecords text="No lab results recorded yet." /> : labResults.map((record) => (
                <div key={record.id} className="px-4 py-4 sm:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{record.testName}</p>
                      <p className="mt-1 text-sm font-bold tabular-nums text-slate-900 dark:text-white">{record.resultValue}{record.unit ? ` ${record.unit}` : ""}</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-bold text-slate-400">{readable(record.status)}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{record.codeSystem && record.code ? `${record.codeSystem} ${record.code} · ` : ""}{formatDateTime(record.resultAt)}{record.referenceRange ? ` · Reference ${record.referenceRange}` : ""}</p>
                  {record.interpretation && <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{record.interpretation}</p>}
                  {record.notes && <p className="mt-1 text-xs text-slate-500">{record.notes}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <p className="text-[11px] font-semibold text-slate-500">{record.releasedAt ? `Released to portal ${formatDateTime(record.releasedAt)}` : "Not released to portal"}</p>
                    {canAddClinicalRecords && (record.status === LabResultStatus.FINAL || record.status === LabResultStatus.AMENDED || record.status === LabResultStatus.CORRECTED) ? <form action={updateLabResultRelease.bind(null, patientId, record.id)}><input type="hidden" name="released" value={record.releasedAt ? "no" : "yes"} /><button type="submit" className="text-xs font-semibold text-[#397f99] hover:underline">{record.releasedAt ? "Remove from portal" : "Release to portal"}</button></form> : null}
                  </div>
                </div>
              ))}
            </ChartSection>

            <VitalTrends vitalSigns={vitalSigns} canAddVitals={canAddVitals} patientId={patientId} />
          </>
        )}
      </div>
    </section>
  );
}
