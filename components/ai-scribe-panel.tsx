"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Sparkles } from "lucide-react";

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export function AiScribePanel({ patientId: initialPatientId }: { patientId?: string }) {
  const [patientId, setPatientId] = useState(initialPatientId ?? "");
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const patientSelect = document.querySelector<HTMLInputElement>('input[name="patientId"][data-patient-search]')
      ?? document.querySelector<HTMLInputElement>('select[name="patientId"]');
    if (!patientSelect) return;

    const updatePatient = () => setPatientId(patientSelect.value);
    updatePatient();
    patientSelect.addEventListener("change", updatePatient);
    return () => patientSelect.removeEventListener("change", updatePatient);
  }, []);

  function toggleListening() {
    setError("");
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const browser = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!Recognition) {
      setError("Live browser transcription is not supported here. Paste or type the transcript manually.");
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-ZA";
    recognition.onresult = (event) => {
      let finalText = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        if (event.results[index].isFinal) finalText += event.results[index][0].transcript;
      }
      if (finalText) setTranscript((current) => `${current}${current ? " " : ""}${finalText.trim()}`);
    };
    recognition.onerror = (event) => setError(`Live transcription stopped: ${event.error}`);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  async function generateDraft() {
    setError("");
    setGenerating(true);
    try {
      const chiefComplaint = (document.querySelector('[name="chiefComplaint"]') as HTMLTextAreaElement | null)?.value ?? "";
      const response = await fetch("/api/scribe/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, transcript, chiefComplaint }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The AI draft could not be generated.");
      const fields: Record<string, string> = {
        subjective: result.draft.subjective,
        objective: result.draft.objective,
        assessment: result.draft.assessment,
        plan: result.draft.plan,
        diagnosis: result.draft.diagnosis,
      };
      Object.entries(fields).forEach(([name, value]) => {
        const field = document.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLTextAreaElement | null;
        if (field) field.value = value;
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The AI draft could not be generated.");
    } finally {
      setGenerating(false);
    }

    if (!patientId) {
      return (
        <fieldset className="rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
          <legend className="px-1 text-sm font-bold text-slate-600 dark:text-slate-300">AI clinical scribe</legend>
          <p className="text-sm text-slate-500">Select a patient to enable the AI clinical scribe.</p>
        </fieldset>
      );
    }
  }

  return (
    <fieldset className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-900 dark:bg-violet-950/20">
      <legend className="px-1 text-sm font-bold text-violet-900 dark:text-violet-200">AI clinical scribe</legend>
      <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">Requires active patient AI-scribe consent. Review every draft before it becomes part of the record.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={toggleListening} className="inline-flex h-10 items-center gap-2 rounded-lg border border-violet-300 bg-white px-3 text-sm font-semibold text-violet-800 dark:border-violet-800 dark:bg-slate-950 dark:text-violet-200">
          {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          {listening ? "Stop transcription" : "Start live transcription"}
        </button>
        <button type="button" disabled={!transcript.trim() || generating} onClick={generateDraft} className="inline-flex h-10 items-center gap-2 rounded-lg bg-violet-700 px-3 text-sm font-semibold text-white disabled:opacity-50">
          <Sparkles className="size-4" />
          {generating ? "Generating draft..." : "Generate SOAP draft"}
        </button>
      </div>
      <label className="mt-3 block text-sm font-semibold text-slate-700 dark:text-slate-200">
        Consultation transcript
        <textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} rows={7} maxLength={20000} className="mt-2 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm font-normal text-slate-800 outline-none dark:border-violet-900 dark:bg-slate-950 dark:text-slate-100" placeholder="Live transcript appears here. You can edit it before generating a draft." />
      </label>
      {error ? <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</p> : null}
    </fieldset>
  );
}
