import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getSession } from "next-auth/react";

export const authOptions: NextAuthOptions = {
  debug: true,

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        extension: { label: "Code", type: "text" },
        phone: { label: "Phone", type: "number" },
        otp: { label: "Verification Code", type: "number" },
        company_id: { label: "Company ID", type: "text" },
        login: { label: "Login", type: "text" },
      },
      async authorize(credentials) {
        try {
          const api = process.env.NEXT_PUBLIC_API_URL;

          const res = await fetch(`${api}app-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json","is_web" : 'true' },
            body: JSON.stringify(credentials),
          });

          const data = await res.json();

          if (!res.ok || !data?.info) {
            const error = Object.entries(data);
            throw new Error(
              data?.isSuccess === false ? data.message : error?.[1]?.[1] || "Login failed"
            );
          }

          const token = data.info.authToken;

          const companyRes = await fetch(`${api}company/active-company`, {
            headers: {
              "Content-Type": "application/json",
              "is_web" : "true", 
              authorization: `Bearer ${token}`,
            },
          });

          const companyData = await companyRes.json();

          const companyId = companyData?.info?.id ?? null;
          
          if (companyId === null) {
            throw new Error("NO_COMPANY"); 
          }

          if (!companyRes.ok || !companyData?.info) {
            throw new Error("Failed to fetch active company data");
          }
          await getSession();
          return {
            ...data.info,
            token,
            user_image: companyData?.info?.user_image ?? null ,
            name: companyData?.info?.user_name ?? null,
            first_name: companyData?.info?.first_name ?? null,
            last_name: companyData?.info?.last_name ?? null,
            email: companyData?.info?.email ?? null,
            company_id: companyData?.info?.id ?? null,
            company_name: companyData?.info?.name ?? null,
            company_image: companyData?.info?.image ?? null,
            trade_id: companyData?.info?.trade_id ?? null,
            trade_name: companyData?.info?.trade_name ?? null,
            currency_id: companyData?.info?.currency_id ?? null
          };
          
        } catch (err) {
          throw new Error(err instanceof Error ? err.message : String(err));
        }
      },
    }),
  ],

  callbacks: {
      async jwt({ token, user, trigger, session }) {
      if (typeof token.user !== "object" || token.user === null) {
        token.user = {};
      }
      if (trigger === "update" && session && typeof session === "object" && !Array.isArray(session)) {
        token.user = {
          ...(token.user as Record<string, any>),
          ...(session as Record<string, any>),
        };
      }

      if (user) {
        token.user = user;
        token.accessToken = (user as any).token;
      }
      return token;
    },

    async session({ session, token }) {
      const api = process.env.NEXT_PUBLIC_API_URL;
      const user = token.user as any;
      let companyData = null;

      try {
        const res = await fetch(`${api}company/active-company`, {
          headers: {
            "Content-Type": "application/json",
            "is_web" : "true", 
            authorization: `Bearer ${user?.token}`,
          },
        });

        const data = await res.json();
        await getSession();
        if (res.ok && data?.info) {
          companyData = {
            user_image: data?.info?.user_image ?? null,
            name: data?.info?.user_name ?? null,
            first_name: data?.info?.first_name ?? null,
            last_name: data?.info?.last_name ?? null,
            email: data?.info?.email ?? null,
            company_id: data?.info?.id ?? null,
            company_name: data?.info?.name ?? null,
            company_image: data?.info?.image ?? null,
            trade_id: data?.info?.trade_id ?? null,
            trade_name: data?.info?.trade_name ?? null,
            currency_id: data?.info?.currency_id ?? null
          };
        } else {
          console.error("Failed to fetch updated company data:", data);
        }
      } catch (err) {
        console.error("Error fetching active company in session:", err);
      }

      return {
        ...session,
        user: {
          ...user,
          ...companyData,
        },
        accessToken: token.accessToken,
      };
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return baseUrl + url;
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },
  },

  pages: {
    signIn: "/auth",
  },

  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
