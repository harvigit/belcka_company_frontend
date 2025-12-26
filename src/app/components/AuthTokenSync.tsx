"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { setAccessToken } from "@/lib/authToken";

export function AuthTokenSync() {
  const { data: session } = useSession();

  useEffect(() => {
    setAccessToken((session as any)?.accessToken ?? null);
  }, [session]);

  return null;
}
