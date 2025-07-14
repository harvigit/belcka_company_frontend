import React from "react";
import { CustomizerContextProvider } from "./context/customizerContext";

import MyApp from "./app";
import "./global.css";
import NextTopLoader from 'nextjs-toploader';
import { RouteLoadingProvider } from "./context/RouteLoadingContext/RouteLoadingContext";

export const metadata = {
  title: "OTMS System",
  description: "OTMS System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <NextTopLoader color="#1e4db7" />
        <CustomizerContextProvider>
            <MyApp session={undefined}>
            <RouteLoadingProvider>
              {children}
            </RouteLoadingProvider>
            </MyApp>
        </CustomizerContextProvider>
      </body>
    </html>
  );
}
