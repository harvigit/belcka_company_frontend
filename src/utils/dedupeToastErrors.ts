import toast from "react-hot-toast";

const DEDUPE_WINDOW_MS = 1500;
const PATCH_FLAG = "__belckaToastErrorDedupePatched";
const RECENT_ERRORS_KEY = "__belckaRecentToastErrors";

type RecentToastErrors = Map<string, number>;

const normalizeToastMessage = (message: unknown) => {
  if (typeof message === "string") {
    return message.replace(/\s+/g, " ").trim();
  }

  return String(message ?? "").replace(/\s+/g, " ").trim();
};

export const installToastErrorDedupe = () => {
  if (typeof window === "undefined") return;

  const globalWindow = window as typeof window & {
    [PATCH_FLAG]?: boolean;
    [RECENT_ERRORS_KEY]?: RecentToastErrors;
  };

  if (globalWindow[PATCH_FLAG]) return;

  globalWindow[PATCH_FLAG] = true;
  globalWindow[RECENT_ERRORS_KEY] =
    globalWindow[RECENT_ERRORS_KEY] ?? new Map<string, number>();

  const originalError = toast.error.bind(toast);

  (toast as any).error = (message: unknown, options?: any) => {
    const normalizedMessage = normalizeToastMessage(message);
    const now = Date.now();
    const recentErrors = globalWindow[RECENT_ERRORS_KEY]!;
    const lastShownAt = recentErrors.get(normalizedMessage) ?? 0;

    for (const [key, shownAt] of recentErrors.entries()) {
      if (now - shownAt > DEDUPE_WINDOW_MS) {
        recentErrors.delete(key);
      }
    }

    if (
      normalizedMessage &&
      now - lastShownAt < DEDUPE_WINDOW_MS &&
      !options?.id
    ) {
      return normalizedMessage;
    }

    if (normalizedMessage) {
      recentErrors.set(normalizedMessage, now);
    }

    return originalError(message as any, options);
  };
};
