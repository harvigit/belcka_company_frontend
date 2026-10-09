"use client";

import { signOut, useSession } from "next-auth/react";
import { useEffect } from "react";
import { clearStoredApiToken, setSignedIn } from "@/lib/apiSession";

let signingOut = false;

async function endRevokedSession() {
  if (signingOut) return;
  signingOut = true;
  setSignedIn(false);
  try {
    await clearStoredApiToken();
    await signOut({ callbackUrl: "/auth" });
  } finally {
    signingOut = false;
  }
}

export function AuthTokenSync() {
  const { data: session } = useSession();

  useEffect(() => {
    const revoked =
      (session as { error?: string } | null)?.error === "SessionRevoked";
    setSignedIn(Boolean(session?.user) && !revoked);

    if (revoked) {
      void endRevokedSession();
    }
  }, [session]);

  return null;
}
