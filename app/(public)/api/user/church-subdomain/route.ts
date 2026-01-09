import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { churches } from "@/db/schema";
import { user } from "@/auth-schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    // Get authenticated session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user record with churchId
    const userRecord = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
    });

    if (!userRecord) {
      return NextResponse.json(
        { error: "User record not found" },
        { status: 404 }
      );
    }

    if (!userRecord.churchId) {
      return NextResponse.json(
        { error: "User does not belong to a church" },
        { status: 404 }
      );
    }

    // Get church with subdomain
    const church = await db.query.churches.findFirst({
      where: eq(churches.id, userRecord.churchId),
    });

    if (!church) {
      return NextResponse.json(
        { error: "Church not found" },
        { status: 404 }
      );
    }

    if (!church.subdomain) {
      return NextResponse.json(
        { error: "Church subdomain not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      subdomain: church.subdomain,
      churchId: church.id,
    });
  } catch (error) {
    console.error("Error fetching user's church subdomain:", error);
    return NextResponse.json(
      { error: "Failed to fetch church subdomain", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

