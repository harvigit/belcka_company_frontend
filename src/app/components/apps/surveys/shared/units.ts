"use client";

import { useEffect, useReducer } from "react";
import api from "@/utils/axios";

// Units of measure from Survey settings › Units (loaded once, shared by every screen; refreshed after a change).
export type Unit = { code: string; label: string; aliases: string[]; is_default: boolean };

// Used until the list has loaded (and if it cannot load): the 9 standard units.
const STANDARD: Unit[] = [
  { code: "it", label: "item", aliases: ["item", "items", "each", "ea"], is_default: true },
  { code: "no", label: "no", aliases: ["nr", "number"], is_default: false },
  { code: "sm", label: "m²", aliases: ["m2", "sqm", "sq m", "m^2"], is_default: false },
  { code: "lm", label: "m", aliases: ["m", "metre", "meter", "lin m"], is_default: false },
  { code: "cm", label: "m³", aliases: ["m3", "cu m", "m^3"], is_default: false },
  { code: "hr", label: "hour", aliases: ["hour", "hours", "hrs"], is_default: false },
  { code: "pr", label: "pair", aliases: ["pair", "pairs"], is_default: false },
  { code: "wk", label: "week", aliases: ["week", "weeks"], is_default: false },
  { code: "kg", label: "kg", aliases: ["kilo", "kgs"], is_default: false },
];

let cache: Unit[] | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const key = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

/** Loads (or reloads) the company's units and updates every screen that shows them. */
export function loadUnits(force = false) {
  if (loading && !force) return loading;
  loading = api
    .get("survey-units/options")
    .then((res) => {
      cache = res.data.data as Unit[];
    })
    .catch(() => {
      /* keep the standard units */
    })
    .finally(() => {
      loading = null;
      listeners.forEach((l) => l());
    });
  return loading;
}

const current = () => cache ?? STANDARD;

/** Code of the default unit (new rows start with it). */
export const defaultUnit = () => (current().find((u) => u.is_default) ?? current()[0])?.code ?? "it";

/** "sm" → "m²"; an unknown code is shown as it is. */
export const unitLabel = (code?: string | null) => {
  if (!code) return "–";
  const k = key(code);
  const hit = current().find((u) => key(u.code) === k) ?? current().find((u) => u.aliases.some((a) => key(a) === k)) ?? STANDARD.find((u) => key(u.code) === k);
  return hit ? hit.label : code;
};

/** A unit written as its code, label or another way ("m2", "litres") → its code; "" when it is not in the list. */
export const unitFromText = (text?: string | null) => {
  const t = key(text);
  if (!t) return "";
  const list = current();
  const hit = list.find((u) => key(u.code) === t) ?? list.find((u) => key(u.label) === t) ?? list.find((u) => u.aliases.some((a) => key(a) === t));
  return hit ? hit.code : "";
};

/** The company's units for dropdowns: units, codes, the default code, plus the helpers above. */
export function useUnits() {
  const [, render] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    listeners.add(render);
    if (!cache) loadUnits();
    return () => {
      listeners.delete(render);
    };
  }, []);
  const units = current();
  return { units, codes: units.map((u) => u.code), def: (units.find((u) => u.is_default) ?? units[0])?.code ?? "it", label: unitLabel, fromText: unitFromText };
}
