"use client";

import { useClerk } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const ACTIVITY_EVENTS = ["mousedown", "keydown", "pointerdown", "scroll", "touchstart"] as const;

export function SessionTimeout() {
  const { signOut } = useClerk();
  const lastActivity = useRef(0);

  useEffect(() => {
    lastActivity.current = Date.now();
    const recordActivity = () => {
      lastActivity.current = Date.now();
    };

    const checkTimeout = window.setInterval(() => {
      if (Date.now() - lastActivity.current >= IDLE_TIMEOUT_MS) {
        void signOut({ redirectUrl: "/sign-in?reason=timeout" });
      }
    }, 30_000);

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, recordActivity, { passive: true });
    }

    return () => {
      window.clearInterval(checkTimeout);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, recordActivity);
      }
    };
  }, [signOut]);

  return null;
}
