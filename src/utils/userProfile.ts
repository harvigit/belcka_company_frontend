import api from "@/utils/axios";
import { AxiosResponse } from "axios";

type UserProfileResponse = {
  info?: any;
};

const cache = new Map<string, AxiosResponse<UserProfileResponse>>();
const inflight = new Map<string, Promise<AxiosResponse<UserProfileResponse>>>();

function buildKey(userId: number, companyId: number) {
  return `${userId}|${companyId}`;
}

function isValidId(value: number) {
  return Number.isFinite(value) && value > 0;
}

/** Clear cached profile (call after trade/profile mutations that affect gate checks). */
export function invalidateUserProfileCache(
  userId?: number,
  companyId?: number,
) {
  if (userId !== undefined && companyId !== undefined) {
    const key = buildKey(userId, companyId);
    cache.delete(key);
    inflight.delete(key);
    return;
  }
  cache.clear();
  inflight.clear();
}

/**
 * Fetch user profile with in-flight dedupe + session cache.
 * Concurrent and sequential PermissionGuard mounts share one network response
 * until invalidated.
 */
export function fetchUserProfile(userId: number, companyId: number) {
  if (!isValidId(userId) || !isValidId(companyId)) {
    return Promise.reject(new Error("Invalid user_id or company_id"));
  }

  const key = buildKey(userId, companyId);

  const cached = cache.get(key);
  if (cached) return Promise.resolve(cached);

  const pending = inflight.get(key);
  if (pending) return pending;

  const request = api
    .get<UserProfileResponse>(
      `user/profile?user_id=${userId}&company_id=${companyId}`,
    )
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
