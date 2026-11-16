"use client";
import { useEffect, useMemo, useRef } from "react";
import Cookies from "js-cookie";
import { useSession } from "next-auth/react";
import { InventoryOptions } from "./useInventoryOptions";

// The store activated on the Stores page (cookie user_store_<userId>_<companyId>), when it is one of the
// company's stores in the Inventory New options. null when none is active, so the store is picked manually.
export function useActiveStoreId(options: InventoryOptions): number | null {
  const session = useSession();
  const user = session.data?.user as { id?: number; company_id?: number | null } | undefined;

  const cookieId = useMemo(() => {
    if (!user?.id || !user?.company_id) return null;
    const raw = Cookies.get(`user_store_${user.id}_${user.company_id}`);
    if (!raw) return null;
    try {
      const id = Number(JSON.parse(raw)?.id);
      return id > 0 ? id : null;
    } catch {
      return null;
    }
  }, [user?.id, user?.company_id]);

  return cookieId && options.stores.some((s) => s.id === cookieId) ? cookieId : null;
}

// Starts a list's store filter on the active store, once; the user can still change or clear it.
export function useDefaultStoreFilter<T extends { store_id: string }>(
  activeStoreId: number | null,
  setFilters: React.Dispatch<React.SetStateAction<T>>,
) {
  const applied = useRef(false);
  useEffect(() => {
    if (applied.current || !activeStoreId) return;
    applied.current = true;
    setFilters((prev) => (prev.store_id ? prev : { ...prev, store_id: String(activeStoreId) }));
  }, [activeStoreId, setFilters]);
}
