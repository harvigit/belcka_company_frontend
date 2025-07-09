import axios from "axios";
import { getSession, signOut } from "next-auth/react";
import toast from "react-hot-toast";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// Request interceptor: attach access token from NextAuth session
  api.interceptors.request.use(
    async (config) => {
      const session = await getSession();

      if ((session as any)?.accessToken) {
        config.headers = config.headers || {}; // ensure it exists
        config.headers['Authorization'] = `Bearer ${(session as any).accessToken}`;
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

// Response interceptor: handle 401 Unauthorized globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await signOut({ callbackUrl: "/auth" });
    }
    toast.error(error.response.data?.message);

    return Promise.reject(error);
  }
);

export default api;
