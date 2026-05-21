import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth";
import db from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getAuthFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    const post = await db.post.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
        title: true,
        headlineClaim: true,
        status: true,
        publishedAt: true,
        topicTags: true,
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
        { code: "FORBIDDEN", message: "You can only view insights for your own posts" },
        { status: 403 }
      );
    }

    if (post.status !== "published") {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Insights are only available for published posts" },
        { status: 400 }
      );
    }

    const [reactions, comments, annotations] = await Promise.all([
      db.reaction.findMany({
        where: { postId: id },
        select: { stance: true, createdAt: true },
      }),
      db.comment.findMany({
        where: { postId: id },
        select: { stance: true, createdAt: true },
      }),
      db.annotation.findMany({
        where: { postId: id },
        select: {
          id: true,
          selectedText: true,
          _count: {
            select: { comments: true },
          },
        },
      }),
    ]);

    const stanceDistribution: Record<string, number> = {
      agree: 0,
      disagree: 0,
      complicated: 0,
      skip: 0,
    };
    reactions.forEach((r) => {
      if (stanceDistribution[r.stance] !== undefined) {
        stanceDistribution[r.stance]++;
      }
    });

    const commentStanceDistribution: Record<string, number> = {};
    comments.forEach((c) => {
      if (c.stance) {
        commentStanceDistribution[c.stance] = (commentStanceDistribution[c.stance] || 0) + 1;
      }
    });

    const totalReactions = reactions.length;
    const disagreeCount = stanceDistribution.disagree || 0;
    const dissentRatio = totalReactions > 0 ? disagreeCount / totalReactions : 0;

    const annotationHotspots = annotations
      .filter((a) => a._count.comments > 0)
      .sort((a, b) => b._count.comments - a._count.comments)
      .slice(0, 3)
      .map((a) => ({
        id: a.id,
        selectedText: a.selectedText.slice(0, 100) + (a.selectedText.length > 100 ? "..." : ""),
        commentCount: a._count.comments,
      }));

    const dailyReactions: Record<string, number> = {};
    reactions.forEach((r) => {
      const dateKey = r.createdAt.toISOString().split("T")[0];
      dailyReactions[dateKey] = (dailyReactions[dateKey] || 0) + 1;
    });

    const sortedDates = Object.keys(dailyReactions).sort();
    const reactionVelocity = sortedDates.map((date) => ({
      date,
      count: dailyReactions[date],
    }));

    return NextResponse.json({
      postId: post.id,
      title: post.title,
      headlineClaim: post.headlineClaim,
      publishedAt: post.publishedAt?.toISOString() ?? null,
      topicTags: post.topicTags,
      insights: {
        stanceDistribution,
        commentStanceDistribution,
        totalReactions,
        totalComments: comments.length,
        totalAnnotations: annotations.length,
        dissentRatio: Math.round(dissentRatio * 100),
        annotationHotspots,
        reactionVelocity,
      },
    });
  } catch (error) {
    console.error("Insights error:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to fetch insights" },
      { status: 500 }
    );
  }
}
