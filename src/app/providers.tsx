"use client";
import { SessionProvider } from "next-auth/react";
import NotificationClient from "./notifications/NotificationClient";
import React from "react";
import { AuthTokenSync } from "./components/AuthTokenSync";

interface ProvidersProps {
  children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider
      refetchOnWindowFocus={false}
      refetchInterval={0}
    >
       <AuthTokenSync />
      {children}
      <NotificationClient />
    </SessionProvider>
  );
}
