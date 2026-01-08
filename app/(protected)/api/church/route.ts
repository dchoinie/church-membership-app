import { NextResponse } from "next/server";
import { getTenantFromRequest } from "@/lib/tenant-context";
import { db } from "@/db";
import { churches } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const churchId = await getTenantFromRequest(request);
    
    if (!churchId) {
      return NextResponse.json(
        { error: "Tenant context not found" },
        { status: 400 }
      );
    }

    const church = await db.query.churches.findFirst({
      where: eq(churches.id, churchId),
    });

    if (!church) {
      return NextResponse.json(
        { error: "Church not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ church });
  } catch (error) {
    console.error("Error fetching church:", error);
    return NextResponse.json(
      { error: "Failed to fetch church data" },
      { status: 500 }
    );
  }
}

