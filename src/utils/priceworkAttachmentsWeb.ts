import api from "@/utils/axios";

export type PriceworkAttachment = {
  id: number;
  image?: string;
  image_url?: string | null;
  thumb_url?: string | null;
  url?: string;
};

const cache = new Map<string, PriceworkAttachment[]>();
const inflight = new Map<string, Promise<PriceworkAttachment[]>>();

function buildKey(priceworkId: number | string) {
  return String(priceworkId);
}

/** Clear cached attachments after create/update/delete of a pricework. */
export function invalidatePriceworkAttachmentsWebCache(
  priceworkId?: number | string | null,
) {
  if (priceworkId !== undefined && priceworkId !== null && priceworkId !== "") {
    const key = buildKey(priceworkId);
    cache.delete(key);
    inflight.delete(key);
    return;
  }
  cache.clear();
  inflight.clear();
}

/**
 * Fetch pricework attachments for Edit Pricework (web).
 * In-flight dedupe + session cache so reopening the same record skips a network call.
 */
export function fetchPriceworkAttachmentsWeb(
  priceworkId: number | string,
  options?: { force?: boolean },
): Promise<PriceworkAttachment[]> {
  const key = buildKey(priceworkId);

  if (!options?.force) {
    const cached = cache.get(key);
    if (cached) return Promise.resolve(cached);

    const pending = inflight.get(key);
    if (pending) return pending;
  }

  const request = api
    .get("/pricework/attachments-web", {
      params: { pricework_id: String(priceworkId) },
    })
    .then((res) => {
      const attachments = Array.isArray(res.data?.info) ? res.data.info : [];
      cache.set(key, attachments);
      return attachments as PriceworkAttachment[];
    })
    .finally(() => {
      if (inflight.get(key) === request) {
        inflight.delete(key);
      }
    });

  inflight.set(key, request);
  return request;
}
