"use client";

import { Button } from "@/components/ui/button";
import { Church, ArrowRight } from "lucide-react";

interface MarketingNavProps {
  onLoginClick: () => void;
  onSignupClick: () => void;
}

export function MarketingNav({ onLoginClick, onSignupClick }: MarketingNavProps) {
  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Church className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Simple Church Tools</span>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={onLoginClick}
              className="hidden sm:flex cursor-pointer"
            >
              Sign In
            </Button>
            <Button onClick={onSignupClick} className="cursor-pointer">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}

