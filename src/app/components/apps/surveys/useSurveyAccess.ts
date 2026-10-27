"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "@/utils/axios";

export interface SurveyAccess {
  user_id: number | null;
  is_admin: boolean;
  loaded: boolean;
  /** The role could not be confirmed; admin-only actions stay hidden until a reload succeeds. */
  failed: boolean;
}

interface ConfirmedAccess {
  user_id: number | null;
  is_admin: boolean;
}

// Shared by every survey page in this browser session. A company switch or sign-out reloads the
// page, which resets it. Admin-only actions are still enforced by the API.
let confirmed: ConfirmedAccess | null = null;
let confirmedAt = 0;
let inflight: Promise<ConfirmedAccess> | null = null;

const REFRESH_AFTER_MS = 5 * 60 * 1000;
const RETRY_DELAYS_MS = [500, 1500];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function requestAccess(): Promise<ConfirmedAccess> {
  if (!inflight) {
    inflight = (async () => {
      for (let attempt = 0; ; attempt++) {
        try {
          // skipToast: a failure here is reported once by the hook, not per attempt.
          const res = await api.get("surveys/access", { skipToast: true } as any);
          const info = res.data?.info || {};
          confirmed = { user_id: info.user_id ?? null, is_admin: Boolean(info.is_admin) };
          confirmedAt = Date.now();
          return confirmed;
        } catch (err: any) {
          const status = err?.response?.status;
          // 401/403 are definitive answers; only retry transient failures.
          if (status === 401 || status === 403 || attempt >= RETRY_DELAYS_MS.length) throw err;
          await sleep(RETRY_DELAYS_MS[attempt]);
        }
      }
    })().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

/**
 * Caller's role for the Survey module, as enforced by the API. Until the role is confirmed,
 * admin-only actions are hidden. A role confirmed earlier in this session is kept if a refresh fails.
 */
export default function useSurveyAccess(): SurveyAccess {
  const [access, setAccess] = useState<SurveyAccess>(() =>
    confirmed
      ? { ...confirmed, loaded: true, failed: false }
      : { user_id: null, is_admin: false, loaded: false, failed: false },
  );

  useEffect(() => {
    if (confirmed && Date.now() - confirmedAt < REFRESH_AFTER_MS) return;

    let active = true;
    requestAccess()
      .then((value) => {
        if (active) setAccess({ ...value, loaded: true, failed: false });
      })
      .catch(() => {
        if (!active || confirmed) return;
        setAccess({ user_id: null, is_admin: false, loaded: true, failed: true });
        toast.error("Couldn't verify your survey permissions. Refresh the page to try again.", {
          id: "survey-access-failed",
        });
      });
    return () => {
      active = false;
    };
  }, []);

  return access;
}
