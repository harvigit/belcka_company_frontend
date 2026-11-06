"use client";
import { useEffect, useRef, useState } from "react";
import api from "@/utils/axios";

export function useItemUuid(
  kind: "internal" | "supplier",
  open: boolean,
  companyId: number | null | undefined,
  itemId: number | undefined,
  uuid: string,
  setUuid: (uuid: string) => void,
) {
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const generated = useRef<string | null>(null);

  useEffect(() => {
    generated.current = null;
    setError(null);
    if (!open || !companyId || itemId) return;
    let cancelled = false;
    api
      .get(`inventory-new/items/uuid?company_id=${companyId}&kind=${kind}`)
      .then((res) => {
        const next = res.data?.info?.next;
        if (cancelled || !next) return;
        generated.current = next;
        setUuid(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, companyId, itemId, kind]);

  useEffect(() => {
    const value = uuid.trim();
    if (!open || !companyId || !value || value === generated.current) {
      setError(null);
      setChecking(false);
      return;
    }
    setChecking(true);
    const timer = setTimeout(() => {
      api
        .get(
          `inventory-new/items/uuid?company_id=${companyId}&kind=${kind}&uuid=${encodeURIComponent(value)}${itemId ? `&id=${itemId}` : ""}`,
        )
        .then((res) => {
          const info = res.data?.info;
          setError(info?.available === false ? info.reason ?? "UUID is already used!" : null);
        })
        .catch(() => setError(null))
        .finally(() => setChecking(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [uuid, open, companyId, itemId, kind]);

  return { uuidError: error, uuidChecking: checking };
}

export const cleanUuidInput = (value: string) => value.replace(/[^A-Za-z0-9._-]/g, "");
