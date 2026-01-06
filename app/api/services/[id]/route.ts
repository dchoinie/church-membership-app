import { NextResponse } from "next/server";
import { eq, and, ne } from "drizzle-orm";

import { db } from "@/db";
import { services } from "@/db/schema";
import { getAuthContext, handleAuthError } from "@/lib/api-helpers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { churchId } = await getAuthContext(request);
    const { id } = await params;

    // Get service by ID and verify it belongs to church
    const [service] = await db
      .select()
      .from(services)
      .where(and(eq(services.id, id), eq(services.churchId, churchId)))
      .limit(1);

    if (!service) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ service });
  } catch (error) {
    const authError = handleAuthError(error);
    if (authError.status !== 500) return authError;
    
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
    const { churchId } = await getAuthContext(request);
    const { id } = await params;
    const body = await request.json();

    // Check if service exists and belongs to church
    const [existingService] = await db
      .select()
      .from(services)
      .where(and(eq(services.id, id), eq(services.churchId, churchId)))
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

    // Check if another service exists with same date and type (within same church)
    if (body.serviceDate !== undefined || body.serviceType !== undefined) {
      const [duplicate] = await db
        .select()
        .from(services)
        .where(
          and(
            eq(services.churchId, churchId),
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
    const authError = handleAuthError(error);
    if (authError.status !== 500) return authError;
    
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
    const { churchId } = await getAuthContext(request);
    const { id } = await params;

    // Check if service exists and belongs to church
    const [existingService] = await db
      .select()
      .from(services)
      .where(and(eq(services.id, id), eq(services.churchId, churchId)))
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
    const authError = handleAuthError(error);
    if (authError.status !== 500) return authError;
    
    console.error("Error deleting service:", error);
    return NextResponse.json(
      { error: "Failed to delete service" },
      { status: 500 },
    );
  }
}

