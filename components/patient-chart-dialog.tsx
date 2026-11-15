"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function PatientChartDialog({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className="flex h-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 px-3 text-xs font-bold text-[#397f99] transition hover:border-[#397f99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#397f99]/40 dark:border-slate-700"
          />
        }
      >
        Add record
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add {title}</DialogTitle>
          <DialogDescription>
            Enter the patient chart details below. Required fields are marked.
          </DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
