import api from "@/utils/axios";
import { AxiosResponse } from "axios";

type UserProfileResponse = {
  info?: any;
};

const inflight = new Map<string, Promise<AxiosResponse<UserProfileResponse>>>();

function buildKey(userId: number, companyId: number) {
  return `${userId}|${companyId}`;
}

function isValidId(value: number) {
  return Number.isFinite(value) && value > 0;
}

/**
 * Fetch user profile with in-flight dedupe only (no session cache).
 * Concurrent callers for the same user/company share one network request.
 * Settled requests are not retained — each new wave refetches as before.
 */
export function fetchUserProfile(userId: number, companyId: number) {
  if (!isValidId(userId) || !isValidId(companyId)) {
    return Promise.reject(new Error("Invalid user_id or company_id"));
  }

  const key = buildKey(userId, companyId);
  const pending = inflight.get(key);
  if (pending) return pending;

  const request = api
    .get<UserProfileResponse>(
      `user/profile?user_id=${userId}&company_id=${companyId}`,
    )
    .finally(() => {
      if (inflight.get(key) === request) {
        inflight.delete(key);
      }
    });

  inflight.set(key, request);
  return request;
}
