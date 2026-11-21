"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";

export function ProfileSavedToast({ show }: { show: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!show) return;
    toast.add({
      id: "patient-profile-saved",
      title: "Profile saved",
      description: "Your profile and preferences have been updated.",
      type: "success",
    });
    router.replace("/portal/profile", { scroll: false });
  }, [router, show]);

  return null;
}
