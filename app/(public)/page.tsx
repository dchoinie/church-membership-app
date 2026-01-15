"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
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
  Zap,
  Lock,
} from "lucide-react";
import { SUBSCRIPTION_PLANS } from "@/lib/pricing";
import { useMarketing } from "@/components/marketing-context";
import { authClient } from "@/lib/auth-client";

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
  const { data: session } = authClient.useSession();
  const router = useRouter();

  // Auto-open login dialog if on subdomain AND user is not authenticated
  useEffect(() => {
    if (isSubdomain && !session?.user?.emailVerified) {
      openLogin();
    }
  }, [isSubdomain, session, openLogin]);

  // Auto-open login dialog if login parameter is present (from auth-layout redirect)
  // This happens when user tries to access a protected route without being authenticated
  useEffect(() => {
    const loginParam = searchParams.get("login");
    if (loginParam === "true" && !isSubdomain) {
      openLogin();
      // Clear the login parameter from URL after opening
      if (typeof window !== "undefined") {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("login");
        window.history.replaceState({}, "", newUrl.pathname + newUrl.search);
      }
    }
  }, [searchParams, isSubdomain, openLogin]);

  // Auto-open login dialog if invite parameter is present
  useEffect(() => {
    const inviteCode = searchParams.get("invite");
    if (inviteCode) {
      openLogin();
    }
  }, [searchParams, openLogin]);

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
  // Always redirect if authenticated, regardless of login param (prevents double login)
  useEffect(() => {
    if (isSubdomain && session?.user?.emailVerified) {
      // Fetch church data to check subscription status
      const checkSubscriptionAndRedirect = async () => {
        try {
          const response = await fetch("/api/church", {
            credentials: "include",
          });
          
          if (response.ok) {
            const { church } = await response.json();
            
            // Check if subscription is active
            const hasActiveSubscription = 
              church.subscriptionStatus === "active" ||
              (church.subscriptionStatus === "trialing" && church.stripeSubscriptionId !== null);
            
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
  }, [isSubdomain, session, router]);
  
  if (isSubdomain) {
    // If user is authenticated, show loading while redirecting (handled by useEffect above)
    if (session?.user?.emailVerified) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-muted-foreground">Redirecting...</div>
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

    // TODO: Implement contact form submission API
    // For now, just simulate success
    setTimeout(() => {
      setContactSuccess(true);
      setIsSubmittingContact(false);
      setContactFormData({ name: "", email: "", message: "" });
    }, 1000);
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
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl"></div>
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Trusted by churches nationwide</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Complete Church Management
              <br />
              <span className="text-primary">Made Simple</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Manage your members, track giving, monitor attendance, and generate reports—all in one powerful, easy-to-use platform designed specifically for churches.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={openSignup}
                className="text-lg px-8 py-6 cursor-pointer"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={openLogin}
                className="text-lg px-8 py-6 cursor-pointer"
              >
                Sign In
              </Button>
            </div>
          </div>

          {/* Hero Image Placeholder */}
          <div className="mt-16 max-w-5xl mx-auto">
            <div className="relative rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 aspect-video flex items-center justify-center">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <FileText className="w-8 h-8 text-primary" />
                </div>
                <p className="text-muted-foreground font-medium">
                  Dashboard Screenshot Placeholder
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Replace this with a screenshot of your dashboard
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 sm:py-32 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
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
                className="p-6 rounded-lg border bg-background hover:shadow-lg transition-shadow"
              >
                <div className="shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
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
                  <span>Customizable to match your church&apos;s branding</span>
                </li>
              </ul>
            </div>
            <div className="relative rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 aspect-video flex items-center justify-center">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Zap className="w-8 h-8 text-primary" />
                </div>
                <p className="text-muted-foreground font-medium">
                  Interface Screenshot Placeholder
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Replace this with a screenshot of your interface
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 sm:py-32 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that fits your church size. All plans include a 14-day free trial.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`relative p-8 rounded-lg border-2 ${
                  plan.popular
                    ? "border-primary bg-background shadow-lg"
                    : "border-border bg-background"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
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
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  onClick={openSignup}
                >
                  Get Started
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-20 sm:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 aspect-video flex items-center justify-center order-2 lg:order-1">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Lock className="w-8 h-8 text-primary" />
                </div>
                <p className="text-muted-foreground font-medium">
                  Security Illustration Placeholder
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Replace this with a security illustration
                </p>
              </div>
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
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Email</h3>
                  <p className="text-muted-foreground">support@simplechurchtools.com</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Phone className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Phone</h3>
                  <p className="text-muted-foreground">1-800-CHURCH-1</p>
                </div>
              </div>
            </div>
            <form onSubmit={handleContactSubmit} className="space-y-6 bg-background p-8 rounded-lg border">
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
              {contactSuccess && (
                <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400 border border-green-500/20">
                  Thank you for your message! We&apos;ll get back to you soon.
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
