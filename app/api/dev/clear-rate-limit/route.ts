import { NextResponse } from "next/server";
import { headers } from "next/headers";

/**
 * Development-only endpoint to clear rate limits
 * Only available in development mode
 * Can clear all rate limits or a specific IP if provided
 */
export async function POST(request: Request) {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 }
    );
  }

  try {
    const { clearRateLimitStore, clearRateLimitForIp } = await import("@/lib/rate-limit");
    
    // Try to get the requesting IP to clear that specific entry
    let clearedIp: string | null = null;
    try {
      const headersList = await headers();
      const forwarded = headersList.get("x-forwarded-for");
      const realIp = headersList.get("x-real-ip");
      const ip = forwarded?.split(",")[0]?.trim() || realIp;
      
      if (ip && ip !== "unknown") {
        clearedIp = ip;
        // Clear specific IP entry
        clearRateLimitForIp(ip);
        console.log(`[Dev] Cleared rate limit for IP: ${ip}`);
        return NextResponse.json({ 
          success: true,
          message: `Rate limit cleared for IP: ${ip}`,
          clearedIp: ip
        });
      }
    } catch (e) {
      // If we can't get IP, just clear all
      console.warn("[Dev] Could not get IP, clearing all rate limits");
    }
    
    // Clear all rate limits as fallback
    clearRateLimitStore();
    console.log("[Dev] Cleared all rate limits");
    
    return NextResponse.json({ 
      success: true,
      message: clearedIp ? `Rate limit cleared for IP: ${clearedIp}` : "All rate limits cleared",
      clearedIp: clearedIp || "all"
    });
  } catch (error) {
    console.error("Error clearing rate limit:", error);
    return NextResponse.json(
      { error: "Failed to clear rate limit" },
      { status: 500 }
    );
  }
}

