"use client";

import { cn } from "@/lib/utils";

/**
 * Grid Pattern - Subtle grid overlay for sections
 */
export function GridPattern({ className }: { className?: string }) {
  return (
    <svg
      className={cn("absolute inset-0 w-full h-full opacity-[0.03] dark:opacity-[0.05]", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-pattern)" />
    </svg>
  );
}

/**
 * Dot Pattern - Fine dot texture
 */
export function DotPattern({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "absolute inset-0 opacity-[0.04] dark:opacity-[0.06]",
        className
      )}
      style={{
        backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
        backgroundSize: "24px 24px",
        backgroundPosition: "0 0",
      }}
    />
  );
}

/**
 * Cross Pattern - Subtle cross motifs (appropriate for church context)
 */
export function CrossPattern({ className }: { className?: string }) {
  return (
    <svg
      className={cn("absolute inset-0 w-full h-full opacity-[0.02] dark:opacity-[0.04]", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="cross-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
          <path
            d="M 30 0 L 30 25 M 30 35 L 30 60 M 0 30 L 25 30 M 35 30 L 60 30"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#cross-pattern)" />
    </svg>
  );
}

/**
 * Ornamental Border - Decorative borders for sections
 */
export function OrnamentalBorder({
  className,
  variant = "top",
}: {
  className?: string;
  variant?: "top" | "bottom" | "both";
}) {
  return (
    <>
      {(variant === "top" || variant === "both") && (
        <div className={cn("absolute top-0 left-0 right-0 h-px", className)}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
          <div className="absolute left-1/2 top-0 -translate-x-1/2 w-32 h-px bg-gold/50" />
        </div>
      )}
      {(variant === "bottom" || variant === "both") && (
        <div className={cn("absolute bottom-0 left-0 right-0 h-px", className)}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
          <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-32 h-px bg-gold/50" />
        </div>
      )}
    </>
  );
}

/**
 * Gradient Mesh - Animated gradient backgrounds
 */
export function GradientMesh({
  className,
  colors = ["primary", "gold"],
}: {
  className?: string;
  colors?: string[];
}) {
  const colorClasses = colors.map((c) => {
    if (c === "primary") return "from-primary/20 via-primary/10";
    if (c === "gold") return "via-gold/15 to-gold/5";
    return `via-${c}/10`;
  }).join(" ");

  return (
    <div
      className={cn(
        "absolute inset-0 bg-gradient-to-br from-primary/15",
        colorClasses,
        "animate-pulse-slow",
        className
      )}
    />
  );
}

/**
 * Blur Orbs - Layered blur effects
 */
export function BlurOrbs({
  count = 3,
  className,
}: {
  count?: number;
  className?: string;
}) {
  const positions = [
    { top: "-top-40", right: "-right-40", size: "w-96 h-96", color: "primary/20", animation: "animate-float-slow" },
    { top: "-bottom-40", right: "-left-40", size: "w-80 h-80", color: "primary/10", animation: "animate-float-reverse" },
    { top: "top-1/2", right: "left-1/2", size: "w-[500px] h-[500px]", color: "primary/8", animation: "animate-pulse-slow", transform: "-translate-x-1/2 -translate-y-1/2" },
  ];

  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      {positions.slice(0, count).map((pos, i) => (
        <div
          key={i}
          className={cn(
            "absolute rounded-full blur-3xl",
            pos.top,
            pos.right,
            pos.size,
            `bg-${pos.color}`,
            pos.animation,
            pos.transform
          )}
        />
      ))}
    </div>
  );
}

/**
 * Decorative Circle Pattern - Elegant circular motifs
 */
export function DecorativeCircles({
  className,
  position = "top-right",
}: {
  className?: string;
  position?: "top-right" | "bottom-left" | "top-left" | "bottom-right";
}) {
  const positions = {
    "top-right": "top-20 right-20",
    "bottom-left": "bottom-20 left-20",
    "top-left": "top-20 left-20",
    "bottom-right": "bottom-20 right-20",
  };

  const rotations = {
    "top-right": "animate-rotate-slow",
    "bottom-left": "animate-rotate-reverse",
    "top-left": "animate-rotate-slow",
    "bottom-right": "animate-rotate-reverse",
  };

  return (
    <svg
      className={cn(
        "absolute w-64 h-64 opacity-[0.08] dark:opacity-[0.12]",
        positions[position],
        rotations[position],
        className
      )}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`grad-${position}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="80" fill="none" stroke={`url(#grad-${position})`} strokeWidth="2" strokeDasharray="5,5" />
      <circle cx="100" cy="100" r="50" fill="none" stroke={`url(#grad-${position})`} strokeWidth="1" />
      <circle cx="100" cy="100" r="20" fill={`url(#grad-${position})`} />
    </svg>
  );
}

/**
 * Decorative Polygon Pattern - Geometric shapes
 */
export function DecorativePolygon({
  className,
  position = "bottom-left",
}: {
  className?: string;
  position?: "top-right" | "bottom-left" | "top-left" | "bottom-right";
}) {
  const positions = {
    "top-right": "top-20 right-20",
    "bottom-left": "bottom-20 left-20",
    "top-left": "top-20 left-20",
    "bottom-right": "bottom-20 right-20",
  };

  const rotations = {
    "top-right": "animate-rotate-slow",
    "bottom-left": "animate-rotate-reverse",
    "top-left": "animate-rotate-slow",
    "bottom-right": "animate-rotate-reverse",
  };

  return (
    <svg
      className={cn(
        "absolute w-48 h-48 opacity-[0.08] dark:opacity-[0.12]",
        positions[position],
        rotations[position],
        className
      )}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`poly-grad-${position}`} x1="100%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points="100,20 180,100 100,180 20,100" fill="none" stroke={`url(#poly-grad-${position})`} strokeWidth="2" />
      <polygon points="100,60 140,100 100,140 60,100" fill={`url(#poly-grad-${position})`} />
    </svg>
  );
}

/**
 * Shimmer Line - Animated gradient line
 */
export function ShimmerLine({
  className,
  delay = 0,
}: {
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={cn(
        "absolute left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent",
        delay > 0 ? "animate-shimmer-delayed" : "animate-shimmer",
        className
      )}
      style={delay > 0 ? { animationDelay: `${delay}s` } : undefined}
    />
  );
}

