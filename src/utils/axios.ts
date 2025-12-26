import { getAccessToken } from "@/lib/authToken";
import axios from "axios";
import { signOut } from "next-auth/react";
import toast from "react-hot-toast";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL
});

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();

    if (token) {
      config.headers = config.headers || {};
      config.headers.authorization = `Bearer ${token}`;
      config.headers.is_web = "true";
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      signOut({ callbackUrl: "/auth" });
      return Promise.reject(error);
    }

    if (!error.config?.__handled) {
      error.config.__handled = true;
      toast.error(error.response?.data?.message || "Something went wrong");
    }

    return Promise.reject(error);
  }
);

export default api;
