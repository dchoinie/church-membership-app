"use client";

import { useState } from "react";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";
import { LoginDialog } from "@/components/login-dialog";
import { SignupDialog } from "@/components/signup-dialog";
import { MarketingProvider } from "@/components/marketing-context";

export function PublicLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loginOpen, setLoginOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);

  const openLogin = () => setLoginOpen(true);
  const openSignup = () => setSignupOpen(true);

  return (
    <MarketingProvider openLogin={openLogin} openSignup={openSignup}>
      <MarketingNav onLoginClick={openLogin} onSignupClick={openSignup} />
      {children}
      <MarketingFooter />
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      <SignupDialog open={signupOpen} onOpenChange={setSignupOpen} />
    </MarketingProvider>
  );
}
