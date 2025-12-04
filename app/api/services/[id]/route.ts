import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, and, ne } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { services, attendance } from "@/db/schema";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get service by ID
    const [service] = await db
      .select()
      .from(services)
      .where(eq(services.id, id))
      .limit(1);

    if (!service) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ service });
  } catch (error) {
    console.error("Error fetching service:", error);
    return NextResponse.json(
      { error: "Failed to fetch service" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Check if service exists
    const [existingService] = await db
      .select()
      .from(services)
      .where(eq(services.id, id))
      .limit(1);

    if (!existingService) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 },
      );
    }

    // Validate service type if provided
    if (body.serviceType !== undefined) {
      const validServiceTypes = ["divine_service", "midweek_lent", "midweek_advent", "festival"];
      if (!validServiceTypes.includes(body.serviceType)) {
        return NextResponse.json(
          { error: `Invalid service type. Must be one of: ${validServiceTypes.join(", ")}` },
          { status: 400 },
        );
      }
    }

    // Validate date format if provided
    let serviceDate = existingService.serviceDate;
    if (body.serviceDate !== undefined) {
      try {
        const parsedDate = new Date(body.serviceDate);
        if (isNaN(parsedDate.getTime())) {
          return NextResponse.json(
            { error: "Invalid date format (use YYYY-MM-DD)" },
            { status: 400 },
          );
        }
        serviceDate = parsedDate.toISOString().split("T")[0];
      } catch {
        return NextResponse.json(
          { error: "Invalid date format (use YYYY-MM-DD)" },
          { status: 400 },
        );
      }
    }

    const finalServiceType = body.serviceType !== undefined ? body.serviceType : existingService.serviceType;

    // Check if another service exists with same date and type
    if (body.serviceDate !== undefined || body.serviceType !== undefined) {
      const [duplicate] = await db
        .select()
        .from(services)
        .where(
          and(
            eq(services.serviceDate, serviceDate),
            eq(services.serviceType, finalServiceType),
            ne(services.id, id),
          ),
        )
        .limit(1);

      if (duplicate) {
        return NextResponse.json(
          { error: "Service already exists for this date and type" },
          { status: 400 },
        );
      }
    }

    // Update service
    const [updatedService] = await db
      .update(services)
      .set({
        serviceDate,
        serviceType: finalServiceType,
        updatedAt: new Date(),
      })
      .where(eq(services.id, id))
      .returning();

    return NextResponse.json({ service: updatedService });
  } catch (error) {
    console.error("Error updating service:", error);
    return NextResponse.json(
      { error: "Failed to update service" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if service exists
    const [existingService] = await db
      .select()
      .from(services)
      .where(eq(services.id, id))
      .limit(1);

    if (!existingService) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 },
      );
    }

    // Delete service (cascade will delete attendance records)
    await db
      .delete(services)
      .where(eq(services.id, id));

    return NextResponse.json({ message: "Service deleted successfully" });
  } catch (error) {
    console.error("Error deleting service:", error);
    return NextResponse.json(
      { error: "Failed to delete service" },
      { status: 500 },
    );
  }
}

