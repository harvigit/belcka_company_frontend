import "next-auth";

declare module "next-auth" {
  interface User {
    id: number;
    company_id?: string | number | null;
    company_name?: string | null;
    company_image?: string | null;
  }

  interface Session {
    user: User;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: number;
    company_id?: string | number | null;
    company_name?: string | null;
    company_image?: string | null;
  }
}
