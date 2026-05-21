import { Metadata } from "next";
import { notFound } from "next/navigation";
import db from "@/lib/db";
import { isCuid } from "@/lib/utils/slug";
import { PostDetailClient } from "./post-detail-client";
import { formatPublicName } from "@/lib/display-name-policy";

interface PageProps {
  params: Promise<{ id: string }>;
}

function truncateText(text: string, maxLength: number): string {
  if (!text) return "";
  const plainText = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (plainText.length <= maxLength) return plainText;
  return plainText.slice(0, maxLength - 3) + "...";
}

async function getPost(identifier: string) {
  const whereClause = isCuid(identifier)
    ? { id: identifier }
    : { slug: identifier };

  const post = await db.post.findUnique({
    where: whereClause,
    include: {
      author: {
        select: { id: true, name: true, avatarUrl: true },
      },
    },
  });

  return post;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);

  if (!post) {
    return {
      title: "Post Not Found | Mindlair",
    };
  }

  // Don't expose draft post metadata
  if (post.status === "draft") {
    return {
      title: "Draft Post | Mindlair",
      robots: { index: false, follow: false },
    };
  }

  const title = post.seoTitle || post.title || post.headlineClaim;
  const description = post.seoDescription || truncateText(post.body, 155);
  const authorName = formatPublicName(post.author?.name);

  return {
    title: `${title} | Mindlair`,
    description,
    authors: [{ name: authorName }],
    openGraph: {
      title,
      description,
      type: "article",
      siteName: "Mindlair",
      authors: [authorName],
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt?.toISOString(),
      ...(post.thumbnailUrl ? { images: [post.thumbnailUrl] } : {}),
    },
    twitter: {
      card: post.thumbnailUrl ? "summary_large_image" : "summary",
      title,
      description,
      ...(post.thumbnailUrl ? { images: [post.thumbnailUrl] } : {}),
    },
    alternates: {
      canonical: post.slug ? `/post/${post.slug}` : `/post/${post.id}`,
    },
  };
}

export default async function PostDetailPage({ params }: PageProps) {
  const { id } = await params;
  
  return <PostDetailClient postId={id} />;
}
