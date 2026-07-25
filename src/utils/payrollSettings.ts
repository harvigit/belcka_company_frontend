import api from "@/utils/axios";
import { AxiosResponse } from "axios";

const URL = "/setting/get-payroll-settings";

/** In-flight dedupe for concurrent get-payroll-settings callers. */
let inflight: Promise<AxiosResponse<any>> | null = null;

/** Session response cache shared by Timesheet list, Details, and Settings. */
let cached: AxiosResponse<any> | null = null;

/** Clear cached payroll settings (call after save / when fresh data is required). */
export function invalidatePayrollSettingsCache() {
  cached = null;
}

/**
 * Fetch payroll settings with in-flight dedupe + session cache.
 * Concurrent and sequential callers share one network response until invalidated.
 */
export function fetchPayrollSettings(options?: { force?: boolean }) {
  if (!options?.force && cached) {
    return Promise.resolve(cached);
  }

  if (!options?.force && inflight) {
    return inflight;
  }

  const request = api
    .get(URL)
    .then((res) => {
      cached = res;
      return res;
    })
    .finally(() => {
      if (inflight === request) {
        inflight = null;
      }
    });

  inflight = request;
  return request;
}
