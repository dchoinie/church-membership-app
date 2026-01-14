import { NextResponse } from "next/server";
import { eq, desc, and, gte, lte, count } from "drizzle-orm";

import { db } from "@/db";
import { services } from "@/db/schema";
import { getAuthContext, requireAdmin } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";
import { checkCsrfToken } from "@/lib/csrf";
import { sanitizeText } from "@/lib/sanitize";

export async function GET(request: Request) {
  try {
    const { churchId } = await getAuthContext(request);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

    // Validate pagination parameters
    const validPage = Math.max(1, page);
    const validPageSize = Math.max(1, Math.min(100, pageSize));
    const offset = (validPage - 1) * validPageSize;

    // Build where conditions (always include churchId)
    const whereConditions = [eq(services.churchId, churchId)];
    if (startDate) {
      whereConditions.push(gte(services.serviceDate, startDate));
    }
    if (endDate) {
      whereConditions.push(lte(services.serviceDate, endDate));
    }

    const whereCondition = and(...whereConditions);

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(services)
      .where(whereCondition);
    const total = totalResult.count;
    const totalPages = Math.ceil(total / validPageSize);

    // Get paginated services
    const servicesList = await db
      .select()
      .from(services)
      .where(whereCondition)
      .orderBy(desc(services.serviceDate), desc(services.createdAt))
      .limit(validPageSize)
      .offset(offset);

    return NextResponse.json({
      services: servicesList,
      pagination: {
        page: validPage,
        pageSize: validPageSize,
        total,
        totalPages,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    // Check CSRF token
    const csrfError = await checkCsrfToken(request);
    if (csrfError) return csrfError;

    // Require admin role
    const { churchId } = await requireAdmin(request);

    const body = await request.json();

    // Validate required fields
    if (!body.serviceDate || !body.serviceType) {
      return NextResponse.json(
        { error: "Service date and service type are required" },
        { status: 400 },
      );
    }

    // Validate service type
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

    // Validate date format
    let serviceDate: string;
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

    // Check if service already exists for this date and type (within same church)
    const [existingService] = await db
      .select()
      .from(services)
      .where(
        and(
          eq(services.churchId, churchId),
          eq(services.serviceDate, serviceDate),
          eq(services.serviceType, body.serviceType),
        ),
      )
      .limit(1);

    if (existingService) {
      return NextResponse.json(
        { error: "Service already exists for this date and type" },
        { status: 400 },
      );
    }

    // Create new service
    const [newService] = await db
      .insert(services)
      .values({
        churchId,
        serviceDate,
        serviceType: body.serviceType,
      })
      .returning();

    return NextResponse.json({ service: newService }, { status: 201 });
  } catch (error) {
    return createErrorResponse(error);
  }
}

