import React from "react";
import { CustomizerContextProvider } from "./context/customizerContext";
import { Roboto } from 'next/font/google';

import MyApp from "./app";
import "./global.css";
import NextTopLoader from 'nextjs-toploader';
import { RouteLoadingProvider } from "./context/RouteLoadingContext/RouteLoadingContext";

export const metadata = {
  title: "OTMS System",
  description: "OTMS System",
};

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-roboto',     
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={roboto.className}>
        <NextTopLoader color="#1e4db7" />
        <CustomizerContextProvider>
          <MyApp>
            <RouteLoadingProvider>{children}</RouteLoadingProvider>
          </MyApp>
        </CustomizerContextProvider>
      </body>
    </html>
  );
}
