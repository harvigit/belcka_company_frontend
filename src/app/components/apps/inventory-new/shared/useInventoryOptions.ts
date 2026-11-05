"use client";
import { useCallback, useEffect, useState } from "react";
import api from "@/utils/axios";

export interface InventoryOption {
  id: number;
  name: string;
}

export interface InternalItemOption extends InventoryOption {
  code: string;
  status?: boolean;
  is_sub_qty: boolean;
  issue_pack_qty?: number | null;
  issue_pack_unit_name?: string | null;
  unit_name: string | null;
  // supplier items linked to it
  supplier_items_count?: number;
}

export interface InventoryOptions {
  suppliers: (InventoryOption & { default_lead_time_days?: number | null })[];
  stores: InventoryOption[];
  units: InventoryOption[];
  categories: InventoryOption[];
  internal_items: InternalItemOption[];
  projects: InventoryOption[];
  users: InventoryOption[];
}

const EMPTY: InventoryOptions = {
  suppliers: [],
  stores: [],
  units: [],
  categories: [],
  internal_items: [],
  projects: [],
  users: [],
};

// Dropdown data shared by the Inventory New forms, loaded in one call.
export function useInventoryOptions(companyId?: number | null) {
  const [options, setOptions] = useState<InventoryOptions>(EMPTY);
  const [isAdmin, setIsAdmin] = useState(false);

  const reload = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await api.get(
        `inventory-new/options?company_id=${companyId}`,
      );
      setOptions({ ...EMPTY, ...(res.data?.info ?? {}) });
      setIsAdmin(!!res.data?.is_admin);
    } catch (err) {
      console.error("Failed to fetch inventory options", err);
    }
  }, [companyId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { options, isAdmin, reload };
}

export const money = (value: number | null | undefined) =>
  value === null || value === undefined ? "-" : `£${Number(value).toFixed(2)}`;

export const qty = (value: number | null | undefined) =>
  value === null || value === undefined
    ? "-"
    : Number(value).toLocaleString("en-GB", { maximumFractionDigits: 2 });
