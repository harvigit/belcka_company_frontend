"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";


const PUBLIC_ROUTES = ["/auth", "/privacy-policy", "/app-info"];

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const [loading] = useState(false);
  
  useEffect(() => {
    if (status === "unauthenticated" && !PUBLIC_ROUTES.includes(pathname)) {
      router.replace("/auth");
    }
  }, [status, pathname, router]);

  if (status === "loading") {
    return loading
  }

  if (status === "unauthenticated" && !PUBLIC_ROUTES.includes(pathname)) {
    return null; // redirect will happen
  }

  return <>{children}</>;
};

export default AuthProvider;
