import { SessionProvider } from "next-auth/react";
import NotificationClient from "./notifications/NotificationClient";
import React from "react";

interface ProvidersProps {
  children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider
      refetchOnWindowFocus={false}
      refetchInterval={0}
    >
      {children}
      <NotificationClient />
    </SessionProvider>
  );
}
