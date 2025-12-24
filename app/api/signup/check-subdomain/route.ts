import { NextResponse } from "next/server";
import { isSubdomainAvailable } from "@/lib/tenant-context";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const subdomain = searchParams.get("subdomain");

    if (!subdomain) {
      return NextResponse.json(
        { error: "Subdomain is required" },
        { status: 400 }
      );
    }

    const available = await isSubdomainAvailable(subdomain);

    return NextResponse.json({ available });
  } catch (error) {
    console.error("Error checking subdomain availability:", error);
    return NextResponse.json(
      { error: "Failed to check subdomain availability" },
      { status: 500 }
    );
  }
}

