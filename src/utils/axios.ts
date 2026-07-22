// axios.ts
import { getAccessToken } from "@/lib/authToken";
import axios from "axios";
import { User } from "next-auth";
import { getSession, signOut } from "next-auth/react";
import toast from "react-hot-toast";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

let isLoggingOut = false;
let lastSwitchTime = 0;
let isSyncing = false;
let lastKnownCompanyId: number | null = null;

const userLogout = async () => {
  if (isLoggingOut) return;

  isLoggingOut = true;

  // toast.error("You are not part of this company!");

  await signOut({
    callbackUrl: "/auth",
  });

  isLoggingOut = false;
};

api.interceptors.request.use(
  (config) => {
    if (config.url?.includes("company/switch-company")) {
      lastSwitchTime = Date.now();
    }

    if (config.headers?.["x-skip-auth"]) {
      delete config.headers["x-skip-auth"];
      return config;
    }

    const token = getAccessToken();

    if (token) {
      config.headers = config.headers || {};
      config.headers.authorization = `Bearer ${token}`;
      config.headers.is_web = "true";
    }

    if (typeof window !== 'undefined' && (window as any).__isSelectingAll && config.method?.toLowerCase() === 'get') {
      if (config.url && (config.url.includes('limit=') || config.url.includes('page='))) {
        // Strip out limit and page parameters when fetching all IDs
        config.url = config.url.replace(/([?&])limit=\d+/g, '');
        config.url = config.url.replace(/([?&])page=\d+/g, '');
        
        config.url += (config.url.includes('?') ? '&' : '?') + 'return_ids_only=true';
        
        // Clean up any malformed query strings
        config.url = config.url.replace(/\?&/g, '?').replace(/&&/g, '&').replace(/[?&]$/, '');
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  async (response) => {
    if (response.config.url?.includes('return_ids_only=true')) {
      let idsData = response.data.info?.data || response.data.info || response.data.data || response.data;
      if (Array.isArray(idsData) && idsData.length > 0 && typeof idsData[0] === 'object') {
         if (idsData[0].team_id !== undefined) {
           idsData = idsData.map((x: any) => x.team_id);
         } else if (idsData[0].id !== undefined) {
           idsData = idsData.map((x: any) => x.id); // fallback if interceptor failed
         }
      }
      (window as any).__lastFetchedIds = idsData;
      return Promise.reject(new Error('SELECT_ALL_INTERCEPT'));
    }

    try {
      const activeCompanyId =
        response?.data?.context?.active_company_id ??
        response?.data?.active_company_id ??
        response?.headers?.["active-company-id"] ??
        response?.headers?.["x-active-company-id"];

      if (activeCompanyId !== undefined && activeCompanyId !== null) {
        const numericActiveId = Number(activeCompanyId);
        const isSwitchingURL =
          response.config.url?.includes("company/switch-company") ||
          response.config.url?.includes("user/switch-company-list");

        const now = Date.now();
        const isRecentSwitch = now - lastSwitchTime < 5000;
        const hasToken = !!getAccessToken();

        if (numericActiveId === 0) {
          if (!isSwitchingURL && !isRecentSwitch && hasToken) {
            await userLogout();
            return response;
          }
        } else if (hasToken) {
          // Detect switch from last known ID
          if (
            lastKnownCompanyId !== null &&
            numericActiveId !== lastKnownCompanyId
          ) {
            console.log(
              "[Axios] Company switch detected:",
              lastKnownCompanyId,
              "=>",
              numericActiveId,
            );
            window.location.reload();
          }
          lastKnownCompanyId = numericActiveId;
        }
      }
    } catch (err) {
      console.error("Company check error:", err);
    }

    return response;
  },

  async (error) => {
    const isSwitchingURL =
      error.config?.url?.includes("company/switch-company") ||
      error.config?.url?.includes("user/switch-company-list");

    const now = Date.now();
    const isRecentSwitch = now - lastSwitchTime < 5000;
    const hasToken = !!getAccessToken();

    const activeCompanyId =
      error.response?.data?.context?.active_company_id ??
      error.response?.data?.active_company_id ??
      error.response?.headers?.["active-company-id"] ??
      error.response?.headers?.["x-active-company-id"];

    if (activeCompanyId !== undefined && activeCompanyId !== null) {
      const numericActiveId = Number(activeCompanyId);

      if (numericActiveId === 0) {
        if (!isSwitchingURL && !isRecentSwitch && hasToken) {
          await userLogout();
        }
      } else if (hasToken) {
        const session = await getSession();
        const user = session?.user as any;
        const currentCompanyId = user?.company_id;

        if (numericActiveId > 0) {
          if (
            lastKnownCompanyId !== null &&
            numericActiveId !== lastKnownCompanyId
          ) {
            console.log(
              "[Axios] Company switch detected in error:",
              lastKnownCompanyId,
              "=>",
              numericActiveId,
            );
            window.location.reload();
          }
          lastKnownCompanyId = numericActiveId;
        }
      }
    }

    if (error.response?.status === 401) {
      if (!isLoggingOut && !isSwitchingURL && !isRecentSwitch) {
        await userLogout();
      }

      return Promise.reject(error);
    }

    if (error.config?.skipToast) {
      return Promise.reject(error);
    }

    if (!error.config?.__handled && error.message !== 'SELECT_ALL_INTERCEPT') {
      error.config.__handled = true;

      toast.error(error.response?.data?.message || "Something went wrong");
    }

    return Promise.reject(error);
  },
);

export default api;
