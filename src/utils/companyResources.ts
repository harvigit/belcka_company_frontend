import api from "@/utils/axios";
import { AxiosResponse } from "axios";

/** In-flight dedupe for identical get-company-resources GETs (same URL). */
const inflight = new Map<string, Promise<AxiosResponse<any>>>();

/**
 * Fetch company resource flags in one request.
 * Concurrent callers with the same URL share a single network request.
 */
export function fetchCompanyResources(
  flags: string | string[],
  companyId?: number | string | null,
) {
  const flag = Array.isArray(flags) ? flags.join(",") : flags;
  let url = `get-company-resources?flag=${flag}`;
  if (companyId !== undefined && companyId !== null && companyId !== "") {
    url += `&company_id=${companyId}`;
  }

  const existing = inflight.get(url);
  if (existing) return existing;

  const request = api.get(url).finally(() => {
    inflight.delete(url);
  });
  inflight.set(url, request);
  return request;
}
