import { NextResponse } from "next/server";
import { eq, and, ne } from "drizzle-orm";

import { db } from "@/db";
import { services } from "@/db/schema";
import { getAuthContext, requireAdmin } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";
import { checkCsrfToken } from "@/lib/csrf";
import { sanitizeText } from "@/lib/sanitize";

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
    return createErrorResponse(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check CSRF token
    const csrfError = await checkCsrfToken(request);
    if (csrfError) return csrfError;

    // Require admin role
    const { churchId } = await requireAdmin(request);
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
      // Allow predefined types or custom types (non-empty string)
      const validServiceTypes = ["divine_service", "midweek_lent", "midweek_advent", "festival"];
      const isCustomType = !validServiceTypes.includes(body.serviceType);
      
      if (isCustomType) {
        // Validate custom type: must be non-empty string, max 100 characters
        if (typeof body.serviceType !== "string" || body.serviceType.trim().length === 0) {
          return NextResponse.json(
            { error: "Custom service type must be a non-empty string" },
            { status: 400 },
          );
        }
        if (body.serviceType.length > 100) {
          return NextResponse.json(
            { error: "Custom service type must be 100 characters or less" },
            { status: 400 },
          );
        }
        // Normalize and sanitize custom type: trim whitespace and sanitize
        body.serviceType = sanitizeText(body.serviceType.trim());
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

    // Validate service time format if provided (HH:MM:SS)
    let serviceTime: string | null | undefined = undefined;
    if (body.serviceTime !== undefined) {
      if (body.serviceTime === null || body.serviceTime === "") {
        serviceTime = null;
      } else {
        if (typeof body.serviceTime !== "string") {
          return NextResponse.json(
            { error: "Service time must be a string" },
            { status: 400 },
          );
        }
        // Validate format: HH:MM:SS or HH:MM
        const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
        if (!timeRegex.test(body.serviceTime)) {
          return NextResponse.json(
            { error: "Invalid time format (use HH:MM or HH:MM:SS)" },
            { status: 400 },
          );
        }
        // Normalize to HH:MM:SS format
        const timeParts = body.serviceTime.split(":");
        if (timeParts.length === 2) {
          serviceTime = `${timeParts[0].padStart(2, "0")}:${timeParts[1].padStart(2, "0")}:00`;
        } else {
          serviceTime = body.serviceTime;
        }
      }
    }

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

    // Build update object
    const updateData: {
      serviceDate: string;
      serviceType: string;
      serviceTime?: string | null;
      updatedAt: Date;
    } = {
      serviceDate,
      serviceType: finalServiceType,
      updatedAt: new Date(),
    };

    // Only include serviceTime in update if it was provided
    if (serviceTime !== undefined) {
      updateData.serviceTime = serviceTime;
    }

    // Update service
    const [updatedService] = await db
      .update(services)
      .set(updateData)
      .where(eq(services.id, id))
      .returning();

    return NextResponse.json({ service: updatedService });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check CSRF token
    const csrfError = await checkCsrfToken(request);
    if (csrfError) return csrfError;

    // Require admin role
    const { churchId } = await requireAdmin(request);
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
    return createErrorResponse(error);
  }
}

