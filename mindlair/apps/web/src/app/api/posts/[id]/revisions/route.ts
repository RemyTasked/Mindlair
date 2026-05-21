import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const post = await db.post.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        currentVersion: true,
        title: true,
        headlineClaim: true,
        body: true,
        authorStance: true,
        topicTags: true,
      },
    });

    if (!post) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Post not found" },
        { status: 404 }
      );
    }

    if (post.status === "draft") {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Draft posts have no revision history" },
        { status: 403 }
      );
    }

    const revisions = await db.postRevision.findMany({
      where: { postId: id },
      orderBy: { version: "desc" },
      select: {
        id: true,
        version: true,
        title: true,
        headlineClaim: true,
        body: true,
        authorStance: true,
        topicTags: true,
        changeType: true,
        changeNote: true,
        editedAt: true,
      },
    });

    const current = {
      version: post.currentVersion,
      title: post.title,
      headlineClaim: post.headlineClaim,
      body: post.body,
      authorStance: post.authorStance,
      topicTags: post.topicTags,
      isCurrent: true,
    };

    const history = revisions.map((r) => ({
      id: r.id,
      version: r.version,
      title: r.title,
      headlineClaim: r.headlineClaim,
      body: r.body,
      authorStance: r.authorStance,
      topicTags: r.topicTags,
      changeType: r.changeType,
      changeNote: r.changeNote,
      editedAt: r.editedAt.toISOString(),
      isCurrent: false,
    }));

    return NextResponse.json({
      current,
      revisions: history,
      totalVersions: post.currentVersion,
    });
  } catch (error) {
    console.error("Revisions error:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to fetch revisions" },
      { status: 500 }
    );
  }
}
