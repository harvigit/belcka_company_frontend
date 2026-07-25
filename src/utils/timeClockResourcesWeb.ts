import api from "@/utils/axios";
import { AxiosResponse } from "axios";

const URL = "/time-clock/resources-web";

const cache = new Map<string, AxiosResponse<any>>();
const inflight = new Map<string, Promise<AxiosResponse<any>>>();

function buildKey(companyId?: number | string | null) {
  return String(companyId ?? "default");
}

/** Clear cached shifts/projects (call after shift/project mutations / when fresh data is required). */
export function invalidateTimeClockResourcesWebCache(
  companyId?: number | string | null,
) {
  if (companyId !== undefined && companyId !== null) {
    const key = buildKey(companyId);
    cache.delete(key);
    inflight.delete(key);
    return;
  }
  cache.clear();
  inflight.clear();
}

/**
 * Fetch slim time-clock resources (shifts + projects) with in-flight dedupe + session cache.
 * Concurrent and sequential callers (Details modal, Add Worklog) share one network
 * response per company until invalidated.
 */
export function fetchTimeClockResourcesWeb(
  companyId?: number | string | null,
  options?: { force?: boolean },
) {
  const key = buildKey(companyId);

  if (!options?.force) {
    const cached = cache.get(key);
    if (cached) return Promise.resolve(cached);

    const pending = inflight.get(key);
    if (pending) return pending;
  }

  const params: Record<string, string> = {};
  if (companyId !== undefined && companyId !== null && companyId !== "") {
    params.company_id = String(companyId);
  }

  const request = api
    .get(URL, { params })
    .then((res) => {
      cache.set(key, res);
      return res;
    })
    .finally(() => {
      if (inflight.get(key) === request) {
        inflight.delete(key);
      }
    });

  inflight.set(key, request);
  return request;
}
