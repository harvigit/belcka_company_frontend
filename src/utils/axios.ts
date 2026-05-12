import { getAccessToken } from "@/lib/authToken";
import axios from "axios";
import { signOut } from "next-auth/react";
import toast from "react-hot-toast";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

const userLogout = async (response: any) => {
  toast.success("You are not part of this company!");
  await signOut({ callbackUrl: "/auth" });
  return response;
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
      const activeCompany =
        response?.data?.active_company ?? null;

      if (activeCompany) {
        window.dispatchEvent(
          new CustomEvent("company-changed", {
            detail: activeCompany,
          }),
        );
      }

      const companyId =
        response?.data?.active_company_id;

      if (companyId === 0) {
        await userLogout(response);
        return response;
      }

      // const session = await getSession();
      // const user = session?.user as User & {
      //   company_id?: number | null;
      // };
      // const sessionCompanyId = user?.company_id;

      // if (companyId && sessionCompanyId && companyId !== sessionCompanyId) {
      //   console.log("Company mismatch:", sessionCompanyId, "→", companyId);

      //   await fetch("/api/auth/session", {
      //     method: "PATCH",
      //     headers: { "Content-Type": "application/json" },
      //     body: JSON.stringify({
      //       company_id: companyId,
      //     }),
      //   });
      // }
    } catch (err) {
      console.error("Company check error:", err);
    }

    return response;
  },

  (error) => {
    if (error.response?.status === 401) {
      signOut({ callbackUrl: "/auth" });
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
