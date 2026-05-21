import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthFromRequest } from "@/lib/auth";
import { preflightContradictions } from "@/lib/services/contradiction-preflight";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const post = await db.post.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
        headlineClaim: true,
        status: true,
      },
    });

    if (!post) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Post not found" },
        { status: 404 }
      );
    }

    if (post.authorId !== user.id) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "You can only run preflight on your own posts" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const candidateClaim = body.candidateClaim || post.headlineClaim;

    if (!candidateClaim) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "No claim to check" },
        { status: 400 }
      );
    }

    const result = await preflightContradictions({
      userId: user.id,
      candidateClaim,
      excludePostId: post.status === "published" ? post.id : undefined,
    });

    return NextResponse.json({
      conflicts: result.conflicts,
      clean: result.clean,
    });
  } catch (error) {
    console.error("Preflight error:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to run preflight check" },
      { status: 500 }
    );
  }
}
