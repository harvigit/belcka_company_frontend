import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

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
          let api = process.env.NEXT_PUBLIC_API_URL;
          const res = await fetch(`${api}app-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credentials),
          });
      
          const data = await res.json();
      
          if (res.ok && data?.info) {
            return {
              ...data.info,
              token: data.info.api_token,
            };
          }
      
          const error = Object.entries(data);
          throw new Error(
            data?.isSuccess === false ? data.message : error?.[1]?.[1] || "Login failed"
          );
        } catch (err) {
          throw new Error(err instanceof Error ? err.message : String(err));
        }
      }      
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
      return {
        ...session,
        user: token.user as typeof session.user,
        accessToken: (token as any).accessToken,
      };
    },
  },  

  pages: {
    signIn: "/auth",
  },

  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);