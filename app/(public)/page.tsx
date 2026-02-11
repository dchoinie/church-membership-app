"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Users,
  DollarSign,
  FileText,
  Shield,
  CheckCircle2,
  ArrowRight,
  Calendar,
  BarChart3,
  Mail,
  Phone,
  Sparkles,
  Lock,
  LogIn,
} from "lucide-react";
import { ChurchLoadingIndicator } from "@/components/ui/church-loading";
import { SUBSCRIPTION_PLANS } from "@/lib/pricing";
import { useMarketing } from "@/components/marketing-context";
import { authClient } from "@/lib/auth-client";
import Image from "next/image";
import {
  GridPattern,
  DotPattern,
  BlurOrbs,
  DecorativeCircles,
  ShimmerLine,
  GradientMesh,
} from "@/components/marketing-patterns";

/**
 * Extract subdomain from hostname (client-side)
 */
function extractSubdomain(hostname: string): string | null {
  const hostWithoutPort = hostname.split(":")[0];
  const parts = hostWithoutPort.split(".");
  
  if (parts.length <= 1 || hostWithoutPort === "localhost") {
    return null;
  }
  
  // Handle subdomain.localhost format for local development
  if (parts.length === 2 && parts[1] === "localhost") {
    return parts[0];
  }
  
  // For subdomain.domain.com, return the subdomain
  // But exclude "www" as it's typically the main domain, not a subdomain
  if (parts.length >= 3) {
    const potentialSubdomain = parts[0];
    // Don't treat "www" as a subdomain
    if (potentialSubdomain.toLowerCase() === "www") {
      return null;
    }
    return potentialSubdomain;
  }
  
  return null;
}

