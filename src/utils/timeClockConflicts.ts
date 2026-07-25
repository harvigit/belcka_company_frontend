import api from "@/utils/axios";
import { AxiosResponse } from "axios";

type ConflictsResponse = {
  IsSuccess: boolean;
  conflicts?: any[];
  total_conflicts?: number;
};

const cache = new Map<string, AxiosResponse<ConflictsResponse>>();
const inflight = new Map<
  string,
  Promise<AxiosResponse<ConflictsResponse>>
>();
const generations = new Map<string, number>();

function buildKey(startDate: string, endDate: string) {
  return `${startDate}|${endDate}`;
}

/**
 * Return only a fully resolved company-wide response.
 * An unresolved in-flight request is intentionally not exposed so Details can
 * fall back to its existing user-scoped request without changing behavior.
 */
export function getCachedCompanyConflicts(
  startDate: string,
  endDate: string,
) {
  return cache.get(buildKey(startDate, endDate)) ?? null;
}

/**
 * Fetch company-wide conflicts with in-flight dedupe and a resolved cache.
 * Callers explicitly invalidate before every refresh; there is no TTL.
 */
export function fetchCompanyConflicts(
  startDate: string,
  endDate: string,
) {
  const key = buildKey(startDate, endDate);
  const generation = generations.get(key) ?? 0;
  const cached = cache.get(key);
  if (cached) return Promise.resolve(cached);

  const pending = inflight.get(key);
  if (pending) return pending;

  const request = api
    .get<ConflictsResponse>("/time-clock/conflicts", {
      params: {
        start_date: startDate,
        end_date: endDate,
      },
    })
    .then((response) => {
      if (
        response.data?.IsSuccess &&
        (generations.get(key) ?? 0) === generation
      ) {
        cache.set(key, response);
      }
      return response;
    })
    .finally(() => {
      if (inflight.get(key) === request) {
        inflight.delete(key);
      }
    });

  inflight.set(key, request);
  return request;
}

/** Invalidate all ranges or one exact range. In-flight requests are deduped. */
export function invalidateTimeClockConflictsCache(
  startDate?: string,
  endDate?: string,
) {
  if (startDate && endDate) {
    const key = buildKey(startDate, endDate);
    cache.delete(key);
    inflight.delete(key);
    generations.set(key, (generations.get(key) ?? 0) + 1);
    return;
  }
  cache.clear();
  for (const key of inflight.keys()) {
    generations.set(key, (generations.get(key) ?? 0) + 1);
  }
  inflight.clear();
}
