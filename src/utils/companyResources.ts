import api from "@/utils/axios";
import { AxiosResponse } from "axios";

/** In-flight dedupe for identical get-company-resources GETs (same URL). */
const inflight = new Map<string, Promise<AxiosResponse<any>>>();

/**
 * Short-lived response cache. Needed because layout (header) and page often
 * request the same URL sequentially — in-flight dedupe alone misses that case.
 */
const responseCache = new Map<string, AxiosResponse<any>>();

function buildUrl(
  flags: string | string[],
  companyId?: number | string | null,
) {
  const flag = Array.isArray(flags) ? flags.join(",") : flags;
  let url = `get-company-resources?flag=${flag}`;
  if (companyId !== undefined && companyId !== null && companyId !== "") {
    url += `&company_id=${companyId}`;
  }
  return url;
}

/** Drop cached entries (all, or only those for a company). */
export function invalidateCompanyResourcesCache(
  companyId?: number | string | null,
) {
  if (companyId === undefined || companyId === null || companyId === "") {
    responseCache.clear();
    return;
  }
  const suffix = `company_id=${companyId}`;
  for (const key of responseCache.keys()) {
    if (key.includes(suffix)) responseCache.delete(key);
  }
}

/**
 * Fetch company resource flags in one request.
 * Concurrent and sequential callers with the same URL share one network request.
 */
export function fetchCompanyResources(
  flags: string | string[],
  companyId?: number | string | null,
) {
  const url = buildUrl(flags, companyId);

  const cached = responseCache.get(url);
  if (cached) return Promise.resolve(cached);

  const existing = inflight.get(url);
  if (existing) return existing;

  const request = api
    .get(url)
    .then((res) => {
      responseCache.set(url, res);
      return res;
    })
    .finally(() => {
      inflight.delete(url);
    });

  inflight.set(url, request);
  return request;
}
