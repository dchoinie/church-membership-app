"use client";

import { createContext, useContext, ReactNode } from "react";

interface MarketingContextType {
  openLogin: () => void;
  openSignup: () => void;
}

const MarketingContext = createContext<MarketingContextType | undefined>(undefined);

export function MarketingProvider({
  children,
  openLogin,
  openSignup,
}: {
  children: ReactNode;
  openLogin: () => void;
  openSignup: () => void;
}) {
  return (
    <MarketingContext.Provider value={{ openLogin, openSignup }}>
      {children}
    </MarketingContext.Provider>
  );
}

export function useMarketing() {
  const context = useContext(MarketingContext);
  if (context === undefined) {
    throw new Error("useMarketing must be used within a MarketingProvider");
  }
  return context;
}

