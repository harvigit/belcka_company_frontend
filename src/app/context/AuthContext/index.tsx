"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const PUBLIC_ROUTES = ["/auth", "/privacy-policy", "/app-info","/help"];

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;

    if (status === "authenticated" && pathname === "/") {
      router.replace("/apps/users/list");
    }

    if (status === "unauthenticated" && !PUBLIC_ROUTES.includes(pathname)) {
      router.replace("/");
    }
  }, [status, pathname, router, hasMounted]);

  if (!hasMounted || status === "loading") {
    return null; // or loading spinner
  }

  if (status === "unauthenticated" && !PUBLIC_ROUTES.includes(pathname)) {
    router.replace("/auth");
  }

  return <>{children}</>;
};

export default AuthProvider;
