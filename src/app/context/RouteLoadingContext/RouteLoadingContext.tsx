'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const RouteLoadingContext = createContext<{ isRouting: boolean }>({ isRouting: false });

export const useRouteLoading = () => useContext(RouteLoadingContext);

export const RouteLoadingProvider = ({ children }: { children: React.ReactNode }) => {
  const [isRouting, setIsRouting] = useState(false);
  const router = useRouter();

  // useEffect(() => {
  //   const handleStart = () => setIsRouting(true);
  //   const handleStop = () => setIsRouting(false);

  //   router.events?.on('routeChangeStart', handleStart);
  //   router.events?.on('routeChangeComplete', handleStop);
  //   router.events?.on('routeChangeError', handleStop);

  //   return () => {
  //     router.events?.off('routeChangeStart', handleStart);
  //     router.events?.off('routeChangeComplete', handleStop);
  //     router.events?.off('routeChangeError', handleStop);
  //   };
  // }, [router]);

  return (
    <RouteLoadingContext.Provider value={{ isRouting }}>
      {children}
      {isRouting && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(255,255,255,0.6)',
          zIndex: 9999,
          cursor: 'wait'
        }}>
        </div>
      )}
    </RouteLoadingContext.Provider>
  );
};