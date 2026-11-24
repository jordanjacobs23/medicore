"use client";

import { useEffect, useRef, useState } from "react";

type PatientOption = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
};

export function PatientSearchSelect({
  patients,
  defaultPatientId = "",
  required = false,
  inputClass,
}: {
  patients: PatientOption[];
  defaultPatientId?: string;
  required?: boolean;
  inputClass: string;
}) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(defaultPatientId);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizedQuery = query.trim().toLowerCase();
  const matches = patients.filter((patient) => {
    const dob = patient.dateOfBirth ?? "";
    return `${patient.firstName} ${patient.lastName} ${dob}`
      .toLowerCase()
      .includes(normalizedQuery);
  }).slice(0, 25);

  useEffect(() => {
    if (!selectedId) {
      setQuery("");
      return;
    }
    const patient = patients.find((item) => item.id === selectedId);
    if (patient) {
      setQuery(`${patient.firstName} ${patient.lastName}`);
    }
  }, [patients, selectedId]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  function selectPatient(patient: PatientOption) {
    setSelectedId(patient.id);
    setQuery(`${patient.firstName} ${patient.lastName}`);
    setOpen(false);

    const hidden = document.querySelector<HTMLInputElement>('input[name="patientId"][data-patient-search]');
    if (hidden) {
      hidden.value = patient.id;
      hidden.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name="patientId" value={selectedId} data-patient-search required={required} />
      <input
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls="patient-search-results"
        aria-autocomplete="list"
        autoComplete="off"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          if (!event.target.value) {
            setSelectedId("");
            const hidden = document.querySelector<HTMLInputElement>('input[name="patientId"][data-patient-search]');
            if (hidden) {
              hidden.value = "";
              hidden.dispatchEvent(new Event("change", { bubbles: true }));
            }
          }
        }}
        placeholder="Search by patient name or DOB"
        className={inputClass}
      />
      {open ? (
        <div
          id="patient-search-results"
          role="listbox"
          className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-950"
        >
          {matches.length ? matches.map((patient) => (
            <button
              key={patient.id}
              type="button"
              role="option"
              aria-selected={selectedId === patient.id}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectPatient(patient)}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-slate-900 ${selectedId === patient.id ? "bg-[#397f99]/10" : ""}`}
            >
              <span className="font-semibold text-slate-900 dark:text-white">
                {patient.firstName} {patient.lastName}
              </span>
              <span className="ml-3 text-xs text-slate-500">
                {patient.dateOfBirth
                  ? `DOB ${patient.dateOfBirth}`
                  : "DOB not recorded"}
              </span>
            </button>
          )) : (
            <p className="px-3 py-3 text-sm text-slate-500">No matching patients</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
