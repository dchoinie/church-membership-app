"use client";

import { cn } from "@/lib/utils";

/* Church icon paths from public/church.svg - inlined for currentColor theming */
export const ChurchIcon = ({ size = 24, className }: { size?: number; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M10 9h4" />
    <path d="M12 7v5" />
    <path d="M14 21v-3a2 2 0 0 0-4 0v3" />
    <path d="m18 9 3.52 2.147a1 1 0 0 1 .48.854V19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6.999a1 1 0 0 1 .48-.854L6 9" />
    <path d="M6 21V7a1 1 0 0 1 .376-.782l5-3.999a1 1 0 0 1 1.249.001l5 4A1 1 0 0 1 18 7v14" />
  </svg>
);

const sizeMap = {
  sm: { container: "size-6", icon: 14 },
  md: { container: "size-8", icon: 20 },
  lg: { container: "size-10", icon: 26 },
} as const;

interface ChurchLoadingProps {
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Optional label shown below the indicator */
  label?: string;
  /** Center the indicator in a flex container (for full-page loading) */
  centered?: boolean;
  className?: string;
}

export function ChurchLoadingIndicator({
  size = "md",
  label,
  centered = false,
  className,
}: ChurchLoadingProps) {
  const { container, icon } = sizeMap[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3",
        centered && "justify-center min-h-[120px]",
        className
      )}
      role="status"
      aria-label={label ?? "Loading"}
    >
      <div className={cn("relative", container)}>
        {/* Circular loading bar - rotates around the icon */}
        <svg
          className="absolute inset-0 size-full -rotate-90 animate-church-loading-spin"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="2"
            className="opacity-20"
          />
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="47"
            strokeDashoffset="12"
            className="text-primary"
          />
        </svg>
        {/* Church icon centered */}
        <div className="absolute inset-0 flex items-center justify-center text-foreground/90">
          <ChurchIcon size={icon} />
        </div>
      </div>
      {label && (
        <span className="text-sm text-muted-foreground">{label}</span>
      )}
    </div>
  );
}
