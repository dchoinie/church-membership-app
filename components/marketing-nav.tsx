"use client";

import { Button } from "@/components/ui/button";
import { Church, ArrowRight, LogIn } from "lucide-react";

interface MarketingNavProps {
  onLoginClick: () => void;
  onSignupClick: () => void;
}

export function MarketingNav({ onLoginClick, onSignupClick }: MarketingNavProps) {
  return (
    <nav className="border-b border-primary/10 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Church className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold font-heading">Simple Church Tools</span>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={onLoginClick}
              className="hidden sm:flex cursor-pointer"
            >
              <LogIn className="mr-2 h-5 w-5" />
              Sign In
            </Button>
            <Button 
              onClick={onSignupClick} 
              variant="gold"
              className="cursor-pointer"
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}

