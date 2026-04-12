import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import crypto from 'crypto';

function hashText(text: string): string {
  return crypto.createHash('sha256').update(text.toLowerCase().trim()).digest('hex').slice(0, 16);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const session = await getSessionFromRequest(request);

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, status: true, authorId: true },
    });

    if (!post) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Post not found' },
        { status: 404 }
      );
    }

    if (post.status !== 'published' && post.authorId !== session?.userId) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Post not found' },
        { status: 404 }
      );
    }

    const annotations = await prisma.annotation.findMany({
      where: { postId },
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true },
        },
        _count: {
          select: { comments: true, referencingPosts: true },
        },
      },
      orderBy: { startOffset: 'asc' },
    });

    const formattedAnnotations = annotations.map((a) => ({
      id: a.id,
      postId: a.postId,
      author: a.author,
      selectedText: a.selectedText,
      textHash: a.textHash,
      startOffset: a.startOffset,
      endOffset: a.endOffset,
      contextBefore: a.contextBefore,
      contextAfter: a.contextAfter,
      isResolved: a.isResolved,
      commentCount: a._count.comments,
      responsePostCount: a._count.referencingPosts,
      isOwnAnnotation: session?.userId === a.authorId,
      createdAt: a.createdAt.toISOString(),
    }));

    return NextResponse.json({ annotations: formattedAnnotations });
  } catch (error) {
    console.error('Error fetching annotations:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch annotations' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const session = await getSessionFromRequest(request);

    if (!session) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, status: true, authorId: true },
    });

    if (!post) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Post not found' },
        { status: 404 }
      );
    }

    if (post.status !== 'published') {
      return NextResponse.json(
        { code: 'FORBIDDEN', message: 'Can only annotate published posts' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { selectedText, startOffset, endOffset, contextBefore, contextAfter } = body;

    if (!selectedText || typeof selectedText !== 'string' || selectedText.trim().length === 0) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'selectedText is required' },
        { status: 400 }
      );
    }

    if (selectedText.length > 1000) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Selected text must be under 1000 characters' },
        { status: 400 }
      );
    }

    const textHash = hashText(selectedText);

    const annotation = await prisma.annotation.create({
      data: {
        postId,
        authorId: session.userId,
        selectedText: selectedText.trim(),
        textHash,
        startOffset: typeof startOffset === 'number' ? startOffset : null,
        endOffset: typeof endOffset === 'number' ? endOffset : null,
        contextBefore: contextBefore?.slice(0, 100) || null,
        contextAfter: contextAfter?.slice(0, 100) || null,
      },
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json({
      annotation: {
        id: annotation.id,
        postId: annotation.postId,
        author: annotation.author,
        selectedText: annotation.selectedText,
        textHash: annotation.textHash,
        startOffset: annotation.startOffset,
        endOffset: annotation.endOffset,
        contextBefore: annotation.contextBefore,
        contextAfter: annotation.contextAfter,
        isResolved: annotation.isResolved,
        commentCount: 0,
        responsePostCount: 0,
        isOwnAnnotation: true,
        createdAt: annotation.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error creating annotation:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to create annotation' },
      { status: 500 }
    );
  }
}
