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
      },
      async authorize(credentials) {
        try {
          const api = process.env.NEXT_PUBLIC_API_URL;

          const res = await fetch(`${api}app-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
              Authorization: `Bearer ${token}`,
            },
          });

          const companyData = await companyRes.json();

          if (!companyRes.ok || !companyData?.info) {
            throw new Error("Failed to fetch active company data");
          }
          await getSession();
          return {
            ...data.info,
            token,
            company_id: companyData.info.id,
            company_name: companyData.info.name,
            company_image: companyData.info.image,
          };
          
        } catch (err) {
          throw new Error(err instanceof Error ? err.message : String(err));
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
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
            Authorization: `Bearer ${user.token}`,
          },
        });

        const data = await res.json();
        await getSession();
        if (res.ok && data?.info) {
          companyData = {
            company_id: data.info.id,
            company_name: data.info.name,
            company_image: data.info.image,
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
      try {
        if (url.startsWith("/")) {
          return `${baseUrl}${url}`;
        }
    
        const parsedBase = new URL(baseUrl);
        const parsedUrl = new URL(url);
    
        if (parsedUrl.origin === parsedBase.origin) {
          return `${baseUrl}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
        }
        return baseUrl;
      } catch {
        return baseUrl;
      }
    }
  },

  pages: {
    signIn: "/auth",
  },

  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);