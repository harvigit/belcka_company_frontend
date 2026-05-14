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

const userLogout = async () => {
  if (isLoggingOut) return;

  isLoggingOut = true;

  toast.error("You are not part of this company!");

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

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  async (response) => {
    try {
      const activeCompanyId =
        response?.data?.context?.active_company_id ??
        response?.data?.active_company_id;

      const isSwitchingURL =
        response.config.url?.includes("company/switch-company") ||
        response.config.url?.includes("user/switch-company-list");

      const now = Date.now();
      const isRecentSwitch = now - lastSwitchTime < 5000;
      const hasToken = !!getAccessToken();

      if (
        activeCompanyId !== undefined &&
        activeCompanyId !== null &&
        Number(activeCompanyId) === 0 &&
        !isSwitchingURL &&
        !isRecentSwitch &&
        hasToken
      ) {
        await userLogout();
        return response;
      }

      if (
        activeCompanyId !== undefined &&
        activeCompanyId !== null &&
        Number(activeCompanyId) !== 0
      ) {
        const session = await getSession();
        const user = session?.user as User & {
          company_id?: number | null;
        };
        const currentCompanyId = user?.company_id;

        if (
          activeCompanyId &&
          Number(activeCompanyId) !== Number(currentCompanyId)
        ) {
          console.log(
            "Company changed:",
            currentCompanyId,
            "=>",
            activeCompanyId,
          );

          const companyResponse = await api.get("company/active-company", {
            headers: {
              "x-skip-auth": true,
            },
          });

          const company = companyResponse?.data?.info;

          if (company) {
            window.dispatchEvent(
              new CustomEvent("company-changed", {
                detail: company,
              }),
            );
          }
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

    if (error.response?.status === 401) {
      if (!isLoggingOut && !isSwitchingURL && !isRecentSwitch) {
        await userLogout();
      }

      return Promise.reject(error);
    }

    if (error.config?.skipToast) {
      return Promise.reject(error);
    }

    if (!error.config?.__handled) {
      error.config.__handled = true;

      toast.error(error.response?.data?.message || "Something went wrong");
    }

    return Promise.reject(error);
  },
);

export default api;