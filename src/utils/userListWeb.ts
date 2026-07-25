import api from "@/utils/axios";
import { AxiosResponse } from "axios";

const URL = "user/list-web";

const cache = new Map<string, AxiosResponse<any>>();
const inflight = new Map<string, Promise<AxiosResponse<any>>>();

function buildKey(companyId?: number | string | null) {
  return String(companyId ?? "default");
}

/** Clear cached user picker list (call after user mutations / when fresh data is required). */
export function invalidateUserListWebCache(companyId?: number | string | null) {
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
 * Fetch slim web user picker list with in-flight dedupe + session cache.
 * Concurrent and sequential callers (Add Leave / Expense / Worklog / Pricework)
 * share one network response until invalidated.
 */
export function fetchUserListWeb(
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

  const request = api
    .get(URL)
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
