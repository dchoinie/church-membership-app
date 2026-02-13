import { NextResponse } from "next/server";
import { db } from "@/db";
import { churches, subscriptions } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/auth-helpers";
import { createErrorResponse } from "@/lib/error-handler";
import { checkCsrfToken } from "@/lib/csrf";
import { sanitizeText } from "@/lib/sanitize";
import { eq, desc } from "drizzle-orm";
import { decryptChurch } from "@/lib/encryption";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin(request);
    const { id } = await params;

    const church = await db.query.churches.findFirst({
      where: eq(churches.id, id),
    });

    if (!church) {
      return NextResponse.json(
        { error: "Church not found" },
        { status: 404 }
      );
    }

    // Get subscription record for this church (most recent by updatedAt)
    const [subscription] = await db
      .select({
        createdAt: subscriptions.createdAt,
        updatedAt: subscriptions.updatedAt,
        status: subscriptions.status,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
      })
      .from(subscriptions)
      .where(eq(subscriptions.churchId, id))
      .orderBy(desc(subscriptions.updatedAt))
      .limit(1);

    const churchData = decryptChurch(church);
    const response = {
      church: {
        ...churchData,
        subscription: subscription
          ? {
              subscribedAt: subscription.createdAt,
              canceledAt:
                subscription.status === "canceled" && subscription.updatedAt
                  ? subscription.updatedAt
                  : null,
              currentPeriodEnd: subscription.currentPeriodEnd,
              status: subscription.status,
            }
          : null,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check CSRF token
    const csrfError = await checkCsrfToken(request);
    if (csrfError) return csrfError;

    await requireSuperAdmin(request);
    const { id } = await params;
    const body = await request.json();

    // Sanitize input
    const sanitizedData = {
      name: body.name ? sanitizeText(body.name) : undefined,
      email: body.email ? sanitizeText(body.email) : undefined,
      phone: body.phone ? sanitizeText(body.phone) : undefined,
      address: body.address ? sanitizeText(body.address) : undefined,
    };

    const [updatedChurch] = await db
      .update(churches)
      .set({
        name: sanitizedData.name,
        email: sanitizedData.email,
        phone: sanitizedData.phone,
        address: sanitizedData.address,
        subscriptionStatus: body.subscriptionStatus,
        subscriptionPlan: body.subscriptionPlan,
        updatedAt: new Date(),
      })
      .where(eq(churches.id, id))
      .returning();

    if (!updatedChurch) {
      return NextResponse.json(
        { error: "Church not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ church: decryptChurch(updatedChurch) });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check CSRF token
    const csrfError = await checkCsrfToken(request);
    if (csrfError) return csrfError;

    await requireSuperAdmin(request);
    const { id } = await params;

    await db.delete(churches).where(eq(churches.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorResponse(error);
  }
}

