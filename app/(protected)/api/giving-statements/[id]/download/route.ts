import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/db";
import { givingStatements } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { canManageGivingStatements } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/**
 * GET /api/giving-statements/[id]/download
 * Downloads a giving statement PDF
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    const churchId = session?.user?.churchId;
    const userId = session?.user?.id;

    if (!churchId || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    const hasPermission = await canManageGivingStatements(userId, churchId);
    if (!hasPermission) {
      return NextResponse.json(
        { error: "You do not have permission to download giving statements" },
        { status: 403 }
      );
    }

    const statementId = params.id;

    // Get statement
    const statements = await db
      .select()
      .from(givingStatements)
      .where(
        and(
          eq(givingStatements.id, statementId),
          eq(givingStatements.churchId, churchId)
        )
      )
      .limit(1);

    if (!statements || statements.length === 0) {
      return NextResponse.json(
        { error: "Statement not found" },
        { status: 404 }
      );
    }

    const statement = statements[0];

    if (!statement.pdfUrl) {
      return NextResponse.json(
        { error: "PDF not available for this statement" },
        { status: 404 }
      );
    }

    // Extract PDF buffer from data URL
    if (statement.pdfUrl.startsWith("data:application/pdf;base64,")) {
      const base64Data = statement.pdfUrl.replace(
        "data:application/pdf;base64,",
        ""
      );
      const pdfBuffer = Buffer.from(base64Data, "base64");

      return new NextResponse(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="giving-statement-${statement.year}-${statement.statementNumber || statement.id}.pdf"`,
        },
      });
    } else {
      // If it's a URL (future: S3, etc.), redirect to it
      return NextResponse.redirect(statement.pdfUrl);
    }
  } catch (error) {
    console.error("Error downloading giving statement:", error);
    return NextResponse.json(
      {
        error: "Failed to download giving statement",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