export default function LandingPage() {
  const { openLogin, openSignup } = useMarketing();
  const searchParams = useSearchParams();
  const [contactFormData, setContactFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [isGatheringChurchInfo, setIsGatheringChurchInfo] = useState(false);

  // Compute subdomain during render (client-side only)
  const isSubdomain = useMemo(() => {
    if (typeof window === "undefined") return false;
    const subdomain = extractSubdomain(window.location.hostname);
    return !!subdomain;
  }, []);

  // Compute showVerifiedMessage from searchParams
  const showVerifiedMessage = useMemo(() => {
    const verified = searchParams.get("verified");
    const signin = searchParams.get("signin");
    return verified === "true" && signin === "true";
  }, [searchParams]);

  // Get session and router - needed for authentication checks
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Auto-open login dialog if on subdomain AND user is not authenticated
  // Wait for session to finish loading (isSessionPending === false) before making decisions
  // This prevents opening modal during redirect after successful login
  // Don't open if login param is present (handled by separate useEffect above)
  useEffect(() => {
    const loginParam = searchParams.get("login");
    // Only open login modal after session has finished loading
    // Skip if login param is present (it's handled separately)
    if (isSubdomain && !isSessionPending && !session?.user?.emailVerified && loginParam !== "true") {
      openLogin();
    }
  }, [isSubdomain, isSessionPending, session, searchParams, openLogin]);

  // Auto-open login dialog if login parameter is present (from auth-layout redirect)
  // This happens when user tries to access a protected route without being authenticated
  // Also handle login param on subdomain - wait for session to load before opening
  useEffect(() => {
    const loginParam = searchParams.get("login");
    if (loginParam === "true") {
      // Wait for session to finish loading before opening login dialog
      // This prevents opening login dialog if user just logged in and session is still loading
      if (!isSessionPending) {
        // Only open login dialog if user is not authenticated
        // If user is authenticated, they should be redirected by the other useEffect
        if (!session?.user?.emailVerified) {
          openLogin();
        }
        // Clear the login parameter from URL after handling
        if (typeof window !== "undefined") {
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete("login");
          window.history.replaceState({}, "", newUrl.pathname + newUrl.search);
        }
      }
    }
  }, [searchParams, isSubdomain, isSessionPending, session, openLogin]);

  // Auto-open login dialog if invite parameter is present
  useEffect(() => {
    const inviteCode = searchParams.get("invite");
    if (inviteCode) {
      openLogin();
    }
  }, [searchParams, openLogin]);

  // Load reCAPTCHA v3 script
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) return;

    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`;
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector(
        `script[src*="recaptcha/api.js"]`
      );
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
    };
  }, []);

  // Handle verified parameter - clear query params and open login
  useEffect(() => {
    if (showVerifiedMessage) {
      // Auto-open login dialog
      openLogin();
      // Clear query params
      if (typeof window !== "undefined") {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("verified");
        newUrl.searchParams.delete("signin");
        window.history.replaceState({}, "", newUrl.pathname + newUrl.search);
      }
    }
  }, [showVerifiedMessage, openLogin]);

  // Redirect authenticated users on subdomain root to /dashboard or /setup
  // This is a safety net for edge cases (client-side navigation, race conditions)
  // Middleware already handles server-side redirects, but this catches cases where:
  // - Client-side navigation bypasses middleware
  // - Session hook updates after middleware check
  // Optimized: Only fetch church data if middleware didn't redirect (edge case)
  // Middleware already validated subscription status, so this is just a fallback
  useEffect(() => {
    if (isSubdomain && !isSessionPending && session?.user?.emailVerified) {
      // Check if we're already being redirected by middleware
      // If pathname is still "/", middleware didn't redirect (edge case)
      if (pathname === "/") {
        // Fetch church data to determine redirect path
        // This is optimized - only runs in edge cases where middleware didn't catch it
        const checkSubscriptionAndRedirect = async () => {
          try {
            const response = await fetch("/api/church", {
              credentials: "include",
            });
            
            if (response.ok) {
              const { church } = await response.json();
              
              // Check if subscription is active
              const hasActiveSubscription = church.subscriptionStatus === "active";
              
              // Redirect to appropriate page
              const targetPath = hasActiveSubscription ? "/dashboard" : "/setup";
              router.replace(targetPath);
            } else {
              // If can't fetch church, default to setup
              router.replace("/setup");
            }
          } catch (error) {
            console.error("Error checking subscription:", error);
            // Default to setup on error
            router.replace("/setup");
          }
        };
        
        checkSubscriptionAndRedirect();
      }
    }
  }, [isSubdomain, isSessionPending, session, pathname, router]);
  
  if (isSubdomain) {
    // If user is authenticated, show loading while redirecting (handled by useEffect above)
    if (session?.user?.emailVerified) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <ChurchLoadingIndicator
            size="lg"
            label={isGatheringChurchInfo ? "Gathering church info..." : "Redirecting..."}
            centered
          />
        </div>
      );
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">
              Sign in to access your church dashboard
            </p>
          </div>
          {showVerifiedMessage && (
            <div className="mb-6 rounded-md bg-green-50 dark:bg-green-950 p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                <p className="text-sm text-green-800 dark:text-green-200">
                  Email verified successfully! Please sign in to continue.
                </p>
              </div>
            </div>
          )}
          {/* Login dialog will be opened automatically via useEffect */}
          <div className="text-center text-sm text-muted-foreground">
            <p>If the login form didn&apos;t open automatically,</p>
            <Button
              variant="link"
              onClick={openLogin}
              className="p-0 h-auto font-normal"
            >
              click here to sign in
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingContact(true);
    setContactSuccess(false);
    setContactError(null);

    try {
      let recaptchaToken: string | null = null;

      // Get reCAPTCHA v3 token if configured
      if (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
        try {
          recaptchaToken = await new Promise<string>((resolve, reject) => {
            if (typeof window === "undefined" || !window.grecaptcha) {
              reject(new Error("reCAPTCHA not loaded"));
              return;
            }

            window.grecaptcha.ready(() => {
              window.grecaptcha
                .execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!, {
                  action: "submit",
                })
                .then((token: string) => {
                  resolve(token);
                })
                .catch(reject);
            });
          });
        } catch (recaptchaError) {
          console.error("reCAPTCHA error:", recaptchaError);
          setContactError("reCAPTCHA verification failed. Please refresh the page and try again.");
          setIsSubmittingContact(false);
          return;
        }
      }

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: contactFormData.name,
          email: contactFormData.email,
          message: contactFormData.message,
          recaptchaToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      // Success
      setContactSuccess(true);
      setContactFormData({ name: "", email: "", message: "" });
    } catch (error) {
      console.error("Error submitting contact form:", error);
      setContactError(
        error instanceof Error ? error.message : "Failed to send message. Please try again."
      );
    } finally {
      setIsSubmittingContact(false);
    }
  };

  const features = [
    {
      icon: Users,
      title: "Member Directory",
      description:
        "Manage member profiles, track household relationships, and maintain up-to-date contact information for your congregation.",
    },
    {
      icon: DollarSign,
      title: "Giving Management",
      description:
        "Record and track donations, manage recurring gifts, and maintain detailed giving history for each member.",
    },
    {
      icon: Calendar,
      title: "Attendance Tracking",
      description:
        "Track service attendance, manage events, and monitor member engagement with comprehensive attendance reports.",
    },
    {
      icon: FileText,
      title: "Reports & Analytics",
      description:
        "Generate comprehensive reports on membership, giving, attendance, and other key metrics to guide your church's decisions.",
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description:
        "Enterprise-grade security with each church getting its own secure subdomain. Your data is protected and private.",
    },
    {
      icon: BarChart3,
      title: "Real-time Insights",
      description:
        "Get real-time insights into your church's growth, giving trends, and member engagement with beautiful dashboards.",
    },
  ];

  const pricingPlans = [
    {
      name: SUBSCRIPTION_PLANS.basic.name,
      price: SUBSCRIPTION_PLANS.basic.price,
      features: SUBSCRIPTION_PLANS.basic.features,
      popular: true,
    },
    {
      name: SUBSCRIPTION_PLANS.premium.name,
      price: SUBSCRIPTION_PLANS.premium.price,
      features: SUBSCRIPTION_PLANS.premium.features,
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32 lg:py-40">
        {/* Multi-layered background with gradients and patterns */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Gradient mesh overlay */}
          <GradientMesh colors={["primary", "gold"]} />
          
          {/* Blur orbs */}
          <BlurOrbs count={3} />
          
          {/* Grid pattern */}
          <GridPattern />
          
          {/* Dot pattern */}
          <DotPattern />
          
          {/* Decorative shapes */}
          <DecorativeCircles position="top-right" />
          
          {/* Shimmer lines */}
          <ShimmerLine className="top-1/4" />
          <ShimmerLine className="top-3/4" delay={2} />
        </div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Enhanced Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-r from-primary/15 via-accent/10 to-primary/15 border border-accent/20 text-primary mb-6 backdrop-blur-sm shadow-lg animate-fade-in">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium">Designed for small churches everywhere</span>
            </div>
            
            {/* Enhanced Heading with Gradient */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 animate-fade-in-up">
              Essential Church Management
              <br />
              <span className="bg-linear-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient-shift">
                Made Simple
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in-up-delayed">
              Manage your members, track giving, monitor attendance, and generate reports—all in one powerful, easy-to-use platform designed specifically for churches.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up-delayed-2">
              <Button
                size="lg"
                variant="outline"
                onClick={openLogin}
                className="text-lg px-8 py-6 cursor-pointer backdrop-blur-sm transition-all duration-300 hover:scale-[1.02]"
              >
                <LogIn className="mr-2 h-5 w-5" />
                <span>Sign In</span>
              </Button>
              <Button
                size="lg"
                onClick={openSignup}
                variant="gold"
                className="group text-lg px-8 py-6 cursor-pointer transition-all duration-300 hover:scale-[1.02]"
              >
                <span>Get Started</span>
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </div>

          {/* Enhanced Hero Image Container */}
          <div className="mt-16 max-w-5xl mx-auto animate-fade-in-up-delayed-3">
            <div className="relative group">
              {/* Animated glow effect behind image */}
              <div className="absolute -inset-4 bg-linear-to-r from-primary/20 via-accent/20 to-primary/20 rounded-2xl blur-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-500 animate-pulse-glow"></div>
              
              {/* Image container with enhanced styling */}
              <div className="relative rounded-xl border border-primary/20 bg-linear-to-br from-background/90 via-muted/20 to-background/90 backdrop-blur-sm overflow-hidden shadow-2xl group-hover:shadow-primary/20 transition-all duration-500">
                
                {/* Subtle inner glow */}
                <div className="absolute inset-0 bg-linear-to-t from-transparent via-transparent to-primary/5 pointer-events-none"></div>
                
                <div className="relative z-10 flex items-center justify-center overflow-hidden">
                  <Image 
                    src="/dashboard_1.png" 
                    alt="Dashboard" 
                    width={1000} 
                    height={1000}
                    className="w-full h-auto transition-transform duration-700 group-hover:scale-[1.02]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-20 sm:py-32 bg-muted/30 overflow-hidden">
        <GridPattern />
        <DotPattern />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything You Need to Manage Your Church
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to help you focus on what matters most—your congregation.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 rounded-lg border bg-background hover:shadow-lg hover:border-accent/20 transition-all duration-300"
              >
                <div className="shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-accent/10 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary group-hover:text-accent transition-colors" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Image Showcase Section */}
      <section className="py-20 sm:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Beautiful, Intuitive Interface
              </h2>
              <p className="text-xl text-muted-foreground mb-6">
                Our clean, modern interface makes it easy for anyone on your team to manage church operations, even without technical expertise.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                  <span>Easy-to-use dashboard with everything at your fingertips</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                  <span>Mobile-responsive design works on any device</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                  <span>No training required for staff or volunteers</span>
                </li>
              </ul>
            </div>
            <div className="relative rounded-lg bg-muted/30 flex items-center justify-center">
              <Image src="/ui_1.png" alt="UI" width={1000} height={1000} className="rounded-lg" />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative py-20 sm:py-32 bg-muted/30 overflow-hidden">
        <GradientMesh colors={["primary"]} />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that fits your church size.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-8 max-w-4xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`relative p-8 rounded-lg border-2 w-full md:w-[calc(50%-1rem)] transition-all duration-300 ${
                  plan.popular
                    ? "border-accent bg-background shadow-lg hover:shadow-xl"
                    : "border-border bg-background hover:border-primary/50"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-accent text-accent-foreground px-4 py-1 rounded-full text-sm font-medium shadow-md">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    {plan.price > 0 && (
                      <span className="text-muted-foreground">/month</span>
                    )}
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <CheckCircle2 className={`w-5 h-5 shrink-0 mt-0.5 ${plan.popular ? "text-accent" : "text-primary"}`} />
                      <span className="text-sm self-center">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.popular ? "gold" : "outline"}
                  onClick={openSignup}
                >
                  Get Started
                </Button>
              </div>
            ))}
          </div>
          
          {/* Shared Features Section */}
          <div className="mt-16 max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold mb-2">Included in All Plans</h3>
              <p className="text-muted-foreground text-sm">
                Every plan includes these essential features
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50 border border-border/50">
                <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-sm">Enterprise-grade Security</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Encrypted data storage and secure subdomain isolation
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50 border border-border/50">
                <Lock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-sm">You Own Your Data</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Full data ownership with export capabilities
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50 border border-border/50">
                <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-sm">All Core Features</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Member directory, giving tracking, attendance, and reports
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50 border border-border/50">
                <BarChart3 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-sm">Regular Backups</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Automated daily backups to protect your data
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-20 sm:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative rounded-lg flex items-center justify-center order-2 lg:order-1 overflow-hidden aspect-video">
              <Image src="/security.png" alt="Security" width={1000} height={700} className="rounded-lg object-cover w-full h-full object-[center_40%]" />
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Your Data is Safe and Secure
              </h2>
              <p className="text-xl text-muted-foreground mb-6">
                We take security seriously. Your church&apos;s data is protected with enterprise-grade security measures.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Shield className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Encrypted Data Storage</span>
                    <p className="text-sm text-muted-foreground">
                      All data is encrypted both in transit and at rest
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Shield className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Isolated Subdomains</span>
                    <p className="text-sm text-muted-foreground">
                      Each church gets its own secure subdomain
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Shield className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Regular Backups</span>
                    <p className="text-sm text-muted-foreground">
                      Automated daily backups ensure your data is never lost
                    </p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 sm:py-32 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Get in Touch</h2>
              <p className="text-xl text-muted-foreground">
                Have questions? We&apos;d love to hear from you. Send us a message and we&apos;ll respond as soon as possible.
              </p>
            </div>
            <div className="flex justify-center gap-4 mb-12">
              <div className="shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Email</h3>
                <p className="text-muted-foreground">support@simplechurchtools.com</p>
              </div>
            </div>
            <form onSubmit={handleContactSubmit} className="space-y-6 bg-background p-8 rounded-lg border">
              {/* Honeypot field - hidden from users but bots might fill it */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                style={{ position: "absolute", left: "-9999px" }}
                aria-hidden="true"
              />
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Your name"
                    value={contactFormData.name}
                    onChange={(e) =>
                      setContactFormData({ ...contactFormData, name: e.target.value })
                    }
                    required
                    disabled={isSubmittingContact}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="your@email.com"
                    value={contactFormData.email}
                    onChange={(e) =>
                      setContactFormData({ ...contactFormData, email: e.target.value })
                    }
                    required
                    disabled={isSubmittingContact}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  name="message"
                  placeholder="Your message..."
                  value={contactFormData.message}
                  onChange={(e) =>
                    setContactFormData({ ...contactFormData, message: e.target.value })
                  }
                  required
                  disabled={isSubmittingContact}
                  rows={6}
                />
              </div>
              
              {/* reCAPTCHA v3 runs invisibly in the background - no UI needed */}
              {!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && (
                <div className="rounded-md bg-yellow-500/10 p-3 text-sm text-yellow-600 dark:text-yellow-400 border border-yellow-500/20">
                  reCAPTCHA is not configured. Please set NEXT_PUBLIC_RECAPTCHA_SITE_KEY in your environment variables.
                </div>
              )}

              {/* Success message */}
              {contactSuccess && (
                <div className="rounded-md bg-green-500/10 p-4 text-sm text-green-600 dark:text-green-400 border border-green-500/20 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <span>Your message has been sent successfully! We&apos;ll get back to you soon.</span>
                </div>
              )}

              {/* Error message */}
              {contactError && (
                <div className="rounded-md bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400 border border-red-500/20">
                  {contactError}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmittingContact}
              >
                {isSubmittingContact ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
