// axios.ts
import { getAccessToken } from "@/lib/authToken";
import axios from "axios";
import { User } from "next-auth";
import {
  getSession,
  signOut,
} from "next-auth/react";
import toast from "react-hot-toast";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

let isLoggingOut = false;

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
        response?.data?.context
          ?.active_company_id ??
        response?.data?.active_company_id;

      if (activeCompanyId === 0) {
        await userLogout();
        return response;
      }

      // Optimize network overhead: query getSession only when API responses include an active company directive
      if (activeCompanyId !== undefined && activeCompanyId !== null) {
        const session = await getSession();
        const user = session?.user as User & {
          company_id?: number | null;
        };
        const currentCompanyId =
          user?.company_id;

        if (
          activeCompanyId &&
          Number(activeCompanyId) !==
          Number(currentCompanyId)
        ) {
          console.log(
            "Company changed:",
            currentCompanyId,
            "=>",
            activeCompanyId,
          );

          const companyResponse =
            await api.get(
              "company/active-company",
              {
                headers: {
                  "x-skip-auth": true,
                },
              },
            );

          const company =
            companyResponse?.data?.info;

          if (company) {
            window.dispatchEvent(
              new CustomEvent(
                "company-changed",
                {
                  detail: company,
                },
              ),
            );
          }
        }
      }
    } catch (err) {
      console.error(
        "Company check error:",
        err,
      );
    }

    return response;
  },

  async (error) => {
    if (
      error.response?.status === 401
    ) {
      await signOut({
        callbackUrl: "/auth",
      });

      return Promise.reject(error);
    }

    if (error.config?.skipToast) {
      return Promise.reject(error);
    }

    if (!error.config?.__handled) {
      error.config.__handled = true;

      toast.error(
        error.response?.data?.message ||
        "Something went wrong",
      );
    }

    return Promise.reject(error);
  },
);

export default api;